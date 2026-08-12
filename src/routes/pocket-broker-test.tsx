import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Globe } from "lucide-react";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/pocket-broker-test")({
  head: () => ({
    meta: [
      { title: "Pocket Broker Test - Agent Business Tracker" },
      {
        name: "description",
        content: "Internal iframe test for the Pocket Broker interface.",
      },
      { property: "og:title", content: "Pocket Broker Test - Agent Business Tracker" },
      {
        property: "og:description",
        content: "Internal iframe test for the Pocket Broker interface.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PocketBrokerTestPage,
});

function PocketBrokerTestPage() {
  return (
    <PageShell
      title="Pocket Broker Test"
      subtitle="Iframe integration test for app.endlessprospects.org"
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
      <div className="rounded-2xl border border-border/70 bg-card p-1 shadow-sm sm:rounded-3xl">
        <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 sm:rounded-2xl">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Testing: <span className="font-mono text-foreground">https://app.endlessprospects.org/</span>
          </p>
        </div>
        <iframe
          src="https://app.endlessprospects.org/"
          title="Pocket Broker Test"
          width="100%"
          height="calc(100vh - 100px)"
          allow="clipboard-write; microphone; camera"
          className="mt-1 block w-full rounded-xl border-0 bg-white sm:rounded-2xl"
        />
      </div>
    </PageShell>
  );
}
