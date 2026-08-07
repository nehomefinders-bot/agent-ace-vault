import { Link, useRouterState } from "@tanstack/react-router";
import { Bot } from "lucide-react";

export function JackieFab() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path === "/ai-assistant") return null;
  return (
    <Link
      to="/ai-assistant"
      aria-label="Chat with Jackie"
      className="fixed bottom-[5.25rem] right-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#EAB308] px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-lg backdrop-blur-xl transition hover:bg-[#FACC15] hover:shadow-xl hover:brightness-105 md:bottom-24 md:right-6"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A]/10 text-[#0F172A]">
        <Bot className="h-4 w-4" />
      </span>
      <span>Chat with Jackie</span>
    </Link>
  );
}

