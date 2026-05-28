import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, TrendingUp, Home, Users, Receipt,
  Wallet, Car, Image, FolderOpen, BookOpen, LifeBuoy, LogOut, LogIn, Calculator,
  CreditCard, Sparkles, Settings, ListTodo, Menu, X, CalendarDays,
  User,
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
      { to: "/clients", label: "Directory", icon: Users },
      { to: "/tasks", label: "Tasks", icon: ListTodo },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
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
      { to: "/media-storage", label: "Media Storage", icon: Image },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/profile", label: "Profile", icon: User },
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/billing", label: "Billing", icon: CreditCard },
      { to: "/pricing", label: "Plans", icon: Sparkles },
      { to: "/support", label: "Support", icon: LifeBuoy },
      { to: "/help", label: "How-to", icon: BookOpen },
    ],
  },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, isActive } = useSubscription();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const currentPlan = subscription
    ? PLANS.find((p) => p.monthly.priceId === subscription.price_id || p.yearly.priceId === subscription.price_id)
    : null;
  const planLabel = !user
    ? "-"
    : !isActive
      ? "No plan"
      : subscription?.status === "trialing"
        ? `${currentPlan?.name ?? "Trial"} (trial)`
        : currentPlan?.name ?? "Active";

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 pt-6 pb-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl overflow-hidden border border-sidebar-border bg-black flex items-center justify-center shrink-0">
            <img
              src="/endless-prospects-logo.png"
              alt="Endless Prospects"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="font-display font-bold text-base leading-none">Agent</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-sidebar-foreground/75">Business Tracker</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="lg:hidden h-11 w-11 -mr-2 inline-flex items-center justify-center rounded-lg hover:bg-sidebar-accent text-sidebar-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 min-h-0 px-2.5 space-y-4 overflow-y-auto overscroll-contain">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="mb-1.5 px-2.5 text-xs font-medium uppercase tracking-[0.14em] text-sidebar-foreground/70">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon }) => {
                const active = to === "/" ? path === "/" : path === to || path.startsWith(to + "/");
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`group flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-3 text-base transition-colors lg:py-2 ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="m-3 p-4 rounded-xl bg-sidebar-accent/60 border border-sidebar-border space-y-3 shrink-0">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-sidebar-foreground/75">Plan</div>
          <div className="text-base font-medium text-sidebar-foreground">{planLabel}</div>
        </div>
        {user ? (
          <div className="pt-2 border-t border-sidebar-border">
            <div className="mb-2 break-all text-sm leading-5 text-sidebar-foreground/75">{user.email}</div>
            <button
              onClick={async () => {
                await signOut();
                nav({ to: "/landing" });
              }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2.5 text-sm font-medium hover:bg-sidebar-accent"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-sidebar-primary px-3 py-2.5 text-sm font-medium text-sidebar-primary-foreground"
          >
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="lg:hidden sticky top-0 z-30 flex w-full items-center gap-3 px-4 h-14 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className="h-11 w-11 -ml-2 inline-flex items-center justify-center rounded-lg hover:bg-sidebar-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg overflow-hidden border border-sidebar-border bg-black flex items-center justify-center shrink-0">
            <img
              src="/endless-prospects-logo.png"
              alt="Endless Prospects"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="font-display font-bold text-base">Agent</span>
        </div>
        <Link
          to="/"
          title="Dashboard"
          aria-label="Go to dashboard"
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-sidebar-accent"
        >
          <LayoutDashboard className="h-4 w-4" />
        </Link>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 bg-sidebar text-sidebar-foreground flex-col h-dvh sticky top-0 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="relative w-[min(18rem,85%)] bg-sidebar text-sidebar-foreground flex flex-col h-full shadow-xl animate-in slide-in-from-left overflow-hidden">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
