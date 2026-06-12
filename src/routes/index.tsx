import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
  head: () => ({
    meta: [
      { title: "Agent Business Tracker" },
      { name: "description", content: "Business tracker for brokers & agents." },
    ],
  }),
});

function IndexRedirect() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/landing", replace: true });
      return;
    }
    if (subLoading) return;
    nav({ to: isActive ? "/dashboard" : "/thankyou", replace: true });
  }, [authLoading, subLoading, user, isActive, nav]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
