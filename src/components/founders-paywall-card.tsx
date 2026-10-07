import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";

import { buildStripeCheckoutUrl } from "@/lib/stripe";
import { Button } from "@/components/ui/button";

const FEATURES = [
  "Every feature unlocked — no tiers, no upsells",
  "One simple membership: $19.99/month",
  "Help shape the product roadmap",
  "Direct line to the founders",
  "Priority bug-fix turnaround",
];

export function FoundersPaywallCard() {
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const [profileActive, setProfileActive] = useState(false);

  useEffect(() => {
    if (!user) { setProfileActive(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setProfileActive(data?.plan === "active" || data?.plan === "gifted");
    })();
    return () => { cancelled = true; };
  }, [user]);

  const alreadyMember = isActive || profileActive;

  const handleSubscribe = () => {
    if (alreadyMember) {
      toast.message("You're already a member.");
      return;
    }
    window.location.href = buildStripeCheckoutUrl(user);
  };

  return (
    <div className="min-h-dvh w-full bg-slate-950 px-4 py-10 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-xl relative rounded-3xl border border-white/10 bg-[#0b1020] p-8 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)]">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-950 shadow-[0_10px_30px_-8px_rgba(212,175,55,0.6)]">
            <Sparkles className="h-3.5 w-3.5" /> 14-Day Free Trial
          </div>
        </div>

        <h1 className="mt-2 font-display text-3xl font-bold text-white">Full Access</h1>
        <p className="mt-2 text-sm text-white/70">
          Start with a 14-Day Free Trial, then $19.99/month.
        </p>

        <div className="mt-6 flex items-baseline gap-1">
          <span className="font-display text-6xl font-bold tabular-nums text-white">$19.99</span>
          <span className="text-base text-white/60">/month</span>
        </div>


        <p className="mt-5 text-sm leading-relaxed text-white/70">
          Start with full access for a 14-Day Free Trial. After your trial, continue for{" "}
          <span className="font-semibold text-white">$19.99/month</span>. Cancel anytime.
        </p>


        {alreadyMember ? (
          <Button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-6 h-auto w-full rounded-lg bg-muted px-5 py-4 text-base font-bold text-muted-foreground"
          >
            Already Subscribed
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubscribe}
            className="mt-6 h-auto w-full cursor-pointer whitespace-normal rounded-lg bg-spotlight-gold px-5 py-4 text-base font-bold text-spotlight shadow-elevated hover:bg-spotlight-gold-soft"
          >
            Start 14-Day Free Trial
          </Button>
        )}

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
