import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home } from "lucide-react";

export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const showHomeButton = path !== "/";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8 gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {showHomeButton && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
              aria-label="Go to dashboard"
              title="Dashboard"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}
          {actions}
        </div>
      </header>
      {children}
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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
