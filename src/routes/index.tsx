import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
  head: () => ({
    meta: [
      { title: "Agent Business Tracker" },
      { name: "description", content: "Manage your real estate business with Agent Business Tracker. 14-Day Free Trial, then $19.99/month." },
      { property: "og:title", content: "Agent Business Tracker" },
      { property: "og:description", content: "Your real estate business in one place. 14-Day Free Trial, then $19.99/month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function IndexRedirect() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    nav({ to: user ? "/dashboard" : "/landing", replace: true });
  }, [authLoading, user, nav]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
