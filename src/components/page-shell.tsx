import type { ReactNode } from "react";

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
  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
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
