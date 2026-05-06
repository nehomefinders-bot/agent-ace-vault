import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

const SAAS_TAX_CODE = "txcd_10103001";

async function ensureProductTaxCode(stripe: ReturnType<typeof createStripeClient>, productId: string) {
  try {
    const product = await stripe.products.retrieve(productId);
    if (!(product as any).tax_code) {
      await stripe.products.update(productId, { tax_code: SAAS_TAX_CODE });
    }
  } catch (e) {
    console.error("ensureProductTaxCode failed:", e);
  }
}

/**
 * Creates an embedded Stripe Checkout session.
 * Returns clientSecret for <EmbeddedCheckout />.
 *
 * Uses managed_payments (full compliance handling): Stripe handles tax
 * calculation/collection/filing/remittance, fraud, disputes, and customer support.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; environment: StripeEnv; returnUrl: string }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId, supabase, claims } = context;
    const stripe = createStripeClient(data.environment);

    // Look up the price by our human-readable external id.
    const prices = await stripe.prices.search({
      query: `metadata['lovable_external_id']:'${data.priceId}'`,
      limit: 1,
    });
    const stripePrice = prices.data[0];
    if (!stripePrice) throw new Error(`Price not found: ${data.priceId}. Have you created the products yet?`);

    // Make sure the product has a tax code so managed_payments / tax works.
    if (typeof stripePrice.product === "string") {
      await ensureProductTaxCode(stripe, stripePrice.product);
    }

    // Reuse customer if we have one for this env.
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, status, current_period_end")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Block creating a duplicate active subscription
    const activeStatuses = ["active", "trialing", "past_due"];
    if (existing && activeStatuses.includes(existing.status as string)) {
      throw new Error("You already have an active subscription. Use 'Manage billing' to change plans.");
    }

    const customerId = existing?.stripe_customer_id as string | undefined;
    const customerEmail = (claims as any)?.email as string | undefined;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded",
      return_url: data.returnUrl,
      ...(customerId
        ? { customer: customerId }
        : customerEmail
        ? { customer_email: customerEmail }
        : {}),
      managed_payments: { enabled: true } as any,
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId },
      },
      metadata: { userId, lovable_price_id: data.priceId, managed_payments: "true" },
      allow_promotion_codes: true,
    });

    return { clientSecret: (session as any).client_secret as string };
  });

/** Returns a hosted Stripe Customer Portal URL — opens in a new tab. */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError || !sub?.stripe_customer_id) throw new Error("No subscription found");

    const stripe = createStripeClient(data.environment);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id as string,
      return_url: data.returnUrl,
    });
    return { url: portal.url };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) throw new Error("No subscription found");

    const stripe = createStripeClient(data.environment);
    await stripe.subscriptions.update(sub.stripe_subscription_id as string, {
      cancel_at_period_end: true,
    });
    return { ok: true };
  });

export const resumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) throw new Error("No subscription found");

    const stripe = createStripeClient(data.environment);
    await stripe.subscriptions.update(sub.stripe_subscription_id as string, {
      cancel_at_period_end: false,
    });
    return { ok: true };
  });
