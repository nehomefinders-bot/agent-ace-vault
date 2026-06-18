import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";

// === Google Ads conversion tracking ===
const GOOGLE_ADS_ID = "AW-444-670-3525";
const GOOGLE_ADS_CONVERSION_LABEL = "17129648704";

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
  const [activating, setActivating] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const ranRef = useRef(false);

  // Fire Google Ads conversion exactly once when this page mounts.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    const loaderId = "google-ads-gtag-loader";
    if (!document.getElementById(loaderId)) {
      const s = document.createElement("script");
      s.id = loaderId;
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
      document.head.appendChild(s);
    }
    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag(...args: unknown[]) {
        (w.dataLayer as unknown[]).push(args);
      };
      w.gtag("js", new Date());
    }
    w.gtag("config", GOOGLE_ADS_ID);
    w.gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
    });
  }, []);

  // Activate the user's profile and decide whether to show the welcome modal.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav({ to: "/auth", replace: true });
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const seenKey = `ep_activation_seen_${user.id}`;
      const alreadySeen =
        typeof window !== "undefined" && window.localStorage.getItem(seenKey) === "1";

      // Check current plan first — if already active and already seen, skip straight to dashboard.
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.plan !== "active") {
        await supabase
          .from("profiles")
          .upsert(
            { id: user.id, plan: "active", updated_at: new Date().toISOString() },
            { onConflict: "id" },
          );
      }

      if (alreadySeen) {
        nav({ to: "/dashboard", replace: true });
        return;
      }

      window.localStorage.setItem(seenKey, "1");
      setActivating(false);
      setShowModal(true);
    })();
  }, [authLoading, user, nav]);

  const dismiss = () => {
    setShowModal(false);
    nav({ to: "/dashboard", replace: true });
  };

  if (authLoading || activating || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950">
        <Loader2 className="h-5 w-5 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-950 flex items-center justify-center px-4 py-12">
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1020] p-8 text-center shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-white/50 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Success! Account Activated</h1>
            <p className="mt-3 text-sm text-white/70">
              Your Founders' Program access is live. Welcome to Endless Prospects — every feature is
              unlocked and ready to go.
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-[#d4af37] px-4 py-3 text-sm font-bold text-slate-950 hover:bg-[#c89e2f]"
            >
              Enter the Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
