import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Check,
  BookOpen,
  Car,
  Receipt,
  ScanLine,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  TrendingUp,
  DollarSign,
  Wallet,
  PieChart,
} from "lucide-react";
import endlessProspectsLogo from "@/assets/endless-prospects-logo.png";
import maColonialHeroBg from "@/assets/ma-colonial-hero-bg.png";

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
      "View all transactions at a glance",
      "Type and print commission statements right from the system",
      "Track mileage and print tax-ready reports",
      "Set up tasks for your deals",
      "Upload and view listings at a glance",
      "Receipt capture for expense tracking",
      "Income tracker",
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
  { icon: Car, title: "Live mileage tracker", body: "Tap start, drive, tap stop. Or punch in two addresses.", glow: "from-white via-[#f7e7b6] to-[#d4af37]" },
  { icon: BookOpen, title: "Book Keeping", body: "Tracking your business from lead to close. Log expenses across all of your financial accounts, and pull a Schedule C and a profit and loss statement from your own bookkeeping system.", glow: "from-white via-[#efe1bb] to-[#b48a3d]" },
  { icon: ScanLine, title: "Receipt scanner", body: "Snap, categorize, file. Everything ready come April.", glow: "from-white via-[#f7e6dc] to-[#c07b4a]" },
  { icon: ShieldCheck, title: "Cancel anytime", body: "Credit card is not charged until after the 14-day trial. Cancel anytime.", glow: "from-white via-[#e8f5ee] to-[#4d7c5f]" },
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
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] opacity-80 mt-1 hidden sm:block">Business Tracker</div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link to="/auth" className="text-sm font-medium px-2.5 sm:px-4 py-2 text-white/80 hover:text-white transition-colors">Sign in</Link>
            <Link
              to="/auth"
              className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap bg-[#d4af37] text-slate-950 shadow-[0_8px_24px_-8px_rgba(212,175,55,0.55)] hover:bg-[#c89e2f] transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#050b22]">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-100"
          style={{
            backgroundImage: `url(${maColonialHeroBg})`,
            filter: "grayscale(80%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 15, 45, 0.85) 50%, rgba(0, 0, 0, 0.98) 100%)",
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 sm:pt-32 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/15 text-xs font-medium mb-8 text-[#d4af37]">
          <Sparkles className="h-3 w-3" /> Built for real estate agents
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.02] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          <span className="text-white">Your Real Estate Business at a Glance</span>{" "}
          <span className="text-[#d4af37]">all in one place.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/75 mt-8 max-w-2xl mx-auto leading-relaxed">
          Clients, Deals, Trackable milage, commission statements, Listings, Leads, and Book Keeping for end of the day reports all in one spot.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/auth"
            className="px-7 py-3.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 bg-[#d4af37] text-slate-950 shadow-[0_12px_40px_-8px_rgba(212,175,55,0.5)] hover:bg-[#c89e2f] transition-colors"
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
        </div>
      </section>

      {/* Glassmorphism Features */}
      <section className="relative max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/15 text-xs font-medium mb-4 text-[#d4af37]">
            Live preview
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white">
            Your business, at a <span className="text-[#d4af37]">glance.</span>
          </h2>
          <p className="text-white/65 mt-3 max-w-xl mx-auto">A real-time view of commissions earned, expenses logged, and miles driven.</p>
        </div>

        <div className="relative mx-auto max-w-5xl perspective-1000">
          {/* Glow */}
          <div className="absolute -inset-8 bg-gradient-to-r from-[#d4af37]/20 via-white/10 to-[#d4af37]/20 blur-3xl rounded-[3rem] -z-10" />
          <div
            className="rounded-2xl border border-white/15 bg-[#0b0a08]/80 backdrop-blur-xl shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9),0_30px_60px_-20px_rgba(212,175,55,0.2)] overflow-hidden"
            style={{ transform: "rotateX(4deg)" }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#130f0a]/60">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-[#d4af37]/80" />
              <span className="h-3 w-3 rounded-full bg-green-400/80" />
              <div className="ml-4 text-xs text-white/50 font-display">endlessprospects.app/dashboard</div>
            </div>
            {/* Dashboard body */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: DollarSign, label: "YTD Commissions", value: "$184,250", delta: "+12.4%", color: "text-[#d4af37]" },
                { icon: Wallet,     label: "Expenses",        value: "$22,807",  delta: "+3.1%",  color: "text-[#f7e7b6]"   },
                { icon: Car,        label: "Miles driven",    value: "8,431",    delta: "+248",   color: "text-[#d4af37]"     },
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
                    <TrendingUp className="h-4 w-4 text-[#d4af37]" /> Revenue · last 6 months
                  </div>
                  <span className="text-xs text-white/50">2025</span>
                </div>
                <div className="flex items-end gap-3 h-32">
                  {[40, 62, 55, 78, 70, 92].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-[#d4af37] to-[#fff0c9]" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-white mb-4">
                  <PieChart className="h-4 w-4 text-[#d4af37]" /> Expense mix
                </div>
                <div className="space-y-2.5">
                  {[
                    { l: "Marketing", v: 42, c: "bg-[#d4af37]" },
                    { l: "Mileage",   v: 28, c: "bg-[#f7e7b6]"   },
                    { l: "MLS fees",  v: 18, c: "bg-white/60" },
                    { l: "Office",    v: 12, c: "bg-[#b8912a]" },
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
                  ? "border-[#d4af37]/60 bg-gradient-to-b from-[#120f0a]/90 to-[#050b22]/90 lg:scale-105 shadow-[0_0_0_1px_rgba(212,175,55,0.3),0_30px_80px_-20px_rgba(212,175,55,0.35)]"
                  : "border-white/10 bg-[#070d24]/80 hover:border-white/20 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]"
              }`}
            >
              {tier.featured && (
                <>
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#d4af37]/40 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-white via-[#f7e7b6] to-[#d4af37] text-slate-950 text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1 rounded-full shadow-[0_8px_24px_-4px_rgba(212,175,55,0.6)]">
                    Most popular
                  </div>
                </>
              )}
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#d4af37] text-slate-950 text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1 rounded-full">
                  {tier.badge}
                </div>
              )}
              <div className="font-display font-bold text-lg text-white">{tier.name}</div>
              <div className="text-sm text-white/60 mt-1 mb-5 min-h-[5.5rem]">{tier.blurb}</div>
              <div className="flex items-baseline gap-1 mb-6">
                <div className={`font-display text-5xl font-bold tabular-nums ${tier.featured ? "bg-gradient-to-r from-white via-[#f7e7b6] to-[#d4af37] bg-clip-text text-transparent" : "text-white"}`}>
                  ${tier.price}
                </div>
                <div className="text-sm text-white/55">/mo</div>
              </div>
              <div className="text-xs text-white/55 mb-4 min-h-[1rem]">
                {tier.seat ? `+ $${tier.seat}/agent seat` : null}
              </div>
              <Link
                to="/auth"
                className={`block text-center w-full px-4 py-2.5 rounded-lg text-sm font-semibold mb-6 transition-colors ${
                  tier.featured
                    ? "bg-[#d4af37] text-slate-950 hover:bg-[#c89e2f]"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {tier.cta}
              </Link>
              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                    <Check className={`h-4 w-4 shrink-0 mt-0.5 ${tier.featured ? "text-[#d4af37]" : "text-[#f7e7b6]"}`} />
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
