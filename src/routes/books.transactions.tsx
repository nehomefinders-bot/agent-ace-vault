import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, ArrowRight } from "lucide-react";
import { transactions, accountById, accounts, formatMoneyCents, classifyTxn } from "@/lib/books-helpers";

export const Route = createFileRoute("/books/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const rows = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((t) => {
        if (q && !t.memo.toLowerCase().includes(q.toLowerCase()) && !(t.vendor ?? "").toLowerCase().includes(q.toLowerCase())) return false;
        if (cat !== "all" && t.debitAccountId !== cat && t.creditAccountId !== cat) return false;
        return true;
      });
  }, [q, cat]);

  const expenseAccounts = accounts.filter((a) => a.kind === "Expense");
  const incomeAccounts = accounts.filter((a) => a.kind === "Income");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search memo or vendor…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-card text-sm"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-border bg-card text-sm min-w-[200px]"
        >
          <option value="all">All categories</option>
          <optgroup label="Income">
            {incomeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </optgroup>
          <optgroup label="Expenses">
            {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </optgroup>
          <optgroup label="Other">
            <option value="2100">Loan from Officer</option>
            <option value="1010">Business Checking</option>
          </optgroup>
        </select>
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium ml-auto">
          <Plus className="h-4 w-4" /> Add transaction
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <th className="text-left font-medium py-3 px-6">Date</th>
              <th className="text-left font-medium py-3">Memo / Vendor</th>
              <th className="text-left font-medium py-3">Category</th>
              <th className="text-left font-medium py-3">Paid by / Into</th>
              <th className="text-right font-medium py-3 pr-6">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const debit = accountById(t.debitAccountId)!;
              const credit = accountById(t.creditAccountId)!;
              const kind = classifyTxn(t);
              const isIncome = kind === "income";
              const category = isIncome ? credit : debit;
              const counter = isIncome ? debit : credit;
              return (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="py-4 px-6 text-xs text-muted-foreground tabular-nums w-28">{t.date}</td>
                  <td className="py-4">
                    <div className="font-medium">{t.memo}</div>
                    {t.vendor && <div className="text-xs text-muted-foreground">{t.vendor}</div>}
                  </td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                      {category.code} · {category.name}
                    </span>
                  </td>
                  <td className="py-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      {counter.name} <ArrowRight className="h-3 w-3" />
                    </span>
                  </td>
                  <td className={`py-4 pr-6 text-right tabular-nums font-semibold ${isIncome ? "text-success" : ""}`}>
                    {isIncome ? "+" : "−"}{formatMoneyCents(t.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
