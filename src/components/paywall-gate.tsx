import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

// Single Founders' Program plan — every signed-in user has full access.
// The "paywall" now only enforces auth, not subscription state.
const PUBLIC_PATHS = [
  "/landing", "/auth", "/signup", "/forgot-password", "/reset-password",
  "/terms", "/privacy", "/privacy-policy", "/terms-and-conditions",
];

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();

  // Send unauthenticated users away from non-public app routes.
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

  // Signed in → full access to every feature.
  return <>{children}</>;
}
