import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BooksTransactionDialog, type BooksTransactionDraft } from "@/components/books-transaction-dialog";
import { useBooks, formatMoneyCents } from "@/hooks/use-books";
import { classifyTxn } from "@/lib/books-data";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ReceiptPreviewDialog } from "@/components/receipt-preview-dialog";
import { getReceiptFileName, getReceiptPreviewKind } from "@/lib/receipt-preview";
import { TableFilterBar, useTableFilters, applyTableFilters } from "@/components/table-filter-bar";
import { TableExportButton } from "@/components/table-export-button";

export const Route = createFileRoute("/books/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { accounts, transactions, accountById, addTransaction, updateTransaction, deleteTransaction } = useBooks();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<{ id: string; draft: BooksTransactionDraft } | null>(null);
  const [expenseReceipts, setExpenseReceipts] = useState<
    Record<string, { receipt_path: string; vendor: string | null; date: string | null; category: string | null }>
  >({});
  const [preview, setPreview] = useState<{
    title: string;
    subtitle: string;
    fileUrl: string;
    fileName: string;
    kind: "image" | "pdf" | "other";
  } | null>(null);
  const [previewingTxnId, setPreviewingTxnId] = useState<string | null>(null);

  const [filters, setFilters, resetFilters] = useTableFilters();

  useEffect(() => {
    let active = true;

    async function loadExpenseReceipts() {
      if (!user) {
        setExpenseReceipts({});
        return;
      }

      const { data, error } = await supabase
        .from("expenses")
        .select("transaction_id,receipt_path,vendor,date,category")
        .eq("user_id", user.id);

      if (!active) return;
      if (error) {
        toast.error(error.message);
        setExpenseReceipts({});
        return;
      }

      const next: Record<string, { receipt_path: string; vendor: string | null; date: string | null; category: string | null }> = {};
      for (const row of (data ?? []) as Array<{
        transaction_id: string | null;
        receipt_path: string | null;
        vendor: string | null;
        date: string | null;
        category: string | null;
      }>) {
        if (!row.transaction_id || !row.receipt_path) continue;
        next[row.transaction_id] = {
          receipt_path: row.receipt_path,
          vendor: row.vendor,
          date: row.date,
          category: row.category,
        };
      }
      setExpenseReceipts(next);
    }

    void loadExpenseReceipts();
    return () => {
      active = false;
    };
  }, [user]);

  const accountSelectOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const a of accounts) opts.push({ value: a.id, label: `${a.kind}: ${a.name}` });
    return opts;
  }, [accounts]);

  const rows = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    return applyTableFilters(sorted, filters, {
      searchText: (t) => `${t.memo} ${t.vendor ?? ""}`,
      date: (t) => t.date,
      amount: (t) => Number(t.amount),
      selectValue: (t, key) => {
        if (key === "account") {
          const v = filters.selects.account;
          if (t.debitAccountId === v || t.creditAccountId === v) return v;
          return "";
        }
        if (key === "type") {
          return classifyTxn(t, accountById);
        }
        return "";
      },
    });
  }, [transactions, filters, accountById]);

  const expenseAccounts = accounts.filter((a) => a.kind === "Expense");
  const incomeAccounts = accounts.filter((a) => a.kind === "Income");
  const assetAccounts = accounts.filter((a) => a.kind === "Asset");
  const liabAccounts = accounts.filter((a) => a.kind === "Liability");

  async function openReceiptPreview(transactionId: string) {
    const receipt = expenseReceipts[transactionId];
    if (!receipt?.receipt_path) return;

    setPreviewingTxnId(transactionId);
    try {
      const { data, error } = await supabase.storage.from("receipts").createSignedUrl(receipt.receipt_path, 60 * 30);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? "Could not open receipt");
      }

      setPreview({
        title: receipt.vendor ? `${receipt.vendor} receipt` : "Receipt preview",
        subtitle: [receipt.category, receipt.date].filter(Boolean).join(" - "),
        fileUrl: data.signedUrl,
        fileName: getReceiptFileName(receipt.receipt_path),
        kind: getReceiptPreviewKind(receipt.receipt_path),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open receipt");
    } finally {
      setPreviewingTxnId(null);
    }
  }

  return (
    <div>
      <ReceiptPreviewDialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        title={preview?.title ?? "Receipt preview"}
        subtitle={preview?.subtitle}
        fileUrl={preview?.fileUrl ?? null}
        fileName={preview?.fileName}
        kind={preview?.kind}
      />

      <TableFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        searchPlaceholder="Search memo or vendor..."
        showAmount
        selects={[
          { key: "type", label: "Type", options: [
            { value: "income", label: "Income" },
            { value: "expense", label: "Expense" },
            { value: "transfer", label: "Transfer" },
          ]},
          { key: "account", label: "Account / Category", options: accountSelectOptions },
        ]}
        trailing={
          <div className="flex items-center gap-2 ml-auto">
            <TableExportButton
              filename="transactions"
              sheetName="Transactions"
              rows={rows}
              columns={[
                { header: "Date", accessor: (t) => t.date },
                { header: "Memo", accessor: (t) => t.memo },
              { header: "Vendor", accessor: (t) => t.vendor },
              { header: "Type", accessor: (t) => classifyTxn(t, accountById) },
              { header: "Debit Account", accessor: (t) => accountById(t.debitAccountId)?.name ?? "" },
              { header: "Credit Account", accessor: (t) => accountById(t.creditAccountId)?.name ?? "" },
              { header: "Receipt", accessor: (t) => (expenseReceipts[t.id]?.receipt_path ? "Attached" : "Missing") },
              { header: "Amount", accessor: (t) => Number(t.amount) },
            ]}
            />
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Add transaction
            </button>
          </div>
        }
      />

      {showAdd && (
        <AddTxnForm
          onDone={() => setShowAdd(false)}
          onSubmit={addTransaction}
          incomeAccounts={incomeAccounts}
          expenseAccounts={expenseAccounts}
          assetAccounts={assetAccounts}
          liabAccounts={liabAccounts}
        />
      )}

      <BooksTransactionDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit transaction"
        accounts={accounts}
        initialValue={editing?.draft}
        onSubmit={async (draft) => {
          if (!editing) return;
          await updateTransaction(editing.id, draft);
          setEditing(null);
        }}
      />

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-sm text-muted-foreground text-center">No transactions yet - add your first one.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-medium py-3 px-6">Date</th>
                <th className="text-left font-medium py-3">Memo / Vendor</th>
                <th className="text-left font-medium py-3">Category</th>
                <th className="text-left font-medium py-3 px-6 w-28">Receipt</th>
                <th className="text-left font-medium py-3">Paid by / Into</th>
                <th className="text-right font-medium py-3 pr-2">Amount</th>
                <th className="w-20 pr-6"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const debit = accountById(t.debitAccountId);
                const credit = accountById(t.creditAccountId);
                if (!debit || !credit) return null;
                const kind = classifyTxn(t, accountById);
                const isIncome = kind === "income";
                const category = isIncome ? credit : debit;
                const counter = isIncome ? debit : credit;
                const receipt = expenseReceipts[t.id];
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
                    <td className="py-4 px-6">
                      {receipt ? (
                        <button
                          type="button"
                          onClick={() => openReceiptPreview(t.id)}
                          disabled={previewingTxnId === t.id}
                          className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success transition hover:bg-success/15 disabled:opacity-60"
                        >
                          {previewingTxnId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                          Receipt
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {counter.name} <ArrowRight className="h-3 w-3" />
                      </span>
                    </td>
                    <td className={`py-4 pr-2 text-right tabular-nums font-semibold ${isIncome ? "text-success" : ""}`}>
                      {isIncome ? "+" : "−"}{formatMoneyCents(Number(t.amount))}
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing({ id: t.id, draft: transactionToDraft(t) })}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Edit transaction"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this transaction?")) {
                              deleteTransaction(t.id).catch((error) => toast.error(error.message));
                            }
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                          aria-label="Delete transaction"
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

function transactionToDraft(t: {
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

function AddTxnForm({
  onDone, onSubmit,
  incomeAccounts, expenseAccounts, assetAccounts, liabAccounts,
}: {
  onDone: () => void;
  onSubmit: (t: { date: string; memo: string; amount: number; debitAccountId: string; creditAccountId: string; vendor?: string }) => Promise<void>;
  incomeAccounts: { id: string; name: string }[];
  expenseAccounts: { id: string; name: string }[];
  assetAccounts: { id: string; name: string }[];
  liabAccounts: { id: string; name: string }[];
}) {
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(expenseAccounts[0]?.id ?? "");
  const [paidFrom, setPaidFrom] = useState(assetAccounts[0]?.id ?? liabAccounts[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || !memo || !category || !paidFrom) return;
    setSaving(true);
    try {
      let debit: string, credit: string;
      if (type === "income") {
        debit = paidFrom; credit = category;
      } else if (type === "expense") {
        debit = category; credit = paidFrom;
      } else {
        debit = category; credit = paidFrom;
      }
      await onSubmit({ date, memo, amount: amt, debitAccountId: debit, creditAccountId: credit, vendor: vendor || undefined });
      onDone();
    } finally { setSaving(false); }
  };

  const catOptions = type === "income" ? incomeAccounts : type === "expense" ? expenseAccounts : [...assetAccounts, ...liabAccounts];
  const paidLabel = type === "income" ? "Deposit into" : "Paid from";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${type === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={onDone} className="text-xs text-muted-foreground">Cancel</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Memo"
          className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm md:col-span-2" />
        <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor (optional)"
          className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount here" inputMode="decimal"
          className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm tabular-nums" />
        <button onClick={save} disabled={saving}
          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm">
            {catOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{paidLabel}</span>
          <select value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm">
            <optgroup label="Bank">{assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
            <optgroup label="Cards / Liability">{liabAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
          </select>
        </label>
      </div>
    </div>
  );
}
