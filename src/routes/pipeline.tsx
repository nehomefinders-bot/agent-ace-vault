import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/pipeline")({
  component: Pipeline,
  head: () => ({ meta: [{ title: "Pipeline — Agent Business Tracker" }] }),
});

type Stage = "pending" | "under_contract" | "closing" | "closed";
const STAGES: { key: Stage; label: string; tone: "muted" | "warning" | "primary" | "success" }[] = [
  { key: "pending", label: "Lead", tone: "muted" },
  { key: "under_contract", label: "Under Contract", tone: "warning" },
  { key: "closing", label: "Closing", tone: "primary" },
  { key: "closed", label: "Closed", tone: "success" },
];

interface Deal {
  id: string;
  address: string;
  status: string;
  sale_price: number;
  gross_commission: number;
  client_name: string | null;
  close_date: string | null;
}

function Pipeline() {
  const { user, loading: authLoading } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // form
  const [property, setProperty] = useState("");
  const [stage, setStage] = useState<Stage>("pending");
  const [closeDate, setCloseDate] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) { setDeals([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("deals")
      .select("id,address,status,sale_price,gross_commission,client_name,close_date")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDeals((data ?? []) as Deal[]);
    setLoading(false);
  }
  useEffect(() => { if (!authLoading) load(); /* eslint-disable-next-line */ }, [user, authLoading]);

  async function createOpportunity(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !property.trim()) return;
    setSaving(true);
    const sale = parseFloat(salePrice) || 0;
    const { error } = await supabase.from("deals").insert({
      user_id: user.id,
      address: property.trim(),
      side: "buy",
      status: stage,
      sale_price: sale,
      gross_commission: sale * 0.025,
      agent_split_pct: 80,
      brokerage_split_pct: 20,
      close_date: closeDate || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Opportunity added");
    setProperty(""); setSalePrice(""); setCloseDate(""); setStage("pending");
    setOpen(false);
    load();
  }

  if (authLoading) {
    return <PageShell title="Pipeline"><div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></PageShell>;
  }
  if (!user) {
    return <PageShell title="Pipeline" subtitle="Sign in to view your deals.">
      <Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Sign in</Link>
    </PageShell>;
  }

  return (
    <PageShell
      title="Pipeline"
      subtitle="Drag deals across stages. Forecast commission with confidence."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> New Opportunity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Opportunity</DialogTitle></DialogHeader>
            <form onSubmit={createOpportunity} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prop">Property *</Label>
                <Input id="prop" autoFocus required placeholder="123 Main St" value={property} onChange={(e) => setProperty(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Stage</Label>
                  <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cd">Close date</Label>
                  <Input id="cd" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp">Estimated sale price</Label>
                <Input id="sp" type="number" min="0" placeholder="500000" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !property.trim()}>{saving ? "Saving…" : "Add Opportunity"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {STAGES.map((s) => {
            const items = deals.filter((d) => d.status === s.key);
            const total = items.reduce((sum, d) => sum + Number(d.sale_price), 0);
            return (
              <div key={s.key} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col">
                <header className="px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between mb-1">
                    <StatusPill tone={s.tone}>{s.label}</StatusPill>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="text-lg font-bold tabular-nums font-display mt-2">{formatMoney(total)}</div>
                </header>
                <ul className="p-3 space-y-2 flex-1 min-h-[120px]">
                  {items.map((d) => (
                    <li key={d.id} className="p-3 rounded-lg border border-border hover:border-secondary hover:shadow-sm transition cursor-pointer bg-background">
                      <div className="font-medium text-sm">{d.address}</div>
                      {d.client_name && <div className="text-xs text-muted-foreground mt-0.5">{d.client_name}</div>}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm tabular-nums font-semibold">{formatMoney(Number(d.sale_price))}</span>
                        {d.close_date && <span className="text-[11px] text-muted-foreground">{d.close_date}</span>}
                      </div>
                    </li>
                  ))}
                  {items.length === 0 && <li className="text-xs text-muted-foreground text-center py-8">No deals</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
