import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";

// Routes that are always accessible without auth or active subscription.
// NOTE: "/" is the index redirector and is intentionally NOT here.
const PUBLIC_PATHS = ["/landing", "/auth", "/signup", "/forgot-password", "/reset-password", "/terms", "/privacy", "/privacy-policy", "/terms-and-conditions"];
// Account-management and sandbox routes that signed-in users may reach without an active subscription.
const ACCOUNT_PATHS = ["/pricing", "/billing", "/help", "/settings", "/test", "/thankyou"];

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const nav = useNavigate();

  // Send unauthenticated users away from any non-public app route to /landing.
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
        if (!cancelled) {
          nav({ to: "/landing", replace: true });
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [authLoading, user, path, nav]);

  // Signed-in users without an active subscription on a gated route → /thankyou.
  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!user) return;
    if (PUBLIC_PATHS.includes(path)) return;
    if (ACCOUNT_PATHS.some((p) => path === p || path.startsWith(p + "/"))) return;
    if (isActive) return;
    nav({ to: "/thankyou", replace: true });
  }, [authLoading, subLoading, user, isActive, path, nav]);

  // Public pages: pass through.
  if (PUBLIC_PATHS.includes(path)) return <>{children}</>;

  if (authLoading || (user && subLoading)) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not signed in — about to redirect; show a spinner instead of leaking gated content.
  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Account-management routes always reachable for signed-in users.
  if (ACCOUNT_PATHS.some(p => path === p || path.startsWith(p + "/"))) return <>{children}</>;

  if (isActive) return <>{children}</>;

  // About to redirect to /thankyou — render a spinner in the meantime.
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
