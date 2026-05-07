import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Loader2, Plus, Search } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  id: string;
  property: string;
  agentName: string;
  closingDate: string;
  salePrice: number;
  gci: number;
  brokerSplit: number;
  deductions: number;
  status: "Paid" | "Pending";
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

function StatusBadge({ status }: { status: "Paid" | "Pending" }) {
  const cls =
    status === "Paid"
      ? "bg-success/15 text-success ring-1 ring-inset ring-success/30"
      : "bg-warning/15 text-warning ring-1 ring-inset ring-warning/30";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "Paid" ? "bg-success" : "bg-warning"}`} />
      {status}
    </span>
  );
}

function AddCommissionDialog({
  onAdded,
  defaultAgentName,
}: {
  onAdded: () => void;
  defaultAgentName: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [property, setProperty] = useState("");
  const [agentName, setAgentName] = useState(defaultAgentName);
  const [salePrice, setSalePrice] = useState("");
  const [commissionPct, setCommissionPct] = useState("3");
  const [brokerSplit, setBrokerSplit] = useState("70");
  const [deductions, setDeductions] = useState("");
  const [saving, setSaving] = useState(false);

  const sale = parseFloat(salePrice) || 0;
  const cPct = parseFloat(commissionPct) || 0;
  const bSplit = parseFloat(brokerSplit) || 0;
  const ded = parseFloat(deductions) || 0;
  const gci = sale * (cPct / 100);
  const net = gci * (bSplit / 100) - ded;

  useEffect(() => {
    if (open) setAgentName(defaultAgentName);
  }, [open, defaultAgentName]);

  const reset = () => {
    setProperty("");
    setAgentName(defaultAgentName);
    setSalePrice("");
    setCommissionPct("3");
    setBrokerSplit("70");
    setDeductions("");
  };

  const submit = async () => {
    if (!user || !property.trim() || sale <= 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("deals").insert({
        user_id: user.id,
        address: property.trim(),
        side: "buy",
        status: "closed",
        sale_price: sale,
        gross_commission: gci,
        agent_split_pct: bSplit,
        brokerage_split_pct: 100 - bSplit,
        close_date: new Date().toISOString().slice(0, 10),
        agent_name: agentName.trim() || null,
        notes: ded > 0 ? `Deductions: ${ded}` : null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Commission saved");
      reset();
      setOpen(false);
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Commission
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Commission</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!property.trim() || sale <= 0}>
            {saving ? "Saving..." : "Save Commission"}
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
      return {
        id: d.id.slice(0, 8),
        property: d.address,
        agentName: d.agent_name ?? "",
        closingDate: d.close_date ?? d.created_at?.slice(0, 10) ?? "",
        salePrice: Number(d.sale_price),
        gci: Number(d.gross_commission),
        brokerSplit: Number(d.agent_split_pct),
        deductions: m ? parseFloat(m[1]) : 0,
        status: "Paid" as const,
      };
    }));
    setLoading(false);
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
          <AddCommissionDialog onAdded={load} defaultAgentName={defaultAgentName} />
        </>
      }
    >
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
              <li key={r.id} className="px-4 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{r.property}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.agentName || "Unknown agent"}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {r.id} - {formatDate(r.closingDate)}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
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
                <th className="text-left font-medium py-3 px-6">Property Address</th>
                <th className="text-left font-medium py-3">Agent Name</th>
                <th className="text-left font-medium py-3">Closing Date</th>
                <th className="text-right font-medium py-3">Sale Price</th>
                <th className="text-right font-medium py-3">GCI</th>
                <th className="text-right font-medium py-3">Broker Split</th>
                <th className="text-right font-medium py-3">Deductions</th>
                <th className="text-right font-medium py-3">Net Commission</th>
                <th className="text-left font-medium py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const net = netCommission(r);
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-medium">{r.property}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{r.id}</div>
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
                    <td className="py-4 px-6"><StatusBadge status={r.status} /></td>
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
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
