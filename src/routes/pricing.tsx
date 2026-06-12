import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PLANS, isTestMode } from "@/lib/stripe";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentTestBanner } from "@/components/payment-test-banner";
import { toast } from "sonner";

const STRIPE_CHECKOUT_URL =
  "https://cbospmbzmetqkuibrskt.supabase.co/functions/v1/stripe-checkout";

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
  const { user, session, loading: authLoading } = useAuth();
  const { subscription, isActive } = useSubscription();

  const startStandaloneCheckout = useCallback(
    async (priceId: string) => {
      if (typeof window === "undefined") return;

      if (!user?.email) {
        window.location.assign(`/auth?next=${encodeURIComponent(`/pricing?checkout=${priceId}`)}`);
        return;
      }

      const userEmail = user.email.trim();
      if (!userEmail) {
        toast.error("Your account email is missing.");
        return;
      }

      setBusy(priceId);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
        if (publishableKey) {
          headers.apikey = publishableKey;
        }
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const response = await fetch(STRIPE_CHECKOUT_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            userEmail,
            userId: user.id,
            priceId,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.error ?? "Could not start checkout");
        }

        if (!data?.url) {
          throw new Error("Stripe did not return a checkout URL.");
        }

        window.location.assign(data.url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not start checkout");
      } finally {
        setBusy(null);
      }
    },
    [session?.access_token, user?.email, user?.id],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const desired = params.get("checkout");
    if (!desired) return;
    if (authLoading) return;

    if (!user?.email) {
      window.location.assign(`/auth?next=${encodeURIComponent(`/pricing?checkout=${desired}`)}`);
      return;
    }

    if (subscription?.price_id === desired && isActive) {
      params.delete("checkout");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
      return;
    }

    params.delete("checkout");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    void startStandaloneCheckout(desired);
  }, [authLoading, isActive, startStandaloneCheckout, subscription?.price_id, user]);

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

        <div className={`mx-auto grid gap-5 grid-cols-1 sm:grid-cols-2 ${interval === "yearly" ? "max-w-5xl lg:grid-cols-3" : "max-w-6xl lg:grid-cols-4"}`}>
          {PLANS.filter((plan) => !(interval === "yearly" && plan.id === "beta_tester")).map((plan) => {
            const price = plan[interval];
            const stripePriceId = price.priceId;
            const isCurrent = subscription?.price_id === stripePriceId && isActive;
            const isFounders = plan.id === "beta_tester";
            const isComingSoon = !isFounders;
            // Block Founders subscribers from switching tiers until 6-month milestone
            const founderLocked = !isFounders && isActive && subscription
              ? PLANS.find((p) => p.monthly.priceId === subscription.price_id || p.yearly.priceId === subscription.price_id)?.id === "beta_tester"
              : false;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-card p-6 shadow-card ${
                  plan.popular ? "border-primary/25" : "border-border"
                }`}
              >
                {isComingSoon && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 rounded-full border-2 border-amber-400 bg-slate-900 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider !text-amber-400 !opacity-100 shadow-lg">
                    <Sparkles className="h-3 w-3 !text-amber-400" /> Coming Soon
                  </div>
                )}
                {plan.popular && !isComingSoon && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-primary-foreground shadow-sm">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </div>
                )}

                <div className={isComingSoon ? "grayscale opacity-50" : ""}>
                  <div className="font-display text-xl font-bold text-foreground">{plan.name}</div>
                  <div className="mb-5 mt-1 text-sm text-muted-foreground">{plan.tagline}</div>

                  <div className="mb-5 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold tabular-nums text-foreground">${price.amount}</span>
                    <span className="text-sm text-muted-foreground">/{interval === "monthly" ? "mo" : "yr"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void startStandaloneCheckout(stripePriceId)}
                  disabled={!!busy || isCurrent || isComingSoon || founderLocked}
                  title={founderLocked ? "Plan changes are locked until your 6-month Founders retention milestone ends." : undefined}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${
                    isComingSoon
                      ? "border-2 border-amber-400 bg-slate-900 !text-amber-400 font-extrabold !opacity-100 shadow-md"
                      : isFounders
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      : "border border-border bg-background text-foreground hover:bg-muted disabled:opacity-60"
                  }`}
                >
                  {busy === stripePriceId && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isComingSoon ? "Coming Soon" : isCurrent ? "Current plan" : founderLocked ? "Locked - Founders 6-month term" : isActive ? "Upgrade" : "Subscribe"}
                </button>

                <ul className={`mt-6 space-y-2.5 ${isComingSoon ? "grayscale opacity-50" : ""}`}>
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

        {isActive && subscription && PLANS.find((p) => p.monthly.priceId === subscription.price_id || p.yearly.priceId === subscription.price_id)?.id === "beta_tester" && (
          <p className="mt-6 text-center text-sm text-amber-500">
            You're on the Founders' Program. Your exclusive $19.99/mo base rate unlocks after your 6-month founder retention milestone - plan changes are locked until then.
          </p>
        )}


        <p className="mt-8 text-center text-xs text-muted-foreground">
          14-day free trial on all plans. Card required to start - no charge until day 15. Cancel anytime from your billing page.
          {isTestMode() && " Currently in test mode - no real charges."}
        </p>
      </div>
    </PageShell>
  );
}
