import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Loader2, Trash2, Wallet, Paperclip } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { ReceiptPreviewDialog } from "@/components/receipt-preview-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/mock-data";
import { getReceiptFileName, getReceiptPreviewKind } from "@/lib/receipt-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { upsertExpenseTransaction, deleteExpenseTransaction } from "@/lib/expense-books-sync";
import { TableFilterBar, useTableFilters, applyTableFilters } from "@/components/table-filter-bar";

export const Route = createFileRoute("/expenses")({
  component: Expenses,
  head: () => ({ meta: [{ title: "Expenses - Agent Business Tracker" }] }),
});

interface Expense {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  receipt_path: string | null;
  notes: string | null;
  transaction_id: string | null;
}

type ExpenseFormValues = {
  vendor: string;
  category: string;
  amount: string;
  date: string;
  notes: string;
};

const CATEGORIES = ["Marketing", "Auto", "Office", "Software", "Meals", "Travel", "Education", "Insurance", "Other"];

function Expenses() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    subtitle: string;
    fileUrl: string;
    fileName: string;
    kind: "image" | "pdf" | "other";
  } | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  async function load() {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("id,vendor,category,amount,date,receipt_path,notes,transaction_id")
      .order("date", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Expense[]);
    setLoading(false);
  }
  useEffect(() => { if (!authLoading) load(); /* eslint-disable-next-line */ }, [user, authLoading]);

  const [filters, setFilters, resetFilters] = useTableFilters();
  const filteredRows = applyTableFilters(rows, filters, {
    searchText: (e) => `${e.vendor} ${e.notes ?? ""} ${e.category}`,
    date: (e) => e.date,
    amount: (e) => Number(e.amount),
    selectValue: (e, key) => (key === "category" ? e.category : ""),
  });

  async function remove(e: Expense) {
    if (!confirm("Delete this expense?")) return;
    if (e.receipt_path) await supabase.storage.from("receipts").remove([e.receipt_path]);
    await deleteExpenseTransaction(e.transaction_id);
    const { error } = await supabase.from("expenses").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Expense deleted");
    load();
  }

  async function openReceiptPreview(expense: Expense) {
    if (!expense.receipt_path) return;
    setPreviewingId(expense.id);
    try {
      const { data, error } = await supabase.storage.from("receipts").createSignedUrl(expense.receipt_path, 60 * 30);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? "Could not open receipt");
      }

      setPreview({
        title: `${expense.vendor} receipt`,
        subtitle: [expense.category, expense.date].filter(Boolean).join(" - "),
        fileUrl: data.signedUrl,
        fileName: getReceiptFileName(expense.receipt_path),
        kind: getReceiptPreviewKind(expense.receipt_path),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open receipt");
    } finally {
      setPreviewingId(null);
    }
  }

  const total = filteredRows.reduce((s, e) => s + Number(e.amount), 0);

  if (authLoading) return <PageShell title="Expenses"><div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></PageShell>;
  if (!user) return <PageShell title="Expenses" subtitle="Sign in to track expenses."><Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Sign in</Link></PageShell>;

  return (
    <PageShell
      title="Expenses"
      subtitle="Track deductible business spend, with receipts attached."
      actions={
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Log Expense</Button>
      }
    >
      <ExpenseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Log Expense"
        submitLabel="Save Expense"
        onSubmit={async (input) => {
          if (!user) return;
          const created = await saveExpenseRow(user.id, input, null);
          if (created.error) throw created.error;
          const txnId = await upsertExpenseTransaction(
            user.id,
            {
              vendor: created.row.vendor as string,
              category: created.row.category as string,
              amount: created.row.amount as number,
              date: created.row.date as string,
              notes: (created.row.notes as string | null) ?? null,
            },
            null,
          );
          const { error } = await supabase.from("expenses").insert({
            user_id: user.id,
            ...created.row,
            transaction_id: txnId,
          } as never);
          if (error) throw error;
          toast.success("Expense logged");
          await load();
        }}
      />

      <ExpenseDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit Expense"
        submitLabel="Save Changes"
        initial={editing ? expenseToForm(editing) : undefined}
        existingReceiptPath={editing?.receipt_path ?? null}
        onSubmit={async (input) => {
          if (!editing) return;
          const result = await saveExpenseRow(user!.id, input, editing.receipt_path);
          if (result.error) throw result.error;
          const txnId = await upsertExpenseTransaction(
            user!.id,
            {
              vendor: result.row.vendor as string,
              category: result.row.category as string,
              amount: result.row.amount as number,
              date: result.row.date as string,
              notes: (result.row.notes as string | null) ?? null,
            },
            editing.transaction_id,
          );
          const { error } = await supabase
            .from("expenses")
            .update({ ...result.row, transaction_id: txnId } as never)
            .eq("id", editing.id);
          if (error) throw error;
          setEditing(null);
          toast.success("Expense updated");
          await load();
        }}
      />
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

      <div className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-card max-w-sm">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total tracked</div>
        <div className="text-3xl font-bold tabular-nums font-display">{formatMoney(total)}</div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="border border-dashed rounded-xl py-16 text-center">
          <Wallet className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <div className="font-medium">No expenses yet</div>
          <div className="text-sm text-muted-foreground mt-1">Click <span className="font-medium">Log Expense</span> to add your first.</div>
        </div>
      ) : (
        <>
          <ul className="md:hidden space-y-2">
            {rows.map((e) => (
              <li key={e.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{e.vendor}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{e.category} - {e.date}</div>
                  {e.receipt_path && (
                    <button
                      type="button"
                      onClick={() => openReceiptPreview(e)}
                      className="inline-flex items-center gap-1 text-xs text-success mt-1 hover:underline disabled:opacity-60"
                      disabled={previewingId === e.id}
                    >
                      {previewingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                      Receipt
                    </button>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="tabular-nums font-medium">{formatMoney(Number(e.amount))}</div>
                  <div className="mt-2 inline-flex gap-1">
                    <button onClick={() => setEditing(e)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(e)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <th className="text-left font-medium py-3 px-6">Vendor</th>
                  <th className="text-left font-medium py-3">Category</th>
                  <th className="text-left font-medium py-3">Date</th>
                  <th className="text-left font-medium py-3">Receipt</th>
                  <th className="text-right font-medium py-3">Amount</th>
                  <th className="w-20 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                    <td className="py-4 px-6 font-medium">{e.vendor}</td>
                    <td className="py-4 text-muted-foreground">{e.category}</td>
                    <td className="py-4 text-muted-foreground text-xs">{e.date}</td>
                    <td className="py-4">
                      {e.receipt_path ? (
                        <button
                          type="button"
                          onClick={() => openReceiptPreview(e)}
                          className="inline-flex"
                          disabled={previewingId === e.id}
                        >
                          <StatusPill tone="success">
                            <span className="inline-flex items-center gap-1">
                              {previewingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                              Attached
                            </span>
                          </StatusPill>
                        </button>
                      ) : (
                        <StatusPill tone="warning">Missing</StatusPill>
                      )}
                    </td>
                    <td className="py-4 text-right tabular-nums font-medium">{formatMoney(Number(e.amount))}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(e)} className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(e)} className="text-muted-foreground hover:text-destructive inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageShell>
  );
}

function expenseToForm(expense: Expense): ExpenseFormValues {
  return {
    vendor: expense.vendor,
    category: expense.category,
    amount: String(expense.amount ?? ""),
    date: expense.date,
    notes: expense.notes ?? "",
  };
}

async function saveExpenseRow(
  userId: string,
  input: ExpenseFormValues & { file?: File | null },
  existingReceiptPath: string | null,
): Promise<{ row: Record<string, unknown>; error: Error | null }> {
  let receipt_path = existingReceiptPath;
  if (input.file) {
    const path = `${userId}/${Date.now()}-${input.file.name}`;
    const up = await supabase.storage.from("receipts").upload(path, input.file);
    if (up.error) return { row: {}, error: new Error(up.error.message) };
    receipt_path = up.data.path;
    if (existingReceiptPath && existingReceiptPath !== receipt_path) {
      await supabase.storage.from("receipts").remove([existingReceiptPath]);
    }
  }

  return {
    row: {
      vendor: input.vendor.trim(),
      category: input.category,
      amount: parseFloat(input.amount) || 0,
      date: input.date,
      notes: input.notes.trim() || null,
      receipt_path,
    },
    error: null,
  };
}

function ExpenseDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  onSubmit,
  initial,
  existingReceiptPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  onSubmit: (input: ExpenseFormValues & { file?: File | null }) => Promise<void>;
  initial?: ExpenseFormValues;
  existingReceiptPath?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [vendor, setVendor] = useState(initial?.vendor ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Other");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVendor(initial?.vendor ?? "");
    setCategory(initial?.category ?? "Other");
    setAmount(initial?.amount ?? "");
    setDate(initial?.date ?? new Date().toISOString().slice(0, 10));
    setNotes(initial?.notes ?? "");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [open, initial]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ vendor, category, amount, date, notes, file });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ve">Vendor *</Label>
            <Input id="ve" autoFocus required value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Staples, Shell, Zillow Ads..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="am">Amount *</Label>
              <Input id="am" type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="89.50" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dt">Date</Label>
            <Input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc">{existingReceiptPath ? "Replace receipt (optional)" : "Receipt (optional)"}</Label>
            <Input id="rc" ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nt">Notes</Label>
            <Input id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !vendor.trim()}>{saving ? "Saving..." : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
