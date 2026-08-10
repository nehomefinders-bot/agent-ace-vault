import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Loader2,
  MessageSquarePlus,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
  User as UserIcon,
  PanelLeft,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createChatFolder,
  deleteChatFolder,
  deleteChatSession,
  getChatMessages,
  listChatFolders,
  listChatSessions,
  moveChatSession,
  renameChatFolder,
  renameChatSession,
  sendAssistantMessage,
} from "@/lib/chat-assistant.functions";


export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "Chat with Jackie - Agent Business Tracker" },
      {
        name: "description",
        content:
          "Chat with Jackie, the built-in AI assistant, about your real estate business, deals, and workflow, with saved conversation history.",
      },
      { property: "og:title", content: "Chat with Jackie - Agent Business Tracker" },
      {
        property: "og:description",
        content: "A ChatGPT-style assistant named Jackie with saved chat history inside your tracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiAssistantPage,
});

type SessionRow = { id: string; title: string; created_at: string; updated_at: string };
type MessageRow = { id: string; role: string; content: string; created_at: string };

const SUGGESTIONS = [
  "Summarize what I should focus on this week",
  "Draft a follow-up email to a buyer lead",
  "What expenses are deductible on Schedule C?",
];

function AiAssistantPage() {
  const { user, loading: authLoading } = useAuth();

  const send = useServerFn(sendAssistantMessage);
  const loadSessions = useServerFn(listChatSessions);
  const loadMessages = useServerFn(getChatMessages);
  const removeSession = useServerFn(deleteChatSession);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshSessions = useCallback(async () => {
    // Never call the protected server fn before a Supabase session exists —
    // the auth middleware throws a raw 401 Response ("Error: [object Response]").
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    try {
      const rows = (await loadSessions({})) as SessionRow[];
      setSessions(rows);
    } catch (err) {
      console.error(err);
    }
  }, [loadSessions]);

  useEffect(() => {
    if (authLoading || !user) return;
    void refreshSessions();
  }, [authLoading, user, refreshSessions]);


  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function openSession(id: string) {
    setActiveId(id);
    setHistoryOpen(false);
    try {
      const rows = (await loadMessages({ data: { sessionId: id } })) as MessageRow[];
      setMessages(rows);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't load that conversation.");
    }
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setHistoryOpen(false);
    inputRef.current?.focus();
  }

  async function handleDelete(id: string) {
    try {
      await removeSession({ data: { sessionId: id } });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) newChat();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't delete that conversation.");
    }
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const optimistic: MessageRow = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setLoading(true);
    try {
      const res = await send({ data: { sessionId: activeId, message: trimmed } });
      setActiveId(res.sessionId);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        res.userMessage as MessageRow,
        res.assistantMessage as MessageRow,
      ]);
      if (res.error) toast.error(res.error);
      void refreshSessions();
    } catch (err) {
      console.error(err);
      const detail = err instanceof Error ? err.message : "The assistant is unavailable right now.";
      toast.error(detail);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { ...optimistic, id: `usr-${Date.now()}` },
        {
          id: `err-${Date.now()}`,
          role: "model",
          content: `Error: ${detail}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const historyPanel = (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <Button onClick={newChat} className="w-full justify-start gap-2" variant="secondary">
        <MessageSquarePlus className="h-4 w-4" /> New chat
      </Button>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-xs">No saved conversations yet.</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1 rounded-lg px-2 ${
                activeId === s.id ? "bg-muted" : "hover:bg-muted/60"
              }`}
            >
              <button
                type="button"
                onClick={() => void openSession(s.id)}
                className="flex-1 truncate py-2 text-left text-sm"
                title={s.title}
              >
                {s.title}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(s.id)}
                aria-label={`Delete ${s.title}`}
                className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1.5 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <PageShell
      title="Chat with Jackie"
      subtitle="Ask questions, draft messages, and pick up past conversations — history is saved to your account."
    >
      <div className="mb-24 flex h-[calc(100dvh-18rem)] min-h-[26rem] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm sm:mb-28">
        <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-muted/30 md:block">
          {historyPanel}
        </aside>

        {historyOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <button
              type="button"
              aria-label="Close history"
              onClick={() => setHistoryOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <div className="relative h-full w-[min(18rem,85%)] bg-card shadow-xl">{historyPanel}</div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2 md:hidden">
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} className="gap-2">
              <PanelLeft className="h-4 w-4" /> History
            </Button>
            <Button variant="ghost" size="sm" onClick={newChat} className="ml-auto gap-2">
              <MessageSquarePlus className="h-4 w-4" /> New
            </Button>
          </div>

          <div ref={feedRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
            {messages.length === 0 && !loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">How can I help today?</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Your conversations are saved so you can return to them anytime.
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
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role !== "user" && (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 sm:max-w-[70%] ${
                      m.role === "user"
                        ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
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
      </div>
    </PageShell>
  );
}
