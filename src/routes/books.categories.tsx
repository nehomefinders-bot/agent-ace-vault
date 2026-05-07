import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { BooksAccountDialog, type BooksAccountDraft } from "@/components/books-account-dialog";
import { useBooks, formatMoney } from "@/hooks/use-books";
import type { Account, AccountKind } from "@/lib/books-data";

export const Route = createFileRoute("/books/categories")({
  component: CategoriesPage,
});

const order: AccountKind[] = ["Income", "Expense", "Asset", "Liability", "Equity"];

function CategoriesPage() {
  const { accounts, transactions, addAccount, updateAccount, removeAccount } = useBooks();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const totals = new Map<string, number>();
  for (const t of transactions) {
    totals.set(t.debitAccountId, (totals.get(t.debitAccountId) ?? 0) + Number(t.amount));
    totals.set(t.creditAccountId, (totals.get(t.creditAccountId) ?? 0) + Number(t.amount));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Your chart of accounts. These are the buckets every dollar gets sorted into for tax time.
          Tax line shows where each one lands on Schedule C.
        </p>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium shrink-0 ml-4"
        >
          <Plus className="h-4 w-4" /> New category
        </button>
      </div>

      <BooksAccountDialog
        open={showNew}
        onOpenChange={setShowNew}
        title="New category"
        submitLabel="Add category"
        onSubmit={addAccount}
      />

      <BooksAccountDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit category"
        submitLabel="Save category"
        initialValue={editing ? accountToDraft(editing) : undefined}
        onSubmit={async (draft: BooksAccountDraft) => {
          if (!editing) return;
          await updateAccount(editing.id, draft);
          setEditing(null);
        }}
      />

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
                    <th className="w-20 pr-4"></th>
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
                      <td className="py-3 text-xs text-muted-foreground">{a.taxLine ?? "â€”"}</td>
                      <td className="py-3 pr-6 text-right tabular-nums">{formatMoney(totals.get(a.id) ?? 0)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditing(a)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Edit ${a.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${a.name}?`)) {
                                removeAccount(a.id).catch((error) => console.error(error));
                              }
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                            aria-label={`Delete ${a.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
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

function accountToDraft(account: Account): BooksAccountDraft {
  return {
    code: account.code,
    name: account.name,
    kind: account.kind,
    taxLine: account.taxLine ?? undefined,
    description: account.description ?? undefined,
  };
}
