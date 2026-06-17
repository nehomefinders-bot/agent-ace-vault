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
  X,
  Star,
  Loader2,
} from "lucide-react";
import maColonialHeroBg from "@/assets/landing-house-autumn.jpeg";
import { BRAND_TITLE, BrandLockup } from "@/components/brand-lockup";
import { Reveal } from "@/components/reveal";


export const Route = createFileRoute("/landing")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Agent Business Tracker - QuickBooks built for real estate agents" },
      {
        name: "description",
        content:
          "Track commissions, expenses, mileage and owner loans in one place. Tax-ready Schedule C reports built for agents and brokers.",
      },
      {
        property: "og:title",
        content: "Agent Business Tracker - QuickBooks for real estate agents",
      },
      {
        property: "og:description",
        content:
          "All-in-one books, mileage and client tracking for agents. Tax-ready in one click.",
      },
    ],
  }),
});

const tiers = [
  {
    name: "Founders' Program",
    price: 10,
    blurb: "Every feature unlocked. Locked in at $10/month for life.",
    features: [
      "All features unlocked from day one",
      "Just $10/month — locked in for life",
      "Direct line to the founders",
      "Priority bug-fix turnaround",
      "Help shape the product roadmap",
    ],
    cta: "Claim Founders Access",
    featured: true,
    badge: "Best Value",
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
    title: "Founder pricing",
    body: "Lock in $10/month for life. Cancel anytime from your billing page.",
    glow: "from-white via-[#e8f5ee] to-[#4d7c5f]",
  },
];


type FooterLink = { label: string; to: string };

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const footerColumns: FooterColumn[] = [
  {
    title: "App Modules",
    links: [
      { label: "Smart Bookkeeping", to: "/books" },
      { label: "Live Mileage Tracker", to: "/mileage" },
      { label: "Pipeline Management", to: "/pipeline" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "Contact Support", to: "/support" },
      { label: "Sign In", to: "/auth" },
    ],
  },
  {
    title: "Trust & Privacy",
    links: [
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms & Conditions", to: "/terms-and-conditions" },
    ],
  },
];

function Landing() {
  const nav = useNavigate();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isVideoOpen, setIsVideoOpen] = useState(false);

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
    if (!isVideoOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVideoOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isVideoOpen]);

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newsletterEmail.trim()) return;

    const subject = encodeURIComponent("Agent Business Tracker newsletter signup");
    const body = encodeURIComponent(
      `Please add this email to the Agent Business Tracker updates list:\n\n${newsletterEmail.trim()}`,
    );

    window.location.href = `mailto:livingandlearningwithjackie@gmail.com?subject=${subject}&body=${body}`;
    setNewsletterEmail("");
  };

  const handleFounderAccessClick = () => {
    nav({ to: "/signup" });
  };
  const isFounderCheckoutLoading = false;


  return (
    <div className="dark min-h-dvh w-full overflow-x-hidden bg-slate-950 text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#050b22]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/landing" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <BrandLockup
              logoClassName="h-9 w-9 ring-white/20 sm:h-10 sm:w-10"
              titleClassName="text-base text-white sm:text-lg"
              taglineClassName="hidden text-xs text-[#d4af37] sm:block"
              textClassName="max-w-[13rem] sm:max-w-none"
            />
          </Link>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link
              to="/auth"
              className="whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-18px_rgba(0,0,0,0.55)] transition-colors hover:bg-white/10 sm:px-4 sm:text-base"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={handleFounderAccessClick}
              disabled={isFounderCheckoutLoading}
              className="founder-nav-cta whitespace-nowrap rounded-lg bg-[#d4af37] px-3 py-2 text-sm font-bold text-slate-950 shadow-[0_12px_30px_-12px_rgba(212,175,55,0.7)] transition-colors hover:bg-[#c89e2f] disabled:cursor-not-allowed disabled:opacity-70 sm:px-4 sm:text-base"
            >
              {isFounderCheckoutLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening Stripe...
                </span>
              ) : (
                "Claim Founders Access"
              )}
            </button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-slate-950">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
          style={{ backgroundImage: `url(${maColonialHeroBg})` }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.26),rgba(2,6,23,0.5)_58%,rgba(2,6,23,0.88))]" />
        <div className="relative z-10 mx-auto flex max-w-7xl items-center px-4 py-8 text-center sm:px-6 sm:py-10 lg:min-h-[34rem] lg:py-10 xl:min-h-[36rem]">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-slate-950/55 px-4 py-1.5 text-sm font-semibold text-[#f0cf6a] shadow-[0_16px_36px_-18px_rgba(0,0,0,0.75)] backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" /> Built for real estate agents
            </div>
            <h1 className="mt-6 max-w-5xl font-display text-4xl font-bold leading-[1.02] tracking-tight text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.9)] sm:text-5xl md:text-6xl lg:text-[4.35rem] xl:text-[4.85rem]">
              <span className="text-white">Your Real Estate Business at a Glance</span>{" "}
              <span className="inline-block scale-[1.03] bg-gradient-to-b from-[#fff0a8] via-[#e4be47] to-[#b88918] bg-clip-text text-transparent [text-shadow:0_10px_24px_rgba(212,175,55,0.22)]">
                all in one place.
              </span>
            </h1>
            <p className="mt-5 max-w-4xl text-base leading-relaxed text-white/90 drop-shadow-[0_5px_16px_rgba(0,0,0,0.88)] sm:text-lg lg:text-xl xl:text-[1.35rem]">
              Clients, deals, trackable mileage, commission statements, listings, leads, and
              bookkeeping for end-of-day reports all in one spot.
            </p>
            <div className="mt-7 flex w-full max-w-4xl flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-0">
              <Link
                to="/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 text-base font-semibold text-slate-950 shadow-[0_12px_40px_-8px_rgba(212,175,55,0.5)] transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-[#c89e2f] hover:shadow-[0_18px_50px_-8px_rgba(212,175,55,0.7)] sm:w-auto sm:px-7"
              >
                Claim Founders Access <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setIsVideoOpen(true)}
                className="w-full rounded-lg border border-white/80 bg-white/92 px-6 py-3 text-base font-semibold text-slate-950 shadow-[0_16px_34px_-16px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-white hover:shadow-[0_18px_40px_-16px_rgba(255,255,255,0.22)] sm:w-auto sm:px-7"
              >
                See live demo
              </button>
            </div>



          </div>
        </div>
      </section>

      {isVideoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          onClick={() => setIsVideoOpen(false)}
          role="presentation"
        >
          <div
            className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Live demo video"
          >
            <button
              type="button"
              onClick={() => setIsVideoOpen(false)}
              className="absolute -top-3 -right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/90 text-white/70 shadow-lg transition hover:bg-slate-900 hover:text-white"
              aria-label="Close video"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/g-FDTVZ-InI?autoplay=1&rel=0"
              title="Agent Business Tracker live demo"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <section className="relative overflow-hidden border-y border-[#d4af37]/20 bg-[#050b22]">
        <div
          className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#d4af37]/15 blur-[120px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -bottom-32 h-96 w-96 rounded-full bg-[#d4af37]/10 blur-[120px]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_1fr] sm:py-24">
          <Reveal direction="left">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#f0cf6a]">
                <Sparkles className="h-3.5 w-3.5" /> Limited Seats Available
              </div>
              <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
                Get in early.{" "}
                <span className="bg-gradient-to-r from-[#fff0a8] via-[#e4be47] to-[#b88918] bg-clip-text text-transparent">
                  Lock in founder pricing.
                </span>
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
                The Founders Program entry window is open for{" "}
                <span className="font-semibold text-[#f0cf6a]">6 months only</span>. Members who join today lock in the{" "}
                <span className="font-semibold text-[#f0cf6a]">$10/month</span> price for life and avoid the future standard base plan rate of{" "}
                <span className="font-semibold text-white">$19.99/month</span>.
              </p>

              <ul className="mt-6 space-y-2.5 text-base text-white/80">
                {[
                  "All Pro & Team features unlocked from day one",
                  "Direct line to the founders - shape the roadmap",
                  "Priority bug-fix turnaround & early access drops",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#d4af37]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleFounderAccessClick}
                  disabled={isFounderCheckoutLoading}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(135deg,#fff0a8_0%,#d4af37_45%,#b88918_100%)] px-7 py-3.5 text-base font-bold text-slate-950 shadow-[0_18px_50px_-12px_rgba(212,175,55,0.7)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-12px_rgba(212,175,55,0.85)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {isFounderCheckoutLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening Stripe...
                    </>
                  ) : (
                    <>
                      Claim Founders Access <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right" delay={150}>
            <div className="relative">
              <div
                className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-[#d4af37]/30 via-white/5 to-[#7c5cff]/25 blur-3xl"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.06] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#d4af37]/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                    Founder Dashboard
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                  <div className="text-xs uppercase tracking-wider text-white/55">
                    Your Founder Rate
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-5xl font-bold tabular-nums text-white">
                      $10
                    </span>
                    <span className="text-sm text-white/55">/month — locked in for life</span>
                  </div>
                  <div className="mt-2 text-xs text-white/45">
                    Every feature unlocked. Cancel anytime.
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[24%] rounded-full bg-gradient-to-r from-[#d4af37] to-[#fff0a8]" />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-white/45">
                    <span>Seats claimed</span>
                    <span>24%</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { l: "Features", v: "All Pro" },
                    { l: "Updates", v: "Priority" },
                    { l: "Support", v: "Founders" },
                    { l: "Lock-in", v: "For life" },
                  ].map((k) => (
                    <div
                      key={k.l}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-white/50">
                        {k.l}
                      </div>
                      <div className="mt-0.5 font-display text-sm font-semibold text-[#f0cf6a]">
                        {k.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#ecd59a] text-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {features.map((f, idx) => (
              <Reveal key={f.title} direction="up" delay={idx * 100} className="h-full">
                <div className="group relative h-full rounded-2xl border border-[#dcccae] bg-[#faf4e7] p-5 shadow-[0_18px_45px_-28px_rgba(96,72,18,0.18)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#cfb77a] hover:bg-slate-900 hover:shadow-2xl active:-translate-y-0.5 active:border-[#cfb77a] active:bg-slate-900 active:shadow-[0_24px_46px_-24px_rgba(15,23,42,0.42)] sm:p-6">
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
              </Reveal>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-[#dcccae] bg-[#fbf5e8] px-6 py-6 shadow-[0_24px_60px_-36px_rgba(96,72,18,0.14)] sm:px-8 sm:py-7">
            <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                Ready to track your Real Estate Business?
              </h2>
              <button
                type="button"
                onClick={handleFounderAccessClick}
                disabled={isFounderCheckoutLoading}
                className="inline-flex items-center justify-center rounded-lg bg-[#d4af37] px-6 py-3 text-base font-semibold text-slate-950 shadow-[0_12px_28px_-14px_rgba(212,175,55,0.75)] transition-colors hover:bg-[#c89e2f] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isFounderCheckoutLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening Stripe...
                  </span>
                ) : (
                  "Join the Founders' Program"
                )}
              </button>
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
                <div className="ml-4 font-display text-sm text-white/50">
                  endlessprospects.app/dashboard
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 sm:p-8 md:grid-cols-3">
                {[
                  {
                    icon: DollarSign,
                    label: "YTD Commissions",
                    value: "$184,250",
                    delta: "+12.4%",
                    color: "text-[#d4af37]",
                  },
                  {
                    icon: Wallet,
                    label: "Expenses",
                    value: "$22,807",
                    delta: "+3.1%",
                    color: "text-[#f7e7b6]",
                  },
                  {
                    icon: Car,
                    label: "Miles driven",
                    value: "8,431",
                    delta: "+248",
                    color: "text-[#d4af37]",
                  },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-sm uppercase tracking-wider text-white/60">
                      <span>{k.label}</span>
                      <k.icon className="h-4 w-4" />
                    </div>
                    <div className="mt-2 font-display text-3xl font-bold tabular-nums text-white">
                      {k.value}
                    </div>
                    <div className={`mt-1 text-sm ${k.color}`}>{k.delta}</div>
                  </div>
                ))}

                <div className="rounded-xl border border-white/10 bg-white/5 p-5 md:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-base font-medium text-white">
                      <TrendingUp className="h-4 w-4 text-[#d4af37]" /> Revenue &middot; last 6
                      months
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
                          <div
                            className={`h-full rounded-full ${r.c}`}
                            style={{ width: `${r.v}%` }}
                          />
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

      <section className="bg-[#efd28a] text-slate-900">
        <div className="relative mx-auto max-w-6xl scroll-mt-28 px-6 py-20" id="pricing">
          <div className="mb-14 text-center">
            <h2 className="font-display text-5xl font-bold text-slate-900 md:text-6xl">
              Simple pricing, real value
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Less than a single closing gift per month.
            </p>
          </div>

          <div className="mx-auto grid max-w-md grid-cols-1 gap-6">
            {tiers.map((tier, idx) => (
              <Reveal key={tier.name} direction="up" delay={idx * 100} className="h-full">
                <div className="relative h-full overflow-visible flex flex-col rounded-2xl border border-[#cfb15a] bg-[linear-gradient(180deg,#fffaf1_0%,#f4e4b4_100%)] p-7 pt-9 shadow-[0_0_0_1px_rgba(207,177,90,0.4),0_34px_84px_-30px_rgba(184,137,24,0.55)] transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl">
                  <div className="pointer-events-none absolute -inset-px rounded-2xl bg-[radial-gradient(circle_at_top,rgba(219,191,107,0.25)_0%,rgba(255,247,227,0.14)_30%,transparent_75%)]" />
                  {tier.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#d8bb66] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-950 shadow-[0_12px_30px_-10px_rgba(184,137,24,0.82)]">
                      {tier.badge}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 font-display text-xl font-bold text-slate-900">
                      <Star
                        className="h-5 w-5 shrink-0 fill-[#d4af37] text-[#b88918] drop-shadow-[0_4px_10px_rgba(212,175,55,0.65)]"
                        strokeWidth={2.2}
                      />
                      <span>{tier.name}</span>
                    </div>
                    <div className="mt-1 mb-5 text-base text-slate-600">{tier.blurb}</div>
                    <div className="mb-6 flex items-baseline gap-1">
                      <div className="font-display text-5xl font-bold tabular-nums text-[#8f6b12]">
                        ${tier.price}
                      </div>
                      <div className="text-base text-slate-500">/month</div>
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleFounderAccessClick}
                      disabled={isFounderCheckoutLoading}
                      className="group relative mb-6 block w-full overflow-hidden rounded-lg bg-[linear-gradient(135deg,#fff0a8_0%,#d4af37_45%,#b88918_100%)] px-4 py-3 text-center text-base font-bold text-slate-950 shadow-[0_18px_40px_-12px_rgba(212,175,55,0.7)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_24px_60px_-12px_rgba(212,175,55,0.85)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      {isFounderCheckoutLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Opening Stripe...
                        </span>
                      ) : (
                        tier.cta
                      )}
                    </button>
                    <ul className="space-y-2.5">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-base text-slate-700">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c59a22]" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Every feature unlocked. Unlimited transactions, secure cloud backup, free updates.
          </p>

        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#030712] text-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="rounded-[2rem] border border-[#d4af37]/30 bg-[linear-gradient(180deg,rgba(10,16,36,0.98)_0%,rgba(4,8,20,0.98)_100%)] px-6 py-10 text-center shadow-[0_22px_60px_-36px_rgba(0,0,0,0.75)] sm:px-10 sm:py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Stop losing hours to messy spreadsheets.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-300 sm:text-lg">
                Join elite agents automating their real estate business. Set up your workspace in 60
                seconds.
              </p>
              <Link
                to="/signup"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-[#d4af37] px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_36px_-16px_rgba(212,175,55,0.75)] transition-colors hover:bg-[#c89e2f]"
              >
                Claim Founders Access
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-10 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)_minmax(320px,420px)] xl:items-start">
            <div className="flex flex-col items-start gap-5">
              <Link to="/landing" className="inline-flex shrink-0">
                <BrandLockup
                  logoClassName="h-16 w-16 rounded-2xl border border-white/10 bg-black ring-0 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.8)] sm:h-20 sm:w-20"
                  titleClassName="text-xl text-white sm:text-2xl"
                  taglineClassName="text-sm text-amber-400"
                  textClassName="max-w-none"
                />
              </Link>
              <div className="font-display text-sm text-slate-300">
                &copy; {new Date().getFullYear()} {BRAND_TITLE} by Endless Prospects
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {footerColumns.map((column) => (
                <div key={column.title} className="space-y-4">
                  <div className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
                    {column.title}
                  </div>
                  <div className="space-y-3">
                    {column.links.map((link) => (
                      <Link
                        key={link.label}
                        to={link.to}
                        className="block font-display text-base text-slate-200 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="justify-self-stretch xl:justify-self-end">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-2 shadow-[0_20px_50px_-34px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                <div className="rounded-[1.5rem] bg-slate-950/95 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <form
                    onSubmit={handleNewsletterSubmit}
                    className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-[0_18px_45px_-32px_rgba(0,0,0,0.45)] backdrop-blur-md"
                  >
                    <div className="mb-3">
                      <div className="font-display text-lg font-bold text-white">
                        Stay in the loop
                      </div>
                      <p className="mt-1 text-sm text-white/60">
                        Click here for product updates for agents and teams
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="email"
                        value={newsletterEmail}
                        onChange={(event) => setNewsletterEmail(event.target.value)}
                        placeholder="Enter your email"
                        className="min-w-0 flex-1 rounded-lg border border-white/12 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/25"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-[#d4af37] px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-[#c89e2f]"
                      >
                        Get updates
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

      </footer>
    </div>
  );
}
