import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; environment: StripeEnv; returnUrl: string }) => data)
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const stripe = createStripeClient(data.environment);

    // Find or create stripe customer for this user
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id as string | undefined;

    // Look up the actual Stripe price by lovable_external_id metadata
    const prices = await stripe.prices.search({
      query: `metadata['lovable_external_id']:'${data.priceId}'`,
      limit: 1,
    });
    const stripePrice = prices.data[0];
    if (!stripePrice) throw new Error(`Price not found: ${data.priceId}`);

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      ...(customerId ? { customer: customerId } : { customer_creation: "always" as any }),
      subscription_data: {
        metadata: { userId },
      },
      metadata: { userId },
    });

    return { url: (session as any).url as string };
  });

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
