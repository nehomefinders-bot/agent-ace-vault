import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  BookOpen,
  Car,
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
import maColonialHeroBg from "@/assets/ma-colonial-hero-bg-updated.png";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/landing")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Endless Prospects - QuickBooks built for real estate agents" },
      {
        name: "description",
        content:
          "Track commissions, expenses, mileage and owner loans in one place. Tax-ready Schedule C reports built for agents and brokers.",
      },
      { property: "og:title", content: "Endless Prospects - QuickBooks for real estate agents" },
      {
        property: "og:description",
        content: "All-in-one books, mileage and client tracking for agents. Tax-ready in one click.",
      },
    ],
  }),
});

const tiers = [
  {
    name: "Founders Program",
    price: 10,
    blurb: "All features unlocked for 6 months while we gather feedback.",
    features: [
      "All Pro & Team features unlocked",
      "Just $10/mo for 6 months",
      "Help shape the product roadmap",
      "Direct line to the founders",
      "Priority bug-fix turnaround",
    ],
    cta: "Join founders program",
    featured: false,
    badge: "Founders access",
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
  {
    icon: Car,
    title: "Live mileage tracker",
    body: "Tap start, drive, tap stop. Or punch in two addresses.",
    glow: "from-white via-[#f7e7b6] to-[#d4af37]",
  },
  {
    icon: BookOpen,
    title: "Book Keeping",
    body: "Tracking your business from lead to close. Log expenses across all of your financial accounts, and pull a Schedule C and a profit and loss statement from your own bookkeeping system.",
    glow: "from-white via-[#efe1bb] to-[#b48a3d]",
  },
  {
    icon: ScanLine,
    title: "Receipt scanner",
    body: "Snap, categorize, file. Everything ready come April.",
    glow: "from-white via-[#f7e6dc] to-[#c07b4a]",
  },
  {
    icon: ShieldCheck,
    title: "Cancel anytime",
    body: "Credit card is not charged until after the 14-day trial. Cancel anytime.",
    glow: "from-white via-[#e8f5ee] to-[#4d7c5f]",
  },
];

function Landing() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [newsletterEmail, setNewsletterEmail] = useState("");

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    nav({ to: "/", replace: true });
  }, [authLoading, user, nav]);

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newsletterEmail.trim()) return;

    const subject = encodeURIComponent("Endless Prospects newsletter signup");
    const body = encodeURIComponent(
      `Please add this email to the Endless Prospects updates list:\n\n${newsletterEmail.trim()}`
    );

    window.location.href = `mailto:livingandlearningwithjackie@gmail.com?subject=${subject}&body=${body}`;
    setNewsletterEmail("");
  };

  return (
    <div className="dark min-h-dvh w-full overflow-x-hidden bg-slate-950 text-white">
      <nav className="sticky top-0 z-50 border-b border-slate-200/90 bg-slate-50/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/landing" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <img
              src={endlessProspectsLogo}
              alt="Endless Prospects"
              className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 sm:h-10 sm:w-10"
            />
            <div className="min-w-0">
              <div className="truncate font-display text-base leading-none font-bold text-slate-900 sm:text-lg">
                Endless Prospects
              </div>
              <div className="mt-1 hidden text-xs uppercase tracking-[0.2em] text-[#b88918] sm:block">
                Business Tracker
              </div>
            </div>
          </Link>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link
              to="/auth"
              className="px-2.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950 sm:px-4 sm:text-base"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] transition-colors hover:bg-slate-100 sm:px-4 sm:text-base"
            >
              Get started
            </Link>
            <Link
              to="/auth"
              className="whitespace-nowrap rounded-lg bg-[#d4af37] px-3 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_-12px_rgba(212,175,55,0.7)] transition-colors hover:bg-[#c89e2f] sm:px-4 sm:text-base"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-slate-950">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
          style={{ backgroundImage: `url(${maColonialHeroBg})` }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-24 lg:pt-36">
          <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
            <div
              className="pointer-events-none absolute left-1/2 top-[44%] h-[30rem] w-[108%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.9)_30%,rgba(2,6,23,0.72)_56%,rgba(2,6,23,0.34)_78%,transparent_100%)] blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-1/2 top-[60%] h-[22rem] w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.82)_0%,rgba(2,6,23,0.58)_46%,rgba(2,6,23,0.22)_74%,transparent_100%)] blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-1/2 top-8 h-28 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,0.62)_0%,rgba(15,23,42,0.34)_58%,transparent_100%)] blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-1/2 top-[74%] h-28 w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.72)_0%,rgba(2,6,23,0.36)_58%,transparent_100%)] blur-2xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-medium text-[#d4af37] backdrop-blur-md">
                <Sparkles className="h-3 w-3" /> Built for real estate agents
              </div>
              <h1 className="mx-auto max-w-4xl font-display text-5xl leading-[1.02] font-bold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] md:text-7xl">
                <span className="text-white">Your Real Estate Business at a Glance</span>{" "}
                <span className="text-[#d4af37]">all in one place.</span>
              </h1>
              <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-white/75 md:text-2xl">
                Clients, Deals, Trackable milage, commission statements, Listings, Leads, and Book Keeping for end of the day reports all in one spot.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-7 py-3.5 text-base font-semibold text-slate-950 shadow-[0_12px_40px_-8px_rgba(212,175,55,0.5)] transition-colors hover:bg-[#c89e2f]"
                >
                  Start your free 14-day trial <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/"
                  className="rounded-lg border border-white/20 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
                >
                  See live demo
                </Link>
              </div>
              <p className="mt-5 inline-flex items-center rounded-full border border-white/15 bg-slate-950/55 px-4 py-2 text-sm font-medium text-[#f3e6b2] shadow-[0_14px_32px_-18px_rgba(2,6,23,0.8)] backdrop-blur-sm">
                No charge until day 15 &bull; Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#e9eef1] text-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-[#d6dde5] bg-[#f5f3ed] p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.2)] transition-all duration-200 hover:-translate-y-1 hover:border-[#b8c3d0] hover:bg-slate-900 hover:shadow-[0_28px_56px_-26px_rgba(15,23,42,0.48)] active:-translate-y-0.5 active:border-[#b8c3d0] active:bg-slate-900 active:shadow-[0_24px_46px_-24px_rgba(15,23,42,0.42)] sm:p-6"
              >
                <div
                  className={`absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br ${f.glow} opacity-0 blur-xl transition-opacity duration-200 group-hover:opacity-30 group-active:opacity-30`}
                />
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.glow} shadow-[0_12px_28px_-10px_rgba(15,23,42,0.24)] ring-1 ring-black/5 transition-all duration-200 group-hover:scale-105 group-hover:ring-white/10 group-active:scale-105 group-active:ring-white/10`}
                >
                  <f.icon className="h-5 w-5 text-slate-950" strokeWidth={2.5} />
                </div>
                <div className="mb-1.5 font-display text-lg font-bold text-slate-900 transition-colors duration-200 group-hover:text-white group-active:text-white">
                  {f.title}
                </div>
                <div className="text-base leading-relaxed text-slate-600 transition-colors duration-200 group-hover:text-slate-200 group-active:text-slate-200">
                  {f.body}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-[#d6dde5] bg-[#f5f3ed] px-6 py-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.16)] sm:px-8 sm:py-7">
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                Ready to automate your admin?
              </h2>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-lg bg-[#d4af37] px-6 py-3 text-base font-semibold text-slate-950 shadow-[0_12px_28px_-14px_rgba(212,175,55,0.75)] transition-colors hover:bg-[#c89e2f]"
              >
                Try All Features Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950">
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-medium text-[#d4af37] backdrop-blur-md">
              Live preview
            </div>
            <h2 className="font-display text-4xl font-bold text-white md:text-6xl">
              Your business, at a <span className="text-[#d4af37]">glance.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-white/65">
              A real-time view of commissions earned, expenses logged, and miles driven.
            </p>
          </div>

          <div className="relative mx-auto max-w-5xl perspective-1000">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-r from-[#d4af37]/20 via-white/10 to-[#d4af37]/20 blur-3xl" />
            <div
              className="overflow-hidden rounded-2xl border border-white/15 bg-[#0b0a08]/80 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9),0_30px_60px_-20px_rgba(212,175,55,0.2)] backdrop-blur-xl"
              style={{ transform: "rotateX(4deg)" }}
            >
              <div className="flex items-center gap-2 border-b border-white/10 bg-[#130f0a]/60 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-[#d4af37]/80" />
                <span className="h-3 w-3 rounded-full bg-green-400/80" />
                <div className="ml-4 font-display text-sm text-white/50">endlessprospects.app/dashboard</div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 sm:p-8 md:grid-cols-3">
                {[
                  { icon: DollarSign, label: "YTD Commissions", value: "$184,250", delta: "+12.4%", color: "text-[#d4af37]" },
                  { icon: Wallet, label: "Expenses", value: "$22,807", delta: "+3.1%", color: "text-[#f7e7b6]" },
                  { icon: Car, label: "Miles driven", value: "8,431", delta: "+248", color: "text-[#d4af37]" },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-sm uppercase tracking-wider text-white/60">
                      <span>{k.label}</span>
                      <k.icon className="h-4 w-4" />
                    </div>
                    <div className="mt-2 font-display text-3xl font-bold tabular-nums text-white">{k.value}</div>
                    <div className={`mt-1 text-sm ${k.color}`}>{k.delta}</div>
                  </div>
                ))}

                <div className="rounded-xl border border-white/10 bg-white/5 p-5 md:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-base font-medium text-white">
                      <TrendingUp className="h-4 w-4 text-[#d4af37]" /> Revenue &middot; last 6 months
                    </div>
                    <span className="text-sm text-white/50">2025</span>
                  </div>
                  <div className="flex h-32 items-end gap-3">
                    {[40, 62, 55, 78, 70, 92].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-[#d4af37] to-[#fff0c9]"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-4 flex items-center gap-2 text-base font-medium text-white">
                    <PieChart className="h-4 w-4 text-[#d4af37]" /> Expense mix
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { l: "Marketing", v: 42, c: "bg-[#d4af37]" },
                      { l: "Mileage", v: 28, c: "bg-[#f7e7b6]" },
                      { l: "MLS fees", v: 18, c: "bg-white/60" },
                      { l: "Office", v: 12, c: "bg-[#b8912a]" },
                    ].map((r) => (
                      <div key={r.l}>
                        <div className="mb-1 flex justify-between text-sm text-white/70">
                          <span>{r.l}</span>
                          <span>{r.v}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className={`h-full rounded-full ${r.c}`} style={{ width: `${r.v}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 text-base font-semibold text-[#d4af37] transition-colors hover:text-[#f0ce63]"
            >
              Explore the Agent Command Center <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-stone-50 text-slate-900">
        <div className="relative mx-auto max-w-6xl scroll-mt-28 px-6 py-20" id="pricing">
          <div className="mb-14 text-center">
            <h2 className="font-display text-5xl font-bold text-slate-900 md:text-6xl">Simple pricing, real value</h2>
            <p className="mt-3 text-lg text-slate-600">Less than a single closing gift per month.</p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border bg-white p-7 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.25)] transition-all ${
                  tier.featured
                    ? "border-[#b88918] shadow-[0_0_0_1px_rgba(184,137,24,0.22),0_28px_70px_-32px_rgba(184,137,24,0.45)] lg:-translate-y-2"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {tier.featured && (
                  <>
                    <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-[#d4af37]/20 via-transparent to-transparent" />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#d4af37] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-950 shadow-[0_8px_24px_-4px_rgba(212,175,55,0.6)]">
                      Most popular
                    </div>
                  </>
                )}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#d4af37] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-950">
                    {tier.badge}
                  </div>
                )}
                <div className="font-display text-xl font-bold text-slate-900">{tier.name}</div>
                <div className="mt-1 mb-5 min-h-[5.5rem] text-base text-slate-600">{tier.blurb}</div>
                <div className="mb-6 flex items-baseline gap-1">
                  <div className={`font-display text-5xl font-bold tabular-nums ${tier.featured ? "text-[#a97900]" : "text-slate-900"}`}>
                    ${tier.price}
                  </div>
                  <div className="text-base text-slate-500">/mo</div>
                </div>
                <div className="mb-4 min-h-[1rem] text-sm text-slate-500">
                  {tier.seat ? `+ $${tier.seat}/agent seat` : null}
                </div>
                <Link
                  to="/auth"
                  className={`mb-6 block w-full rounded-lg px-4 py-2.5 text-center text-base font-semibold transition-colors ${
                    tier.featured
                      ? "bg-[#d4af37] text-slate-950 hover:bg-[#c89e2f]"
                      : "border border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {tier.cta}
                </Link>
                <ul className="space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-base text-slate-700">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tier.featured ? "text-[#b88918]" : "text-[#d4af37]"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            All plans include unlimited transactions, secure cloud backup, and free updates.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 text-sm text-slate-600 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] md:items-center">
          <div className="flex flex-col gap-3">
            <div>&copy; {new Date().getFullYear()} Endless Prospects &middot; Agent Business Tracker</div>
            <div className="flex flex-wrap gap-4">
              <Link to="/auth" className="transition-colors hover:text-slate-900">
                Sign in
              </Link>
              <Link to="/help" className="transition-colors hover:text-slate-900">
                Help
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleNewsletterSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.25)]"
          >
            <div className="mb-3">
              <div className="font-display text-lg font-bold text-slate-900">Stay in the loop</div>
              <p className="mt-1 text-sm text-slate-600">Low-volume product updates for agents and teams.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder="Enter your email"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Get updates
              </button>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
}
