import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Check,
  BookOpen,
  Car,
  Receipt,
  ScanLine,
  ArrowRight,
  Sparkles,
  TrendingUp,
  DollarSign,
  Wallet,
  PieChart,
  Bell,
  LayoutDashboard,
  User,
} from "lucide-react";
import endlessProspectsLogo from "@/assets/endless-prospects-logo.png";
import maHomeBg from "@/assets/landing-hero-bg.png";

export const Route = createFileRoute("/landing")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Endless Prospects — QuickBooks built for real estate agents" },
      { name: "description", content: "Track commissions, expenses, mileage and owner loans in one place. Tax-ready Schedule C reports built for agents and brokers." },
      { property: "og:title", content: "Endless Prospects — QuickBooks for real estate agents" },
      { property: "og:description", content: "All-in-one books, mileage and client tracking for agents. Tax-ready in one click." },
    ],
  }),
});

const tiers = [
  {
    name: "Beta Tester",
    price: 10,
    blurb: "All features unlocked for 6 months while we gather feedback.",
    features: [
      "All Pro & Team features unlocked",
      "Just $10/mo for 6 months",
      "Help shape the product roadmap",
      "Direct line to the founders",
      "Priority bug-fix turnaround",
    ],
    cta: "Join the beta",
    featured: false,
    badge: "Limited beta",
  },
  {
    name: "Solo Agent",
    price: 29,
    blurb: "Everything a single agent needs to file a clean Schedule C.",
    features: [
      "Unlimited bank & credit card accounts",
      "Double-entry bookkeeping (Schedule C categories)",
      "Owner loan ledger (lend to / get reimbursed)",
      "Live GPS mileage tracker",
      "Receipt capture",
      "Year-end P&L export",
    ],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Pro Agent",
    price: 49,
    blurb: "For producers who invoice clients and want polish at tax time.",
    features: [
      "Everything in Solo",
      "Stripe invoicing + auto-recorded payments",
      "Address-to-address mileage (Google Maps)",
      "Tax-ready PDF reports for your CPA",
      "Custom expense categories",
      "Pipeline & client CRM",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Team / Brokerage",
    price: 99,
    seat: 15,
    blurb: "Roll up the brokerage. One book per agent, dashboards for the principal.",
    features: [
      "Everything in Pro",
      "Multi-agent workspace",
      "Per-agent commission splits",
      "Brokerage-wide dashboards",
      "Role-based access",
      "Priority support",
    ],
    cta: "Talk to sales",
    featured: false,
  },
];

const features = [
  { icon: BookOpen, title: "Double-entry books", body: "Real bookkeeping under a friendly UI. Multiple bank accounts and cards.", glow: "from-amber-300 to-yellow-500" },
  { icon: Car,      title: "Live mileage tracker", body: "Tap start, drive, tap stop. Or punch in two addresses.", glow: "from-sky-300 to-cyan-500" },
  { icon: Receipt,  title: "Stripe invoicing", body: "Send invoices, get paid, books update automatically.", glow: "from-emerald-300 to-teal-500" },
  { icon: ScanLine, title: "Receipt capture", body: "Snap, categorize, file. Everything ready come April.", glow: "from-fuchsia-300 to-rose-500" },
];

function Landing() {
  useEffect(() => {
    const root = document.documentElement;
    const prevClass = root.classList.contains("dark");
    const prevScheme = root.style.colorScheme;
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    return () => {
      if (!prevClass) root.classList.remove("dark");
      root.style.colorScheme = prevScheme;
    };
  }, []);
  return (
    <div className="dark relative min-h-dvh w-full bg-[#050b22] text-white overflow-hidden">
      {/* Fixed luxury home background */}
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage: `url(${maHomeBg})`,
          backgroundAttachment: "fixed",
        }}
        aria-hidden
      />
      {/* Subtle bottom gradient + light top scrim for text legibility */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,7,20,0.55) 0%, rgba(3,7,20,0.35) 30%, rgba(3,7,20,0.65) 70%, rgba(2,4,12,0.95) 100%)",
        }}
        aria-hidden
      />

      <header className="relative border-b border-white/10 backdrop-blur-md bg-black/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link to="/landing" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img
              src={endlessProspectsLogo}
              alt="Endless Prospects"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl object-cover shrink-0 ring-1 ring-white/20"
            />
            <div className="min-w-0">
              <div className="font-display font-bold text-sm sm:text-base leading-none truncate text-white">Endless Prospects</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300/80 mt-1 hidden sm:block">Business Tracker</div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link to="/auth" className="text-sm font-medium px-2.5 sm:px-4 py-2 text-white/80 hover:text-white transition-colors">Sign in</Link>
            <Link
              to="/auth"
              className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_8px_24px_-8px_rgba(251,191,36,0.6)] hover:from-amber-300 hover:to-yellow-400 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 sm:pt-32 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/15 text-xs font-medium mb-8 text-amber-200">
          <Sparkles className="h-3 w-3" /> Built for real estate agents
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.02] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          QuickBooks built for the way{" "}
          <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            agents actually work
          </span>
          .
        </h1>
        <p className="text-lg md:text-xl text-white/75 mt-8 max-w-2xl mx-auto leading-relaxed">
          Track commissions, write off every mile, log expenses across all your cards, and hand your CPA a tax-ready Schedule C — without the QuickBooks learning curve.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/auth"
            className="px-7 py-3.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_12px_40px_-8px_rgba(251,191,36,0.55)] hover:from-amber-300 hover:to-yellow-400 transition-colors"
          >
            Start your free 14-day trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/"
            className="px-7 py-3.5 rounded-lg text-sm font-semibold border border-white/20 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 transition-colors"
          >
            See live demo
          </Link>
        </div>
        <p className="text-xs text-white/55 mt-5">No credit card required · Cancel anytime</p>
      </section>

      {/* Glassmorphism Features */}
      <section className="relative max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-2xl p-5 sm:p-6 border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] hover:border-white/20 hover:bg-white/10 transition-all"
          >
            <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${f.glow} opacity-0 blur-xl group-hover:opacity-20 transition-opacity -z-10`} />
            <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${f.glow} flex items-center justify-center mb-4 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]`}>
              <f.icon className="h-5 w-5 text-slate-950" strokeWidth={2.5} />
            </div>
            <div className="font-display font-bold mb-1.5 text-white">{f.title}</div>
            <div className="text-sm text-white/65 leading-relaxed">{f.body}</div>
          </div>
        ))}
      </section>

      {/* Floating Dashboard Preview */}
      <section className="relative max-w-6xl mx-auto px-6 py-16 sm:py-24">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/15 text-xs font-medium mb-4 text-amber-200">
            Live preview
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white">Your business, at a glance.</h2>
          <p className="text-white/65 mt-3 max-w-xl mx-auto">A real-time view of commissions earned, expenses logged, miles driven, and the mobile app experience.</p>
        </div>

        <div className="relative mx-auto max-w-5xl perspective-1000">
          {/* Glow */}
          <div className="absolute -inset-8 bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/20 blur-3xl rounded-[3rem] -z-10" />
          <div
            className="rounded-2xl border border-white/15 bg-slate-900/80 backdrop-blur-xl shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9),0_30px_60px_-20px_rgba(251,191,36,0.15)] overflow-hidden"
            style={{ transform: "rotateX(4deg)" }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-slate-950/60">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
              <span className="h-3 w-3 rounded-full bg-green-400/80" />
              <div className="ml-4 text-xs text-white/50 font-mono">endlessprospects.app/dashboard</div>
            </div>
            {/* Dashboard body */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: DollarSign, label: "YTD Commissions", value: "$184,250", delta: "+12.4%", color: "text-emerald-300" },
                { icon: Wallet,     label: "Expenses",        value: "$22,807",  delta: "+3.1%",  color: "text-amber-300"   },
                { icon: Car,        label: "Miles driven",    value: "8,431",    delta: "+248",   color: "text-sky-300"     },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-white/60 text-xs uppercase tracking-wider">
                    <span>{k.label}</span>
                    <k.icon className="h-4 w-4" />
                  </div>
                  <div className="font-display text-2xl font-bold text-white mt-2 tabular-nums">{k.value}</div>
                  <div className={`text-xs mt-1 ${k.color}`}>{k.delta}</div>
                </div>
              ))}

              <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <TrendingUp className="h-4 w-4 text-amber-300" /> Revenue · last 6 months
                  </div>
                  <span className="text-xs text-white/50">2025</span>
                </div>
                <div className="flex items-end gap-3 h-32">
                  {[40, 62, 55, 78, 70, 92].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-amber-500 to-yellow-300" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-white mb-4">
                  <PieChart className="h-4 w-4 text-amber-300" /> Expense mix
                </div>
                <div className="space-y-2.5">
                  {[
                    { l: "Marketing", v: 42, c: "bg-amber-400" },
                    { l: "Mileage",   v: 28, c: "bg-sky-400"   },
                    { l: "MLS fees",  v: 18, c: "bg-emerald-400" },
                    { l: "Office",    v: 12, c: "bg-fuchsia-400" },
                  ].map((r) => (
                    <div key={r.l}>
                      <div className="flex justify-between text-xs text-white/70 mb-1">
                        <span>{r.l}</span><span>{r.v}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full ${r.c} rounded-full`} style={{ width: `${r.v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-3 lg:-mt-80 lg:items-end lg:pr-10">
          <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55 backdrop-blur-md">
            iPhone mockup
          </div>
          <IPhoneMockup />
        </div>
      </section>

      {/* Pricing — Navy & Gold */}
      <section className="relative max-w-6xl mx-auto px-6 py-20" id="pricing">
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white">Simple pricing, real value</h2>
          <p className="text-white/65 mt-3">Less than a single closing gift per month.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-7 border backdrop-blur-md transition-all flex flex-col ${
                tier.featured
                  ? "border-amber-400/60 bg-gradient-to-b from-[#0b1638]/90 to-[#050b22]/90 lg:scale-105 shadow-[0_0_0_1px_rgba(251,191,36,0.3),0_30px_80px_-20px_rgba(251,191,36,0.35)]"
                  : "border-white/10 bg-[#070d24]/80 hover:border-white/20 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]"
              }`}
            >
              {tier.featured && (
                <>
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-amber-400/40 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1 rounded-full shadow-[0_8px_24px_-4px_rgba(251,191,36,0.6)]">
                    Most popular
                  </div>
                </>
              )}
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-emerald-950 text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1 rounded-full">
                  {tier.badge}
                </div>
              )}
              <div className="font-display font-bold text-lg text-white">{tier.name}</div>
              <div className="text-sm text-white/60 mt-1 mb-5">{tier.blurb}</div>
              <div className="flex items-baseline gap-1 mb-6">
                <div className={`font-display text-5xl font-bold tabular-nums ${tier.featured ? "bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent" : "text-white"}`}>
                  ${tier.price}
                </div>
                <div className="text-sm text-white/55">/mo</div>
              </div>
              {tier.seat && (
                <div className="text-xs text-white/55 mb-4">+ ${tier.seat}/agent seat</div>
              )}
              <Link
                to="/auth"
                className={`block text-center w-full px-4 py-2.5 rounded-lg text-sm font-semibold mb-6 transition-colors ${
                  tier.featured
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:from-amber-300 hover:to-yellow-400"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {tier.cta}
              </Link>
              <ul className="space-y-2.5 mt-auto">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                    <Check className={`h-4 w-4 shrink-0 mt-0.5 ${tier.featured ? "text-amber-300" : "text-emerald-400"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/55 mt-8">
          All plans include unlimited transactions, secure cloud backup, and free updates.
        </p>
      </section>

      <footer className="relative border-t border-white/10 mt-12 backdrop-blur-md bg-black/30">
        <div className="max-w-6xl mx-auto px-6 py-8 text-xs text-white/55 flex justify-between">
          <div>© {new Date().getFullYear()} Endless Prospects · Agent Business Tracker</div>
          <div className="flex gap-4">
            <Link to="/auth" className="hover:text-white">Sign in</Link>
            <Link to="/help" className="hover:text-white">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function IPhoneMockup() {
  const stats = [
    { icon: TrendingUp, label: "Deals", value: "14", color: "text-amber-300" },
    { icon: BookOpen, label: "Books", value: "8", color: "text-sky-300" },
    { icon: Car, label: "Miles", value: "83", color: "text-emerald-300" },
  ];
  const activity = [
    { title: "Open house follow-up", detail: "3 new leads added this morning", time: "8m", tone: "bg-amber-300" },
    { title: "Receipt captured", detail: "$128 office supply expense", time: "22m", tone: "bg-sky-300" },
    { title: "Mileage logged", detail: "14.2 miles to a listing appointment", time: "1h", tone: "bg-emerald-300" },
  ];
  const navItems = [
    { label: "Home", icon: LayoutDashboard, active: true },
    { label: "Pipeline", icon: TrendingUp, active: false },
    { label: "Books", icon: BookOpen, active: false },
    { label: "Profile", icon: User, active: false },
  ];

  return (
    <div className="relative w-full max-w-[20rem] shrink-0 lg:rotate-6">
      <div className="absolute -inset-5 rounded-[3rem] bg-gradient-to-b from-sky-400/20 via-amber-400/10 to-emerald-400/15 blur-3xl" />
      <div className="relative mx-auto w-[min(100%,19rem)] rounded-[2.8rem] border border-white/20 bg-slate-950/95 p-2.5 shadow-[0_40px_80px_-24px_rgba(0,0,0,0.85),0_18px_48px_-20px_rgba(14,165,233,0.25)]">
        <div className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#0b1127]">
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <img src={endlessProspectsLogo} alt="Endless Prospects" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">Mobile app</div>
                <div className="font-display text-base font-bold text-white">Today</div>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/65">
              <Bell className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-4 px-4 pb-4 pt-4">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">YTD commissions</div>
                  <div className="mt-2 font-display text-3xl font-bold tabular-nums text-white">$184,250</div>
                  <div className="mt-2 text-xs text-emerald-300">+12.4% vs last month</div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-[0_14px_30px_-10px_rgba(251,191,36,0.6)]">
                  <LayoutDashboard className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/45">
                      <span>{stat.label}</span>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="mt-2 text-lg font-bold tabular-nums text-white">{stat.value}</div>
                    <div className={`mt-1 text-[10px] ${stat.color}`}>Live</div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-white">Recent activity</div>
                <div className="text-[11px] text-white/45">Live</div>
              </div>
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white">{item.title}</div>
                      <div className="text-xs text-white/55">{item.detail}</div>
                    </div>
                    <span className="text-[11px] text-white/40">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-slate-950/75 px-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-center justify-between gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium transition-colors ${
                      item.active ? "bg-white/10 text-amber-300" : "text-white/45 hover:bg-white/5 hover:text-white/75"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="absolute left-1/2 top-2 h-1.5 w-28 -translate-x-1/2 rounded-full bg-white/12" />
        </div>
      </div>
    </div>
  );
}
