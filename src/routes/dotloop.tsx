import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ExternalLink, Loader2, Workflow, ShieldCheck, ArrowLeft, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ALLOWED_EMAIL = "nehomefinders@gmail.com";
const DOTLOOP_URL = "https://www.dotloop.com/login/";
const RETURN_KEY = "dotloop:return_to";

export const Route = createFileRoute("/dotloop")({
  head: () => ({
    meta: [
      { title: "Dotloop Workspace" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DotloopPage,
});

function DotloopPage() {
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
    try {
      window.sessionStorage.setItem(RETURN_KEY, "/dashboard");
    } catch {
      // ignore storage errors
    }
    window.location.href = DOTLOOP_URL;
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Workflow className="h-3.5 w-3.5" />
          Dotloop Integration
        </div>
        <h1 className="text-2xl font-semibold text-foreground lg:text-3xl">
          Dotloop Workspace
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Launch Dotloop in this tab to manage your transaction loops. When you're
          finished, return to your dashboard using the button below or your browser's back button.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Workflow className="h-6 w-6" />
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">
                Launch Dotloop
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Redirects to{" "}
                <span className="font-mono text-xs text-foreground/80">
                  dotloop.com/login
                </span>{" "}
                in this tab. Your Agent Business Tracker session stays signed in.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={launch}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ExternalLink className="h-4 w-4" />
            Launch Dotloop
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="flex items-start gap-3">
          <ArrowLeft className="mt-0.5 h-4 w-4 text-primary" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">
              Return path
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              After you finish in Dotloop, come back to your Agent Business
              Tracker dashboard at any time.
            </p>
            <div className="mt-3">
              <Link
                to="/dashboard"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <LayoutDashboard className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Dotloop blocks embedded iframe access. Same-tab redirect is the
          supported flow — your dashboard session persists on return.
        </span>
      </div>
    </div>
  );
}
