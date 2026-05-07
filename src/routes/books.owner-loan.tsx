import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { BooksTransactionDialog, type BooksTransactionDraft } from "@/components/books-transaction-dialog";
import { useBooks, formatMoney, formatMoneyCents } from "@/hooks/use-books";
import { ownerLoanLedger } from "@/lib/books-data";

export const Route = createFileRoute("/books/owner-loan")({
  component: OwnerLoanPage,
});

function OwnerLoanPage() {
  const { accounts, transactions, updateTransaction, deleteTransaction } = useBooks();
  const { entries, balance } = ownerLoanLedger(accounts, transactions);
  const totalAdvances = entries.filter((e) => e.direction === "advance").reduce((s, e) => s + e.amount, 0);
  const totalRepayments = entries.filter((e) => e.direction === "repayment").reduce((s, e) => s + e.amount, 0);
  const [editing, setEditing] = useState<{ id: string; draft: BooksTransactionDraft } | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-2xl shadow-card p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80 mb-2">
          <HandCoins className="h-3.5 w-3.5" /> Loan from Officer · Balance
        </div>
        <div className="text-4xl font-bold font-display tabular-nums">{formatMoney(balance)}</div>
        <div className="text-sm opacity-80 mt-1">
          {balance > 0 ? "The company owes you this amount." : balance < 0 ? "You owe the company this amount." : "All settled up."}
        </div>
        <div className="text-xs opacity-70 mt-3">
          Tip: To record an advance (you paid for something on personal card), add an Expense transaction in Transactions
          and choose Loan from Officer as the "Paid from" account.
        </div>
      </div>

      <BooksTransactionDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit owner loan entry"
        accounts={accounts}
        initialValue={editing?.draft}
        onSubmit={async (draft) => {
          if (!editing) return;
          await updateTransaction(editing.id, draft);
          setEditing(null);
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        {entries.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No officer-loan activity yet.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-medium py-3 px-6">Date</th>
                <th className="text-left font-medium py-3">Memo</th>
                <th className="text-left font-medium py-3">Type</th>
                <th className="text-right font-medium py-3">Amount</th>
                <th className="w-20 pr-6"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const txn = transactions.find((t) => t.id === e.txnId);
                if (!txn) return null;
                return (
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
                    <td className={`py-3 text-right tabular-nums font-semibold ${e.direction === "advance" ? "text-success" : ""}`}>
                      {e.direction === "advance" ? "+" : "−"}{formatMoneyCents(e.amount)}
                    </td>
                    <td className="py-3 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing({ id: txn.id, draft: txnToDraft(txn) })}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Edit entry"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this entry?")) {
                              deleteTransaction(txn.id).catch((error) => console.error(error));
                            }
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function txnToDraft(t: {
  date: string;
  memo: string;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  vendor?: string | null;
}): BooksTransactionDraft {
  return {
    date: t.date,
    memo: t.memo,
    amount: Number(t.amount),
    debitAccountId: t.debitAccountId,
    creditAccountId: t.creditAccountId,
    vendor: t.vendor ?? undefined,
  };
}
