import { Link, useRouterState } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";

export function PocketBrokerFab() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path === "/pocket-broker-test" || path === "/landing") return null;
  return (
    <Link
      to="/pocket-broker-test"
      aria-label="Open Pocket Broker"
      className="fixed bottom-[148px] right-4 z-50 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full bg-[#EAB308] px-3 py-2.5 text-sm font-semibold text-[#0F172A] shadow-lg backdrop-blur-xl transition hover:bg-[#FACC15] hover:shadow-xl hover:brightness-105 sm:bottom-[148px] sm:right-6 sm:px-4 sm:py-3"
    >
      <Briefcase className="h-5 w-5 shrink-0" />
      <span className="hidden sm:inline">Pocket Broker</span>
    </Link>
  );
}
