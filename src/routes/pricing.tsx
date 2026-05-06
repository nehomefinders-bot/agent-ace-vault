import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PLANS, getStripeEnvironment, isTestMode } from "@/lib/stripe";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { createPortalSession } from "@/utils/payments.functions";
import { EmbeddedCheckoutModal } from "@/components/embedded-checkout-modal";
import { PaymentTestBanner } from "@/components/payment-test-banner";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({ meta: [
    { title: "Pricing — Agent Business Tracker" },
    { name: "description", content: "Simple month-to-month pricing for real estate agents and brokers. Cancel anytime, no contracts." },
  ]}),
});

function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const { user } = useAuth();
  const { subscription, isActive } = useSubscription();
  const navigate = useNavigate();

  async function subscribe(priceId: string) {
    if (!user) { navigate({ to: "/auth" }); return; }
    setBusy(priceId);
    try {
      if (isActive && subscription) {
        // Existing subscriber → portal to change plan
        const { url } = await createPortalSession({
          data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/billing` },
        });
        window.open(url, "_blank");
        return;
      }
      // New subscriber → embedded checkout modal
      setCheckoutPriceId(priceId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell
      title="Pricing"
      subtitle="Start with a 14-day free trial. Cancel anytime — no contracts."
    >
      <PaymentTestBanner />
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center bg-muted rounded-full p-1">
          <button onClick={() => setInterval("monthly")}
            className={`px-4 py-1.5 text-sm rounded-full font-medium ${interval === "monthly" ? "bg-background shadow" : "text-muted-foreground"}`}>
            Monthly
          </button>
          <button onClick={() => setInterval("yearly")}
            className={`px-4 py-1.5 text-sm rounded-full font-medium ${interval === "yearly" ? "bg-background shadow" : "text-muted-foreground"}`}>
            Yearly <span className="text-xs text-success ml-1">save ~17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {PLANS.map((plan) => {
          const price = plan[interval];
          const isCurrent = subscription?.price_id === price.priceId && isActive;
          return (
            <div key={plan.id}
              className={`relative bg-card border rounded-2xl p-6 shadow-card ${plan.popular ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-medium px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Most popular
                </div>
              )}
              <div className="font-display text-xl font-bold">{plan.name}</div>
              <div className="text-sm text-muted-foreground mt-1 mb-5">{plan.tagline}</div>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-bold font-display tabular-nums">${price.amount}</span>
                <span className="text-muted-foreground text-sm">/{interval === "monthly" ? "mo" : "yr"}</span>
              </div>
              <button onClick={() => subscribe(price.priceId)} disabled={!!busy || isCurrent}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 ${
                  plan.popular ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}>
                {busy === price.priceId && <Loader2 className="h-4 w-4 animate-spin" />}
                {isCurrent ? "Current plan" : isActive ? "Switch plan" : "Start 14-day free trial"}
              </button>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-8">
        14-day free trial on all plans. Card required to start — no charge until day 15. Cancel anytime from your billing page.
        {isTestMode() && " Currently in test mode — no real charges."}
      </p>

      <EmbeddedCheckoutModal
        priceId={checkoutPriceId}
        open={!!checkoutPriceId}
        onClose={() => setCheckoutPriceId(null)}
        returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/billing?welcome=1`}
      />
    </PageShell>
  );
}
