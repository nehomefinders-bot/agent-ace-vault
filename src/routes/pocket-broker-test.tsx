import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/hooks/use-auth";

const POCKET_BROKER_BASE_URL = "https://app.endlessprospects.org/";

function buildPocketBrokerUrl(userEmail?: string | null): string {
  const params = new URLSearchParams({ source: "abt" });
  if (userEmail) params.set("email", userEmail);
  return `https://app.endlessprospects.org/?${params.toString()}`;
}

export const Route = createFileRoute("/pocket-broker-test")({
  head: () => ({
    meta: [
      { title: "Pocket Broker - Agent Business Tracker" },
      {
        name: "description",
        content: "Pocket Broker interface embedded inside Agent Business Tracker.",
      },
      { property: "og:title", content: "Pocket Broker - Agent Business Tracker" },
      {
        property: "og:description",
        content: "Pocket Broker interface embedded inside Agent Business Tracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PocketBrokerPage,
});

function PocketBrokerPage() {
  const { user } = useAuth();
  const brokerUrl = buildPocketBrokerUrl(user?.email);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageShell
      title="Pocket Broker"
      fullHeight
      actions={
        <a
          href={brokerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">Open in new tab</span>
        </a>
      }
    >
      <div className="flex min-h-[80vh] flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm sm:rounded-3xl">
        <iframe
          src={brokerUrl}
          title="Pocket Broker"
          allow="clipboard-write; microphone; camera"
          className="h-full min-h-[75vh] w-full flex-1 rounded-lg border-0 bg-white lg:h-full"
        />
      </div>
    </PageShell>
  );
}
