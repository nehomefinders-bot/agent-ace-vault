import { Link, useRouterState } from "@tanstack/react-router";
import { Bot } from "lucide-react";

export function JackieFab() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path === "/ai-assistant") return null;
  return (
    <Link
      to="/ai-assistant"
      aria-label="Chat with Jackie"
      className="fixed bottom-4 right-4 z-50 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full bg-[#EAB308] px-3 py-2.5 text-sm font-semibold text-[#0F172A] shadow-lg backdrop-blur-xl transition hover:bg-[#FACC15] hover:shadow-xl hover:brightness-105 sm:px-4 sm:py-3 md:bottom-6 md:right-6"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F172A]/10 text-[#0F172A]">
        <Bot className="h-4 w-4" />
      </span>
      <span className="hidden sm:inline">Chat with Jackie</span>
    </Link>
  );
}

