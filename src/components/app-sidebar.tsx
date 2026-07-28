import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Home,
  Users,
  Receipt,
  Wallet,
  Car,
  Image,
  FolderOpen,
  BookOpen,
  LifeBuoy,
  LogOut,
  LogIn,
  CreditCard,
  Sparkles,
  Settings,
  ListTodo,
  Menu,
  X,
  CalendarDays,
  User,
  Shield,
  FileText,
  Building2,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { PLANS } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { BrandLockup } from "@/components/brand-lockup";

const sections = [
  {
    label: "Business",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/mileage", label: "Mileage Tracker", icon: Car },
      { to: "/clients", label: "Contacts", icon: Users },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/commissions", label: "Commissions", icon: Receipt },
      { to: "/tasks", label: "Tasks", icon: ListTodo },
    ],
  },
  {
    label: "More",
    items: [
      { to: "/deals", label: "Deals", icon: Receipt },
      { to: "/listings", label: "Listings", icon: Home },
      { to: "/pipeline", label: "Pipeline", icon: TrendingUp },
      { to: "/books", label: "Bookkeeping", icon: BookOpen },
      { to: "/expenses", label: "Expenses", icon: Wallet },
      { to: "/documents", label: "Documents", icon: FolderOpen },
      { to: "/media-storage", label: "Media Storage", icon: Image },
    ],
  },
  {
    label: "Your Account Information",
    items: [
      { to: "/profile", label: "Profile", icon: User },
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/billing", label: "Billing", icon: CreditCard },
      { to: "/pricing", label: "Plans", icon: Sparkles },
      { to: "/support", label: "Support", icon: LifeBuoy },
      { to: "/help", label: "How-to", icon: BookOpen },
      { to: "/privacy-policy", label: "Privacy Policy", icon: Shield },
      { to: "/terms-and-conditions", label: "Terms of Service", icon: FileText },
    ],
  },
] as { label: string; items: { to: string; label: string; icon: typeof LayoutDashboard }[] }[];

const MLS_ALLOWED_EMAIL = "nehomefinders@gmail.com";
const MLS_ITEM = { to: "/mls-listings", label: "MLS Listings", icon: Building2 } as const;
const DOTLOOP_ITEM = { to: "/dotloop", label: "Dotloop Workspace", icon: Workflow } as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, isActive, refetch } = useSubscription();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profilePlan, setProfilePlan] = useState<string | null>(null);

  // Force a clean re-fetch of subscription + profile state whenever the user
  // arrives on the dashboard (e.g. coming from /thankyou → "Enter the Dashboard").
  useEffect(() => {
    if (!user?.id) {
      setProfilePlan(null);
      return;
    }
    let cancelled = false;
    refetch();
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setProfilePlan((data?.plan as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [user?.id, path, refetch]);

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
    ? PLANS.find(
        (p) =>
          p.monthly.priceId === subscription.price_id || p.yearly.priceId === subscription.price_id,
      )
    : null;
  const planName = currentPlan?.name ?? "Founders Program";
  const status = subscription?.status ?? null;
  const cancelAtEnd = subscription?.cancel_at_period_end ?? false;
  const periodEndLabel = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  type StatusTone = "emerald" | "amber" | "rose" | "slate";
  let statusTone: StatusTone = "slate";
  let statusLabel = "No plan";
  let statusDetail: string | null = null;
  const profileActive = profilePlan === "active" || profilePlan === "gifted";

  if (user) {
    if (status === "trialing") {
      statusTone = "emerald";
      statusLabel = "Trial";
      statusDetail = periodEndLabel ? `Ends ${periodEndLabel}` : null;
    } else if (status === "active") {
      if (cancelAtEnd) {
        statusTone = "amber";
        statusLabel = "Canceling";
        statusDetail = periodEndLabel ? `Ends ${periodEndLabel}` : null;
      } else {
        statusTone = "emerald";
        statusLabel = "Active";
      }
    } else if (status === "past_due") {
      statusTone = "amber";
      statusLabel = "Past due";
      statusDetail = "Update payment";
    } else if (status === "unpaid" || status === "incomplete" || status === "incomplete_expired") {
      statusTone = "rose";
      statusLabel = status === "unpaid" ? "Unpaid" : "Incomplete";
      statusDetail = "Action required";
    } else if (status === "paused") {
      statusTone = "amber";
      statusLabel = "Paused";
    } else if (status === "canceled") {
      if (isActive && periodEndLabel) {
        statusTone = "amber";
        statusLabel = "Canceled";
        statusDetail = `Access until ${periodEndLabel}`;
      } else {
        statusTone = "slate";
        statusLabel = "Canceled";
      }
    } else if (isActive || profileActive) {
      statusTone = "emerald";
      statusLabel = "Active";
    }
  }

  const toneClasses: Record<StatusTone, { dot: string; text: string }> = {
    emerald: { dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]", text: "text-emerald-400" },
    amber: { dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]", text: "text-amber-400" },
    rose: { dot: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]", text: "text-rose-400" },
    slate: { dot: "bg-slate-500", text: "text-sidebar-foreground/70" },
  };
  const tone = toneClasses[statusTone];
  const showPlanLine = !!user && (status !== null || isActive || profileActive);

  const isMlsUser = user?.email?.trim().toLowerCase() === MLS_ALLOWED_EMAIL;
  const visibleSections = sections.map((section) => {
    if (!isMlsUser || section.label !== "More") return section;
    const items = [...section.items];
    const dealsIdx = items.findIndex((i) => i.to === "/deals");
    const insertAt = dealsIdx >= 0 ? dealsIdx + 1 : items.length;
    items.splice(insertAt, 0, MLS_ITEM, DOTLOOP_ITEM);
    return { ...section, items };
  });




  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 pt-6 pb-6 flex items-center justify-between shrink-0">
        <BrandLockup
          logoClassName="h-9 w-9 border border-sidebar-border bg-black ring-0"
          titleClassName="truncate text-base text-white"
          taglineClassName="text-xs text-amber-400"
          textClassName="max-w-[min(12rem,calc(100vw-8rem))]"
        />
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
        {visibleSections.map((section) => (
          <div key={section.label}>
            <div className="mb-1.5 px-2.5 text-xs font-medium uppercase tracking-[0.14em] text-sidebar-foreground/70">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon }) => {
                const active = path === to || path.startsWith(to + "/");
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
          <div className="mb-1 text-xs uppercase tracking-wider text-sidebar-foreground/75">
            Plan
          </div>
          {!user ? (
            <div className="text-base font-medium text-sidebar-foreground">—</div>
          ) : showPlanLine ? (
            <>
              <div className="text-base font-semibold text-sidebar-foreground">{planName}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
                <span className={`font-medium ${tone.text}`}>{statusLabel}</span>
                {statusDetail && (
                  <span className="text-sidebar-foreground/60">· {statusDetail}</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-base font-medium text-sidebar-foreground">No plan</div>
          )}
        </div>
        {user ? (
          <div className="pt-2 border-t border-sidebar-border">
            <div className="mb-2 break-all text-sm leading-5 text-sidebar-foreground/75">
              {user.email}
            </div>
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
      <div className="lg:hidden sticky top-0 z-30 flex h-16 w-full items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className="-ml-2 inline-flex h-12 w-12 flex-col items-center justify-center rounded-lg hover:bg-sidebar-accent"
        >
          <Menu className="h-5 w-5" />
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/75">
            Menu
          </span>
        </button>
        <BrandLockup
          logoClassName="h-8 w-8 rounded-lg border border-sidebar-border bg-black ring-0"
          titleClassName="truncate text-base text-white"
          taglineClassName="text-[9px] text-amber-400"
          textClassName="max-w-[min(10rem,calc(100vw-9rem))]"
        />
        <Link
          to="/dashboard"
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
