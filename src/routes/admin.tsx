import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, CreditCard, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAdminUsers, type AdminUserRow } from "@/lib/admin.functions";
import { PageShell } from "@/components/page-shell";

const ADMIN_EMAIL = "qa.tester@endlessprospects.org";
const TRIAL_DAYS = 14;

function trialInfo(createdAt: string, hasSub: boolean, plan: string | null) {
  if (hasSub || plan === "active" || plan === "gifted") return { label: "—", tone: "slate" as const };
  const created = new Date(createdAt).getTime();
  if (!created) return { label: "—", tone: "slate" as const };
  const ends = created + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((ends - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft > 0) return { label: `Active Trial (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)`, tone: "emerald" as const };
  return { label: "Expired", tone: "rose" as const };
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Agent Business Tracker" },
      { name: "description", content: "Admin overview of sign-ups, trials and subscriptions." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const isAdmin = (user?.email ?? "").toLowerCase() === ADMIN_EMAIL;

  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      nav({ to: "/dashboard", replace: true });
    }
  }, [authLoading, user, isAdmin, nav]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getAdminUsers();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load users");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const activeSubs = useMemo(() => {
    if (!rows) return 0;
    return rows.filter(
      (r) =>
        ["active", "trialing"].includes(r.subscription_status ?? "") ||
        r.plan === "active" ||
        r.plan === "gifted",
    ).length;
  }, [rows]);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageShell title="Admin Portal" subtitle="Sign-ups, trial windows and subscription status.">
      <div className="mx-auto w-full max-w-6xl">

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-[#d99a26]" /> Total Users
            </div>
            <div className="mt-2 text-3xl font-semibold">{rows ? rows.length : "—"}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4 text-[#d99a26]" /> Active Subscriptions
            </div>
            <div className="mt-2 text-3xl font-semibold">{rows ? activeSubs : "—"}</div>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Signup Date</th>
                <th className="px-4 py-3 font-medium">Trial Status</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
              </tr>
            </thead>
            <tbody>
              {!rows && !error && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-rose-500">
                    {error}
                  </td>
                </tr>
              )}
              {rows && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No users match your search.
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const hasSub = ["active", "trialing"].includes(r.subscription_status ?? "");
                const trial = trialInfo(r.created_at, hasSub, r.plan);
                const subLabel = hasSub
                  ? r.subscription_status === "trialing"
                    ? "Trialing"
                    : "Active"
                  : r.plan === "gifted"
                    ? "Gifted"
                    : r.plan === "active"
                      ? "Active"
                      : "None";
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          trial.tone === "emerald"
                            ? "text-emerald-500"
                            : trial.tone === "rose"
                              ? "text-rose-500"
                              : "text-muted-foreground"
                        }
                      >
                        {trial.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          subLabel === "None"
                            ? "bg-muted text-muted-foreground"
                            : "bg-[#d99a26]/15 text-[#d99a26]"
                        }`}
                      >
                        {subLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
