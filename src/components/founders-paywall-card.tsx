import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const FOUNDER_CHECKOUT_URL =
  "https://cbospmbzmetqkuibrskt.supabase.co/functions/v1/stripe-checkout";
const FOUNDER_PRICE_KEY =
  import.meta.env.VITE_FOUNDER_PRICE_ID?.trim() || "beta_monthly";

const FEATURES = [
  "Every feature unlocked — no tiers, no upsells",
  "Just $10/month, locked in for life",
  "Help shape the product roadmap",
  "Direct line to the founders",
  "Priority bug-fix turnaround",
];

export function FoundersPaywallCard() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user?.email) {
      window.location.assign("/auth");
      return;
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
      if (publishableKey) headers.apikey = publishableKey;
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch(FOUNDER_CHECKOUT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userEmail: user.email.trim(),
          userId: user.id,
          priceId: FOUNDER_PRICE_KEY,
          price_override: FOUNDER_PRICE_KEY,
          metadata: {
            founder_price_id: FOUNDER_PRICE_KEY,
            lovable_external_id: FOUNDER_PRICE_KEY,
          },
        }),
      });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not start checkout.");
      if (!data?.url) throw new Error("Stripe did not return a checkout URL.");
      window.location.assign(data.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-slate-950 px-4 py-10 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-xl relative rounded-3xl border border-white/10 bg-[#0b1020] p-8 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)]">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-950 shadow-[0_10px_30px_-8px_rgba(212,175,55,0.6)]">
            <Sparkles className="h-3.5 w-3.5" /> Limited Seats Available
          </div>
        </div>

        <h1 className="mt-2 font-display text-3xl font-bold text-white">Founders' Program</h1>
        <p className="mt-2 text-sm text-white/70">
          All features unlocked. Lock in $10/month for life.
        </p>

        <div className="mt-6 flex items-baseline gap-1">
          <span className="font-display text-6xl font-bold tabular-nums text-white">$10</span>
          <span className="text-base text-white/60">/month</span>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-white/70">
          The Founders Program entry window is open for{" "}
          <span className="font-semibold text-white">6 months only</span>. Members who join today lock in the{" "}
          <span className="font-semibold text-white">$10/month</span> price for life and avoid the future standard base plan rate of{" "}
          <span className="font-semibold text-white">$19.99/month</span>.
        </p>

        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 py-4 text-base font-bold text-slate-950 shadow-[0_18px_40px_-12px_rgba(212,175,55,0.7)] transition hover:bg-[#c89e2f] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Opening Stripe..." : "Subscribe — $10/month"}
        </button>

        <ul className="mt-6 space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-white/85">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
