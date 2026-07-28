// One-shot gift-account provisioner. Delete after use.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/provision-gift")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("token") !== "gift-brapoza-2026") {
          return new Response("Forbidden", { status: 403 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const email = "Brapoza42@gmail.com";
        const displayName = "Brian Rapoza";

        // Find or create the auth user
        let userId: string | null = null;
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (listErr) return new Response("listUsers: " + listErr.message, { status: 500 });
        const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
        if (existing) {
          userId = existing.id;
        } else {
          const tempPassword = "Welcome-" + crypto.randomUUID().slice(0, 12) + "!";
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { display_name: displayName },
          });
          if (createErr || !created.user) {
            return new Response("createUser: " + (createErr?.message ?? "unknown"), { status: 500 });
          }
          userId = created.user.id;
          // Send a password recovery so Brian sets his own password
          await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email });
        }

        // Ensure profile
        await supabaseAdmin.from("profiles").upsert({
          id: userId!,
          display_name: displayName,
          plan: "gifted",
        });

        // Ensure active gifted subscription (live env so paywall passes everywhere)
        await supabaseAdmin
          .from("subscriptions")
          .delete()
          .eq("user_id", userId!)
          .eq("environment", "live");

        const now = new Date();
        const end = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
        const { error: subErr } = await supabaseAdmin.from("subscriptions").insert({
          user_id: userId!,
          stripe_subscription_id: "gift_" + userId!,
          stripe_customer_id: "gift_cus_" + userId!.replace(/-/g, "").slice(0, 12),
          product_id: "gift_lifetime",
          price_id: "gift_lifetime",
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
          cancel_at_period_end: false,
          environment: "live",
        });
        if (subErr) return new Response("subscription: " + subErr.message, { status: 500 });

        return new Response(
          JSON.stringify({ ok: true, userId, email, plan: "gifted" }, null, 2),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
