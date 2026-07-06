import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Building2, ShieldCheck, Search, Home } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ExternalWorkspaceOverlay } from "@/components/external-workspace-overlay";

const ALLOWED_EMAIL = "nehomefinders@gmail.com";
const MLS_URL = "https://www.mlspin.com";

export const Route = createFileRoute("/mls-listings")({
  head: () => ({
    meta: [
      { title: "MLS Listings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MlsListingsPage,
});

function MlsListingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const allowed =
    !!user?.email && user.email.trim().toLowerCase() === ALLOWED_EMAIL;

  useEffect(() => {
    if (!loading && !allowed) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, allowed, navigate]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const launch = () => {
    window.open(MLS_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          MLS Integration
        </div>
        <h1 className="text-2xl font-semibold text-foreground lg:text-3xl">
          MLS PIN Workspace
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Launch the MLS PIN broker portal in a secure new tab. Your Agent
          Business Tracker stays active and untouched in this window.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">
                Launch MLS PIN Workspace
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Opens{" "}
                <span className="font-mono text-xs text-foreground/80">
                  mlspin.com
                </span>{" "}
                in a new tab with a secure, isolated session.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={launch}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ExternalLink className="h-4 w-4" />
            Launch MLS PIN
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Search,
            title: "Full search matrix",
            body: "Access the complete MLS PIN active listing search and hotsheet.",
          },
          {
            icon: Home,
            title: "Listing management",
            body: "Manage your active listings, price changes, and status updates.",
          },
          {
            icon: ShieldCheck,
            title: "Secure session",
            body: "Opened with noopener + noreferrer — no cross-tab tracking.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-card/50 p-4"
          >
            <Icon className="h-4 w-4 text-primary" />
            <div className="mt-3 text-sm font-semibold text-foreground">
              {title}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {body}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Note: MLS PIN blocks embedded iframe access for security. The new-tab
        launch is the supported way to work in the portal alongside your
        dashboard.
      </p>
    </div>
  );
}
