import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, TrendingUp, Home, Users, Receipt,
  Wallet, Car, ScanLine, FolderOpen, Building2,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pipeline", label: "Pipeline", icon: TrendingUp },
  { to: "/listings", label: "Listings", icon: Home },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/mileage", label: "Mileage", icon: Car },
  { to: "/receipts", label: "Receipts", icon: ScanLine },
  { to: "/documents", label: "Documents", icon: FolderOpen },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col min-h-dvh sticky top-0">
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none">Apex</div>
            <div className="text-[11px] uppercase tracking-wider opacity-60 mt-1">Realty OS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = path === to;
          return (
            <Link
              key={to}
              to={to}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 p-4 rounded-xl bg-sidebar-accent/60 border border-sidebar-border">
        <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Plan</div>
        <div className="text-sm font-medium">Solo Agent</div>
        <div className="text-xs opacity-60 mt-2">Connect Stripe to start invoicing clients.</div>
      </div>
    </aside>
  );
}
