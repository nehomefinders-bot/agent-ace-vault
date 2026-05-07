import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkStatusBar } from "@/components/bulk-status-bar";
import { formatMoney } from "@/lib/mock-data";
import { exportCommissionsCsv, exportCommissionsExcel, exportCommissionsPdf, type CommissionExportRow } from "@/lib/commission-exports";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/commissions")({
  component: Commissions,
  head: () => ({ meta: [{ title: "Commissions - Agent Business Tracker" }] }),
});

interface CommissionRow {
  dealId: string;
  shortId: string;
  property: string;
  agentName: string;
  closingDate: string;
  salePrice: number;
  gci: number;
  commissionPct: number;
  brokerSplit: number;
  deductions: number;
  status: "Paid" | "Pending";
}

interface CommissionFormValues {
  property: string;
  agentName: string;
  salePrice: string;
  commissionPct: string;
  brokerSplit: string;
  deductions: string;
}

function netCommission(r: CommissionRow): number {
  return r.gci * (r.brokerSplit / 100) - r.deductions;
}

function formatDate(iso: string): string {
  if (!iso) return "Unknown";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status, onChange }: { status: "Paid" | "Pending"; onChange?: (v: "Paid" | "Pending") => void }) {
  const cls =
    status === "Paid"
      ? "bg-success/15 text-success ring-1 ring-inset ring-success/30"
      : "bg-warning/15 text-warning ring-1 ring-inset ring-warning/30";

  if (!onChange) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${status === "Paid" ? "bg-success" : "bg-warning"}`} />
        {status}
      </span>
    );
  }

  return (
    <Select value={status} onValueChange={(v) => onChange(v as "Paid" | "Pending")}>
      <SelectTrigger className={`h-7 w-[110px] px-2.5 text-xs font-medium border-0 rounded-full ${cls}`}>
        <SelectValue>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${status === "Paid" ? "bg-success" : "bg-warning"}`} />
            {status}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Paid">Paid</SelectItem>
        <SelectItem value="Pending">Pending</SelectItem>
      </SelectContent>
    </Select>
  );
}

function CommissionDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  defaultAgentName,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  defaultAgentName: string;
  initial?: CommissionFormValues;
  onSubmit: (input: CommissionFormValues) => Promise<void>;
}) {
  const [property, setProperty] = useState(initial?.property ?? "");
  const [agentName, setAgentName] = useState(initial?.agentName ?? defaultAgentName);
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? "");
  const [commissionPct, setCommissionPct] = useState(initial?.commissionPct ?? "3");
  const [brokerSplit, setBrokerSplit] = useState(initial?.brokerSplit ?? "70");
  const [deductions, setDeductions] = useState(initial?.deductions ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProperty(initial?.property ?? "");
    setAgentName(initial?.agentName ?? defaultAgentName);
    setSalePrice(initial?.salePrice ?? "");
    setCommissionPct(initial?.commissionPct ?? "3");
    setBrokerSplit(initial?.brokerSplit ?? "70");
    setDeductions(initial?.deductions ?? "");
  }, [open, initial, defaultAgentName]);

  const sale = parseFloat(salePrice) || 0;
  const cPct = parseFloat(commissionPct) || 0;
  const bSplit = parseFloat(brokerSplit) || 0;
  const ded = parseFloat(deductions) || 0;
  const gci = sale * (cPct / 100);
  const net = gci * (bSplit / 100) - ded;

  const save = async () => {
    if (!property.trim() || sale <= 0) return;
    setSaving(true);
    try {
      await onSubmit({
        property: property.trim(),
        agentName: agentName.trim(),
        salePrice,
        commissionPct,
        brokerSplit,
        deductions,
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
          <DialogDescription>
            Enter closing details. GCI and Net are calculated as you type.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="prop">Property Name</Label>
            <Input
              id="prop"
              placeholder="e.g. Oakwood Residence, 412 Oakwood Dr"
              value={property}
              onChange={(e) => setProperty(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="agent">Agent Name</Label>
            <Input
              id="agent"
              placeholder="e.g. Pratyush Sharma"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="price">Sale Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                placeholder="750000"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cpct">Commission %</Label>
              <Input
                id="cpct"
                type="number"
                min="0"
                step="0.1"
                placeholder="3"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="split">Broker Split %</Label>
              <Input
                id="split"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="70"
                value={brokerSplit}
                onChange={(e) => setBrokerSplit(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ded">Flat Deductions ($)</Label>
              <Input
                id="ded"
                type="number"
                min="0"
                placeholder="TC fees, etc."
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-border bg-muted/40 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">GCI (Sale x Commission %)</span>
              <span className="tabular-nums font-medium">{formatMoney(gci)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Agent share (x {bSplit || 0}%)</span>
              <span className="tabular-nums font-medium">{formatMoney(gci * (bSplit / 100))}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Deductions</span>
              <span className="tabular-nums text-destructive">-{formatMoney(ded)}</span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Net Commission</span>
              <span className={`tabular-nums font-bold text-lg font-display ${net >= 0 ? "text-success" : "text-destructive"}`}>
                {formatMoney(net)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!property.trim() || sale <= 0}>
            {saving ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Commissions() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const defaultAgentName = useMemo(() => {
    const displayName = user?.user_metadata?.display_name;
    if (typeof displayName === "string" && displayName.trim()) return displayName.trim();
    return user?.email?.split("@")[0] ?? "";
  }, [user]);

  async function load() {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("deals")
      .select("id,address,agent_name,close_date,sale_price,gross_commission,agent_split_pct,status,notes,created_at")
      .eq("status", "closed")
      .order("close_date", { ascending: false, nullsFirst: false });

    if (error) toast.error(error.message);

    setRows((data ?? []).map((d: any) => {
      const m = d.notes?.match(/Deductions:\s*([\d.]+)/);
      const sale = Number(d.sale_price);
      const gci = Number(d.gross_commission);
      const commissionPct = sale > 0 ? (gci / sale) * 100 : 0;
      const status: "Paid" | "Pending" = /Status:\s*Pending/i.test(d.notes ?? "") ? "Pending" : "Paid";
      return {
        dealId: d.id,
        shortId: d.id.slice(0, 8),
        property: d.address,
        agentName: d.agent_name ?? "",
        closingDate: d.close_date ?? d.created_at?.slice(0, 10) ?? "",
        salePrice: sale,
        gci,
        commissionPct,
        brokerSplit: Number(d.agent_split_pct),
        deductions: m ? parseFloat(m[1]) : 0,
        status,
      };
    }));
    setLoading(false);
  }

  async function toggleStatus(r: CommissionRow, status: "Paid" | "Pending") {
    const prev = rows;
    setRows((cur) => cur.map((x) => (x.dealId === r.dealId ? { ...x, status } : x)));
    const parts: string[] = [];
    if (r.deductions > 0) parts.push(`Deductions: ${r.deductions}`);
    parts.push(`Status: ${status}`);
    const { error } = await supabase.from("deals").update({ notes: parts.join(" | ") }).eq("id", r.dealId);
    if (error) { setRows(prev); toast.error(error.message); }
  }

  const toggleOne = (id: string) =>
    setSelected((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected((cur) => cur.size === rows.length ? new Set() : new Set(rows.map((r) => r.dealId)));

  async function bulkUpdateStatus(status: string) {
    const targets = rows.filter((r) => selected.has(r.dealId));
    if (!targets.length) return;
    const newStatus = status as "Paid" | "Pending";
    const prev = rows;
    setRows((cur) => cur.map((r) => (selected.has(r.dealId) ? { ...r, status: newStatus } : r)));
    const updates = targets.map((r) => {
      const parts: string[] = [];
      if (r.deductions > 0) parts.push(`Deductions: ${r.deductions}`);
      parts.push(`Status: ${newStatus}`);
      return supabase.from("deals").update({ notes: parts.join(" | ") }).eq("id", r.dealId);
    });
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) { setRows(prev); toast.error(failed.error.message); return; }
    toast.success(`Updated ${targets.length} commission${targets.length > 1 ? "s" : ""}`);
    setSelected(new Set());
  }

  useEffect(() => {
    if (!authLoading) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const totalGci = useMemo(() => rows.reduce((sum, row) => sum + row.gci, 0), [rows]);
  const totalNet = useMemo(() => rows.reduce((sum, row) => sum + netCommission(row), 0), [rows]);
  const paidNet = useMemo(() => rows.filter((row) => row.status === "Paid").reduce((sum, row) => sum + netCommission(row), 0), [rows]);
  const pendingNet = useMemo(() => rows.filter((row) => row.status === "Pending").reduce((sum, row) => sum + netCommission(row), 0), [rows]);

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    if (rows.length === 0) {
      toast.info("No commission rows to export yet.");
      return;
    }

    const exportRows: CommissionExportRow[] = rows.map((row) => ({
      property: row.property,
      agentName: row.agentName,
      closingDate: row.closingDate,
      salePrice: row.salePrice,
      gci: row.gci,
      brokerSplit: row.brokerSplit,
      deductions: row.deductions,
      netCommission: netCommission(row),
      status: row.status,
    }));

    try {
      if (format === "csv") {
        await exportCommissionsCsv(exportRows);
      } else if (format === "xlsx") {
        await exportCommissionsExcel(exportRows);
      } else {
        await exportCommissionsPdf(exportRows);
      }
      const label = format === "xlsx" ? "Excel" : format.toUpperCase();
      toast.success(`${label} export downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  if (authLoading) {
    return (
      <PageShell title="Commissions">
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title="Commissions" subtitle="Sign in to view commissions.">
        <Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
          Sign in
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Commissions"
      subtitle="Track gross commission income, broker splits, and net payouts per closing."
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void handleExport("pdf")}>Export PDF</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleExport("xlsx")}>Export Excel</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleExport("csv")}>Export CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Commission
          </Button>
        </>
      }
    >
      <CommissionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Commission"
        submitLabel="Save Commission"
        defaultAgentName={defaultAgentName}
        onSubmit={async (input) => {
          if (!user) return;
          const sale = parseFloat(input.salePrice) || 0;
          const cPct = parseFloat(input.commissionPct) || 0;
          const bSplit = parseFloat(input.brokerSplit) || 0;
          const ded = parseFloat(input.deductions) || 0;
          const gci = sale * (cPct / 100);
          const { error } = await supabase.from("deals").insert({
            user_id: user.id,
            address: input.property.trim(),
            side: "buy",
            status: "closed",
            sale_price: sale,
            gross_commission: gci,
            agent_split_pct: bSplit,
            brokerage_split_pct: 100 - bSplit,
            close_date: new Date().toISOString().slice(0, 10),
            agent_name: input.agentName.trim() || null,
            notes: ded > 0 ? `Deductions: ${ded}` : null,
          });
          if (error) throw error;
          toast.success("Commission saved");
          await load();
        }}
      />

      <CommissionDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit Commission"
        submitLabel="Save Changes"
        defaultAgentName={defaultAgentName}
        initial={editing ? commissionToForm(editing) : undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          const sale = parseFloat(input.salePrice) || 0;
          const cPct = parseFloat(input.commissionPct) || 0;
          const bSplit = parseFloat(input.brokerSplit) || 0;
          const ded = parseFloat(input.deductions) || 0;
          const gci = sale * (cPct / 100);
          const { error } = await supabase.from("deals").update({
            address: input.property.trim(),
            agent_name: input.agentName.trim() || null,
            sale_price: sale,
            gross_commission: gci,
            agent_split_pct: bSplit,
            brokerage_split_pct: 100 - bSplit,
            notes: ded > 0 ? `Deductions: ${ded}` : null,
          }).eq("id", editing.dealId);
          if (error) throw error;
          toast.success("Commission updated");
          setEditing(null);
          await load();
        }}
      />

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total GCI</div>
          <div className="text-2xl font-bold tabular-nums font-display">{formatMoney(totalGci)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Net Commission</div>
          <div className="text-2xl font-bold tabular-nums font-display">{formatMoney(totalNet)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Paid</div>
          <div className="text-2xl font-bold tabular-nums font-display text-success">{formatMoney(paidNet)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pending</div>
          <div className="text-2xl font-bold tabular-nums font-display text-warning">{formatMoney(pendingNet)}</div>
        </div>
      </div>

      <BulkStatusBar
        count={selected.size}
        itemLabel="commissions"
        options={[{ value: "Paid", label: "Paid" }, { value: "Pending", label: "Pending" }]}
        onApply={bulkUpdateStatus}
        onClear={() => setSelected(new Set())}
      />

      <section className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Commission Tracker</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{rows.length} closings - sorted by most recent</p>
          </div>
          <div className="relative hidden md:block">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search property..."
              className="pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </header>

        <ul className="md:hidden divide-y divide-border">
          {rows.map((r) => {
            const net = netCommission(r);
            return (
              <li key={r.dealId} className="px-4 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{r.property}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.agentName || "Unknown agent"}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {r.shortId} - {formatDate(r.closingDate)}
                    </div>
                  </div>
                  <StatusBadge status={r.status} onChange={(v) => toggleStatus(r, v)} />
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="flex justify-between col-span-2 sm:col-span-1">
                    <dt className="text-muted-foreground">Agent</dt>
                    <dd className="tabular-nums">{r.agentName || "Unknown"}</dd>
                  </div>
                  <div className="flex justify-between col-span-2 sm:col-span-1">
                    <dt className="text-muted-foreground">Sale Price</dt>
                    <dd className="tabular-nums">{formatMoney(r.salePrice)}</dd>
                  </div>
                  <div className="flex justify-between col-span-2 sm:col-span-1">
                    <dt className="text-muted-foreground">GCI</dt>
                    <dd className="tabular-nums font-medium">{formatMoney(r.gci)}</dd>
                  </div>
                  <div className="flex justify-between col-span-2 sm:col-span-1">
                    <dt className="text-muted-foreground">Broker Split</dt>
                    <dd className="tabular-nums">{r.brokerSplit}%</dd>
                  </div>
                  <div className="flex justify-between col-span-2 sm:col-span-1">
                    <dt className="text-muted-foreground">Deductions</dt>
                    <dd className="tabular-nums text-destructive">-{formatMoney(r.deductions)}</dd>
                  </div>
                </dl>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Net</span>
                  <span className="tabular-nums font-bold text-base font-display">{formatMoney(net)}</span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => setEditing(r)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Edit commission"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this commission?")) {
                        supabase.from("deals").delete().eq("id", r.dealId).then(({ error }) => {
                          if (error) toast.error(error.message);
                          else load();
                        });
                      }
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Delete commission"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
          <li className="px-4 py-4 bg-muted/30 flex items-center justify-between">
            <span className="text-sm font-medium">Net Total</span>
            <span className="tabular-nums font-bold">{formatMoney(totalNet)}</span>
          </li>
        </ul>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="w-12 pl-6 pr-2 py-3">
                  <Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="text-left font-medium py-3 pl-2">Property Address</th>
                <th className="text-left font-medium py-3">Agent Name</th>
                <th className="text-left font-medium py-3">Closing Date</th>
                <th className="text-right font-medium py-3">Sale Price</th>
                <th className="text-right font-medium py-3">GCI</th>
                <th className="text-right font-medium py-3">Broker Split</th>
                <th className="text-right font-medium py-3">Deductions</th>
                <th className="text-right font-medium py-3">Net Commission</th>
                <th className="text-left font-medium py-3 px-6">Status</th>
                <th className="w-20 pr-6"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const net = netCommission(r);
                const isSel = selected.has(r.dealId);
                return (
                  <tr key={r.dealId} className={`border-t border-border hover:bg-muted/30 transition-colors ${isSel ? "bg-primary/5" : ""}`}>
                    <td className="pl-6 py-4">
                      <Checkbox checked={isSel} onCheckedChange={() => toggleOne(r.dealId)} aria-label="Select commission" />
                    </td>
                    <td className="py-4">
                      <div className="font-medium">{r.property}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{r.shortId}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium">{r.agentName || "Unknown agent"}</div>
                    </td>
                    <td className="py-4 text-muted-foreground whitespace-nowrap">{formatDate(r.closingDate)}</td>
                    <td className="py-4 text-right tabular-nums">{formatMoney(r.salePrice)}</td>
                    <td className="py-4 text-right tabular-nums font-medium">{formatMoney(r.gci)}</td>
                    <td className="py-4 text-right tabular-nums text-muted-foreground">{r.brokerSplit}%</td>
                    <td className="py-4 text-right tabular-nums text-destructive">-{formatMoney(r.deductions)}</td>
                    <td className="py-4 text-right tabular-nums font-semibold">{formatMoney(net)}</td>
                    <td className="py-4 px-6"><StatusBadge status={r.status} onChange={(v) => toggleStatus(r, v)} /></td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(r)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Edit commission"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this commission?")) {
                              supabase.from("deals").delete().eq("id", r.dealId).then(({ error }) => {
                                if (error) toast.error(error.message);
                                else load();
                              });
                            }
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                          aria-label="Delete commission"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30 text-sm">
                <td className="py-3 px-6 font-medium" colSpan={4}>Totals</td>
                <td className="py-3 text-right tabular-nums font-semibold">{formatMoney(totalGci)}</td>
                <td />
                <td className="py-3 text-right tabular-nums text-destructive">-{formatMoney(rows.reduce((sum, row) => sum + row.deductions, 0))}</td>
                <td className="py-3 text-right tabular-nums font-bold">{formatMoney(totalNet)}</td>
                <td className="py-3 px-6" />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </PageShell>
  );
}

function commissionToForm(r: CommissionRow): CommissionFormValues {
  return {
    property: r.property,
    agentName: r.agentName,
    salePrice: String(r.salePrice),
    commissionPct: String(r.commissionPct || 0),
    brokerSplit: String(r.brokerSplit),
    deductions: String(r.deductions),
  };
}
