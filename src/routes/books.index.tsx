import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { transactions, accountById, profitAndLoss, formatMoney, formatMoneyCents, classifyTxn } from "@/lib/books-helpers";

export const Route = createFileRoute("/books/")({
  component: BooksOverview,
});

function BooksOverview() {
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const pl = profitAndLoss();
  const topExpenses = pl.expense.slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">Recent activity</h2>
          <span className="text-xs text-muted-foreground">Last 8 entries</span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {recent.map((t) => {
              const kind = classifyTxn(t);
              const debit = accountById(t.debitAccountId);
              const credit = accountById(t.creditAccountId);
              const isIncome = kind === "income";
              return (
                <tr key={t.id} className="border-t border-border first:border-t-0">
                  <td className="py-3 px-6 text-xs text-muted-foreground tabular-nums w-24">{t.date.slice(5)}</td>
                  <td className="py-3">
                    <div className="font-medium">{t.memo}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>{credit?.name}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{debit?.name}</span>
                    </div>
                  </td>
                  <td className={`py-3 pr-6 text-right tabular-nums font-semibold ${isIncome ? "text-success" : ""}`}>
                    {isIncome ? "+" : "−"}{formatMoneyCents(t.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-success" />
            <h3 className="font-display font-bold text-sm uppercase tracking-wider">Top expense categories</h3>
          </div>
          <ul className="space-y-2.5">
            {topExpenses.map(({ account, amount }) => (
              <li key={account.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{account.name}</span>
                <span className="tabular-nums font-medium">{formatMoney(amount)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-primary text-primary-foreground rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Net Income YTD</span>
          </div>
          <div className="text-3xl font-bold font-display tabular-nums">{formatMoney(pl.netIncome)}</div>
          <div className="text-xs opacity-70 mt-1">{formatMoney(pl.totalIncome)} in − {formatMoney(pl.totalExpense)} out</div>
        </div>
      </div>
    </div>
  );
}
