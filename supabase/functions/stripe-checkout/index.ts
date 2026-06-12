import "@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe?target=deno";
import { withSupabase } from "@supabase/server";

type CheckoutRequestBody = {
  userEmail?: string;
  email?: string;
  user_email?: string;
  userId?: string;
  user_id?: string;
  priceId?: string;
  price_id?: string;
  priceOverride?: string;
  price_override?: string;
  metadata?: Record<string, string | undefined>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getStripe() {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(secretKey);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function normalizeId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function normalizePriceKey(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function escapeStripeSearchValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function resolvePriceId(stripe: Stripe, body: CheckoutRequestBody) {
  const bodyPriceKey = normalizePriceKey(
    body.priceId ??
      body.price_id ??
      body.priceOverride ??
      body.price_override ??
      body.metadata?.priceId ??
      body.metadata?.price_id ??
      body.metadata?.lovable_price_id ??
      body.metadata?.lovable_external_id,
  );
  const configuredPriceKey = normalizePriceKey(Deno.env.get("STRIPE_PRICE_ID"));
  const lookupKey = bodyPriceKey ?? configuredPriceKey;

  if (!lookupKey) {
    throw new Error("STRIPE_PRICE_ID is not configured");
  }

  if (lookupKey.startsWith("price_")) {
    return { priceId: lookupKey, priceKey: lookupKey };
  }

  const { data, error } = await stripe.prices.search({
    query: `metadata['lovable_external_id']:'${escapeStripeSearchValue(lookupKey)}'`,
    limit: 1,
  });

  if (error) {
    throw new Error(error.message);
  }

  const matchedPrice = data[0];
  if (!matchedPrice) {
    throw new Error(`Price not found: ${lookupKey}`);
  }

  return { priceId: matchedPrice.id, priceKey: lookupKey };
}

async function resolveUserEmail(
  body: CheckoutRequestBody,
  ctx: {
    supabaseAdmin: {
      auth: {
        admin: {
          getUserById: (
            userId: string,
          ) => Promise<{ data: { user: { id?: string; email?: string | null } | null }; error: Error | null }>;
          listUsers: (
            params: { page?: number; perPage?: number },
          ) => Promise<{ data: { users: Array<{ id: string; email?: string | null }> }; error: Error | null }>;
        };
      };
    };
  },
) {
  const explicitEmail = normalizeEmail(body.userEmail ?? body.email ?? body.user_email);
  const explicitUserId = normalizeId(body.userId ?? body.user_id);

  if (explicitEmail && !isValidEmail(explicitEmail)) {
    throw new Error("A valid email address is required.");
  }

  if (explicitUserId && !isUuid(explicitUserId)) {
    throw new Error("A valid user_id is required.");
  }

  if (explicitUserId) {
    const { data, error } = await ctx.supabaseAdmin.auth.admin.getUserById(explicitUserId);
    if (error) {
      throw new Error(error.message);
    }

    const lookedUpEmail = normalizeEmail(data.user?.email);
    if (!lookedUpEmail) {
      throw new Error("Could not resolve an email address for that user_id.");
    }

    if (explicitEmail && explicitEmail !== lookedUpEmail) {
      throw new Error("userEmail does not match user_id.");
    }

    return { userEmail: lookedUpEmail, userId: explicitUserId };
  }

  if (explicitEmail) {
    const perPage = 100;
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await ctx.supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw new Error(error.message);
      }

      const matchedUser = data.users.find((user) => normalizeEmail(user.email) === explicitEmail);
      if (matchedUser) {
        return { userEmail: explicitEmail, userId: matchedUser.id };
      }

      if (data.users.length < perPage) {
        break;
      }
    }

    return { userEmail: explicitEmail, userId: null };
  }

  throw new Error("Provide either userEmail or user_id.");
}

const checkoutHandler = withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as CheckoutRequestBody;
    const { userEmail, userId } = await resolveUserEmail(body, ctx);

    const stripe = getStripe();
    const { priceId, priceKey } = await resolvePriceId(stripe, body);
    const requestMetadata = Object.entries(body.metadata ?? {}).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        const trimmed = value?.trim();
        if (trimmed) acc[key] = trimmed;
        return acc;
      },
      {},
    );
    const sessionMetadata = {
      ...requestMetadata,
      userEmail,
      founderPriceId: priceKey,
      ...(userId ? { userId } : {}),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      success_url: "https://endlessprospects.net/dashboard?payment=success",
      cancel_url: "https://endlessprospects.net/dashboard?payment=cancel",
      metadata: sessionMetadata,
      subscription_data: {
        metadata: sessionMetadata,
      },
    });

    if (!session.url) {
      return json({ error: "Stripe did not return a checkout URL." }, 502);
    }

    return json({ url: session.url });
  } catch (error) {
    console.error("stripe-checkout error", error);
    return json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, 400);
  }
});

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    return checkoutHandler(req);
  },
};
