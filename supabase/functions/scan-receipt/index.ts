// Scans a receipt image with Lovable AI (Gemini multimodal) and returns
// structured fields: vendor, date, subtotal, tax, total, suggested_category.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "Advertising & Marketing",
  "Auto — Gas & Maintenance",
  "Continuing Education",
  "Dues & Subscriptions (MLS)",
  "Insurance (E&O, Liability)",
  "Legal & Professional Fees",
  "Meals (50% deductible)",
  "Office Supplies",
  "Office Rent",
  "Software & Subscriptions",
  "Staging & Photography",
  "Travel",
  "Telephone & Internet",
  "Bank & Merchant Fees",
  "Gifts (capped $25/client)",
  "Other Business Expenses",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl } = await req.json();
    if (!imageDataUrl) {
      return json({ error: "imageDataUrl required" }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const systemPrompt =
      "You are an accounting assistant for a real estate agent. " +
      "Extract receipt fields and pick the best Schedule C category from the provided list. " +
      "If a field is not visible, return null for it.";

    const userText =
      "Extract this receipt. Categories to choose from: " + CATEGORIES.join(", ");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "record_receipt",
              description: "Record extracted receipt data",
              parameters: {
                type: "object",
                properties: {
                  vendor: { type: ["string", "null"] },
                  receipt_date: {
                    type: ["string", "null"],
                    description: "ISO yyyy-mm-dd",
                  },
                  subtotal: { type: ["number", "null"] },
                  tax: { type: ["number", "null"] },
                  total: { type: ["number", "null"] },
                  suggested_category: {
                    type: ["string", "null"],
                    enum: [...CATEGORIES, null],
                  },
                  notes: { type: ["string", "null"] },
                },
                required: [
                  "vendor",
                  "receipt_date",
                  "total",
                  "suggested_category",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "record_receipt" } },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      if (resp.status === 429) return json({ error: "Rate limit exceeded — try again in a moment." }, 429);
      if (resp.status === 402) return json({ error: "AI credits exhausted. Add funds in Settings → Workspace." }, 402);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments
      ? JSON.parse(call.function.arguments)
      : null;

    if (!args) return json({ error: "Could not extract receipt data" }, 422);

    return json({ ok: true, extracted: args, raw: data });
  } catch (e) {
    console.error("scan-receipt error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
