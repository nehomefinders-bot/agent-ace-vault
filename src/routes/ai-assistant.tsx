import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendAssistantMessage } from "@/lib/chat-assistant.functions";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant - Agent Business Tracker" },
      {
        name: "description",
        content:
          "Ask the built-in AI assistant questions about your real estate business, deals, and workflow inside Agent Business Tracker.",
      },
      { property: "og:title", content: "AI Assistant - Agent Business Tracker" },
      {
        property: "og:description",
        content: "Chat with the built-in AI assistant for quick answers inside your tracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiAssistantPage,
});

type ChatTurn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Summarize what I should focus on this week",
  "Draft a follow-up email to a buyer lead",
  "What expenses are deductible on Schedule C?",
];

function AiAssistantPage() {
  const send = useServerFn(sendAssistantMessage);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: ChatTurn[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await send({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "The assistant is unavailable right now.");
      setMessages(next);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <PageShell
      title="AI Assistant"
      subtitle="Ask questions, draft messages, and get quick answers without leaving your tracker."
    >
      <div className="flex h-[calc(100dvh-14rem)] min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div ref={feedRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          {messages.length === 0 && !loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">How can I help today?</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Start a conversation — your chat stays in this session.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void submit(s)}
                    className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6 sm:max-w-[70%] ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="text-muted-foreground inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
          className="flex items-end gap-2 border-t border-border/70 bg-card px-3 py-3 sm:px-4"
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(input);
              }
            }}
            placeholder="Ask the assistant anything…"
            rows={1}
            className="max-h-40 min-h-11 flex-1 resize-none"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="h-11 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </PageShell>
  );
}
