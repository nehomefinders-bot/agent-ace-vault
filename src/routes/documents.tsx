import { createFileRoute } from "@tanstack/react-router";
import { FileText, Upload } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";

export const Route = createFileRoute("/documents")({
  component: Documents,
  head: () => ({ meta: [{ title: "Documents — Agent Business Tracker" }] }),
});

const docs = [
  { name: "Purchase Agreement — Oakwood.pdf", deal: "Oakwood Residence", signed: "Signed", uploaded: "Oct 24" },
  { name: "Disclosure Packet — Loft 4B.pdf", deal: "Downtown Loft 4B", signed: "Pending", uploaded: "Oct 22" },
  { name: "Listing Agreement — Willow Creek.pdf", deal: "Willow Creek Estate", signed: "Signed", uploaded: "Oct 18" },
  { name: "Inspection Report — Elm St.pdf", deal: "Elm Street Townhouse", signed: "Signed", uploaded: "Oct 12" },
  { name: "Counter Offer — Harbor View.pdf", deal: "Harbor View Condo", signed: "Pending", uploaded: "Oct 10" },
];

const tone: Record<string, "success" | "warning"> = { Signed: "success", Pending: "warning" };

function Documents() {
  return (
    <PageShell
      title="Documents"
      subtitle="Every contract, disclosure, and signed document — organized by deal."
      actions={
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Upload className="h-4 w-4" /> Upload
        </button>
      }
    >
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <ul className="divide-y divide-border">
          {docs.map((d) => (
            <li key={d.name} className="px-6 py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.deal} · uploaded {d.uploaded}</div>
              </div>
              <StatusPill tone={tone[d.signed]}>{d.signed}</StatusPill>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
