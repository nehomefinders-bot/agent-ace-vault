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

const BACKGROUND_IMAGE_URL =
  "https://assets.cdn.filesafe.space/Ym9STc30GZhxo1Z2crhM/media/69a9f300618c8d86d9096bba.webp";

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell
      title="Pricing"
      subtitle="Start with a 14-day free trial. Cancel anytime - no contracts."
    >
      <PaymentTestBanner />

      <div
        className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80"
        style={{
          backgroundImage: `url(${BACKGROUND_IMAGE_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-hidden="true" />

        <div className="relative z-10 px-4 py-6 sm:px-6 sm:py-8 text-white">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setInterval("monthly")}
                className={`px-4 py-1.5 text-sm rounded-full font-medium transition ${
                  interval === "monthly" ? "bg-white/20 text-white shadow" : "text-white/70 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setInterval("yearly")}
                className={`px-4 py-1.5 text-sm rounded-full font-medium transition ${
                  interval === "yearly" ? "bg-white/20 text-white shadow" : "text-white/70 hover:text-white"
                }`}
              >
                Yearly <span className="text-xs text-success ml-1">save ~17%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {PLANS.map((plan) => {
              const price = plan[interval];
              const isCurrent = subscription?.price_id === price.priceId && isActive;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 shadow-[0_24px_80px_rgba(2,6,23,0.35)] backdrop-blur-md border ${
                    plan.popular ? "border-white/25 bg-white/[0.12]" : "border-white/15 bg-white/10"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                      <Sparkles className="h-3 w-3" /> Most popular
                    </div>
                  )}
                  <div className="font-display text-xl font-bold text-white">{plan.name}</div>
                  <div className="mt-1 mb-5 text-sm text-white/70">{plan.tagline}</div>
                  <div className="mb-5 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold tabular-nums text-white">${price.amount}</span>
                    <span className="text-sm text-white/70">/{interval === "monthly" ? "mo" : "yr"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => subscribe(price.priceId)}
                    disabled={!!busy || isCurrent}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${
                      plan.popular
                        ? "bg-primary text-primary-foreground"
                        : "border border-white/20 bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {busy === price.priceId && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isCurrent ? "Current plan" : isActive ? "Switch plan" : "Start 14-day free trial"}
                  </button>
                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-xs text-white/70">
            14-day free trial on all plans. Card required to start - no charge until day 15. Cancel anytime from your billing page.
            {isTestMode() && " Currently in test mode - no real charges."}
          </p>
        </div>
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
