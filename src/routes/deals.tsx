import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Plus, TrendingUp, Trash2, Home as HomeIcon } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/hooks/use-books";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/deals")({
  component: DealsPage,
  head: () => ({ meta: [{ title: "Deals & Commissions â€” Agent Business Tracker" }] }),
});

interface Deal {
  id: string;
  address: string;
  side: string;
  sale_price: number;
  gross_commission: number;
  agent_split_pct: number;
  brokerage_split_pct: number;
  referral_pct: number;
  referral_to: string | null;
  status: string;
  close_date: string | null;
  client_name: string | null;
  notes: string | null;
}

type DealFormValues = {
  address: string;
  client: string;
  side: string;
  salePrice: string;
  commPct: string;
  agentSplit: string;
  refPct: string;
  refTo: string;
  status: string;
  closeDate: string;
};

const STATUSES = ["pending", "under_contract", "closed", "dead"];

function DealsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);

  const reload = async () => {
    if (!user) { setDeals([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
    setDeals((data ?? []) as Deal[]);
    setLoading(false);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user]);

  const remove = async (id: string) => {
    await supabase.from("deals").delete().eq("id", id);
    await reload();
  };

  const closed = deals.filter((d) => d.status === "closed");
  const pipeline = deals.filter((d) => d.status !== "closed" && d.status !== "dead");

  const calcAgentTake = (d: Deal) => {
    const afterReferral = d.gross_commission * (1 - d.referral_pct / 100);
    return afterReferral * (d.agent_split_pct / 100);
  };

  const earnedYTD = closed.reduce((s, d) => s + calcAgentTake(d), 0);
  const pipelineValue = pipeline.reduce((s, d) => s + calcAgentTake(d), 0);

  if (!user) {
    return (
      <PageShell title="Deals" subtitle="Sign in to track deals and commissions.">
        <Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Sign in</Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Deals & Commissions"
      subtitle="Track each transaction, splits, and what you actually take home."
      actions={
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New deal
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Closed YTD (your take)" value={formatMoney(earnedYTD)} accent="success" sub={`${closed.length} deals`} />
        <Stat label="Pipeline (your take)" value={formatMoney(pipelineValue)} accent="primary" sub={`${pipeline.length} active`} />
        <Stat label="Total deals" value={String(deals.length)} accent="muted" />
      </div>

      <DealDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="New deal"
        submitLabel="Save deal"
        onSubmit={async (input) => {
          if (!user) return;
          const sale = parseFloat(input.salePrice) || 0;
          const commPct = parseFloat(input.commPct) || 0;
          const agentSplit = parseFloat(input.agentSplit) || 0;
          const refPct = parseFloat(input.refPct) || 0;
          const gross = sale * (commPct / 100);
          await supabase.from("deals").insert({
            user_id: user.id,
            address: input.address,
            client_name: input.client || null,
            side: input.side,
            sale_price: sale,
            gross_commission: gross,
            agent_split_pct: agentSplit,
            brokerage_split_pct: 100 - agentSplit,
            referral_pct: refPct,
            referral_to: input.refTo || null,
            status: input.status,
            close_date: input.closeDate || null,
          });
          await reload();
        }}
      />

      <DealDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit deal"
        submitLabel="Save changes"
        initial={editing ? dealToForm(editing) : undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          const sale = parseFloat(input.salePrice) || 0;
          const commPct = parseFloat(input.commPct) || 0;
          const agentSplit = parseFloat(input.agentSplit) || 0;
          const refPct = parseFloat(input.refPct) || 0;
          const gross = sale * (commPct / 100);
          await supabase.from("deals").update({
            address: input.address,
            client_name: input.client || null,
            side: input.side,
            sale_price: sale,
            gross_commission: gross,
            agent_split_pct: agentSplit,
            brokerage_split_pct: 100 - agentSplit,
            referral_pct: refPct,
            referral_to: input.refTo || null,
            status: input.status,
            close_date: input.closeDate || null,
          }).eq("id", editing.id);
          setEditing(null);
          await reload();
        }}
      />

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground text-center">Loadingâ€¦</div>
        ) : deals.length === 0 ? (
          <div className="p-12 text-center">
            <HomeIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">No deals yet. Add your first one to start tracking commissions.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-medium py-3 px-6">Property</th>
                <th className="text-left font-medium py-3">Status</th>
                <th className="text-right font-medium py-3">Sale price</th>
                <th className="text-right font-medium py-3">Gross comm.</th>
                <th className="text-right font-medium py-3">Splits</th>
                <th className="text-right font-medium py-3 pr-6">Your take</th>
                <th className="w-20 pr-6"></th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const take = calcAgentTake(d);
                return (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                    <td className="py-4 px-6">
                      <div className="font-medium">{d.address}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.client_name && <>{d.client_name} · </>}
                        {d.side} side
                        {d.close_date && <> · {d.close_date}</>}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                        d.status === "closed" ? "bg-success/10 text-success" :
                        d.status === "dead" ? "bg-muted text-muted-foreground" :
                        "bg-primary/10 text-primary"
                      }`}>{d.status.replace("_", " ")}</span>
                    </td>
                    <td className="py-4 text-right tabular-nums">{formatMoney(Number(d.sale_price))}</td>
                    <td className="py-4 text-right tabular-nums">{formatMoney(Number(d.gross_commission))}</td>
                    <td className="py-4 text-right text-xs text-muted-foreground tabular-nums">
                      {d.referral_pct > 0 && <>{d.referral_pct}% ref → </>}
                      {d.agent_split_pct}/{d.brokerage_split_pct}
                    </td>
                    <td className="py-4 pr-6 text-right tabular-nums font-semibold text-success">{formatMoney(take)}</td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(d)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Edit deal"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm("Delete this deal?")) remove(d.id); }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                          aria-label="Delete deal"
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
    </PageShell>
  );
}

function Stat({ label, value, accent, sub }: { label: string; value: string; accent: "success" | "primary" | "muted"; sub?: string }) {
  const tones = { success: "text-success", primary: "text-primary", muted: "text-foreground" };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className={`text-2xl font-bold tabular-nums font-display ${tones[accent]}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function DealDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initial?: DealFormValues;
  onSubmit: (values: DealFormValues) => Promise<void>;
}) {
  const [address, setAddress] = useState(initial?.address ?? "");
  const [client, setClient] = useState(initial?.client ?? "");
  const [side, setSide] = useState(initial?.side ?? "buy");
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? "");
  const [commPct, setCommPct] = useState(initial?.commPct ?? "2.5");
  const [agentSplit, setAgentSplit] = useState(initial?.agentSplit ?? "80");
  const [refPct, setRefPct] = useState(initial?.refPct ?? "0");
  const [refTo, setRefTo] = useState(initial?.refTo ?? "");
  const [status, setStatus] = useState(initial?.status ?? "pending");
  const [closeDate, setCloseDate] = useState(initial?.closeDate ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAddress(initial?.address ?? "");
    setClient(initial?.client ?? "");
    setSide(initial?.side ?? "buy");
    setSalePrice(initial?.salePrice ?? "");
    setCommPct(initial?.commPct ?? "2.5");
    setAgentSplit(initial?.agentSplit ?? "80");
    setRefPct(initial?.refPct ?? "0");
    setRefTo(initial?.refTo ?? "");
    setStatus(initial?.status ?? "pending");
    setCloseDate(initial?.closeDate ?? "");
  }, [open, initial]);

  const gross = (parseFloat(salePrice) || 0) * ((parseFloat(commPct) || 0) / 100);
  const yourTake = gross * (1 - (parseFloat(refPct) || 0) / 100) * ((parseFloat(agentSplit) || 0) / 100);

  const save = async () => {
    if (!address.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        address: address.trim(),
        client: client.trim(),
        side,
        salePrice,
        commPct,
        agentSplit,
        refPct,
        refTo: refTo.trim(),
        status,
        closeDate,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <FormField label="Property address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className="inp" />
          </FormField>
          <FormField label="Client name">
            <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Sarah Chen" className="inp" />
          </FormField>
          <FormField label="Side">
            <select value={side} onChange={(e) => setSide(e.target.value)} className="inp">
              <option value="buy">Buy side</option><option value="sell">Sell / List side</option><option value="both">Both sides</option>
            </select>
          </FormField>
          <FormField label="Sale price">
            <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="inp tabular-nums" />
          </FormField>
          <FormField label="Commission %">
            <input type="number" step={0.25} value={commPct} onChange={(e) => setCommPct(e.target.value)} className="inp tabular-nums" />
          </FormField>
          <FormField label="Your split with brokerage %">
            <input type="number" value={agentSplit} onChange={(e) => setAgentSplit(e.target.value)} className="inp tabular-nums" />
          </FormField>
          <FormField label="Referral % (off the top)">
            <input type="number" value={refPct} onChange={(e) => setRefPct(e.target.value)} className="inp tabular-nums" />
          </FormField>
          <FormField label="Referral to (optional)">
            <input value={refTo} onChange={(e) => setRefTo(e.target.value)} placeholder="Coastal Realty" className="inp" />
          </FormField>
          <FormField label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="inp"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Close date">
            <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="inp" />
          </FormField>
        </div>

        <div className="bg-muted/40 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <div className="text-xs text-muted-foreground">Gross commission</div>
            <div className="font-display font-bold tabular-nums">{formatMoney(gross)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">After referral & split</div>
            <div className="font-display font-bold tabular-nums">{formatMoney(yourTake)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Effective rate on sale</div>
            <div className="font-display font-bold tabular-nums">{salePrice ? ((yourTake / (parseFloat(salePrice) || 1)) * 100).toFixed(2) : "0.00"}%</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !address.trim()}>
            {saving ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
        <style>{`.inp { width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); font-size: 0.875rem; }`}</style>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function dealToForm(d: Deal): DealFormValues {
  const commPct = Number(d.sale_price) > 0 ? ((Number(d.gross_commission) / Number(d.sale_price)) * 100).toFixed(2) : "0";
  const refPct = String(d.referral_pct ?? 0);
  const agentSplit = String(d.agent_split_pct ?? 0);
  return {
    address: d.address,
    client: d.client_name ?? "",
    side: d.side ?? "buy",
    salePrice: String(d.sale_price ?? 0),
    commPct,
    agentSplit,
    refPct,
    refTo: d.referral_to ?? "",
    status: d.status ?? "pending",
    closeDate: d.close_date ?? "",
  };
}
