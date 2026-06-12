import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/thankyou")({
  component: ThankYouPage,
  head: () => ({
    meta: [
      { title: "Thank you - Agent Business Tracker" },
      { name: "description", content: "Start your 14-day free trial to unlock the full app." },
    ],
  }),
});

function ThankYouPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();

  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!user) {
      nav({ to: "/landing", replace: true });
      return;
    }
    if (isActive) {
      nav({ to: "/dashboard", replace: true });
    }
  }, [authLoading, subLoading, user, isActive, nav]);

  if (authLoading || subLoading || !user || isActive) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-card text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h1 className="font-display text-xl font-bold">Thanks for signing up!</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Start your 14-day free trial to access deals, books, mileage and the rest of the app.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            to="/pricing"
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            View plans & start trial
          </Link>
          <Link
            to="/billing"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Manage existing subscription
          </Link>
        </div>
      </div>
    </div>
  );
}
