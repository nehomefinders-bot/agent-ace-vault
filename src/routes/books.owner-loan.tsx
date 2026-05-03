import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Plus } from "lucide-react";
import { ownerLoanLedger, formatMoney, formatMoneyCents } from "@/lib/books-helpers";

export const Route = createFileRoute("/books/owner-loan")({
  component: OwnerLoanPage,
});

function OwnerLoanPage() {
  const { entries, balance } = ownerLoanLedger();
  const totalAdvances = entries.filter(e => e.direction === "advance").reduce((s, e) => s + e.amount, 0);
  const totalRepayments = entries.filter(e => e.direction === "repayment").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-2xl shadow-card p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80 mb-2">
            <HandCoins className="h-3.5 w-3.5" /> Loan from Officer · Balance
          </div>
          <div className="text-4xl font-bold font-display tabular-nums">{formatMoney(balance)}</div>
          <div className="text-sm opacity-80 mt-1">
            {balance > 0 ? "The company owes you this amount." : balance < 0 ? "You owe the company this amount." : "All settled up."}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-secondary text-secondary-foreground px-3.5 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> I paid for something
          </button>
          <button className="bg-card text-foreground px-3.5 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Company reimbursed me
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
            <ArrowUpRight className="h-3.5 w-3.5 text-success" /> You advanced
          </div>
          <div className="text-2xl font-bold tabular-nums font-display">{formatMoney(totalAdvances)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
            <ArrowDownLeft className="h-3.5 w-3.5 text-destructive" /> Company repaid
          </div>
          <div className="text-2xl font-bold tabular-nums font-display">{formatMoney(totalRepayments)}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display font-bold">Ledger</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <th className="text-left font-medium py-3 px-6">Date</th>
              <th className="text-left font-medium py-3">Memo</th>
              <th className="text-left font-medium py-3">Type</th>
              <th className="text-right font-medium py-3 pr-6">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                <td className="py-3 px-6 text-xs text-muted-foreground tabular-nums w-28">{e.date}</td>
                <td className="py-3 font-medium">{e.memo}</td>
                <td className="py-3">
                  {e.direction === "advance" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-medium">
                      <ArrowUpRight className="h-3 w-3" /> Advance
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                      <ArrowDownLeft className="h-3 w-3" /> Repayment
                    </span>
                  )}
                </td>
                <td className={`py-3 pr-6 text-right tabular-nums font-semibold ${e.direction === "advance" ? "text-success" : ""}`}>
                  {e.direction === "advance" ? "+" : "−"}{formatMoneyCents(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
