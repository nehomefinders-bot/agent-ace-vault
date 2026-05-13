import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, TrendingDown, TrendingUp, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { BooksTransactionDialog, type BooksTransactionDraft } from "@/components/books-transaction-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBooks, formatMoneyCents, formatMoney } from "@/hooks/use-books";
import { classifyTxn } from "@/lib/books-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const EXTRA_ACCOUNTS: { sentinel: string; name: string; code: string }[] = [
  { sentinel: "__misc__", name: "Miscellaneous", code: "1900" },
  { sentinel: "__ask_accountant__", name: "Ask Accountant", code: "1910" },
];

export const Route = createFileRoute("/books/")({
  component: BooksOverview,
});

function BooksOverview() {
  const { accounts, transactions, accountById, addTransaction, updateTransaction, deleteTransaction, setCleared } = useBooks();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; draft: BooksTransactionDraft } | null>(null);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthly = useMemo(
    () => transactions.filter((t) => t.date.startsWith(monthKey)),
    [transactions, monthKey],
  );

  const { totalIncome, totalExpense } = useMemo(() => {
    let inc = 0, exp = 0;
    for (const t of monthly) {
      const kind = classifyTxn(t, accountById);
      if (kind === "income") inc += Number(t.amount);
      else if (kind === "expense") exp += Number(t.amount);
    }
    return { totalIncome: inc, totalExpense: exp };
  }, [monthly, accountById]);
  const netProfit = totalIncome - totalExpense;

  const ledger = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );

  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="Net Profit"
          sub={monthLabel}
          value={formatMoney(netProfit)}
          tone={netProfit >= 0 ? "success" : "danger"}
          icon={<Wallet className="h-4 w-4" />}
        />
        <SummaryCard
          label="Total Income"
          sub={monthLabel}
          value={formatMoney(totalIncome)}
          tone="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <SummaryCard
          label="Total Expenses"
          sub={monthLabel}
          value={formatMoney(totalExpense)}
          tone="danger"
          icon={<TrendingDown className="h-4 w-4" />}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg">Transaction Ledger</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All income and expenses, newest first.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" /> Add Transaction
            </Button>
          </DialogTrigger>
          <AddTransactionModal
            accounts={accounts}
            onClose={() => setOpen(false)}
            onSubmit={addTransaction}
          />
        </Dialog>
      </div>

      <BooksTransactionDialog
        open={!!editing}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditing(null);
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
        {ledger.length === 0 ? (
          <div className="p-12 text-sm text-muted-foreground text-center">
            No transactions yet. Click <span className="font-medium text-foreground">Add Transaction</span> to log your first entry.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border">
                    <th className="text-left font-semibold py-3 px-4 w-24">Date</th>
                    <th className="text-left font-semibold py-3 px-4">Description</th>
                    <th className="text-left font-semibold py-3 px-4">Category</th>
                    <th className="text-left font-semibold py-3 px-4 w-24">Type</th>
                    <th className="text-right font-semibold py-3 px-4 w-32">Amount</th>
                    <th className="text-center font-semibold py-3 px-4 w-20">Cleared</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((t, i) => {
                    const debit = accountById(t.debitAccountId);
                    const credit = accountById(t.creditAccountId);
                    if (!debit || !credit) return null;
                    const kind = classifyTxn(t, accountById);
                    const isIncome = kind === "income";
                    const category = isIncome ? credit : debit;
                    return (
                      <tr
                        key={t.id}
                        className={`border-b border-border/60 last:border-b-0 hover:bg-accent/30 transition-colors ${
                          i % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }`}
                      >
                        <td className="py-3 px-4 text-xs text-muted-foreground tabular-nums">{t.date}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{t.memo}</div>
                          {t.vendor && <div className="text-xs text-muted-foreground">{t.vendor}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                            {category.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isIncome
                                ? "bg-success/10 text-success"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {isIncome ? "Income" : "Expense"}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 text-right tabular-nums font-semibold ${
                            isIncome ? "text-success" : "text-foreground"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatMoneyCents(Number(t.amount))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Checkbox
                            checked={!!t.cleared}
                            onCheckedChange={(v) => setCleared(t.id, !!v)}
                            aria-label="Cleared"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditing({ id: t.id, draft: transactionToDraft(t) })}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Delete this transaction?")) {
                                  deleteTransaction(t.id).catch((e) => toast.error(e.message));
                                }
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                              aria-label="Delete"
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

            <div className="md:hidden divide-y divide-border">
              {ledger.map((t, i) => {
                const debit = accountById(t.debitAccountId);
                const credit = accountById(t.creditAccountId);
                if (!debit || !credit) return null;
                const kind = classifyTxn(t, accountById);
                const isIncome = kind === "income";
                const category = isIncome ? credit : debit;
                return (
                  <div key={t.id} className={`p-4 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isIncome ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {isIncome ? "Income" : "Expense"}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{t.date}</span>
                        </div>
                        <div className="font-medium truncate">{t.memo}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{category.name}</div>
                      </div>
                      <div className={`text-right tabular-nums font-semibold ${isIncome ? "text-success" : ""}`}>
                        {isIncome ? "+" : "-"}
                        {formatMoneyCents(Number(t.amount))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={!!t.cleared}
                          onCheckedChange={(v) => setCleared(t.id, !!v)}
                        />
                        Cleared
                      </label>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setEditing({ id: t.id, draft: transactionToDraft(t) })}
                          className="text-muted-foreground hover:text-foreground p-2 -mr-1"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this transaction?")) {
                              deleteTransaction(t.id).catch((e) => toast.error(e.message));
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive p-2 -mr-2"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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

function SummaryCard({
  label, sub, value, tone, icon,
}: {
  label: string; sub: string; value: string; tone: "success" | "danger" | "muted"; icon: React.ReactNode;
}) {
  const valueClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-foreground";
  const iconBg =
    tone === "success" ? "bg-success/10 text-success" :
    tone === "danger" ? "bg-destructive/10 text-destructive" :
    "bg-muted text-muted-foreground";
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <div className={`text-3xl font-bold font-display tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function AddTransactionModal({
  accounts, onClose, onSubmit,
}: {
  accounts: { id: string; name: string; kind: string; code: string }[];
  onClose: () => void;
  onSubmit: (t: { date: string; memo: string; amount: number; debitAccountId: string; creditAccountId: string; vendor?: string }) => Promise<void>;
}) {
  const expenseAccounts = accounts.filter((a) => a.kind === "Expense");
  const incomeAccounts = accounts.filter((a) => a.kind === "Income");
  const assetAccounts = accounts.filter((a) => a.kind === "Asset");
  const liabAccounts = accounts.filter((a) => a.kind === "Liability");

  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [saving, setSaving] = useState(false);

  const catOptions = type === "income" ? incomeAccounts : expenseAccounts;
  const acctOptions = [...assetAccounts, ...liabAccounts];

  const effCategory = category || catOptions[0]?.id || "";
  const effAccount = account || acctOptions[0]?.id || EXTRA_ACCOUNTS[0].sentinel;

  const { user } = useAuth();
  const { reload } = useBooks();

  async function resolveAccountId(value: string): Promise<string> {
    const extra = EXTRA_ACCOUNTS.find((e) => e.sentinel === value);
    if (!extra) return value;
    if (!user) throw new Error("Not signed in");
    const existing = accounts.find((a) => a.name === extra.name);
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("accounts")
      .insert({ user_id: user.id, code: extra.code, name: extra.name, kind: "Asset" })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Could not create account");
    await reload();
    return data.id;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!memo.trim()) return toast.error("Add a description");
    if (!effCategory || !effAccount) return toast.error("Pick a category and account");
    setSaving(true);
    try {
      const accountId = await resolveAccountId(effAccount);
      const debit = type === "income" ? accountId : effCategory;
      const credit = type === "income" ? effCategory : accountId;
      await onSubmit({ date, memo: memo.trim(), amount: amt, debitAccountId: debit, creditAccountId: credit });
      toast.success("Transaction saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Transaction</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 bg-muted rounded-lg p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategory(""); }}
              className={`py-2 rounded-md text-sm font-medium capitalize transition ${
                type === t
                  ? t === "income"
                    ? "bg-success text-success-foreground shadow-sm"
                    : "bg-destructive text-destructive-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="tabular-nums"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={effCategory} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
            <SelectContent>
              {catOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{type === "income" ? "Deposit into" : "Paid from"}</Label>
          <Select value={effAccount} onValueChange={setAccount}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {acctOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
              {EXTRA_ACCOUNTS.map((e) => (
                <SelectItem key={e.sentinel} value={e.sentinel}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="memo">Description / Memo</Label>
          <Textarea
            id="memo"
            required
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="e.g. Zillow Premier Agent - March"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Transaction"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
