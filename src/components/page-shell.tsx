import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home } from "lucide-react";

export function PageShell({
  title,
  subtitle,
  actions,
  children,
  fullHeight = false,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  fullHeight?: boolean;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const showHomeButton = path !== "/";

  return (
    <div
      className={`mx-auto w-full max-w-[1400px] min-w-0 px-3 py-4 sm:px-6 sm:py-6 lg:p-8 ${
        fullHeight ? "flex h-full min-h-0 flex-1 flex-col" : "overflow-x-hidden"
      }`}
    >
      <header className="mb-5 min-w-0 shrink-0 rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm sm:mb-8 sm:rounded-3xl sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold sm:text-3xl">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>}
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            {showHomeButton && (
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
                aria-label="Go to dashboard"
                title="Dashboard"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}
            {actions}
          </div>
        </div>
      </header>
      <div className={fullHeight ? "flex min-h-0 flex-1 flex-col" : undefined}>
        {children}
      </div>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "primary" | "muted";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    success: "bg-success/10 text-success",
    warning: "bg-secondary/20 text-secondary-foreground",
    danger: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
