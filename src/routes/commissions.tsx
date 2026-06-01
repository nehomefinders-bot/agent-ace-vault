import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import SignatureCanvas from "react-signature-canvas";
import { ChevronDown, Download, FileText, Loader2, LockKeyhole, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkStatusBar } from "@/components/bulk-status-bar";
import { formatMoney } from "@/lib/mock-data";
import { exportCommissionsCsv, exportCommissionsExcel, exportCommissionsPdf, type CommissionExportRow } from "@/lib/commission-exports";
import { mergeCommissionNotes, parseCommissionNotes } from "@/lib/commission-notes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ImportButton, type ImportColumn } from "@/components/import-button";

const COMMISSION_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "address", label: "Property", required: true, sample: "123 Main St" },
  { key: "agent_name", label: "Agent Name", sample: "Jane Smith" },
  { key: "side", label: "Side", enumValues: ["buy", "sell", "both"], sample: "buy" },
  { key: "sale_price", label: "Sale Price", type: "number", sample: 500000 },
  { key: "commission_pct", label: "Commission %", type: "number", sample: 3 },
  { key: "broker_split_pct", label: "Broker Split %", type: "number", sample: 80 },
  { key: "deductions", label: "Deductions", type: "number", sample: 0 },
  { key: "close_date", label: "Closing Date", type: "date", sample: "2025-01-15" },
];

export const Route = createFileRoute("/commissions")({
  component: Commissions,
  head: () => ({ meta: [{ title: "Commissions - Agent Business Tracker" }] }),
});

interface CommissionRow {
  dealId: string;
  shortId: string;
  property: string;
  side: string;
  agentName: string;
  closingDate: string;
  salePrice: number;
  gci: number;
  commissionPct: number;
  brokerSplit: number;
  concessions: number;
  deductions: number;
  deductionNotes: string;
  status: "Paid" | "Pending";
}

interface CommissionFormValues {
  dealId: string;
  property: string;
  agentName: string;
  side: string;
  closingDate: string;
  salePrice: string;
  commissionPct: string;
  concessions: string;
  brokerSplit: string;
  deductions: string;
  deductionNotes: string;
}

interface DealOption {
  id: string;
  address: string;
  side: string;
  status?: string;
  agent_name: string | null;
  close_date: string | null;
  sale_price: number;
  gross_commission: number;
  agent_split_pct: number;
  notes: string | null;
}

const COMMISSION_FORM_DRAFT_KEY = "agent-ace:commission-disbursement-draft:v1";

interface CommissionDisbursementDraft {
  sellingSideCommission: boolean;
  listingSideCommission: boolean;
  propertyAddress: string;
  closingDate: string;
  mlsNumber: string;
  purchasePrice: string;
  grossCommissionPct: string;
  grossCommissionAmount: string;
  buyerName: string;
  buyerAddress: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerLoanType: string;
  sellerName: string;
  sellerAddress: string;
  sellerPhone: string;
  sellerEmail: string;
  referralListingSide: boolean;
  referralSellingSide: boolean;
  referralType: string;
  referralContactName: string;
  referralEmail: string;
  referralPhone: string;
  referralPct: string;
  sellingCompanyPct: string;
  sellingCompanyAdjustments: string;
  listingCompanyPct: string;
  listingCompanyAdjustments: string;
  sellingAgent1Name: string;
  sellingAgent1Pct: string;
  sellingAgent2Name: string;
  sellingAgent2Pct: string;
  listingAgent1Name: string;
  listingAgent1Pct: string;
  listingAgent2Name: string;
  listingAgent2Pct: string;
  brokeragePct: string;
  adminBrokerName: string;
  authorizedSignatureDate: string;
  signatureDataUrl: string;
  locked: boolean;
}

function createCommissionDisbursementDraft(): CommissionDisbursementDraft {
  return {
    sellingSideCommission: false,
    listingSideCommission: false,
    propertyAddress: "",
    closingDate: "",
    mlsNumber: "",
    purchasePrice: "",
    grossCommissionPct: "",
    grossCommissionAmount: "",
    buyerName: "",
    buyerAddress: "",
    buyerPhone: "",
    buyerEmail: "",
    buyerLoanType: "",
    sellerName: "",
    sellerAddress: "",
    sellerPhone: "",
    sellerEmail: "",
    referralListingSide: false,
    referralSellingSide: false,
    referralType: "",
    referralContactName: "",
    referralEmail: "",
    referralPhone: "",
    referralPct: "",
    sellingCompanyPct: "",
    sellingCompanyAdjustments: "",
    listingCompanyPct: "",
    listingCompanyAdjustments: "",
    sellingAgent1Name: "",
    sellingAgent1Pct: "",
    sellingAgent2Name: "",
    sellingAgent2Pct: "",
    listingAgent1Name: "",
    listingAgent1Pct: "",
    listingAgent2Name: "",
    listingAgent2Pct: "",
    brokeragePct: "",
    adminBrokerName: "",
    authorizedSignatureDate: new Date().toISOString().slice(0, 10),
    signatureDataUrl: "",
    locked: false,
  };
}

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currency(value: number): string {
  return formatMoney(Number.isFinite(value) ? value : 0);
}

function calculateDisbursementDraft(draft: CommissionDisbursementDraft) {
  const purchasePrice = toNumber(draft.purchasePrice);
  const grossPct = toNumber(draft.grossCommissionPct);
  const enteredGross = toNumber(draft.grossCommissionAmount);
  const grossCommission = enteredGross > 0 ? enteredGross : purchasePrice * (grossPct / 100);
  const referralAmount = grossCommission * (toNumber(draft.referralPct) / 100);
  const sellingBeforeFees = grossCommission * (toNumber(draft.sellingCompanyPct) / 100);
  const listingBeforeFees = grossCommission * (toNumber(draft.listingCompanyPct) / 100);
  const sellingFinal = sellingBeforeFees + toNumber(draft.sellingCompanyAdjustments);
  const listingFinal = listingBeforeFees + toNumber(draft.listingCompanyAdjustments);
  const sellingAgent1 = grossCommission * (toNumber(draft.sellingAgent1Pct) / 100);
  const sellingAgent2 = grossCommission * (toNumber(draft.sellingAgent2Pct) / 100);
  const listingAgent1 = grossCommission * (toNumber(draft.listingAgent1Pct) / 100);
  const listingAgent2 = grossCommission * (toNumber(draft.listingAgent2Pct) / 100);
  const brokerage = grossCommission * (toNumber(draft.brokeragePct) / 100);
  const totalDueBrokerage = Math.max(sellingFinal + listingFinal + brokerage - referralAmount, 0);

  return {
    purchasePrice,
    grossCommission,
    referralAmount,
    sellingBeforeFees,
    listingBeforeFees,
    sellingFinal,
    listingFinal,
    sellingAgent1,
    sellingAgent2,
    listingAgent1,
    listingAgent2,
    brokerage,
    totalDueBrokerage,
  };
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
  dealOptions,
  initial,
  lockDeal = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  defaultAgentName: string;
  dealOptions: DealOption[];
  initial?: CommissionFormValues;
  lockDeal?: boolean;
  onSubmit: (input: CommissionFormValues) => Promise<void>;
}) {
  const [dealId, setDealId] = useState(initial?.dealId ?? "");
  const [agentName, setAgentName] = useState(initial?.agentName ?? defaultAgentName);
  const [side, setSide] = useState(initial?.side ?? "buy");
  const [closingDate, setClosingDate] = useState(initial?.closingDate ?? "");
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? "");
  const [commissionPct, setCommissionPct] = useState(initial?.commissionPct ?? "");
  const [concessions, setConcessions] = useState(initial?.concessions ?? "");
  const [brokerSplit, setBrokerSplit] = useState(initial?.brokerSplit ?? "");
  const [deductions, setDeductions] = useState(initial?.deductions ?? "");
  const [deductionNotes, setDeductionNotes] = useState(initial?.deductionNotes ?? "");
  const [saving, setSaving] = useState(false);

  const selectedDeal = dealOptions.find((deal) => deal.id === dealId);

  useEffect(() => {
    if (!open) return;
    setDealId(initial?.dealId ?? dealOptions[0]?.id ?? "");
    setAgentName(initial?.agentName ?? defaultAgentName);
    setSide(initial?.side ?? "buy");
    setClosingDate(initial?.closingDate ?? "");
    setSalePrice(initial?.salePrice ?? "");
    setCommissionPct(initial?.commissionPct ?? "");
    setConcessions(initial?.concessions ?? "");
    setBrokerSplit(initial?.brokerSplit ?? "");
    setDeductions(initial?.deductions ?? "");
    setDeductionNotes(initial?.deductionNotes ?? "");
  }, [open, initial, defaultAgentName, dealOptions]);

  useEffect(() => {
    if (!selectedDeal || !open) return;
    if (initial?.dealId === selectedDeal.id) return;

    const meta = parseCommissionNotes(selectedDeal.notes);
    const sale = Number(selectedDeal.sale_price) || 0;
    const concessionsValue = meta.concessions || 0;
    const adjustedSale = Math.max(sale - concessionsValue, 0);
    const derivedCommissionPct = adjustedSale > 0 && Number(selectedDeal.gross_commission) > 0
      ? ((Number(selectedDeal.gross_commission) / adjustedSale) * 100).toFixed(2)
      : "";

    setAgentName(selectedDeal.agent_name ?? defaultAgentName);
    setSide(selectedDeal.side ?? "buy");
    setClosingDate(selectedDeal.close_date ?? "");
    setSalePrice(sale > 0 ? String(sale) : "");
    setCommissionPct(derivedCommissionPct);
    setConcessions(concessionsValue > 0 ? String(concessionsValue) : "");
    setBrokerSplit(selectedDeal.agent_split_pct ? String(selectedDeal.agent_split_pct) : "");
    setDeductions(meta.deductions > 0 ? String(meta.deductions) : "");
    setDeductionNotes(meta.deductionNotes);
  }, [dealId, defaultAgentName, dealOptions, initial?.dealId, open, selectedDeal]);

  const sale = parseFloat(salePrice) || 0;
  const concessionAmount = parseFloat(concessions) || 0;
  const cPct = parseFloat(commissionPct) || 0;
  const bSplit = parseFloat(brokerSplit) || 0;
  const ded = parseFloat(deductions) || 0;
  const adjustedSale = Math.max(sale - concessionAmount, 0);
  const gci = adjustedSale * (cPct / 100);
  const net = gci * (bSplit / 100) - ded;

  const save = async () => {
    if (!dealId) {
      toast.error("Please choose a property");
      return;
    }
    if (!closingDate) {
      toast.error("Please add a closing date");
      return;
    }
    if (sale <= 0) {
      toast.error("Please enter a sale price greater than 0");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        dealId,
        property: selectedDeal?.address ?? initial?.property ?? "",
        agentName: agentName.trim(),
        side,
        closingDate,
        salePrice,
        commissionPct,
        concessions,
        brokerSplit,
        deductions,
        deductionNotes: deductionNotes.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Save commission failed", err);
      toast.error(err instanceof Error ? err.message : "Could not save commission");
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
            <Select value={dealId} onValueChange={setDealId} disabled={lockDeal}>
              <SelectTrigger id="prop">
                <SelectValue placeholder="Select a property from your deals" />
              </SelectTrigger>
              <SelectContent>
                {dealOptions.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {deal.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="agent">Agent Name</Label>
            <Input
              id="agent"
              placeholder="Enter agent name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="side">Side</Label>
              <Select value={side} onValueChange={setSide}>
                <SelectTrigger id="side">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buyer side</SelectItem>
                  <SelectItem value="sell">Seller side</SelectItem>
                  <SelectItem value="both">Both sides</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="closing-date">Closing Date</Label>
              <Input
                id="closing-date"
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="price">Sale Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                placeholder="Enter sale price"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="concessions">Concessions ($)</Label>
              <Input
                id="concessions"
                type="number"
                min="0"
                placeholder="Enter concession amount"
                value={concessions}
                onChange={(e) => setConcessions(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cpct">Commission %</Label>
              <Input
                id="cpct"
                type="number"
                min="0"
                step="0.1"
                placeholder="Enter commission percentage"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="split">Broker Split %</Label>
              <Input
                id="split"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="Enter broker split percentage"
                value={brokerSplit}
                onChange={(e) => setBrokerSplit(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ded">Flat Deductions ($)</Label>
              <Input
                id="ded"
                type="number"
                min="0"
                placeholder="Enter flat deduction amount"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-1">
              <Label htmlFor="deduction-notes">Deduction Notes</Label>
              <Input
                id="deduction-notes"
                placeholder="Enter deduction details"
                value={deductionNotes}
                onChange={(e) => setDeductionNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-border bg-muted/40 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Adjusted Sale Price</span>
              <span className="tabular-nums font-medium">{formatMoney(adjustedSale)}</span>
            </div>
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
          <Button onClick={save} disabled={!dealId || !closingDate || sale <= 0}>
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
  const [dealOptions, setDealOptions] = useState<DealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [commissionFormOpen, setCommissionFormOpen] = useState(false);
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
    const [{ data, error }, { data: optionData, error: optionError }] = await Promise.all([
      supabase
      .from("deals")
      .select("id,address,side,agent_name,close_date,sale_price,gross_commission,agent_split_pct,status,notes,created_at")
      .gt("gross_commission", 0)
      .order("close_date", { ascending: false, nullsFirst: false }),
      supabase
        .from("deals")
        .select("id,address,side,status,agent_name,close_date,sale_price,gross_commission,agent_split_pct,notes,created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (error) toast.error(error.message);
    if (optionError) toast.error(optionError.message);

    setDealOptions((optionData ?? []) as DealOption[]);

    setRows((data ?? []).map((d: any) => {
      const meta = parseCommissionNotes(d.notes);
      const sale = Number(d.sale_price);
      const gci = Number(d.gross_commission);
      const adjustedSale = Math.max(sale - meta.concessions, 0);
      const commissionPct = adjustedSale > 0 ? (gci / adjustedSale) * 100 : 0;
      return {
        dealId: d.id,
        shortId: d.id.slice(0, 8),
        property: d.address,
        side: d.side ?? "buy",
        agentName: d.agent_name ?? "",
        closingDate: d.close_date ?? d.created_at?.slice(0, 10) ?? "",
        salePrice: sale,
        gci,
        commissionPct,
        brokerSplit: Number(d.agent_split_pct),
        concessions: meta.concessions,
        deductions: meta.deductions,
        deductionNotes: meta.deductionNotes,
        status: meta.status,
      };
    }));
    setLoading(false);
  }

  async function toggleStatus(r: CommissionRow, status: "Paid" | "Pending") {
    const prev = rows;
    setRows((cur) => cur.map((x) => (x.dealId === r.dealId ? { ...x, status } : x)));
    const existing = dealOptions.find((deal) => deal.id === r.dealId);
    const notes = mergeCommissionNotes(existing?.notes, {
      status,
      concessions: r.concessions,
      deductions: r.deductions,
      deductionNotes: r.deductionNotes,
    });
    const { error } = await supabase.from("deals").update({ notes }).eq("id", r.dealId);
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
      const existing = dealOptions.find((deal) => deal.id === r.dealId);
      const notes = mergeCommissionNotes(existing?.notes, {
        status: newStatus,
        concessions: r.concessions,
        deductions: r.deductions,
        deductionNotes: r.deductionNotes,
      });
      return supabase.from("deals").update({ notes }).eq("id", r.dealId);
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
          <ImportButton
            table="deals"
            userId={user!.id}
            columns={COMMISSION_IMPORT_COLUMNS}
            templateName="commissions-template"
            entityLabel="commissions"
            onImported={() => void load()}
            transformRow={(r) => {
              const sale = Number(r.sale_price) || 0;
              const cPct = Number(r.commission_pct) || 0;
              const bSplit = Number(r.broker_split_pct) || 0;
              const ded = Number(r.deductions) || 0;
              return {
                address: r.address,
                agent_name: r.agent_name ?? null,
                side: r.side ?? "buy",
                status: "sold",
                sale_price: sale,
                gross_commission: sale * (cPct / 100),
                agent_split_pct: bSplit,
                brokerage_split_pct: 100 - bSplit,
                close_date: r.close_date ?? new Date().toISOString().slice(0, 10),
                notes: ded > 0 ? `Deductions: ${ded}` : null,
              };
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setCommissionFormOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Commission Form
          </Button>
          <Button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Commission
          </Button>
        </>
      }
    >
      <CommissionDisbursementDialog
        open={commissionFormOpen}
        onOpenChange={setCommissionFormOpen}
        defaultBrokerName={defaultAgentName}
      />

      <CommissionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Commission"
        submitLabel="Save Commission"
        defaultAgentName={defaultAgentName}
        dealOptions={dealOptions}
        onSubmit={async (input) => {
          if (!user) return;
          const sale = parseFloat(input.salePrice) || 0;
          const cPct = parseFloat(input.commissionPct) || 0;
          const concessions = parseFloat(input.concessions) || 0;
          const bSplit = parseFloat(input.brokerSplit) || 0;
          const ded = parseFloat(input.deductions) || 0;
          const gci = Math.max(sale - concessions, 0) * (cPct / 100);
          const existing = dealOptions.find((deal) => deal.id === input.dealId);
          const notes = mergeCommissionNotes(existing?.notes, {
            status: "Pending",
            concessions,
            deductions: ded,
            deductionNotes: input.deductionNotes,
          });
          const { error } = await supabase.from("deals").update({
            address: input.property.trim(),
            side: input.side,
            status: existing?.status ?? "sold",
            sale_price: sale,
            gross_commission: gci,
            agent_split_pct: bSplit,
            brokerage_split_pct: 100 - bSplit,
            close_date: input.closingDate || null,
            agent_name: input.agentName.trim() || null,
            notes,
          }).eq("id", input.dealId);
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
        dealOptions={dealOptions}
        lockDeal
        initial={editing ? commissionToForm(editing) : undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          const sale = parseFloat(input.salePrice) || 0;
          const cPct = parseFloat(input.commissionPct) || 0;
          const concessions = parseFloat(input.concessions) || 0;
          const bSplit = parseFloat(input.brokerSplit) || 0;
          const ded = parseFloat(input.deductions) || 0;
          const gci = Math.max(sale - concessions, 0) * (cPct / 100);
          const existing = dealOptions.find((deal) => deal.id === editing.dealId);
          const notes = mergeCommissionNotes(existing?.notes, {
            status: editing.status,
            concessions,
            deductions: ded,
            deductionNotes: input.deductionNotes,
          });
          const { error } = await supabase.from("deals").update({
            address: input.property.trim(),
            agent_name: input.agentName.trim() || null,
            side: input.side,
            sale_price: sale,
            gross_commission: gci,
            agent_split_pct: bSplit,
            brokerage_split_pct: 100 - bSplit,
            close_date: input.closingDate || null,
            notes,
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
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.agentName || "Unknown agent"} · {formatSideLabel(r.side)}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {r.shortId} - {formatDate(r.closingDate)}
                    </div>
                  </div>
                  <StatusBadge status={r.status} onChange={(v) => toggleStatus(r, v)} />
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 text-xs">
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
                <th className="text-left font-medium py-3">Side</th>
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
                    <td className="pl-6 pr-2 py-4">
                      <Checkbox checked={isSel} onCheckedChange={() => toggleOne(r.dealId)} aria-label="Select commission" />
                    </td>
                    <td className="py-4 pl-2">
                      <div className="font-medium">{r.property}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{r.shortId}</div>
                    </td>
                    <td className="py-4">
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {formatSideLabel(r.side)}
                      </span>
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
                <td className="py-3 px-6 font-medium" colSpan={5}>Totals</td>
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

function CommissionDisbursementDialog({
  open,
  onOpenChange,
  defaultBrokerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBrokerName: string;
}) {
  const [draft, setDraft] = useState<CommissionDisbursementDraft>(() => {
    if (typeof window === "undefined") return createCommissionDisbursementDraft();
    const stored = window.localStorage.getItem(COMMISSION_FORM_DRAFT_KEY);
    if (!stored) return createCommissionDisbursementDraft();
    try {
      return { ...createCommissionDisbursementDraft(), ...JSON.parse(stored) };
    } catch {
      return createCommissionDisbursementDraft();
    }
  });
  const [emailOpen, setEmailOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const documentRef = useRef<HTMLDivElement | null>(null);
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const totals = useMemo(() => calculateDisbursementDraft(draft), [draft]);
  const locked = draft.locked;

  useEffect(() => {
    if (!defaultBrokerName || draft.adminBrokerName) return;
    setDraft((current) => ({ ...current, adminBrokerName: defaultBrokerName }));
  }, [defaultBrokerName, draft.adminBrokerName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(COMMISSION_FORM_DRAFT_KEY, JSON.stringify(draft));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [draft]);

  useEffect(() => {
    if (!open || !draft.signatureDataUrl || !signatureRef.current) return;
    signatureRef.current.fromDataURL(draft.signatureDataUrl);
  }, [draft.signatureDataUrl, open]);

  const updateDraft = <K extends keyof CommissionDisbursementDraft>(key: K, value: CommissionDisbursementDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resetDraft = () => {
    const next = createCommissionDisbursementDraft();
    next.adminBrokerName = defaultBrokerName;
    setDraft(next);
    signatureRef.current?.clear();
    toast.success("Commission form draft cleared");
  };

  const saveAndLock = () => {
    setDraft((current) => ({ ...current, locked: true }));
    toast.success("Commission form saved and locked");
  };

  const downloadPdf = async () => {
    if (!documentRef.current) return;
    setPdfBusy(true);
    try {
      const [html2canvasModule, jsPdfModule] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPdfModule;
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      pdf.addImage(image, "PNG", (pageWidth - width) / 2, margin, width, height);
      const base = draft.propertyAddress.trim() || "commission-disbursement-request";
      pdf.save(`${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`);
      toast.success("Commission form PDF downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  const sendEmail = () => {
    if (!recipientEmail.trim()) {
      toast.error("Enter a recipient email address");
      return;
    }

    const propertyAddress = draft.propertyAddress.trim() || "the transaction";
    const summary = [
      `Property Address: ${propertyAddress}`,
      `Closing Date: ${draft.closingDate || "Not entered"}`,
      `MLS#: ${draft.mlsNumber || "Not entered"}`,
      `Purchase Price: ${currency(totals.purchasePrice)}`,
      `Total Gross Commission: ${currency(totals.grossCommission)} (${draft.grossCommissionPct || "0"}%)`,
      `Referral Total: ${currency(totals.referralAmount)} (${draft.referralPct || "0"}%)`,
      `Selling Company Final: ${currency(totals.sellingFinal)}`,
      `Listing Company Final: ${currency(totals.listingFinal)}`,
      `Total Due Brokerage: ${currency(totals.totalDueBrokerage)}`,
      `Authorized By: ${draft.adminBrokerName || "Not entered"}`,
    ].join("\n");

    const subject = `Commission Disbursement Authorization - ${propertyAddress}`;
    const body =
      `Hi Team,\n\n` +
      `Please find the finalized and signed Commission Disbursement Request form filled out for ${propertyAddress} attached.\n\n` +
      `Please download the PDF copy from your tracker workspace or accept the manual document summary below.\n\n` +
      summary;

    window.location.href = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setEmailOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[96vh] w-[96vw] max-w-7xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border bg-background px-6 py-4">
            <div className="flex flex-col gap-3 pr-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <DialogTitle className="font-display text-2xl">Commission Form</DialogTitle>
                <DialogDescription>
                  Auto-saved Commission Disbursement Request with signature, PDF, and email handoff.
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {locked && (
                  <Button type="button" variant="outline" onClick={() => updateDraft("locked", false)}>
                    Unlock draft
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={resetDraft}>
                  Clear draft
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(96vh-145px)] overflow-y-auto bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
            <div
              ref={documentRef}
              className="mx-auto max-w-5xl space-y-5 rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 sm:p-8"
            >
              <section className="rounded-md border border-slate-300 p-5 dark:border-slate-700">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-600 dark:text-amber-300">
                      Agent Business Tracker
                    </p>
                    <h2 className="mt-2 font-display text-3xl font-bold tracking-wide">
                      COMMISSION DISBURSEMENT REQUEST
                    </h2>
                  </div>
                  <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                    <CheckLine
                      label="Selling Side Commission"
                      checked={draft.sellingSideCommission}
                      disabled={locked}
                      onChange={(checked) => updateDraft("sellingSideCommission", checked)}
                    />
                    <CheckLine
                      label="Listing Side Commission"
                      checked={draft.listingSideCommission}
                      disabled={locked}
                      onChange={(checked) => updateDraft("listingSideCommission", checked)}
                    />
                  </div>
                </div>
              </section>

              <FormSection title="Core Transaction Data">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormInput label="Property Address" value={draft.propertyAddress} disabled={locked} placeholder="Enter property address" onChange={(value) => updateDraft("propertyAddress", value)} />
                  <FormInput label="Closing Date" type="date" value={draft.closingDate} disabled={locked} onChange={(value) => updateDraft("closingDate", value)} />
                  <FormInput label="MLS#" value={draft.mlsNumber} disabled={locked} placeholder="Enter MLS number" onChange={(value) => updateDraft("mlsNumber", value)} />
                  <FormInput label="Purchase Price" type="number" value={draft.purchasePrice} disabled={locked} placeholder="Enter purchase price" onChange={(value) => updateDraft("purchasePrice", value)} />
                  <FormInput label="Total Gross Commission (%)" type="number" value={draft.grossCommissionPct} disabled={locked} placeholder="Enter commission percentage" onChange={(value) => updateDraft("grossCommissionPct", value)} />
                  <FormInput label="Total Gross Commission ($)" type="number" value={draft.grossCommissionAmount} disabled={locked} placeholder={currency(totals.grossCommission)} onChange={(value) => updateDraft("grossCommissionAmount", value)} />
                </div>
              </FormSection>

              <div className="grid gap-5 lg:grid-cols-2">
                <FormSection title="Buyer Details">
                  <div className="grid gap-4">
                    <FormInput label="Name" value={draft.buyerName} disabled={locked} placeholder="Enter buyer name" onChange={(value) => updateDraft("buyerName", value)} />
                    <FormInput label="Current Address" value={draft.buyerAddress} disabled={locked} placeholder="Enter buyer current address" onChange={(value) => updateDraft("buyerAddress", value)} />
                    <FormInput label="Phone" value={draft.buyerPhone} disabled={locked} placeholder="Enter buyer phone" onChange={(value) => updateDraft("buyerPhone", value)} />
                    <FormInput label="E-mail" type="email" value={draft.buyerEmail} disabled={locked} placeholder="Enter buyer email" onChange={(value) => updateDraft("buyerEmail", value)} />
                    <FormInput label="Loan Type" value={draft.buyerLoanType} disabled={locked} placeholder="Enter loan type" onChange={(value) => updateDraft("buyerLoanType", value)} />
                  </div>
                </FormSection>

                <FormSection title="Seller Details">
                  <div className="grid gap-4">
                    <FormInput label="Name" value={draft.sellerName} disabled={locked} placeholder="Enter seller name" onChange={(value) => updateDraft("sellerName", value)} />
                    <FormInput label="Current Address" value={draft.sellerAddress} disabled={locked} placeholder="Enter seller current address" onChange={(value) => updateDraft("sellerAddress", value)} />
                    <FormInput label="Phone" value={draft.sellerPhone} disabled={locked} placeholder="Enter seller phone" onChange={(value) => updateDraft("sellerPhone", value)} />
                    <FormInput label="E-mail" type="email" value={draft.sellerEmail} disabled={locked} placeholder="Enter seller email" onChange={(value) => updateDraft("sellerEmail", value)} />
                  </div>
                </FormSection>
              </div>

              <FormSection title="Company & Agent Splits Calculator">
                <div className="grid gap-5 xl:grid-cols-[1fr_1.25fr]">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                    <h3 className="font-semibold">Referral Company</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <CheckLine label="Listing side" checked={draft.referralListingSide} disabled={locked} onChange={(checked) => updateDraft("referralListingSide", checked)} />
                      <CheckLine label="Selling side" checked={draft.referralSellingSide} disabled={locked} onChange={(checked) => updateDraft("referralSellingSide", checked)} />
                    </div>
                    <div className="mt-4 grid gap-4">
                      <FormInput label="Type of Referral" value={draft.referralType} disabled={locked} placeholder="Enter referral type" onChange={(value) => updateDraft("referralType", value)} />
                      <FormInput label="Referral Contact Name" value={draft.referralContactName} disabled={locked} placeholder="Enter referral contact" onChange={(value) => updateDraft("referralContactName", value)} />
                      <FormInput label="E-mail" type="email" value={draft.referralEmail} disabled={locked} placeholder="Enter referral email" onChange={(value) => updateDraft("referralEmail", value)} />
                      <FormInput label="Phone" value={draft.referralPhone} disabled={locked} placeholder="Enter referral phone" onChange={(value) => updateDraft("referralPhone", value)} />
                      <FormInput label="% Referral Total" type="number" value={draft.referralPct} disabled={locked} placeholder="Enter referral percentage" onChange={(value) => updateDraft("referralPct", value)} />
                    </div>
                    <Readout label="Referral total" value={currency(totals.referralAmount)} />
                  </div>

                  <div className="space-y-4">
                    <SplitCompanyRow
                      title="Selling Company"
                      pct={draft.sellingCompanyPct}
                      adjustments={draft.sellingCompanyAdjustments}
                      beforeFees={totals.sellingBeforeFees}
                      final={totals.sellingFinal}
                      disabled={locked}
                      onPct={(value) => updateDraft("sellingCompanyPct", value)}
                      onAdjustments={(value) => updateDraft("sellingCompanyAdjustments", value)}
                    />
                    <SplitCompanyRow
                      title="Listing Company"
                      pct={draft.listingCompanyPct}
                      adjustments={draft.listingCompanyAdjustments}
                      beforeFees={totals.listingBeforeFees}
                      final={totals.listingFinal}
                      disabled={locked}
                      onPct={(value) => updateDraft("listingCompanyPct", value)}
                      onAdjustments={(value) => updateDraft("listingCompanyAdjustments", value)}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <AgentSplitCard title="Selling Agent 1" name={draft.sellingAgent1Name} pct={draft.sellingAgent1Pct} amount={totals.sellingAgent1} disabled={locked} onName={(value) => updateDraft("sellingAgent1Name", value)} onPct={(value) => updateDraft("sellingAgent1Pct", value)} />
                  <AgentSplitCard title="Selling Agent 2" name={draft.sellingAgent2Name} pct={draft.sellingAgent2Pct} amount={totals.sellingAgent2} disabled={locked} onName={(value) => updateDraft("sellingAgent2Name", value)} onPct={(value) => updateDraft("sellingAgent2Pct", value)} />
                  <AgentSplitCard title="Listing Agent 1" name={draft.listingAgent1Name} pct={draft.listingAgent1Pct} amount={totals.listingAgent1} disabled={locked} onName={(value) => updateDraft("listingAgent1Name", value)} onPct={(value) => updateDraft("listingAgent1Pct", value)} />
                  <AgentSplitCard title="Listing Agent 2" name={draft.listingAgent2Name} pct={draft.listingAgent2Pct} amount={totals.listingAgent2} disabled={locked} onName={(value) => updateDraft("listingAgent2Name", value)} onPct={(value) => updateDraft("listingAgent2Pct", value)} />
                </div>

                <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
                  <div className="grid gap-4 md:grid-cols-[1fr_180px_220px] md:items-end">
                    <FormInput label="Brokerage Commission %" type="number" value={draft.brokeragePct} disabled={locked} placeholder="Enter brokerage percentage" onChange={(value) => updateDraft("brokeragePct", value)} />
                    <Readout label="Brokerage amount" value={currency(totals.brokerage)} />
                    <Readout label="TOTAL DUE BROKERAGE" value={currency(totals.totalDueBrokerage)} strong />
                  </div>
                </div>
              </FormSection>

              <FormSection title="Commission Disbursement Authorization">
                <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                  <div>
                    <Label className="mb-2 block">Authorized Signature</Label>
                    <div className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-slate-700">
                      <SignatureCanvas
                        ref={signatureRef}
                        penColor="#0f172a"
                        clearOnResize={false}
                        backgroundColor="#ffffff"
                        canvasProps={{ className: `h-40 w-full ${locked ? "pointer-events-none opacity-80" : ""}` }}
                        onEnd={() => updateDraft("signatureDataUrl", signatureRef.current?.toDataURL("image/png") ?? "")}
                      />
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300 dark:hover:text-amber-100"
                      disabled={locked}
                      onClick={() => {
                        signatureRef.current?.clear();
                        updateDraft("signatureDataUrl", "");
                      }}
                    >
                      Clear Signature
                    </button>
                  </div>
                  <div className="grid content-start gap-4">
                    <FormInput label="Admin/Broker Name" value={draft.adminBrokerName} disabled={locked} placeholder="Enter admin or broker name" onChange={(value) => updateDraft("adminBrokerName", value)} />
                    <FormInput label="Authorized Signature Date" type="date" value={draft.authorizedSignatureDate} disabled={locked} onChange={(value) => updateDraft("authorizedSignatureDate", value)} />
                    <Textarea
                      value="I authorize the commission disbursement according to the transaction details, referral allocations, adjustments, and brokerage totals shown on this request."
                      readOnly
                      className="min-h-24 resize-none border-slate-300 bg-slate-50 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                    />
                  </div>
                </div>
              </FormSection>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-xs text-muted-foreground">
              Draft auto-saves locally on this device. {locked ? "Locked forms can be unlocked from the header." : "Save and lock when the request is ready."}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" onClick={saveAndLock} className="gap-2">
                <LockKeyhole className="h-4 w-4" />
                Save & Lock Form
              </Button>
              <Button type="button" variant="outline" onClick={downloadPdf} disabled={pdfBusy} className="gap-2">
                {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </Button>
              <Button type="button" variant="outline" onClick={() => setEmailOpen(true)} className="gap-2">
                <Mail className="h-4 w-4" />
                Send via Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send via Email</DialogTitle>
            <DialogDescription>Enter recipient email address to send form:</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="commission-form-recipient">Recipient email</Label>
            <Input
              id="commission-form-recipient"
              type="email"
              value={recipientEmail}
              placeholder="name@example.com"
              onChange={(event) => setRecipientEmail(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={sendEmail}>
              Open Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 p-5 dark:border-slate-700">
      <h3 className="mb-4 font-display text-xl font-bold">{title}</h3>
      {children}
    </section>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 disabled:opacity-80 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
      />
    </div>
  );
}

function CheckLine({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={(value) => onChange(Boolean(value))} />
      <span>{label}</span>
    </label>
  );
}

function Readout({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 font-display tabular-nums ${strong ? "text-2xl font-bold text-amber-700 dark:text-amber-300" : "text-lg font-semibold"}`}>
        {value}
      </div>
    </div>
  );
}

function SplitCompanyRow({
  title,
  pct,
  adjustments,
  beforeFees,
  final,
  disabled,
  onPct,
  onAdjustments,
}: {
  title: string;
  pct: string;
  adjustments: string;
  beforeFees: number;
  final: number;
  disabled: boolean;
  onPct: (value: string) => void;
  onAdjustments: (value: string) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <FormInput label="Total Commission % to Agent" type="number" value={pct} disabled={disabled} placeholder="Enter percentage" onChange={onPct} />
        <Readout label="Commission before fees" value={currency(beforeFees)} />
        <FormInput label="Other adjustments (+/-)" type="number" value={adjustments} disabled={disabled} placeholder="Enter adjustment" onChange={onAdjustments} />
        <Readout label="Final commission after fees" value={currency(final)} strong />
      </div>
    </div>
  );
}

function AgentSplitCard({
  title,
  name,
  pct,
  amount,
  disabled,
  onName,
  onPct,
}: {
  title: string;
  name: string;
  pct: string;
  amount: number;
  disabled: boolean;
  onName: (value: string) => void;
  onPct: (value: string) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
      <h4 className="font-semibold">{title}</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_130px_150px] sm:items-end">
        <FormInput label="Agent Name" value={name} disabled={disabled} placeholder="Enter agent name" onChange={onName} />
        <FormInput label="Split %" type="number" value={pct} disabled={disabled} placeholder="Enter split" onChange={onPct} />
        <Readout label="Amount" value={currency(amount)} />
      </div>
    </div>
  );
}

function commissionToForm(r: CommissionRow): CommissionFormValues {
  return {
    dealId: r.dealId,
    property: r.property,
    agentName: r.agentName,
    side: r.side,
    closingDate: r.closingDate,
    salePrice: String(r.salePrice),
    commissionPct: String(r.commissionPct || 0),
    concessions: String(r.concessions || 0),
    brokerSplit: String(r.brokerSplit),
    deductions: String(r.deductions),
    deductionNotes: r.deductionNotes,
  };
}

function formatSideLabel(side: string) {
  if (side === "sell") return "Seller";
  if (side === "both") return "Both";
  return "Buyer";
}
