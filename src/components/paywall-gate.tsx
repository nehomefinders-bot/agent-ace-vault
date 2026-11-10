import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { TrialExpiredModal } from "@/components/trial-expired-modal";
import { getTrialState, type TrialProfile } from "@/lib/trial";
const OWNER_EMAIL = "nehomefinders@gmail.com";
// Lifetime free access (paywall bypass only — never grants admin access).
const LIFETIME_FREE_EMAILS = ["kimg37111@gmail.com"];

// Routes accessible without an active subscription.
const PUBLIC_PATHS = [
  "/landing", "/auth", "/signup", "/forgot-password", "/reset-password",
  "/terms", "/privacy", "/privacy-policy", "/terms-and-conditions",
  "/thankyou", "/pricing",
];

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const nav = useNavigate();
  const [profile, setProfile] = useState<TrialProfile | null | undefined>(undefined);

  // Redirect unauthenticated users away from non-public routes.
  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    if (PUBLIC_PATHS.includes(path)) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) return;
        nav({ to: "/landing", replace: true });
      } catch {
        if (!cancelled) nav({ to: "/landing", replace: true });
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [authLoading, user, path, nav]);

  // Load profile.plan to support manual activation via /thankyou.
  useEffect(() => {
    if (!user) { setProfile(undefined); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, trial_end_date")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setProfile(data ?? null);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (PUBLIC_PATHS.includes(path)) return <>{children}</>;

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Wait for subscription + profile to resolve before deciding.
  if (subLoading || profile === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Owner account always has permanent access.
  const email = (user.email ?? "").toLowerCase();
  const isOwner = email === OWNER_EMAIL;
  // Lifetime free users: full premium access, NO admin privileges.
  const isLifetimeFree = LIFETIME_FREE_EMAILS.includes(email);

  const subscribed = isOwner || isLifetimeFree || isActive || profile?.plan === "active" || profile?.plan === "gifted";
  const { active: trialActive } = getTrialState(profile, user.created_at);

  if (subscribed || trialActive) return <>{children}</>;

  return <TrialExpiredModal />;
}
