import { createFileRoute } from "@tanstack/react-router";
import { Plus, Bed, Bath, Maximize2 } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { listings, formatMoney } from "@/lib/mock-data";

export const Route = createFileRoute("/listings")({
  component: Listings,
  head: () => ({ meta: [{ title: "Listings — Agent Business Tracker" }] }),
});

const tone: Record<string, "success" | "warning" | "muted"> = {
  Active: "success", Pending: "warning", Sold: "muted",
};

function Listings() {
  return (
    <PageShell
      title="Listings"
      subtitle="Active inventory across your portfolio."
      actions={
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Listing
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {listings.map((l) => (
          <div key={l.id} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="aspect-[16/10] bg-gradient-to-br from-primary/80 to-primary relative">
              <div className="absolute top-3 left-3"><StatusPill tone={tone[l.status]}>{l.status}</StatusPill></div>
              <div className="absolute bottom-3 right-3 text-primary-foreground/90 text-xs font-medium bg-black/30 px-2 py-1 rounded">
                {l.daysOnMarket} DOM
              </div>
            </div>
            <div className="p-5">
              <div className="text-2xl font-bold tabular-nums font-display">{formatMoney(l.price)}</div>
              <div className="text-sm text-muted-foreground mt-1">{l.address}</div>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Bed className="h-4 w-4" />{l.beds}</span>
                <span className="inline-flex items-center gap-1.5"><Bath className="h-4 w-4" />{l.baths}</span>
                <span className="inline-flex items-center gap-1.5 tabular-nums"><Maximize2 className="h-4 w-4" />{l.sqft.toLocaleString()} sqft</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
