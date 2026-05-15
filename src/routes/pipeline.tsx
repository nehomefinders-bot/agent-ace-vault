import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Mail, Phone, Plus, Trash2, User } from "lucide-react";
import { STAGES, normalizeStage, type Stage } from "@/lib/pipeline-stages";
import { PageShell, StatusPill } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/pipeline")({
  component: Pipeline,
  head: () => ({ meta: [{ title: "Pipeline - Agent Business Tracker" }] }),
});

type PipelineView = "all" | Stage;

const PIPELINE_VIEWS: { key: PipelineView; label: string }[] = [
  { key: "all", label: "All stages" },
  ...STAGES.map((stage) => ({ key: stage.key, label: stage.label })),
];

interface Deal {
  id: string;
  address: string;
  status: string;
  sale_price: number;
  gross_commission: number;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  close_date: string | null;
}

function Pipeline() {
  const { user, loading: authLoading } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PipelineView>("all");
  const [updatingDealId, setUpdatingDealId] = useState<string | null>(null);

  const [property, setProperty] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [stage, setStage] = useState<Stage>("new_lead");
  const [closeDate, setCloseDate] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) {
      setDeals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("deals")
      .select("id,address,status,sale_price,gross_commission,client_name,client_email,client_phone,close_date")
      .order("created_at", { ascending: false });

    if (error) toast.error(error.message);
    setDeals((data ?? []) as Deal[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const openNewOpportunity = () => {
    if (view !== "all") setStage(view);
    setOpen(true);
  };

  async function changeStage(dealId: string, nextStage: Stage) {
    const previous = deals;
    setDeals((current) => current.map((deal) => (deal.id === dealId ? { ...deal, status: nextStage } : deal)));
    setUpdatingDealId(dealId);

    const { error } = await supabase.from("deals").update({ status: nextStage }).eq("id", dealId);
    setUpdatingDealId(null);

    if (error) {
      setDeals(previous);
      toast.error(error.message);
      return;
    }

    const label = STAGES.find((s) => s.key === nextStage)?.label ?? nextStage;
    toast.success(`Moved to ${label}`);
  }

  async function deleteDeal(dealId: string) {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    const previous = deals;
    setDeals((current) => current.filter((d) => d.id !== dealId));
    const { error } = await supabase.from("deals").delete().eq("id", dealId);
    if (error) {
      setDeals(previous);
      toast.error(error.message);
      return;
    }
    toast.success("Deal deleted");
  }

  async function createOpportunity(e: FormEvent) {
    e.preventDefault();
    if (!user || !property.trim()) return;

    setSaving(true);
    const sale = parseFloat(salePrice) || 0;
    const { error } = await supabase.from("deals").insert({
      user_id: user.id,
      address: property.trim(),
      client_name: clientName.trim() || null,
      client_email: clientEmail.trim() || null,
      client_phone: clientPhone.trim() || null,
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
    setProperty("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setSalePrice("");
    setCloseDate("");
    setStage("new_lead");
    setOpen(false);
    load();
  }

  if (authLoading) {
    return (
      <PageShell title="Pipeline">
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title="Pipeline" subtitle="Sign in to view your deals.">
        <Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
          Sign in
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Pipeline"
      subtitle="Move deals across stages and keep every lead visible at a glance."
      actions={
        <>
          <Button type="button" onClick={openNewOpportunity}>
            <Plus className="h-4 w-4 mr-1.5" /> New Opportunity
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Opportunity</DialogTitle>
              </DialogHeader>
              <form onSubmit={createOpportunity} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prop">Property *</Label>
                  <Input
                    id="prop"
                    autoFocus
                    required
                    placeholder="Enter property address here"
                    value={property}
                    onChange={(e) => setProperty(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client">Name</Label>
                  <Input
                    id="client"
                    placeholder="Name of the Client"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="lead@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Stage</Label>
                    <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label}
                          </SelectItem>
                        ))}
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
                  <Input
                    id="sp"
                    type="number"
                    min="0"
                    placeholder="Enter list price here"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !property.trim()}>
                    {saving ? "Saving..." : "Add Opportunity"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={view} onValueChange={(value) => setView(value as PipelineView)} className="w-full lg:w-auto">
          <TabsList className="w-full flex flex-wrap gap-2">
            {PIPELINE_VIEWS.map((item) => (
              <TabsTrigger key={item.key} value={item.key} className="text-xs sm:text-sm">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={view === "all" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5" : "grid grid-cols-1 gap-5 max-w-3xl"}>
          {(view === "all" ? STAGES : STAGES.filter((s) => s.key === view)).map((s) => {
            const items = deals.filter((deal) => normalizeStage(deal.status) === s.key);
            const total = items.reduce((sum, deal) => sum + Number(deal.sale_price), 0);

            return (
              <StageColumn
                key={s.key}
                stage={s}
                items={items}
                total={total}
                updatingDealId={updatingDealId}
                onStageChange={changeStage}
                onDelete={deleteDeal}
              />
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function StageColumn({
  stage,
  items,
  total,
  updatingDealId,
  onStageChange,
  onDelete,
}: {
  stage: (typeof STAGES)[number];
  items: Deal[];
  total: number;
  updatingDealId: string | null;
  onStageChange: (dealId: string, nextStage: Stage) => Promise<void>;
  onDelete: (dealId: string) => Promise<void>;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col min-h-[320px]">
      <header className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <StatusPill tone={stage.tone}>{stage.label}</StatusPill>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
        <div className="text-lg font-bold tabular-nums font-display mt-2">{formatMoney(total)}</div>
      </header>

      <ul className="p-3 space-y-2 flex-1 min-h-[120px]">
        {items.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            busy={updatingDealId === deal.id}
            onStageChange={onStageChange}
            onDelete={onDelete}
          />
        ))}
        {items.length === 0 && <li className="text-xs text-muted-foreground text-center py-8">No deals</li>}
      </ul>
    </div>
  );
}

function DealCard({
  deal,
  busy,
  onStageChange,
  onDelete,
}: {
  deal: Deal;
  busy: boolean;
  onStageChange: (dealId: string, nextStage: Stage) => Promise<void>;
  onDelete: (dealId: string) => Promise<void>;
}) {
  const currentStage = normalizeStage(deal.status);

  return (
    <li className="p-3 rounded-lg border border-border hover:border-secondary hover:shadow-sm transition bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{deal.address}</div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(deal.id)}
          disabled={busy}
          aria-label={`Delete ${deal.address}`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {(deal.client_name || deal.client_email || deal.client_phone) && (
        <div className="mt-2 space-y-1 border-l-2 border-muted pl-2.5">
          {deal.client_name && (
            <div className="flex items-center gap-1.5 text-xs text-foreground/90">
              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{deal.client_name}</span>
            </div>
          )}
          {deal.client_email && (
            <a
              href={`mailto:${deal.client_email}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
            >
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{deal.client_email}</span>
            </a>
          )}
          {deal.client_phone && (
            <a
              href={`tel:${deal.client_phone}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate tabular-nums">{deal.client_phone}</span>
            </a>
          )}
        </div>
      )}

      <div className="mt-3">
        <Select value={currentStage} onValueChange={(value) => onStageChange(deal.id, value as Stage)}>
          <SelectTrigger className="h-8 w-full text-xs" disabled={busy} aria-label={`Change stage for ${deal.address}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((stage) => (
              <SelectItem key={stage.key} value={stage.key}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between mt-3 gap-2 pt-2 border-t border-border/60">
        <span className="text-sm tabular-nums font-semibold">{formatMoney(Number(deal.sale_price))}</span>
        {deal.close_date && <span className="text-[11px] text-muted-foreground">{deal.close_date}</span>}
      </div>
    </li>
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
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter property address here" className="inp" />
          </FormField>
          <FormField label="Client name">
            <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Sarah Chen" className="inp" />
          </FormField>
          <FormField label="Side">
            <select value={side} onChange={(e) => setSide(e.target.value)} className="inp">
              <option value="buy">Buy side</option>
              <option value="sell">Sell / List side</option>
              <option value="both">Both sides</option>
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
              <SelectTrigger className="inp">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Close date">
            <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="inp" />
          </FormField>
        </div>

        <div className="bg-muted/40 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
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
            <div className="font-display font-bold tabular-nums">
              {salePrice ? ((yourTake / (parseFloat(salePrice) || 1)) * 100).toFixed(2) : "0.00"}%
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !address.trim()}>
            {saving ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
        <style>{`.inp { width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); font-size: 0.875rem; }`}</style>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
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

function dealToForm(d: Deal): DealFormValues {
  const commPct = Number(d.sale_price) > 0 ? ((Number(d.gross_commission) / Number(d.sale_price)) * 100).toFixed(2) : "0";
  const refPct = String((d as { referral_pct?: number }).referral_pct ?? 0);
  const agentSplit = String((d as { agent_split_pct?: number }).agent_split_pct ?? 0);
  return {
    address: d.address,
    client: d.client_name ?? "",
    side: (d as { side?: string }).side ?? "buy",
    salePrice: String(d.sale_price ?? 0),
    commPct,
    agentSplit,
    refPct,
    refTo: (d as { referral_to?: string | null }).referral_to ?? "",
    status: d.status ?? "pending",
    closeDate: d.close_date ?? "",
  };
}
