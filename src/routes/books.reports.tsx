import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart } from "lucide-react";
import { useBooks, formatMoney } from "@/hooks/use-books";
import { profitAndLoss, type PLLine } from "@/lib/books-data";

export const Route = createFileRoute("/books/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { accounts, transactions } = useBooks();
  const pl = profitAndLoss(accounts, transactions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold">Profit & Loss · {new Date().getFullYear()} YTD</h2>
          <p className="text-sm text-muted-foreground">Cash basis. Hand this to your CPA at tax time.</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Download className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 bg-muted/40 border-b border-border flex items-center gap-2">
          <FileBarChart className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Statement</span>
        </div>

        <div className="p-6 space-y-8">
          <Section title="Income" lines={pl.income} total={pl.totalIncome} />
          <Section title="Expenses" lines={pl.expense} total={pl.totalExpense} />

          <div className="border-t-2 border-foreground pt-4 flex items-center justify-between">
            <span className="font-display font-bold text-lg">Net Income</span>
            <span className={`font-display font-bold text-2xl tabular-nums ${pl.netIncome >= 0 ? "text-success" : "text-destructive"}`}>
              {formatMoney(pl.netIncome)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, lines, total }: { title: string; lines: PLLine[]; total: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">{title}</div>
      {lines.length === 0 ? (
        <div className="text-sm text-muted-foreground italic">No {title.toLowerCase()} recorded yet.</div>
      ) : (
        <div className="space-y-1.5">
          {lines.map((l) => (
            <div key={l.account.id} className="flex items-baseline justify-between text-sm py-1.5 border-b border-border/50">
              <div>
                <span className="font-medium">{l.account.name}</span>
                {l.account.taxLine && <span className="text-xs text-muted-foreground ml-2">· {l.account.taxLine}</span>}
              </div>
              <span className="tabular-nums">{formatMoney(l.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-foreground/20">
        <span className="font-display font-bold">Total {title}</span>
        <span className="font-display font-bold tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  );
}
