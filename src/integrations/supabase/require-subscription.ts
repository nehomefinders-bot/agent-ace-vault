// Server-function middleware that enforces an active subscription on top
// of `requireSupabaseAuth`. Use this for sensitive paid features so they
// cannot be invoked by users whose subscription has lapsed, even if they
// manipulate client-side paywall state.
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

export const requireActiveSubscription = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase.rpc("has_active_subscription", {
      user_uuid: userId,
    });

    if (error) {
      console.error("[requireActiveSubscription] RPC error", error);
      throw new Response("Subscription check failed", { status: 500 });
    }

    if (!data) {
      throw new Response("Active subscription required", { status: 402 });
    }

    return next();
  });
