import { createFileRoute } from "@tanstack/react-router";
import { Plus, Car } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { mileage, irsRate, formatMoneyCents } from "@/lib/mock-data";

export const Route = createFileRoute("/mileage")({
  component: Mileage,
  head: () => ({ meta: [{ title: "Mileage — Apex Realty OS" }] }),
});

function Mileage() {
  const totalMiles = mileage.reduce((s, m) => s + m.miles, 0);
  const deduction = totalMiles * irsRate;
  return (
    <PageShell
      title="Mileage"
      subtitle="Log every business trip. We do the IRS math."
      actions={
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> Log Trip
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total miles</div>
          <div className="text-3xl font-bold tabular-nums font-display">{totalMiles.toFixed(1)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Estimated deduction</div>
          <div className="text-3xl font-bold tabular-nums font-display text-success">{formatMoneyCents(deduction)}</div>
          <div className="text-xs text-muted-foreground mt-1">@ ${irsRate}/mi (IRS 2025)</div>
        </div>
        <div className="bg-primary text-primary-foreground rounded-2xl p-5 shadow-card flex items-center gap-3">
          <Car className="h-8 w-8 text-secondary" />
          <div>
            <div className="font-display font-bold">Auto-track trips</div>
            <div className="text-xs opacity-70 mt-0.5">Coming with mobile app</div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <th className="text-left font-medium py-3 px-6">Date</th>
              <th className="text-left font-medium py-3">From</th>
              <th className="text-left font-medium py-3">To</th>
              <th className="text-left font-medium py-3">Purpose</th>
              <th className="text-right font-medium py-3">Miles</th>
              <th className="text-right font-medium py-3 pr-6">Deduction</th>
            </tr>
          </thead>
          <tbody>
            {mileage.map((m) => (
              <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                <td className="py-4 px-6 text-muted-foreground text-xs">{m.date}</td>
                <td className="py-4">{m.from}</td>
                <td className="py-4">{m.to}</td>
                <td className="py-4 text-muted-foreground">{m.purpose}</td>
                <td className="py-4 text-right tabular-nums font-medium">{m.miles.toFixed(1)}</td>
                <td className="py-4 pr-6 text-right tabular-nums font-medium text-success">{formatMoneyCents(m.miles * irsRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
