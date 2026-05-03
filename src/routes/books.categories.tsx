import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { accounts, transactions, formatMoney, type AccountKind } from "@/lib/books-helpers";

export const Route = createFileRoute("/books/categories")({
  component: CategoriesPage,
});

const order: AccountKind[] = ["Income", "Expense", "Asset", "Liability", "Equity"];

function CategoriesPage() {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    totals.set(t.debitAccountId, (totals.get(t.debitAccountId) ?? 0) + t.amount);
    totals.set(t.creditAccountId, (totals.get(t.creditAccountId) ?? 0) + t.amount);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Your chart of accounts. These are the buckets every dollar gets sorted into for tax time.
          Tax line shows where each one lands on Schedule C.
        </p>
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium shrink-0 ml-4">
          <Plus className="h-4 w-4" /> New category
        </button>
      </div>

      {order.map((kind) => {
        const list = accounts.filter((a) => a.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind}>
            <h2 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground mb-3">{kind}</h2>
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <th className="text-left font-medium py-2.5 px-6 w-20">Code</th>
                    <th className="text-left font-medium py-2.5">Name</th>
                    <th className="text-left font-medium py-2.5">Tax line</th>
                    <th className="text-right font-medium py-2.5 pr-6">YTD activity</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                      <td className="py-3 px-6 font-mono text-xs text-muted-foreground">{a.code}</td>
                      <td className="py-3 font-medium">
                        {a.name}
                        {a.description && <div className="text-xs text-muted-foreground font-normal">{a.description}</div>}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{a.taxLine ?? "—"}</td>
                      <td className="py-3 pr-6 text-right tabular-nums">{formatMoney(totals.get(a.id) ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
