import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, TrendingUp, Trash2, Home as HomeIcon } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/hooks/use-books";

export const Route = createFileRoute("/deals")({
  component: DealsPage,
  head: () => ({ meta: [{ title: "Deals & Commissions — Agent Business Tracker" }] }),
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

const STATUSES = ["pending", "under_contract", "closed", "dead"];

function DealsPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

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
        <button onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> New deal
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Closed YTD (your take)" value={formatMoney(earnedYTD)} accent="success" sub={`${closed.length} deals`} />
        <Stat label="Pipeline (your take)" value={formatMoney(pipelineValue)} accent="primary" sub={`${pipeline.length} active`} />
        <Stat label="Total deals" value={String(deals.length)} accent="muted" />
      </div>

      {showAdd && <NewDealForm onDone={() => { setShowAdd(false); reload(); }} userId={user.id} />}

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground text-center">Loading…</div>
        ) : deals.length === 0 ? (
          <div className="p-12 text-center">
            <HomeIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">No deals yet. Add your first one to start tracking commissions.</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-medium py-3 px-6">Property</th>
                <th className="text-left font-medium py-3">Status</th>
                <th className="text-right font-medium py-3">Sale price</th>
                <th className="text-right font-medium py-3">Gross comm.</th>
                <th className="text-right font-medium py-3">Splits</th>
                <th className="text-right font-medium py-3 pr-6">Your take</th>
                <th className="w-10 pr-4"></th>
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
                    <td className="py-4 pr-4">
                      <button onClick={() => { if (confirm("Delete this deal?")) remove(d.id); }} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

function NewDealForm({ onDone, userId }: { onDone: () => void; userId: string }) {
  const [address, setAddress] = useState("");
  const [client, setClient] = useState("");
  const [side, setSide] = useState("buy");
  const [salePrice, setSalePrice] = useState(0);
  const [commPct, setCommPct] = useState(2.5);
  const [agentSplit, setAgentSplit] = useState(80);
  const [refPct, setRefPct] = useState(0);
  const [refTo, setRefTo] = useState("");
  const [status, setStatus] = useState("pending");
  const [closeDate, setCloseDate] = useState("");
  const [saving, setSaving] = useState(false);

  const gross = salePrice * (commPct / 100);
  const yourTake = gross * (1 - refPct / 100) * (agentSplit / 100);

  const save = async () => {
    if (!address) return;
    setSaving(true);
    await supabase.from("deals").insert({
      user_id: userId,
      address,
      client_name: client || null,
      side,
      sale_price: salePrice,
      gross_commission: gross,
      agent_split_pct: agentSplit,
      brokerage_split_pct: 100 - agentSplit,
      referral_pct: refPct,
      referral_to: refTo || null,
      status,
      close_date: closeDate || null,
    });
    setSaving(false);
    onDone();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card mb-6">
      <h3 className="font-display font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> New deal</h3>
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
          <input type="number" value={salePrice} onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)} className="inp tabular-nums" />
        </FormField>
        <FormField label="Commission %">
          <input type="number" step={0.25} value={commPct} onChange={(e) => setCommPct(parseFloat(e.target.value) || 0)} className="inp tabular-nums" />
        </FormField>
        <FormField label="Your split with brokerage %">
          <input type="number" value={agentSplit} onChange={(e) => setAgentSplit(parseFloat(e.target.value) || 0)} className="inp tabular-nums" />
        </FormField>
        <FormField label="Referral % (off the top)">
          <input type="number" value={refPct} onChange={(e) => setRefPct(parseFloat(e.target.value) || 0)} className="inp tabular-nums" />
        </FormField>
        <FormField label="Referral to (optional)">
          <input value={refTo} onChange={(e) => setRefTo(e.target.value)} placeholder="Coastal Realty" className="inp" />
        </FormField>
        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="inp">
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
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
          <div className="font-display font-bold tabular-nums">{salePrice ? ((yourTake / salePrice) * 100).toFixed(2) : "0.00"}%</div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="px-3 py-2 text-sm text-muted-foreground">Cancel</button>
        <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Save deal"}
        </button>
      </div>

      <style>{`.inp { width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); font-size: 0.875rem; }`}</style>
    </div>
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
