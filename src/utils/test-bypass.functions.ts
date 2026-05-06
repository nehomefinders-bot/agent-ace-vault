import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment, type StripeEnv } from "@/lib/stripe";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

type TestSubscriptionPayload = Omit<SubscriptionRow, "id">;

export type SubscriptionSyncDetail = {
  userId: string;
  environment: StripeEnv;
  subscription: SubscriptionRow | null;
};

export const SUBSCRIPTION_SYNC_EVENT = "subscription:sync";

export function broadcastSubscriptionSync(detail: SubscriptionSyncDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_SYNC_EVENT, { detail }));
}

async function assertSignedIn() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session?.user) throw new Error("Please sign in again.");
  return data.session.user;
}

function buildTestSubscription(userId: string, environment: StripeEnv): TestSubscriptionPayload {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replaceAll("-", "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  return {
    user_id: userId,
    stripe_subscription_id: `test_sub_${randomId}`,
    stripe_customer_id: `test_cus_${userId.replaceAll("-", "").slice(0, 8)}`,
    product_id: "test_prod_team",
    price_id: "team_yearly",
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    environment,
  };
}

function isPermissionError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "42501" || /row-level security|permission denied|not authorized/i.test(error.message ?? "");
}

async function seedTestSubscriptionDirect(userId: string, environment: StripeEnv) {
  const subscription = buildTestSubscription(userId, environment);

  const { error: deleteError } = await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("environment", environment)
    .like("stripe_subscription_id", "test_%");
  if (deleteError) throw deleteError;

  const { data, error } = await supabase
    .from("subscriptions")
    .insert(subscription)
    .select("*")
    .single();
  if (error) throw error;

  return data as SubscriptionRow;
}

async function clearTestSubscriptionDirect(userId: string, environment: StripeEnv) {
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("environment", environment)
    .like("stripe_subscription_id", "test_%");
  if (error) throw error;
}

async function seedTestSubscriptionRpc(environment: StripeEnv) {
  const { data, error } = await supabase.rpc("seed_test_subscription", { environment });
  if (error) throw error;
  return data as SubscriptionRow;
}

async function clearTestSubscriptionRpc(environment: StripeEnv) {
  const { error } = await supabase.rpc("clear_test_subscription", { environment });
  if (error) throw error;
}

export async function seedTestSubscription(environment: StripeEnv = getStripeEnvironment()) {
  const user = await assertSignedIn();

  let subscription: SubscriptionRow;
  try {
    subscription = await seedTestSubscriptionDirect(user.id, environment);
  } catch (error) {
    if (!isPermissionError(error)) throw error;
    subscription = await seedTestSubscriptionRpc(environment);
  }

  broadcastSubscriptionSync({
    userId: user.id,
    environment,
    subscription,
  });

  return { ok: true, subscription };
}

export async function clearTestSubscription(environment: StripeEnv = getStripeEnvironment()) {
  const user = await assertSignedIn();

  try {
    await clearTestSubscriptionDirect(user.id, environment);
  } catch (error) {
    if (!isPermissionError(error)) throw error;
    await clearTestSubscriptionRpc(environment);
  }

  broadcastSubscriptionSync({
    userId: user.id,
    environment,
    subscription: null,
  });

  return { ok: true };
}
