import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Play, Trash2, Sparkles, AlertTriangle, ExternalLink } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { getStripeEnvironment } from "@/lib/stripe";
import { seedTestSubscription, clearTestSubscription } from "@/utils/test-bypass.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/test")({
  component: TestPage,
  head: () => ({ meta: [{ title: "Test Console — Agent Business Tracker" }] }),
});

type StepStatus = "pending" | "running" | "ok" | "fail";
interface Step {
  key: string;
  label: string;
  path: string;
  status: StepStatus;
  note?: string;
}

const WALKTHROUGH: Omit<Step, "status">[] = [
  { key: "dashboard", label: "Dashboard loads", path: "/" },
  { key: "commissions", label: "Commissions tracker", path: "/commissions" },
  { key: "deals", label: "Deals pipeline", path: "/deals" },
  { key: "clients", label: "Clients", path: "/clients" },
  { key: "books", label: "Books", path: "/books" },
  { key: "settings", label: "Settings", path: "/settings" },
  { key: "billing", label: "Billing (active sub)", path: "/billing" },
];

function isLiveHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".lovable.app") && !host.includes("id-preview") && !host.includes("-dev.");
}

function TestPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const { subscription, isActive, loading: subLoading, refetch } = useSubscription();
  const [busy, setBusy] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>(
    WALKTHROUGH.map((s) => ({ ...s, status: "pending" }))
  );
  const [autoRunning, setAutoRunning] = useState(false);

  const liveHost = useMemo(isLiveHost, []);

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/auth" });
  }, [authLoading, user, nav]);

  async function activateTestPlan() {
    if (!user) throw new Error("Please sign in again.");

    const result = await seedTestSubscription(getStripeEnvironment());
    await refetch();
    return result;
  }

  async function clearTestPlan() {
    if (!user) throw new Error("Please sign in again.");

    await clearTestSubscription(getStripeEnvironment());
    await refetch();
  }

  if (liveHost) {
    return (
      <PageShell title="Test Console" subtitle="Disabled on the live site.">
        <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-xl mx-auto">
          <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold mb-1">Not available here</h3>
          <p className="text-sm text-muted-foreground">
            The /test route only runs on preview/staging environments.
          </p>
        </div>
      </PageShell>
    );
  }

  async function activate() {
    setBusy("seed");
    try {
      await activateTestPlan();
      toast.success("Team plan activated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not activate");
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    setBusy("clear");
    try {
      await clearTestPlan();
      toast.success("Test subscription cleared.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear");
    } finally {
      setBusy(null);
    }
  }

  async function runAuto() {
    if (autoRunning) return;
    setAutoRunning(true);
    setSteps(WALKTHROUGH.map((s) => ({ ...s, status: "pending" })));

    // 1. Activate Team plan
    try {
      await activateTestPlan();
      toast.success("Team plan activated — starting walkthrough");
    } catch (e) {
      toast.error("Activation failed");
      setAutoRunning(false);
      return;
    }

    // 2. Walk pages — fetch HTML to confirm route renders, then visibly
    //    navigate so the user sees each page render with the active plan.
    for (const step of WALKTHROUGH) {
      setSteps((prev) => prev.map((s) => (s.key === step.key ? { ...s, status: "running" } : s)));
      try {
        const res = await fetch(step.path, { method: "GET", credentials: "include" });
        const ok = res.ok;
        setSteps((prev) =>
          prev.map((s) =>
            s.key === step.key
              ? { ...s, status: ok ? "ok" : "fail", note: `HTTP ${res.status}` }
              : s,
          ),
        );
        if (ok) {
          // Visibly navigate so the user can see each page load.
          await nav({ to: step.path });
          await new Promise((r) => setTimeout(r, 900));
        }
      } catch (err) {
        setSteps((prev) =>
          prev.map((s) =>
            s.key === step.key
              ? { ...s, status: "fail", note: err instanceof Error ? err.message : "error" }
              : s,
          ),
        );
      }
    }

    // 3. Return to test console and report.
    await nav({ to: "/test" });
    setAutoRunning(false);
    toast.success("Automatic walkthrough complete.");
  }

  const allPassed = steps.every((s) => s.status === "ok");
  const anyFailed = steps.some((s) => s.status === "fail");

  return (
    <PageShell
      title="Test Console"
      subtitle="One-click Supabase-backed setup with the highest plan activated. Preview and staging only."
    >
      {/* Status bar */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Current account
            </div>
            <div className="font-medium text-sm">{user?.email ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Subscription
            </div>
            {subLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : subscription ? (
              <div className="flex items-center gap-2">
                <StatusPill tone={isActive ? "success" : "muted"}>{subscription.status}</StatusPill>
                <span className="text-sm font-medium">{subscription.price_id}</span>
              </div>
            ) : (
              <StatusPill tone="muted">none</StatusPill>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Env</div>
            <StatusPill tone="primary">{getStripeEnvironment()}</StatusPill>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Automatic */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-bold">Automatic test</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Activates the Team plan, then visits Dashboard, Commissions, Deals, Clients, Books,
            Settings and Billing — reporting which pages load successfully.
          </p>

          <button
            onClick={runAuto}
            disabled={autoRunning || !!busy}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 mb-5"
          >
            {autoRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {autoRunning ? "Running…" : "Run automatic walkthrough"}
          </button>

          <ul className="space-y-2">
            {steps.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StepIcon status={s.status} />
                  <span className="text-sm font-medium truncate">{s.label}</span>
                  {s.note && (
                    <span className="text-xs text-muted-foreground">· {s.note}</span>
                  )}
                </div>
                <Link
                  to={s.path}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {s.path} <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>

          {!autoRunning && (allPassed || anyFailed) && (
            <div
              className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                allPassed
                  ? "bg-success/10 text-success border border-success/30"
                  : "bg-destructive/10 text-destructive border border-destructive/30"
              }`}
            >
              {allPassed ? "All pages loaded successfully." : "Some pages failed — see notes above."}
            </div>
          )}
        </div>

        {/* Manual */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <h3 className="font-display text-lg font-bold mb-1">Manual controls</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Activate or clear the test subscription independently, and jump into any page.
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={activate}
              disabled={!!busy || autoRunning}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {busy === "seed" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Activate Team plan
            </button>
            <button
              onClick={clear}
              disabled={!!busy || autoRunning}
              className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              {busy === "clear" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Clear test subscription
            </button>
          </div>

          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Jump to page
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WALKTHROUGH.map((s) => (
              <Link
                key={s.key}
                to={s.path}
                className="text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted flex items-center justify-between"
              >
                <span>{s.label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-4 py-3">
        <strong className="text-foreground">Note:</strong> This page seeds a real{" "}
        <code className="font-mono">subscriptions</code> row with{" "}
        <code className="font-mono">environment = {getStripeEnvironment()}</code> and{" "}
        <code className="font-mono">price_id = team_yearly</code>. It uses a real Supabase write
        path, so the active state should appear immediately after activation. It is automatically
        disabled on the published live domain.
      </div>
    </PageShell>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-success shrink-0" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />;
  return <div className="h-2 w-2 rounded-full bg-muted-foreground/40 mx-1 shrink-0" />;
}
