import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Check, Loader2, Sparkles } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PLANS, isTestMode } from "@/lib/stripe";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentTestBanner } from "@/components/payment-test-banner";
import { toast } from "sonner";

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
  const [busy, setBusy] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { subscription, isActive } = useSubscription();
  const plan = PLANS[0];

  const startCheckout = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!user?.email) {
      window.location.assign(`/auth?next=${encodeURIComponent(`/pricing?checkout=1`)}`);
      return;
    }

    setBusy(true);
    try {
      const bypassSupabase = createClient(
        "https://cbospmbzmetqkuibrskt.supabase.co",
        "sb_publishable_EyjaxaW-c__76p_M6H5seg_yU54tnJk",
      );

      const { data, error } = await bypassSupabase.functions.invoke("stripe-checkout", {
        body: { email: user.email.trim() },
      });

      if (error) {
        toast.error(error.message ?? "Could not start checkout");
        return;
      }
      if (!data?.url) throw new Error("Stripe did not return a checkout URL.");

      window.location.assign(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }, [user?.email]);

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

    if (!isActive) void startCheckout();
  }, [authLoading, isActive, startCheckout, user]);

  return (
    <PageShell title="Pricing" subtitle="One plan. Every feature. Cancel anytime.">
      <PaymentTestBanner />

      <div className="mx-auto max-w-md">
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
            onClick={() => void startCheckout()}
            disabled={busy || isActive}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
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
          {isTestMode() && " Currently in test mode - no real charges."}
        </p>
      </div>
    </PageShell>
  );
}
