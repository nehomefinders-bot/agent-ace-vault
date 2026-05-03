import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { useSubscription } from "@/hooks/use-subscription";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment, PLANS } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/billing")({
  component: BillingPage,
  head: () => ({ meta: [{ title: "Billing — Agent Business Tracker" }] }),
});

function BillingPage() {
  const { subscription, isActive, loading, refetch } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("welcome")) {
      setWelcome(true);
      // Poll a few times — webhook may take a moment
      const id = setInterval(() => refetch(), 2000);
      setTimeout(() => clearInterval(id), 15000);
    }
  }, [refetch]);

  async function openPortal() {
    setBusy(true);
    try {
      const { url } = await createPortalSession({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/billing` },
      });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setBusy(false);
    }
  }

  const plan = subscription ? PLANS.find(p => p.monthly.priceId === subscription.price_id || p.yearly.priceId === subscription.price_id) : null;
  const tone = subscription?.status === "active" || subscription?.status === "trialing" ? "success"
    : subscription?.status === "past_due" ? "warning"
    : subscription?.status === "canceled" ? "danger" : "muted";

  return (
    <PageShell title="Billing" subtitle="Manage your subscription, payment method and invoices.">
      {welcome && (
        <div className="mb-5 bg-success/10 border border-success/30 text-success rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Welcome aboard! Your subscription is being activated.
        </div>
      )}

      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-8 shadow-card flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !subscription ? (
        <div className="bg-card border border-border rounded-2xl p-8 shadow-card text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-bold">No active subscription</h3>
          <p className="text-sm text-muted-foreground mb-5 mt-1">Choose a plan to unlock all features.</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
            View plans
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current plan</div>
                <div className="font-display text-2xl font-bold">{plan?.name ?? subscription.price_id}</div>
              </div>
              <StatusPill tone={tone}>{subscription.status}</StatusPill>
            </div>

            {subscription.cancel_at_period_end && (
              <div className="mb-5 bg-warning/10 border border-warning/30 text-warning-foreground rounded-lg px-3 py-2.5 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>Your subscription is set to cancel at the end of the current period. You'll retain access until {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "period end"}.</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Renews</div>
                <div className="font-medium">
                  {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Started</div>
                <div className="font-medium">
                  {subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={openPortal} disabled={busy}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Manage billing
              </button>
              <Link to="/pricing"
                className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
                Change plan
              </Link>
              <button onClick={openPortal} disabled={busy}
                className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted">
                Cancel subscription
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">In the billing portal</div>
            <ul className="text-sm space-y-2.5">
              <li className="flex gap-2"><Check /> Update payment method</li>
              <li className="flex gap-2"><Check /> Download invoices & receipts</li>
              <li className="flex gap-2"><Check /> Switch monthly ↔ yearly</li>
              <li className="flex gap-2"><Check /> Cancel anytime</li>
            </ul>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function Check() {
  return <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />;
}
