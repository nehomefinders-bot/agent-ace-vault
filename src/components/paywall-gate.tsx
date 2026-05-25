import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";

// Routes that are always accessible without auth or active subscription.
// NOTE: "/" is the dashboard (auth-required) and is intentionally NOT here.
const PUBLIC_PATHS = ["/landing", "/auth", "/signup", "/forgot-password", "/reset-password", "/terms", "/privacy"];
// Account-management and sandbox routes that signed-in users may reach without an active subscription.
const ACCOUNT_PATHS = ["/pricing", "/billing", "/help", "/settings", "/test"];

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

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-card text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold">Subscription required</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Start your 14-day free trial to access deals, books, mileage and the rest of the app.
        </p>
        <div className="flex flex-col gap-2">
          <Link to="/pricing"
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
            View plans & start trial
          </Link>
          <Link to="/billing"
            className="text-xs text-muted-foreground hover:text-foreground">
            Manage existing subscription
          </Link>
        </div>
      </div>
    </div>
  );
}
