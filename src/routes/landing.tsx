import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, BookOpen, Car, Receipt, ScanLine, ArrowRight, Sparkles } from "lucide-react";
import endlessProspectsLogo from "@/assets/endless-prospects-logo.png";

export const Route = createFileRoute("/landing")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Agent Business Tracker — QuickBooks built for real estate agents" },
      { name: "description", content: "Track commissions, expenses, mileage and owner loans in one place. Tax-ready Schedule C reports built for agents and brokers." },
      { property: "og:title", content: "Agent Business Tracker — QuickBooks for real estate agents" },
      { property: "og:description", content: "All-in-one books, mileage and client tracking for agents. Tax-ready in one click." },
    ],
  }),
});

const tiers = [
  {
    name: "Beta Tester",
    price: 9.99,
    blurb: "All features unlocked for 6 months while we gather feedback.",
    features: [
      "All Pro & Team features unlocked",
      "Just $9.99/mo for 6 months",
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

function Landing() {
  return (
    <div className="min-h-dvh w-full bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display font-bold text-base leading-none">Agent</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Business Tracker</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm font-medium px-4 py-2 hover:text-foreground text-muted-foreground">Sign in</Link>
            <Link to="/auth" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-6">
          <Sparkles className="h-3 w-3" /> Built for real estate agents
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-[1.05]">
          QuickBooks built for the way <span className="text-primary">agents actually work</span>.
        </h1>
        <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto">
          Track commissions, write off every mile, log expenses across all your cards, and hand your CPA a tax-ready Schedule C.
          Without the QuickBooks learning curve.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium inline-flex items-center gap-2">
            Start your free 14-day trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/" className="px-6 py-3 rounded-lg text-sm font-medium border border-border">
            See live demo
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-4">No credit card required · Cancel anytime</p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, title: "Double-entry books", body: "Real bookkeeping under a friendly UI. Multiple bank accounts and cards." },
          { icon: Car,      title: "Live mileage tracker", body: "Tap start, drive, tap stop. Or punch in two addresses." },
          { icon: Receipt,  title: "Stripe invoicing", body: "Send invoices, get paid, books update automatically." },
          { icon: ScanLine, title: "Receipt capture", body: "Snap, categorize, file. Everything ready come April." },
        ].map((f) => (
          <div key={f.title} className="bg-card border border-border rounded-2xl p-6">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <f.icon className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div className="font-display font-bold mb-1">{f.title}</div>
            <div className="text-sm text-muted-foreground">{f.body}</div>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-20" id="pricing">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl font-bold">Simple pricing, real value</h2>
          <p className="text-muted-foreground mt-3">Less than a single closing gift per month.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div key={tier.name}
              className={`relative rounded-2xl p-7 border ${tier.featured
                ? "border-primary bg-card shadow-card"
                : "border-border bg-card"}`}>
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success text-success-foreground text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full">
                  {tier.badge}
                </div>
              )}
              <div className="font-display font-bold text-lg">{tier.name}</div>
              <div className="text-sm text-muted-foreground mt-1 mb-5">{tier.blurb}</div>
              <div className="flex items-baseline gap-1 mb-6">
                <div className="font-display text-5xl font-bold tabular-nums">${tier.price}</div>
                <div className="text-sm text-muted-foreground">/mo</div>
              </div>
              {tier.seat && (
                <div className="text-xs text-muted-foreground mb-4">+ ${tier.seat}/agent seat</div>
              )}
              <Link to="/auth"
                className={`block text-center w-full px-4 py-2.5 rounded-lg text-sm font-medium mb-6 ${
                  tier.featured ? "bg-primary text-primary-foreground" : "border border-border"
                }`}>
                {tier.cta}
              </Link>
              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          All plans include unlimited transactions, secure cloud backup, and free updates.
        </p>
      </section>

      <footer className="border-t border-border mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8 text-xs text-muted-foreground flex justify-between">
          <div>© {new Date().getFullYear()} Agent Business Tracker</div>
          <div className="flex gap-4">
            <Link to="/auth">Sign in</Link>
            <Link to="/help">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
