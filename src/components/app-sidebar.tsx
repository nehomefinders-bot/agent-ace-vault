import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, TrendingUp, Home, Users, Receipt,
  Wallet, Car, ScanLine, FolderOpen, Building2, BookOpen, LifeBuoy, LogOut, LogIn, Calculator,
  CreditCard, Sparkles, Settings, ListTodo,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { PLANS } from "@/lib/stripe";

const sections = [
  {
    label: "Business",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/pipeline", label: "Pipeline", icon: TrendingUp },
      { to: "/deals", label: "Deals & Commissions", icon: Calculator },
      { to: "/listings", label: "Listings", icon: Home },
      { to: "/clients", label: "Clients", icon: Users },
      { to: "/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "Books",
    items: [
      { to: "/books", label: "Bookkeeping", icon: BookOpen },
      { to: "/commissions", label: "Commissions", icon: Receipt },
      { to: "/expenses", label: "Expenses", icon: Wallet },
      { to: "/mileage", label: "Mileage", icon: Car },
      { to: "/receipts", label: "Receipts", icon: ScanLine },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/billing", label: "Billing", icon: CreditCard },
      { to: "/pricing", label: "Plans", icon: Sparkles },
      { to: "/help", label: "How-to", icon: LifeBuoy },
    ],
  },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, isActive } = useSubscription();
  const currentPlan = subscription
    ? PLANS.find(p => p.monthly.priceId === subscription.price_id || p.yearly.priceId === subscription.price_id)
    : null;
  const planLabel = !user ? "—"
    : !isActive ? "No plan"
    : subscription?.status === "trialing" ? `${currentPlan?.name ?? "Trial"} (trial)`
    : currentPlan?.name ?? "Active";

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col min-h-dvh sticky top-0">
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-bold text-base leading-none">Agent</div>
            <div className="text-[10px] uppercase tracking-wider opacity-60 mt-1">Business Tracker</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.14em] opacity-50 font-medium">{section.label}</div>
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon }) => {
                const active = to === "/" ? path === "/" : path === to || path.startsWith(to + "/");
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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
            </div>
          </div>
        ))}
      </nav>

      <div className="m-3 p-4 rounded-xl bg-sidebar-accent/60 border border-sidebar-border space-y-3">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Plan</div>
          <div className="text-sm font-medium">{planLabel}</div>
        </div>
        {user ? (
          <div className="pt-2 border-t border-sidebar-border">
            <div className="text-xs opacity-60 truncate mb-2">{user.email}</div>
            <button
              onClick={async () => { await signOut(); nav({ to: "/landing" }); }}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-sidebar-border hover:bg-sidebar-accent"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        ) : (
          <Link to="/auth" className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-sidebar-primary text-sidebar-primary-foreground">
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
