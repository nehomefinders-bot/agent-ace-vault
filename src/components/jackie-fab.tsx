import { Link, useRouterState } from "@tanstack/react-router";
import { Bot } from "lucide-react";

export function JackieFab() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path === "/ai-assistant") return null;
  return (
    <Link
      to="/ai-assistant"
      aria-label="Chat with Jackie"
      className="fixed bottom-20 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/30 bg-card/95 px-4 py-3 text-sm font-medium text-foreground shadow-[0_12px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:border-primary/45 hover:bg-card md:bottom-24 md:right-6"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary">
        <Bot className="h-4 w-4" />
      </span>
      <span>Chat with Jackie</span>
    </Link>
  );
}
