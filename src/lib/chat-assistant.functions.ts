import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_INSTRUCTION =
  "You are a helpful AI assistant integrated inside the Agent Business Tracker app. Answer questions concisely, accurately, and professionally.";

const MAX_MESSAGE_LEN = 4000;
const MAX_HISTORY = 30;

type ChatTurn = { role: "user" | "assistant"; content: string };

function validate(input: unknown): { messages: ChatTurn[] } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid payload");
  }
  const raw = (input as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Messages are required");
  }
  const messages = raw.slice(-MAX_HISTORY).map((m) => {
    if (!m || typeof m !== "object") throw new Error("Invalid message");
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") throw new Error("Invalid role");
    if (typeof content !== "string" || !content.trim()) throw new Error("Empty message");
    return { role, content: content.slice(0, MAX_MESSAGE_LEN) } as ChatTurn;
  });
  if (messages[messages.length - 1]!.role !== "user") {
    throw new Error("Conversation must end with a user message");
  }
  return { messages };
}

export const sendAssistantMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) throw new Error("AI assistant is not configured.");

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: data.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        }),
      },
    );

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("[sendAssistantMessage] Gemini error", resp.status, detail);
      throw new Error(`Assistant request failed (${resp.status})`);
    }

    const json = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const reply =
      json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n").trim() ?? "";

    return { reply: reply || "I couldn't generate a response. Please try again." };
  });
