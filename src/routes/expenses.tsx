import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Loader2, Trash2, Wallet, Paperclip } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/expenses")({
  component: Expenses,
  head: () => ({ meta: [{ title: "Expenses — Agent Business Tracker" }] }),
});

interface Expense {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  receipt_path: string | null;
  notes: string | null;
}

const CATEGORIES = ["Marketing", "Auto", "Office", "Software", "Meals", "Travel", "Education", "Insurance", "Other"];

function Expenses() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("Other");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("id,vendor,category,amount,date,receipt_path,notes")
      .order("date", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Expense[]);
    setLoading(false);
  }
  useEffect(() => { if (!authLoading) load(); /* eslint-disable-next-line */ }, [user, authLoading]);

  function reset() {
    setVendor(""); setCategory("Other"); setAmount(""); setDate(new Date().toISOString().slice(0, 10));
    setNotes(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !vendor.trim()) return;
    setSaving(true);

    let receipt_path: string | null = null;
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("receipts").upload(path, file);
      if (up.error) { setSaving(false); return toast.error(up.error.message); }
      receipt_path = up.data.path;
    }

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      vendor: vendor.trim(),
      category,
      amount: parseFloat(amount) || 0,
      date,
      notes: notes.trim() || null,
      receipt_path,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Expense logged");
    reset();
    setOpen(false);
    load();
  }

  async function remove(e: Expense) {
    if (!confirm("Delete this expense?")) return;
    if (e.receipt_path) await supabase.storage.from("receipts").remove([e.receipt_path]);
    const { error } = await supabase.from("expenses").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    load();
  }

  const total = rows.reduce((s, e) => s + Number(e.amount), 0);

  if (authLoading) return <PageShell title="Expenses"><div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></PageShell>;
  if (!user) return <PageShell title="Expenses" subtitle="Sign in to track expenses."><Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Sign in</Link></PageShell>;

  return (
    <PageShell
      title="Expenses"
      subtitle="Track deductible business spend, with receipts attached."
      actions={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Log Expense</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Expense</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ve">Vendor *</Label>
                <Input id="ve" autoFocus required value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Staples, Shell, Zillow Ads…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <Label htmlFor="rc">Receipt (optional)</Label>
                <Input id="rc" ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt">Notes</Label>
                <Input id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !vendor.trim()}>{saving ? "Saving…" : "Save Expense"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
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
          {/* Mobile card view */}
          <ul className="md:hidden space-y-2">
            {rows.map((e) => (
              <li key={e.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{e.vendor}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{e.category} · {e.date}</div>
                  {e.receipt_path && <span className="inline-flex items-center gap-1 text-xs text-success mt-1"><Paperclip className="h-3 w-3" /> Receipt</span>}
                </div>
                <div className="text-right shrink-0">
                  <div className="tabular-nums font-medium">{formatMoney(Number(e.amount))}</div>
                  <button onClick={() => remove(e)} className="text-muted-foreground hover:text-destructive mt-2"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <th className="text-left font-medium py-3 px-6">Vendor</th>
                  <th className="text-left font-medium py-3">Category</th>
                  <th className="text-left font-medium py-3">Date</th>
                  <th className="text-left font-medium py-3">Receipt</th>
                  <th className="text-right font-medium py-3">Amount</th>
                  <th className="w-10 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                    <td className="py-4 px-6 font-medium">{e.vendor}</td>
                    <td className="py-4 text-muted-foreground">{e.category}</td>
                    <td className="py-4 text-muted-foreground text-xs">{e.date}</td>
                    <td className="py-4">
                      {e.receipt_path ? <StatusPill tone="success">Attached</StatusPill> : <StatusPill tone="warning">Missing</StatusPill>}
                    </td>
                    <td className="py-4 text-right tabular-nums font-medium">{formatMoney(Number(e.amount))}</td>
                    <td className="py-4 pr-4">
                      <button onClick={() => remove(e)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
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
