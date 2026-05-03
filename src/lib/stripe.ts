import type { StripeEnv } from "./stripe.server";

export function getStripeEnvironment(): StripeEnv {
  if (typeof window === "undefined") return "sandbox";
  const host = window.location.hostname;
  // Treat lovable.app published domain as live; preview/dev as sandbox
  if (host.endsWith(".lovable.app") && !host.includes("id-preview") && !host.includes("-dev.")) {
    return "live";
  }
  return "sandbox";
}

export const PLANS = [
  {
    id: "solo_agent",
    name: "Solo Agent",
    tagline: "For individual agents getting organized.",
    monthly: { priceId: "solo_monthly", amount: 29 },
    yearly: { priceId: "solo_yearly", amount: 290 },
    features: [
      "Books, deals & commissions",
      "Mileage & receipt tracking",
      "Invoices with Stripe payments",
      "Schedule C tax reports",
      "Unlimited clients & listings",
    ],
  },
  {
    id: "pro_agent",
    name: "Pro",
    tagline: "For top producers who want it all.",
    monthly: { priceId: "pro_monthly", amount: 59 },
    yearly: { priceId: "pro_yearly", amount: 590 },
    popular: true,
    features: [
      "Everything in Solo",
      "Advanced reports & dashboards",
      "Document storage & e-sign ready",
      "AI receipt scanning",
      "Priority email support",
    ],
  },
  {
    id: "team_brokerage",
    name: "Team",
    tagline: "For small brokerages, up to 5 seats.",
    monthly: { priceId: "team_monthly", amount: 149 },
    yearly: { priceId: "team_yearly", amount: 1490 },
    features: [
      "Everything in Pro",
      "Up to 5 agent seats",
      "Shared pipeline & deals",
      "Brokerage-level reports",
      "Dedicated onboarding",
    ],
  },
] as const;

export type PlanId = typeof PLANS[number]["id"];
