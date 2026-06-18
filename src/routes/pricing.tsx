import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { Check, Sparkles } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PLANS } from "@/lib/stripe";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/3cI9ASaDK6bu9XT8Gj9AA04";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing - Agent Business Tracker" },
      { name: "description", content: "One simple plan — $10/month, every feature unlocked. Cancel anytime." },
    ],
  }),
});

function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, isActive } = useSubscription();
  const plan = PLANS[0];

  const startCheckout = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isActive) {
      import("sonner").then(({ toast }) => toast.message("You're already a member."));
      return;
    }
    window.location.href = STRIPE_PAYMENT_LINK;
  }, [isActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("checkout")) return;
    if (authLoading) return;

    if (!user?.email) {
      window.location.assign(`/auth?next=${encodeURIComponent(`/pricing?checkout=1`)}`);
      return;
    }

    params.delete("checkout");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));

    if (!isActive) startCheckout();
  }, [authLoading, isActive, startCheckout, user]);

  return (
    <PageShell title="Pricing" subtitle="One plan. Every feature. Cancel anytime.">

      {isActive && (
        <div className="mx-auto mb-6 max-w-md rounded-2xl border border-success/30 bg-success/10 px-5 py-4 text-sm text-success flex items-start gap-3">
          <Check className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-foreground">You're already subscribed to the Founders Program.</div>
            <div className="mt-1 text-muted-foreground">Thank you for being an early partner!</div>
          </div>
        </div>
      )}


      <div className={`mx-auto max-w-md ${isActive ? "hidden" : ""}`}>
        <div className="relative rounded-2xl border border-primary/30 bg-card p-8 shadow-card">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-primary-foreground shadow-sm">
            <Sparkles className="h-3 w-3" /> Limited Seats Available
          </div>

          <div className="font-display text-2xl font-bold text-foreground">{plan.name}</div>
          <div className="mt-1 mb-6 text-sm text-muted-foreground">{plan.tagline}</div>

          <div className="mb-4 flex items-baseline gap-1">
            <span className="font-display text-5xl font-bold tabular-nums text-foreground">$10</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>

          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            The Founders Program entry window is open for{" "}
            <span className="font-semibold text-foreground">6 months only</span>. Members who join today lock in the{" "}
            <span className="font-semibold text-foreground">$10/month</span> price for life and avoid the future standard base plan rate of{" "}
            <span className="font-semibold text-foreground">$19.99/month</span>.
          </p>

          <button
            type="button"
            onClick={startCheckout}
            disabled={isActive}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isActive ? "You're subscribed" : subscription ? "Resubscribe" : "Subscribe — $10/month"}
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

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Cancel anytime from your billing page.
        </p>
      </div>
    </PageShell>
  );
}
