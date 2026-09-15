import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "qa.tester@endlessprospects.org";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
  plan: string | null;
  subscription_status: string | null;
  subscription_price_id: string | null;
}

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims?.email ?? "").toLowerCase();
    if (email !== ADMIN_EMAIL) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (authError) throw authError;

    const authUsers = authData.users ?? [];
    const ids = authUsers.map((u) => u.id);

    const [{ data: profiles }, { data: subs }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, plan, created_at")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin
        .from("subscriptions")
        .select("user_id, status, price_id, current_period_end, environment")
        .eq("environment", "live")
        .order("created_at", { ascending: false }),
    ]);

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const subByUser = new Map<string, { status: string; price_id: string | null }>();
    for (const s of subs ?? []) {
      if (!subByUser.has(s.user_id)) {
        subByUser.set(s.user_id, { status: s.status, price_id: s.price_id ?? null });
      }
    }

    const rows: AdminUserRow[] = authUsers.map((u) => {
      const profile = profileById.get(u.id);
      const sub = subByUser.get(u.id);
      return {
        id: u.id,
        name: (profile?.display_name as string | null) ?? (u.email ? u.email.split("@")[0] : "—"),
        email: u.email ?? "—",
        created_at: (u.created_at as string | undefined) ?? (profile?.created_at as string) ?? "",
        plan: (profile?.plan as string | null) ?? null,
        subscription_status: sub?.status ?? null,
        subscription_price_id: sub?.price_id ?? null,
      };
    });

    rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return rows;
  });
