import { createFileRoute } from "@tanstack/react-router";
import { ScanLine, Upload, Camera } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { expenses, formatMoneyCents } from "@/lib/mock-data";

export const Route = createFileRoute("/receipts")({
  component: Receipts,
  head: () => ({ meta: [{ title: "Receipts — Apex Realty OS" }] }),
});

function Receipts() {
  return (
    <PageShell
      title="Receipts"
      subtitle="Snap, scan, and auto-categorize. Every receipt becomes a deductible expense."
      actions={
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Upload className="h-4 w-4" /> Upload
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-card">
          <div className="h-12 w-12 mx-auto rounded-xl bg-secondary/20 flex items-center justify-center mb-3">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <div className="font-display font-bold mb-1">Scan with camera</div>
          <div className="text-xs text-muted-foreground">Snap a photo — we OCR vendor, date and total.</div>
        </div>
        <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-card">
          <div className="h-12 w-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="font-display font-bold mb-1">Drop a file</div>
          <div className="text-xs text-muted-foreground">JPG, PNG, PDF — bulk uploads supported.</div>
        </div>
      </div>

      <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground mb-3">Recently scanned</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {expenses.filter(e => e.hasReceipt).map((e) => (
          <div key={e.id} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="aspect-[3/4] bg-gradient-to-br from-muted to-accent flex items-center justify-center">
              <ScanLine className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <div className="p-3">
              <div className="font-medium text-sm truncate">{e.vendor}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{e.date}</span>
                <span className="text-sm font-semibold tabular-nums">{formatMoneyCents(e.amount)}</span>
              </div>
              <div className="mt-2"><StatusPill tone="success">Categorized</StatusPill></div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
