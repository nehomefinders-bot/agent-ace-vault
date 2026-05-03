import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useBooks } from "@/hooks/use-books";
import { formatMoney } from "@/hooks/use-books";
import type { AccountKind } from "@/lib/books-data";

export const Route = createFileRoute("/books/categories")({
  component: CategoriesPage,
});

const order: AccountKind[] = ["Income", "Expense", "Asset", "Liability", "Equity"];

function CategoriesPage() {
  const { accounts, transactions, addAccount } = useBooks();
  const [showNew, setShowNew] = useState(false);

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
          onClick={() => setShowNew((v) => !v)}
          className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium shrink-0 ml-4"
        >
          <Plus className="h-4 w-4" /> New category
        </button>
      </div>

      {showNew && <NewAccountForm onDone={() => setShowNew(false)} onSubmit={addAccount} />}

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

function NewAccountForm({
  onDone,
  onSubmit,
}: {
  onDone: () => void;
  onSubmit: (a: { code: string; name: string; kind: AccountKind; taxLine?: string; description?: string }) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("Expense");
  const [taxLine, setTaxLine] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!code || !name) return;
    setSaving(true);
    try {
      await onSubmit({ code, name, kind, taxLine: taxLine || undefined });
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card grid grid-cols-1 md:grid-cols-5 gap-3">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (e.g. 6500)"
        className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
        className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm md:col-span-2" />
      <select value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}
        className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm">
        {order.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <input value={taxLine} onChange={(e) => setTaxLine(e.target.value)} placeholder="Tax line (optional)"
        className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
      <div className="md:col-span-5 flex justify-end gap-2">
        <button onClick={onDone} className="px-3 py-2 text-sm text-muted-foreground">Cancel</button>
        <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Add category"}
        </button>
      </div>
    </div>
  );
}
