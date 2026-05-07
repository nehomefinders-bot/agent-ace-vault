import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Account } from "@/lib/books-data";

export interface BooksTransactionDraft {
  date: string;
  memo: string;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  vendor?: string;
}

export interface BooksTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  accounts: Account[];
  initialValue?: BooksTransactionDraft;
  onSubmit: (t: BooksTransactionDraft) => Promise<void>;
}

function groupAccounts(accounts: Account[]) {
  const groups = [
    { label: "Income", items: accounts.filter((a) => a.kind === "Income") },
    { label: "Expense", items: accounts.filter((a) => a.kind === "Expense") },
    { label: "Asset", items: accounts.filter((a) => a.kind === "Asset") },
    { label: "Liability", items: accounts.filter((a) => a.kind === "Liability") },
    { label: "Equity", items: accounts.filter((a) => a.kind === "Equity") },
  ];
  return groups.filter((g) => g.items.length > 0);
}

export function BooksTransactionDialog({
  open,
  onOpenChange,
  title,
  accounts,
  initialValue,
  onSubmit,
}: BooksTransactionDialogProps) {
  const groupedAccounts = useMemo(() => groupAccounts(accounts), [accounts]);
  const [date, setDate] = useState(initialValue?.date ?? new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState(initialValue?.memo ?? "");
  const [vendor, setVendor] = useState(initialValue?.vendor ?? "");
  const [amount, setAmount] = useState(String(initialValue?.amount ?? ""));
  const [debitAccountId, setDebitAccountId] = useState(initialValue?.debitAccountId ?? accounts[0]?.id ?? "");
  const [creditAccountId, setCreditAccountId] = useState(initialValue?.creditAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(initialValue?.date ?? new Date().toISOString().slice(0, 10));
    setMemo(initialValue?.memo ?? "");
    setVendor(initialValue?.vendor ?? "");
    setAmount(String(initialValue?.amount ?? ""));
    setDebitAccountId(initialValue?.debitAccountId ?? accounts[0]?.id ?? "");
    setCreditAccountId(initialValue?.creditAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? "");
  }, [open, initialValue, accounts]);

  const save = async () => {
    const amt = parseFloat(amount);
    if (!date || !memo.trim() || !debitAccountId || !creditAccountId || !Number.isFinite(amt)) return;
    setSaving(true);
    try {
      await onSubmit({
        date,
        memo: memo.trim(),
        amount: amt,
        debitAccountId,
        creditAccountId,
        vendor: vendor.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Memo</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Transaction memo" />
          </div>
          <div className="space-y-1.5">
            <Label>Vendor / Reference</Label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Debit account</Label>
            <select
              value={debitAccountId}
              onChange={(e) => setDebitAccountId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            >
              {groupedAccounts.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map((account) => (
                    <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Credit account</Label>
            <select
              value={creditAccountId}
              onChange={(e) => setCreditAccountId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
            >
              {groupedAccounts.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map((account) => (
                    <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
