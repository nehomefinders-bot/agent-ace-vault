import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Globe } from "lucide-react";
import { PageShell } from "@/components/page-shell";

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
        property: "Employee "og:description",
        content: "Pocket Broker interface embedded inside Agent Business Tracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PocketBrokerPage,
});

function PocketBrokerPage() {
  return (
    <PageShell
      title="Pocket Broker"
      subtitle="app.endlessprospects.org"
      fullHeight
      actions={
        <a
          href="https://app.endlessprospects.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">Open in new tab</span>
        </a>
      }
    >
      <div className="flex flex-1 flex-col rounded-2xl border border-border/70 bg-card p-1 shadow-sm sm:rounded-3xl">
        <div className="flex shrink-0 items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 sm:rounded-2xl">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-foreground">https://app.endlessprospects.org/</span>
          </p>
        </div>
        <div className="relative mt-1 flex min-h-0 flex-1 rounded-xl sm:rounded-2xl">
          <iframe
            src="https://app.endlessprospects.org/"
            title="Pocket Broker"
            allow="clipboard-write; microphone; camera"
            className="h-full w-full min-h-[750px] rounded-lg border-0 bg-white shadow-sm"
          />
        </div>
      </div>
    </PageShell>
  );
}
