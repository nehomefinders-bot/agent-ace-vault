import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ghlCreateContact,
  ghlListContacts,
  ghlSearchByEmailOrPhone,
  ghlToClientPatch,
  ghlUpdateContact,
  type LocalClient,
} from "./ghl.server";

const PROVIDER = "ghl";

async function getSettings(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function logSync(
  supabase: any,
  userId: string,
  direction: "push" | "pull" | "webhook",
  entityType: string,
  entityId: string | null,
  status: "ok" | "error" | "skipped",
  error?: string,
  payload?: unknown,
) {
  await supabase.from("integration_sync_log").insert({
    user_id: userId,
    provider: PROVIDER,
    direction,
    entity_type: entityType,
    entity_id: entityId,
    status,
    error: error ?? null,
    payload: payload ? (payload as any) : null,
  });
}

export const getGhlStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const settings = await getSettings(supabase, userId);
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const { count: linkedCount } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("ghl_contact_id", "is", null);
    const { data: recentLogs } = await supabase
      .from("integration_sync_log")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", PROVIDER)
      .order("created_at", { ascending: false })
      .limit(10);
    const tokenConfigured = Boolean(process.env.GHL_PRIVATE_TOKEN);
    return {
      tokenConfigured,
      settings,
      totalClients: count ?? 0,
      linkedClients: linkedCount ?? 0,
      recentLogs: recentLogs ?? [],
    };
  });

export const saveGhlSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        locationId: z.string().min(1).max(100),
        enabled: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const existing = await getSettings(supabase, userId);
    if (existing) {
      const { error } = await supabase
        .from("integration_settings")
        .update({ location_id: data.locationId, enabled: data.enabled })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      // generate a webhook secret on first save
      const webhookSecret = `whk_${crypto.randomUUID().replace(/-/g, "")}`;
      const { error } = await supabase.from("integration_settings").insert({
        user_id: userId,
        provider: PROVIDER,
        location_id: data.locationId,
        enabled: data.enabled,
        webhook_secret: webhookSecret,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const pushClientToGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ clientId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const settings = await getSettings(supabase, userId);
    if (!settings?.location_id) throw new Error("GHL is not configured. Add your Location ID in Settings → Integrations.");

    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", data.clientId)
      .single();
    if (error || !client) throw new Error("Client not found");
    const local = client as LocalClient;

    try {
      let contactId = local.ghl_contact_id;
      if (!contactId) {
        // try to find an existing GHL contact by email/phone to avoid duplicates
        const existing = await ghlSearchByEmailOrPhone(settings.location_id, local.email, local.phone);
        if (existing?.id) {
          contactId = existing.id;
          await ghlUpdateContact(contactId, local, settings.location_id);
        } else {
          const created = await ghlCreateContact(settings.location_id, local);
          contactId = created.id;
        }
      } else {
        await ghlUpdateContact(contactId, local, settings.location_id);
      }

      await supabase
        .from("clients")
        .update({ ghl_contact_id: contactId, last_synced_at: new Date().toISOString() })
        .eq("id", local.id);

      await logSync(supabase, userId, "push", "client", local.id, "ok");
      return { ok: true, ghlContactId: contactId };
    } catch (e: any) {
      await logSync(supabase, userId, "push", "client", local.id, "error", e?.message ?? String(e));
      throw e;
    }
  });

export const pullAllFromGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const settings = await getSettings(supabase, userId);
    if (!settings?.location_id) throw new Error("GHL is not configured.");

    let page = 1;
    let imported = 0;
    let updated = 0;
    while (true) {
      const batch = await ghlListContacts(settings.location_id, page, 100);
      if (!batch.length) break;
      for (const g of batch) {
        const patch = ghlToClientPatch(g);
        // Try to find by ghl_contact_id first, then by email
        const { data: existing } = await supabase
          .from("clients")
          .select("id, updated_at")
          .eq("user_id", userId)
          .or(`ghl_contact_id.eq.${g.id}${patch.email ? `,email.eq.${patch.email}` : ""}`)
          .limit(1)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("clients")
            .update({ ...patch, last_synced_at: new Date().toISOString(), source: "ghl" })
            .eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("clients").insert({
            ...patch,
            user_id: userId,
            source: "ghl",
            last_synced_at: new Date().toISOString(),
          } as any);
          imported++;
        }
      }
      if (batch.length < 100) break;
      page++;
      if (page > 50) break; // hard safety cap = 5000 contacts per run
    }

    await supabase
      .from("integration_settings")
      .update({ last_full_sync_at: new Date().toISOString() })
      .eq("id", settings.id);

    await logSync(supabase, userId, "pull", "client", null, "ok", undefined, { imported, updated });
    return { ok: true, imported, updated };
  });

export const pushAllToGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const settings = await getSettings(supabase, userId);
    if (!settings?.location_id) throw new Error("GHL is not configured.");

    const { data: clients } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId);

    let pushed = 0;
    let failed = 0;
    for (const c of clients ?? []) {
      try {
        const local = c as LocalClient;
        let contactId = local.ghl_contact_id;
        if (!contactId) {
          const existing = await ghlSearchByEmailOrPhone(settings.location_id, local.email, local.phone);
          if (existing?.id) {
            contactId = existing.id;
            await ghlUpdateContact(contactId, local, settings.location_id);
          } else {
            const created = await ghlCreateContact(settings.location_id, local);
            contactId = created.id;
          }
        } else {
          await ghlUpdateContact(contactId, local, settings.location_id);
        }
        await supabase
          .from("clients")
          .update({ ghl_contact_id: contactId, last_synced_at: new Date().toISOString() })
          .eq("id", local.id);
        pushed++;
      } catch (e: any) {
        failed++;
        await logSync(supabase, userId, "push", "client", (c as any).id, "error", e?.message ?? String(e));
      }
    }
    return { ok: true, pushed, failed };
  });
