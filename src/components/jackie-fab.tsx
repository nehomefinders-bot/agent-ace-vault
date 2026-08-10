import { Link, useRouterState } from "@tanstack/react-router";
import jackieAvatar from "@/assets/jackie-avatar.jpg.asset.json";


export function JackieFab() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path === "/ai-assistant" || path === "/landing") return null;
  return (
    <Link
      to="/ai-assistant"
      aria-label="Chat with Jackie"
      className="fixed bottom-4 right-4 z-50 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full bg-[#EAB308] px-3 py-2.5 text-sm font-semibold text-[#0F172A] shadow-lg backdrop-blur-xl transition hover:bg-[#FACC15] hover:shadow-xl hover:brightness-105 sm:px-4 sm:py-3 md:bottom-6 md:right-6"
    >
      <img
        src={jackieAvatar.url}
        alt="Jackie"
        loading="lazy"
        className="h-8 w-8 shrink-0 rounded-full object-cover object-top ring-2 ring-[#0F172A]/15"
      />
      <span className="hidden sm:inline">Chat with Jackie</span>
    </Link>
  );
}

