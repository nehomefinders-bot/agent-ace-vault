import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ghlGetContact, ghlToClientPatch } from "@/utils/ghl.server";

// Inbound webhook from GHL.
// Configure in GHL workflow as: POST https://<your-domain>/api/public/ghl/webhook?key=<webhook_secret>
// The `key` query param identifies the user — it must match integration_settings.webhook_secret.
export const Route = createFileRoute("/api/public/ghl/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const key = url.searchParams.get("key");
        if (!key || key.length < 16) {
          return new Response("Missing key", { status: 401 });
        }

        const { data: settings, error: settingsError } = await supabaseAdmin
          .from("integration_settings")
          .select("user_id, location_id, enabled")
          .eq("provider", "ghl")
          .eq("webhook_secret", key)
          .maybeSingle();

        if (settingsError || !settings) {
          return new Response("Invalid key", { status: 401 });
        }
        if (!settings.enabled) {
          return new Response("Disabled", { status: 200 });
        }

        let payload: any = null;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // GHL sends a `type` like ContactCreate / ContactUpdate / ContactDelete
        const type: string = payload?.type || payload?.event || "";
        const contactId: string | undefined =
          payload?.contact?.id || payload?.contactId || payload?.id;

        if (!contactId) {
          return new Response("Missing contactId", { status: 400 });
        }

        try {
          if (type.includes("Delete")) {
            await supabaseAdmin
              .from("clients")
              .delete()
              .eq("user_id", settings.user_id)
              .eq("ghl_contact_id", contactId);
          } else {
            // Always re-fetch the canonical contact from GHL to avoid trusting the webhook payload
            const fresh = await ghlGetContact(contactId);
            const patch = ghlToClientPatch(fresh);

            const { data: existing } = await supabaseAdmin
              .from("clients")
              .select("id")
              .eq("user_id", settings.user_id)
              .or(`ghl_contact_id.eq.${contactId}${patch.email ? `,email.eq.${patch.email}` : ""}`)
              .limit(1)
              .maybeSingle();

            if (existing) {
              await supabaseAdmin
                .from("clients")
                .update({ ...patch, last_synced_at: new Date().toISOString(), source: "ghl" })
                .eq("id", existing.id);
            } else {
              await supabaseAdmin.from("clients").insert({
                ...patch,
                user_id: settings.user_id,
                source: "ghl",
                last_synced_at: new Date().toISOString(),
              } as any);
            }
          }

          await supabaseAdmin.from("integration_sync_log").insert({
            user_id: settings.user_id,
            provider: "ghl",
            direction: "webhook",
            entity_type: "client",
            entity_id: contactId,
            status: "ok",
            payload: { type },
          });

          return new Response("ok", { status: 200 });
        } catch (e: any) {
          await supabaseAdmin.from("integration_sync_log").insert({
            user_id: settings.user_id,
            provider: "ghl",
            direction: "webhook",
            entity_type: "client",
            entity_id: contactId,
            status: "error",
            error: e?.message ?? String(e),
            payload: { type },
          });
          return new Response("Error processing webhook", { status: 500 });
        }
      },
    },
  },
});
