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
  head: () => ({
    meta: [
      { title: "Pricing - Agent Business Tracker" },
      { name: "description", content: "Simple month-to-month pricing for real estate agents and brokers. Cancel anytime, no contracts." },
    ],
  }),
});

function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const { user } = useAuth();
  const { subscription, isActive } = useSubscription();
  const navigate = useNavigate();

  async function subscribe(priceId: string) {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    setBusy(priceId);
    try {
      if (isActive && subscription) {
        const { url } = await createPortalSession({
          data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/billing` },
        });
        window.open(url, "_blank");
        return;
      }

      setCheckoutPriceId(priceId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell title="Pricing" subtitle="Start with a 14-day free trial. Cancel anytime - no contracts.">
      <PaymentTestBanner />

      <div className="rounded-3xl border border-border bg-background p-4 shadow-sm sm:p-6">
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center rounded-full border border-border bg-background p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                interval === "monthly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("yearly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                interval === "yearly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly <span className="ml-1 text-xs text-success">save ~17%</span>
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = plan[interval];
            const isCurrent = subscription?.price_id === price.priceId && isActive;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-card p-6 shadow-card ${
                  plan.popular ? "border-primary/25" : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-primary-foreground shadow-sm">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </div>
                )}

                <div className="font-display text-xl font-bold text-foreground">{plan.name}</div>
                <div className="mb-5 mt-1 text-sm text-muted-foreground">{plan.tagline}</div>

                <div className="mb-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold tabular-nums text-foreground">${price.amount}</span>
                  <span className="text-sm text-muted-foreground">/{interval === "monthly" ? "mo" : "yr"}</span>
                </div>

                <button
                  type="button"
                  onClick={() => subscribe(price.priceId)}
                  disabled={!!busy || isCurrent}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {busy === price.priceId && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isCurrent ? "Current plan" : isActive ? "Switch plan" : "Start 14-day free trial"}
                </button>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          14-day free trial on all plans. Card required to start - no charge until day 15. Cancel anytime from your billing page.
          {isTestMode() && " Currently in test mode - no real charges."}
        </p>
      </div>

      <EmbeddedCheckoutModal
        priceId={checkoutPriceId}
        open={!!checkoutPriceId}
        onClose={() => setCheckoutPriceId(null)}
        returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/billing?welcome=1`}
      />
    </PageShell>
  );
}
