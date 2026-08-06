const SYSTEM_INSTRUCTION =
  "You are a helpful AI assistant built inside the Agent Business Tracker. Answer questions concisely, accurately, and professionally.";

export const MAX_MESSAGE_LEN = 8000;
export const MAX_HISTORY = 40;

export type ChatRole = "user" | "model";
export type ChatTurn = { role: ChatRole; content: string };

export function validateSendInput(input: unknown): { sessionId: string | null; message: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid payload");
  }
  const { sessionId, message } = input as { sessionId?: unknown; message?: unknown };
  if (typeof message !== "string" || !message.trim()) throw new Error("Message is required");
  if (sessionId != null && typeof sessionId !== "string") throw new Error("Invalid session");
  return {
    sessionId: (sessionId as string | undefined) ?? null,
    message: message.trim().slice(0, MAX_MESSAGE_LEN),
  };
}

export function validateSessionId(input: unknown): { sessionId: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid payload");
  const { sessionId } = input as { sessionId?: unknown };
  if (typeof sessionId !== "string" || !sessionId) throw new Error("Session id is required");
  return { sessionId };
}

export function validateRename(input: unknown): { sessionId: string; title: string } {
  const { sessionId } = validateSessionId(input);
  const { title } = input as { title?: unknown };
  if (typeof title !== "string" || !title.trim()) throw new Error("Title is required");
  return { sessionId, title: title.trim().slice(0, 120) };
}

export function deriveTitle(message: string): string {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean || "New chat";
}

export async function callGemini(history: ChatTurn[]): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: history.slice(-MAX_HISTORY).map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
      }),
    },
  );

  if (!resp.ok) {
    const detail = await resp.text();
    console.error("[chat-assistant] Gemini error", resp.status, detail);
    throw new Error(`Assistant request failed (${resp.status})`);
  }

  const json = (await resp.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const reply =
    json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n").trim() ?? "";
  return reply || "I couldn't generate a response. Please try again.";
}
