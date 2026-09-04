import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import type { StripeEnv } from "./stripe.server";
export type { StripeEnv };

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
    id: "beta_tester",
    name: "14-Day Free Trial",
    tagline: "Start with 14 days free. Then $19.99/month for 6 months.",
    monthly: { priceId: "beta_monthly", amount: 10 },
    yearly: { priceId: "beta_monthly", amount: 10 },
    features: [
      "Every feature unlocked — no tiers, no upsells",
      "Introductory rate: $19.99/mo for first 6 months",
      "Help shape the product roadmap",
      "Direct line to the team",
      "Priority bug-fix turnaround",
    ],
  },
] as const;

export type PlanId = typeof PLANS[number]["id"];
