import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AccountKind } from "@/lib/books-data";

export interface BooksAccountDraft {
  code: string;
  name: string;
  kind: AccountKind;
  taxLine?: string;
  description?: string;
}

export interface BooksAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialValue?: BooksAccountDraft;
  onSubmit: (account: BooksAccountDraft) => Promise<void>;
}

const kinds: AccountKind[] = ["Income", "Expense", "Asset", "Liability", "Equity"];

export function BooksAccountDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initialValue,
  onSubmit,
}: BooksAccountDialogProps) {
  const [code, setCode] = useState(initialValue?.code ?? "");
  const [name, setName] = useState(initialValue?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(initialValue?.kind ?? "Expense");
  const [taxLine, setTaxLine] = useState(initialValue?.taxLine ?? "");
  const [description, setDescription] = useState(initialValue?.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(initialValue?.code ?? "");
    setName(initialValue?.name ?? "");
    setKind(initialValue?.kind ?? "Expense");
    setTaxLine(initialValue?.taxLine ?? "");
    setDescription(initialValue?.description ?? "");
  }, [open, initialValue]);

  const save = async () => {
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        kind,
        taxLine: taxLine.trim() || undefined,
        description: description.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-code">Code</Label>
              <Input
                id="account-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter account code here"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-kind">Kind</Label>
              <select
                id="account-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as AccountKind)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
              >
                {kinds.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Account name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-tax-line">Tax line</Label>
            <Input
              id="account-tax-line"
              value={taxLine}
              onChange={(e) => setTaxLine(e.target.value)}
              placeholder="Optional tax line"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-description">Description</Label>
            <Textarea
              id="account-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !code.trim() || !name.trim()}>
            {saving ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
