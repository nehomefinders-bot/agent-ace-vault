import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import type { StripeEnv } from "./stripe.server";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

let stripePromise: Promise<StripeJs | null> | null = null;
export function getStripe(): Promise<StripeJs | null> {
  if (!stripePromise) {
    if (!clientToken) throw new Error("Payments are not configured (missing VITE_PAYMENTS_CLIENT_TOKEN)");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  // Derive from the publishable key prefix — the source of truth.
  if (clientToken?.startsWith("pk_live_")) return "live";
  return "sandbox";
}

export function isTestMode(): boolean {
  return getStripeEnvironment() === "sandbox";
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthly: { priceId: string; amount: number };
  yearly: { priceId: string; amount: number };
  popular?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
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
