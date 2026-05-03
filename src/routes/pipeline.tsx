import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { deals, formatMoney, type DealStage } from "@/lib/mock-data";

export const Route = createFileRoute("/pipeline")({
  component: Pipeline,
  head: () => ({ meta: [{ title: "Pipeline — Agent Business Tracker" }] }),
});

const stages: DealStage[] = ["Lead", "Under Contract", "Closing", "Closed"];
const stageTone: Record<DealStage, "success" | "warning" | "primary" | "muted"> = {
  Closed: "success", Closing: "primary", "Under Contract": "warning", Lead: "muted",
};

function Pipeline() {
  return (
    <PageShell
      title="Pipeline"
      subtitle="Drag deals across stages. Forecast commission with confidence."
      actions={
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> New Deal
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {stages.map((stage) => {
          const items = deals.filter((d) => d.stage === stage);
          const total = items.reduce((s, d) => s + d.value, 0);
          return (
            <div key={stage} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col">
              <header className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-1">
                  <StatusPill tone={stageTone[stage]}>{stage}</StatusPill>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="text-lg font-bold tabular-nums font-display mt-2">{formatMoney(total)}</div>
              </header>
              <ul className="p-3 space-y-2 flex-1">
                {items.map((d) => (
                  <li key={d.id} className="p-3 rounded-lg border border-border hover:border-secondary hover:shadow-sm transition cursor-pointer bg-background">
                    <div className="font-medium text-sm">{d.property}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{d.client}</div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm tabular-nums font-semibold">{formatMoney(d.value)}</span>
                      <span className="text-[11px] text-muted-foreground">{d.closeDate}</span>
                    </div>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="text-xs text-muted-foreground text-center py-8">No deals</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
