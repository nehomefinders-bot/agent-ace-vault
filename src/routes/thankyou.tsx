import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

// === Google Ads conversion tracking ===
// Replace these with your real IDs from Google Ads → Tools → Conversions.
const GOOGLE_ADS_ID = "AW-XXXXXXXXXX"; // e.g. "AW-1234567890"
const GOOGLE_ADS_CONVERSION_LABEL = "XXXXXXXXXXXXXXXXXX"; // the label after the slash in the snippet

export const Route = createFileRoute("/thankyou")({
  component: ThankYouPage,
  head: () => ({
    meta: [
      { title: "Success! Account Activated — Endless Prospects" },
      { name: "description", content: "Your subscription is active. Welcome aboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ThankYouPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: subLoading } = useSubscription();

  // Fire Google Ads conversion exactly once when this page mounts.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!GOOGLE_ADS_ID || GOOGLE_ADS_ID.includes("XXXX")) return; // not configured yet

    const w = window as unknown as {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };

    // 1. Inject the Global Site Tag (gtag.js) loader if not already present.
    const loaderId = "google-ads-gtag-loader";
    if (!document.getElementById(loaderId)) {
      const s = document.createElement("script");
      s.id = loaderId;
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
      document.head.appendChild(s);
    }

    // 2. Initialize the dataLayer + gtag stub and configure the Ads tag.
    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag(...args: unknown[]) {
        (w.dataLayer as unknown[]).push(args);
      };
      w.gtag("js", new Date());
    }
    w.gtag("config", GOOGLE_ADS_ID);

    // 3. Fire the conversion event for this page mount.
    w.gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
    });
  }, []);

  // Redirect users who shouldn't be on this success page.
  useEffect(() => {
    if (authLoading) return;
    if (!user) nav({ to: "/landing", replace: true });
  }, [authLoading, user, nav]);

  if (authLoading || subLoading || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-card text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center mb-5">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Success! Account Activated
        </h1>
        <p className="text-sm text-muted-foreground mt-3 mb-7">
          Your subscription is live and your workspace is ready. Welcome to Endless Prospects —
          let's go win some deals.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            to="/dashboard"
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/billing"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View billing details
          </Link>
        </div>
      </div>
    </div>
  );
}
