import { createFileRoute } from "@tanstack/react-router";
import { Plus, Zap } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { invoices, formatMoney } from "@/lib/mock-data";

export const Route = createFileRoute("/commissions")({
  component: Commissions,
  head: () => ({ meta: [{ title: "Commissions — Agent Business Tracker" }] }),
});

const tone: Record<string, "success" | "warning" | "danger" | "muted"> = {
  Paid: "success", Pending: "warning", Overdue: "danger", Draft: "muted",
};

function Commissions() {
  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter(i => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);

  return (
    <PageShell
      title="Commissions"
      subtitle="Track commission payouts and accept card or ACH payments via Stripe."
      actions={
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> New Commission
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total billed</div>
          <div className="text-2xl font-bold tabular-nums font-display">{formatMoney(total)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Outstanding</div>
          <div className="text-2xl font-bold tabular-nums font-display text-destructive">{formatMoney(outstanding)}</div>
        </div>
        <div className="bg-primary text-primary-foreground rounded-2xl p-5 shadow-card flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-70 mb-2">Stripe</div>
            <div className="font-display font-bold">Connect to accept payments</div>
          </div>
          <button className="bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Connect
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <th className="text-left font-medium py-3 px-6">Commission</th>
              <th className="text-left font-medium py-3">Client</th>
              <th className="text-left font-medium py-3">Description</th>
              <th className="text-right font-medium py-3">Amount</th>
              <th className="text-left font-medium py-3 pl-6">Status</th>
              <th className="text-left font-medium py-3 pr-6">Due</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                <td className="py-4 px-6 font-medium font-mono text-xs">{i.id}</td>
                <td className="py-4">{i.client}</td>
                <td className="py-4 text-muted-foreground">{i.description}</td>
                <td className="py-4 text-right tabular-nums font-medium">{formatMoney(i.amount)}</td>
                <td className="py-4 pl-6"><StatusPill tone={tone[i.status]}>{i.status}</StatusPill></td>
                <td className="py-4 pr-6 text-muted-foreground text-xs">{i.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
