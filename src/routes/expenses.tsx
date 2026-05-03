import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { expenses, formatMoneyCents } from "@/lib/mock-data";

export const Route = createFileRoute("/expenses")({
  component: Expenses,
  head: () => ({ meta: [{ title: "Expenses — Agent Business Tracker" }] }),
});

function Expenses() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return (
    <PageShell
      title="Expenses"
      subtitle="Track deductible business spend, tied to deals when relevant."
      actions={
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> Log Expense
        </button>
      }
    >
      <div className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-card max-w-sm">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total this month</div>
        <div className="text-3xl font-bold tabular-nums font-display">{formatMoneyCents(total)}</div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <th className="text-left font-medium py-3 px-6">Vendor</th>
              <th className="text-left font-medium py-3">Category</th>
              <th className="text-left font-medium py-3">Deal</th>
              <th className="text-left font-medium py-3">Date</th>
              <th className="text-left font-medium py-3">Receipt</th>
              <th className="text-right font-medium py-3 pr-6">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                <td className="py-4 px-6 font-medium">{e.vendor}</td>
                <td className="py-4 text-muted-foreground">{e.category}</td>
                <td className="py-4 text-muted-foreground">{e.deal ?? "—"}</td>
                <td className="py-4 text-muted-foreground text-xs">{e.date}</td>
                <td className="py-4">
                  {e.hasReceipt ? <StatusPill tone="success">Attached</StatusPill> : <StatusPill tone="warning">Missing</StatusPill>}
                </td>
                <td className="py-4 pr-6 text-right tabular-nums font-medium">{formatMoneyCents(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
