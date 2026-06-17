import Stripe from "https://esm.sh/stripe?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getStripe() {
  return new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SUPABASE_PUBLIC_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeEmail(v?: string | null) {
  const t = v?.trim().toLowerCase();
  return t ? t : null;
}
function normalizeId(v?: string | null) {
  const t = v?.trim();
  return t ? t : null;
}
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type Admin = ReturnType<typeof getSupabaseAdmin>;

async function findUserIdByEmail(admin: Admin, email: string) {
  const perPage = 100;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => normalizeEmail(u.email) === email);
    if (match) return match.id;
    if (data.users.length < perPage) break;
  }
  return null;
}

async function resolveEmailFromCustomer(stripe: Stripe, customerId: string | null) {
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ((customer as { deleted?: boolean }).deleted) return null;
    return normalizeEmail((customer as Stripe.Customer).email);
  } catch (e) {
    console.error("stripe-webhook: customer retrieve failed", e);
    return null;
  }
}

async function activateUser(admin: Admin, userId: string) {
  const { data, error } = await admin
    .from("profiles")
    .update({ plan: "active" })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function resolveUserId(
  admin: Admin,
  stripe: Stripe,
  opts: {
    metadataUserId?: string | null;
    metadataEmail?: string | null;
    fallbackEmail?: string | null;
    customerId?: string | null;
  },
) {
  const metaId = normalizeId(opts.metadataUserId);
  if (metaId && isUuid(metaId)) return metaId;

  const candidates: (string | null)[] = [
    normalizeEmail(opts.metadataEmail),
    normalizeEmail(opts.fallbackEmail),
    await resolveEmailFromCustomer(stripe, opts.customerId ?? null),
  ];
  for (const email of candidates) {
    if (!email) continue;
    const id = await findUserIdByEmail(admin, email);
    if (id) return id;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return textResponse("Method not allowed", 405);

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) return textResponse("Missing Stripe signature", 400);

    const rawBody = await req.text();
    const stripe = getStripe();
    const webhookSecret = getRequiredEnv("STRIPE_WEBHOOK_SIGNING_SECRET");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error("stripe-webhook signature verification failed", error);
      return textResponse("Invalid signature", 400);
    }

    const admin = getSupabaseAdmin();
    let userId: string | null = null;

    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      userId = await resolveUserId(admin, stripe, {
        metadataUserId: s.metadata?.userId ?? s.metadata?.user_id ?? s.client_reference_id,
        metadataEmail: s.metadata?.userEmail ?? s.metadata?.email,
        fallbackEmail: s.customer_details?.email ?? s.customer_email,
        customerId: typeof s.customer === "string" ? s.customer : s.customer?.id ?? null,
      });
    } else if (event.type === "invoice.payment_succeeded") {
      const inv = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };
      let subMetadata: Record<string, string | undefined> | null = null;
      const subRef = inv.subscription;
      const subId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
      if (subId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          subMetadata = sub.metadata ?? null;
        } catch (e) {
          console.error("stripe-webhook: subscription retrieve failed", e);
        }
      }
      userId = await resolveUserId(admin, stripe, {
        metadataUserId: subMetadata?.userId ?? subMetadata?.user_id,
        metadataEmail: subMetadata?.userEmail ?? subMetadata?.email,
        fallbackEmail: inv.customer_email,
        customerId: typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null,
      });
    } else {
      return textResponse("OK", 200);
    }

    if (!userId) {
      console.warn("stripe-webhook: unable to resolve user", { type: event.type, id: event.id });
      return textResponse("OK", 200);
    }

    const ok = await activateUser(admin, userId);
    console.log("stripe-webhook: activation", { type: event.type, userId, updated: ok });
    return textResponse("OK", 200);
  } catch (error) {
    console.error("stripe-webhook error", error);
    return textResponse("Webhook processing failed", 500);
  }
});
