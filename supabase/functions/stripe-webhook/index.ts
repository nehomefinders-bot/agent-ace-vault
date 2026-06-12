import Stripe from "https://esm.sh/stripe?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CheckoutSession = {
  id?: string;
  metadata?: Record<string, string | undefined> | null;
  client_reference_id?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
  customer_email?: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getStripe() {
  return new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SUPABASE_PUBLIC_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const missing = [
      ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
      ...(!supabaseServiceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function normalizeId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function extractLookup(session: CheckoutSession) {
  const metadataUserId = normalizeId(
    session.metadata?.userId ?? session.metadata?.user_id ?? session.client_reference_id,
  );
  const metadataEmail = normalizeEmail(
    session.metadata?.userEmail ?? session.metadata?.email ?? null,
  );
  const customerEmail = normalizeEmail(
    session.customer_details?.email ?? session.customer_email ?? null,
  );

  return {
    userId: metadataUserId && isUuid(metadataUserId) ? metadataUserId : null,
    email: metadataEmail ?? customerEmail,
  };
}

async function findUserIdByEmail(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  email: string,
) {
  const perPage = 100;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const matchedUser = data.users.find((user) => normalizeEmail(user.email) === email);
    if (matchedUser) {
      return matchedUser.id;
    }

    if (data.users.length < perPage) {
      break;
    }
  }

  return null;
}

async function applyFounderTier(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ plan: "Founder Tier" })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return textResponse("Method not allowed", 405);
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return textResponse("Missing Stripe signature", 400);
    }

    const rawBody = await req.text();
    const stripe = getStripe();
    const webhookSecret = getRequiredEnv("STRIPE_WEBHOOK_SIGNING_SECRET");

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error("stripe-webhook signature verification failed", error);
      return textResponse("Invalid signature", 400);
    }

    if (event.type !== "checkout.session.completed") {
      return textResponse("OK", 200);
    }

    const session = event.data.object as CheckoutSession;
    const { userId: metadataUserId, email } = extractLookup(session);
    const supabaseAdmin = getSupabaseAdmin();

    let userId = metadataUserId;
    if (!userId && email) {
      userId = await findUserIdByEmail(supabaseAdmin, email);
    }

    if (!userId) {
      console.warn("stripe-webhook: unable to resolve user for checkout session", {
        sessionId: session.id,
        email,
      });
      return textResponse("OK", 200);
    }

    const updated = await applyFounderTier(supabaseAdmin, userId);
    if (!updated) {
      console.warn("stripe-webhook: no profile row found for user", {
        sessionId: session.id,
        userId,
      });
    } else {
      console.log("stripe-webhook: founder tier applied", {
        sessionId: session.id,
        userId,
      });
    }

    return textResponse("OK", 200);
  } catch (error) {
    console.error("stripe-webhook error", error);
    return textResponse("Webhook processing failed", 500);
  }
});
