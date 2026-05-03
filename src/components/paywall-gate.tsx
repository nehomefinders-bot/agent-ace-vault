import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

// Routes that are always accessible (no auth/sub gating done here — auth gate is separate)
const PUBLIC_PATHS = ["/", "/landing", "/auth", "/forgot-password", "/reset-password", "/terms", "/privacy"];
// Account-management routes that signed-in users may reach without an active subscription
const ACCOUNT_PATHS = ["/pricing", "/billing", "/help"];

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();

  // Public pages: pass through.
  if (PUBLIC_PATHS.includes(path)) return <>{children}</>;

  // Not signed in → let the page decide (most app pages will redirect to /auth themselves).
  if (!user) return <>{children}</>;

  // Account-management routes always reachable for signed-in users.
  if (ACCOUNT_PATHS.some(p => path === p || path.startsWith(p + "/"))) return <>{children}</>;

  if (authLoading || subLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
