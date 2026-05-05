import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getStripeEnvironment } from "@/lib/stripe";

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

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setSubscription(null); setLoading(false); return; }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as SubscriptionRow | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!user) return;
    // Build the channel and register ALL .on() listeners BEFORE calling
    // .subscribe(). Supabase Realtime forbids adding postgres_changes
    // callbacks after subscribe() and will throw otherwise.
    const channel = supabase.channel(`sub-${user.id}-${Math.random().toString(36).slice(2, 8)}`);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
      () => { refetch(); },
    );
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
    // Intentionally depend only on user.id — refetch is stable enough via
    // useCallback and including it caused the channel to be re-created
    // and re-subscribed in a way that triggered "cannot add callbacks
    // after subscribe()" under StrictMode double-invocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const now = Date.now();
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : null;
  const isActive = !!subscription && (
    (["active", "trialing", "past_due"].includes(subscription.status) && (!periodEnd || periodEnd > now)) ||
    (subscription.status === "canceled" && !!periodEnd && periodEnd > now)
  );

  return { subscription, loading, isActive, refetch };
}
