import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient } from "@/lib/stripe.server";

// Software-as-a-Service tax code — applies to all 3 plans
const SAAS_TAX_CODE = "txcd_10103001";
const PRODUCT_IDS = ["solo_agent", "pro_agent", "team_brokerage"];

// One-time setup endpoint. Hit it once per environment after deploy.
// GET /api/public/payments/apply-tax-codes?env=sandbox&secret=<LOVABLE_API_KEY>
export const Route = createFileRoute("/api/public/payments/apply-tax-codes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const env = url.searchParams.get("env");
        const secret = url.searchParams.get("secret");
        if (secret !== process.env.LOVABLE_API_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (env !== "sandbox" && env !== "live") {
          return new Response("env must be sandbox or live", { status: 400 });
        }
        const stripe = createStripeClient(env);
        const results: Array<{ id: string; ok: boolean; error?: string }> = [];

        for (const externalId of PRODUCT_IDS) {
          try {
            const products = await stripe.products.search({
              query: `metadata['lovable_external_id']:'${externalId}'`,
              limit: 1,
            });
            const product = products.data[0];
            if (!product) {
              results.push({ id: externalId, ok: false, error: "not found" });
              continue;
            }
            await stripe.products.update(product.id, { tax_code: SAAS_TAX_CODE });
            results.push({ id: externalId, ok: true });
          } catch (e) {
            results.push({ id: externalId, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ env, tax_code: SAAS_TAX_CODE, results });
      },
    },
  },
});
