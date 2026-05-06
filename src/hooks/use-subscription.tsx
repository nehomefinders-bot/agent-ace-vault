import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  SUBSCRIPTION_SYNC_EVENT,
  type SubscriptionRow,
  type SubscriptionSyncDetail,
} from "@/utils/test-bypass.functions";

export function useSubscription() {
  const { user } = useAuth();
  const userId = user?.id;
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const environment = getStripeEnvironment();

  const refetch = useCallback(async () => {
    setLoading(true);
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("environment", environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription((data as SubscriptionRow | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [environment, userId]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<SubscriptionSyncDetail>).detail;
      if (!detail) return;
      if (detail.userId !== userId) return;
      if (detail.environment !== environment) return;
      setSubscription(detail.subscription);
      setLoading(false);
    };

    window.addEventListener(SUBSCRIPTION_SYNC_EVENT, onSync as EventListener);
    return () => window.removeEventListener(SUBSCRIPTION_SYNC_EVENT, onSync as EventListener);
  }, [environment, userId]);

  useEffect(() => {
    if (!userId) return;
    // Build the channel and register ALL .on() listeners BEFORE calling
    // .subscribe(). Supabase Realtime forbids adding postgres_changes
    // callbacks after subscribe() and will throw otherwise.
    const channel = supabase.channel(`sub-${userId}-${Math.random().toString(36).slice(2, 8)}`);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
      () => { refetch(); },
    );
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
    // Intentionally depend only on user.id — refetch is stable enough via
    // useCallback and including it caused the channel to be re-created
    // and re-subscribed in a way that triggered "cannot add callbacks
    // after subscribe()" under StrictMode double-invocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const now = Date.now();
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : null;
  const isActive = !!subscription && (
    (["active", "trialing", "past_due"].includes(subscription.status) && (!periodEnd || periodEnd > now)) ||
    (subscription.status === "canceled" && !!periodEnd && periodEnd > now)
  );

  return { subscription, loading, isActive, refetch };
}
