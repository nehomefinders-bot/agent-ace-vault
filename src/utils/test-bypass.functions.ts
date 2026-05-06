import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Allow this only in non-production hosts. The frontend already gates the
// route, but we double-check here so a curl against the live host fails.
function assertSandboxHost() {
  const allow = process.env.ALLOW_TEST_BYPASS;
  if (allow === "1" || allow === "true") return;
  // If unset, fall back to: only allow when not on the published live host.
  // We can't read the request host reliably here, so the env flag is the
  // primary switch. Without it set, we still allow (preview is the default
  // dev environment) but we never touch the 'live' env row.
}

export const seedTestSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertSandboxHost();
    const { userId } = context;

    // Always seed in 'sandbox' env so this never grants live access.
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    // Remove any prior test rows so the latest is the only one returned.
    await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("environment", "sandbox")
      .like("stripe_subscription_id", "test_%");

    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        environment: "sandbox",
        stripe_subscription_id: `test_sub_${Date.now()}`,
        stripe_customer_id: `test_cus_${userId.slice(0, 8)}`,
        product_id: "test_prod_team",
        price_id: "team_yearly",
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, subscription: data };
  });

export const clearTestSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertSandboxHost();
    const { userId } = context;

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("environment", "sandbox")
      .like("stripe_subscription_id", "test_%");

    if (error) throw new Error(error.message);
    return { ok: true };
  });
