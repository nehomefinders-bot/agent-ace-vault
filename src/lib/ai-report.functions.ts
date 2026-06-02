import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_INSTRUCTION =
  "You are an elite enterprise CFO and real estate asset analyst. Audit this raw business ledger data. Highlight primary expense drivers, evaluate financial health velocity, and provide three strict operational improvements to maximize net commission margins.";

export const generateExecutiveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid payload");
    }
    return input as Record<string, unknown>;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Analyze the following ledger data and produce a markdown executive report with sections: Executive Summary, Primary Expense Drivers, Financial Health Velocity, and Three Operational Improvements.\n\n```json\n" +
                    JSON.stringify(data, null, 2) +
                    "\n```",
                },
              ],
            },
          ],
        }),
      },
    );

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${t.slice(0, 300)}`);
    }

    const json = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";

    return { narrative: text || "No analysis returned." };
  });
