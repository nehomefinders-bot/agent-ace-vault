import { useEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { mergeCommissionNotes } from "@/lib/commission-notes";
import { formatMoney } from "@/lib/mock-data";
import { toast } from "sonner";

export type CommissionSide = "buyer" | "listing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: CommissionSide;
  userId: string;
  defaultBrokerName: string;
  onSaved: () => void;
}

interface FormState {
  propertyAddress: string;
  sellerName: string;
  buyerName: string;
  psDate: string;
  closeDate: string;
  listingAgent: string;
  listingOffice: string;
  salesAgent: string;
  saleOffice: string;
  salePrice: string;
  concession: string; // buyer only
  totalCommission: string;
  commissionDueCoBroke: string; // listing only
  lessEscrow: string; // listing only
  adminBrokerName: string;
  signatureDate: string;
  signatureDataUrl: string;
  notes: string;
}

function blankForm(broker: string): FormState {
  return {
    propertyAddress: "",
    sellerName: "",
    buyerName: "",
    psDate: "",
    closeDate: "",
    listingAgent: "",
    listingOffice: "",
    salesAgent: "",
    saleOffice: "",
    salePrice: "",
    concession: "",
    totalCommission: "",
    commissionDueCoBroke: "",
    lessEscrow: "",
    adminBrokerName: broker,
    signatureDate: new Date().toISOString().slice(0, 10),
    signatureDataUrl: "",
    notes: "",
  };
}

function num(v: string) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function CommissionSideForm({ open, onOpenChange, side, userId, defaultBrokerName, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => blankForm(defaultBrokerName));
  const [saving, setSaving] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) setForm(blankForm(defaultBrokerName));
  }, [open, defaultBrokerName, side]);

  // Auto-resize notes
  useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [form.notes, open]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((c) => ({ ...c, [k]: v }));

  const salePrice = num(form.salePrice);
  const totalCommission = num(form.totalCommission);

  const { netPrice, totalAmountDue, deductionsForRow } = useMemo(() => {
    if (side === "buyer") {
      const concession = num(form.concession);
      const net = Math.max(salePrice - concession, 0);
      // Buyer side: Total Amount Due = total commission (no escrow/co-broke deductions)
      return { netPrice: net, totalAmountDue: totalCommission, deductionsForRow: concession };
    }
    const coBroke = num(form.commissionDueCoBroke);
    const escrow = num(form.lessEscrow);
    const net = Math.max(salePrice, 0);
    const due = Math.max(totalCommission - coBroke - escrow, 0);
    return { netPrice: net, totalAmountDue: due, deductionsForRow: coBroke + escrow };
  }, [side, salePrice, totalCommission, form.concession, form.commissionDueCoBroke, form.lessEscrow]);

  const title = side === "buyer" ? "Buyer Agent Side - Commission Form" : "Listing Agent Side - Commission Form";
  const sideValue = side === "buyer" ? "buy" : "sell";
  const primaryAgent = form.salesAgent || form.listingAgent || defaultBrokerName;

  const handleSig = () => update("signatureDataUrl", sigRef.current?.toDataURL("image/png") ?? "");

  const uploadSig = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      if (!url) return;
      update("signatureDataUrl", url);
      requestAnimationFrame(() => {
        sigRef.current?.clear();
        sigRef.current?.fromDataURL(url);
      });
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.propertyAddress.trim()) {
      toast.error("Property Address is required");
      return;
    }
    if (salePrice <= 0) {
      toast.error("Sale Price must be greater than 0");
      return;
    }
    if (totalCommission <= 0) {
      toast.error("Total Commission must be greater than 0");
      return;
    }
    setSaving(true);

    // Encode so the Commission Tracker shows Net Commission == Total Amount Due:
    //   gross_commission = totalCommission
    //   agent_split_pct = 100
    //   deductions = totalCommission - totalAmountDue
    const deductions = Math.max(totalCommission - totalAmountDue, 0);

    const noteParts: string[] = [];
    if (side === "buyer") {
      if (form.concession) noteParts.push(`Concession: ${form.concession}`);
    } else {
      if (form.commissionDueCoBroke) noteParts.push(`Co-Broke: ${form.commissionDueCoBroke}`);
      if (form.lessEscrow) noteParts.push(`Less Escrow: ${form.lessEscrow}`);
    }
    if (form.sellerName) noteParts.push(`Seller: ${form.sellerName}`);
    if (form.buyerName) noteParts.push(`Buyer: ${form.buyerName}`);
    if (form.psDate) noteParts.push(`P&S Date: ${form.psDate}`);
    if (form.listingAgent) noteParts.push(`Listing Agent: ${form.listingAgent}`);
    if (form.listingOffice) noteParts.push(`Listing Office: ${form.listingOffice}`);
    if (form.saleOffice) noteParts.push(`Sale Office: ${form.saleOffice}`);
    if (form.adminBrokerName) noteParts.push(`Authorized By: ${form.adminBrokerName} on ${form.signatureDate}`);
    if (form.notes.trim()) noteParts.push(`Notes: ${form.notes.trim()}`);

    const notes = mergeCommissionNotes(noteParts.join(" | ") || null, {
      status: "Pending",
      concessions: side === "buyer" ? num(form.concession) : 0,
      deductions,
      deductionNotes: side === "listing"
        ? `Co-Broke ${form.commissionDueCoBroke || 0}, Escrow ${form.lessEscrow || 0}`
        : form.concession ? `Concession ${form.concession}` : "",
    });

    const { error } = await supabase.from("deals").insert({
      user_id: userId,
      address: form.propertyAddress.trim(),
      side: sideValue,
      status: "sold",
      sale_price: salePrice,
      gross_commission: totalCommission,
      agent_split_pct: 100,
      brokerage_split_pct: 0,
      close_date: form.closeDate || null,
      agent_name: primaryAgent.trim() || null,
      client_name: side === "buyer" ? form.buyerName.trim() || null : form.sellerName.trim() || null,
      notes,
    });

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Commission saved to tracker");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !inset-0 !left-0 !top-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !overflow-hidden !rounded-none !border-0 !p-0 flex flex-col gap-0 bg-background">
        <DialogHeader className="shrink-0 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-8">
          <DialogTitle className="font-display text-2xl sm:text-3xl">{title}</DialogTitle>
          <DialogDescription>
            Fill out the closing details. Saving adds a new row to the Commission Tracker.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <Section title="Core Identifiers">
              <Field label="Property Address" value={form.propertyAddress} onChange={(v) => update("propertyAddress", v)} className="md:col-span-2" />
              <Field label="Seller Name" value={form.sellerName} onChange={(v) => update("sellerName", v)} />
              <Field label="Buyer Name" value={form.buyerName} onChange={(v) => update("buyerName", v)} />
              <Field label="P&S Date" type="date" value={form.psDate} onChange={(v) => update("psDate", v)} />
              <Field label="Close Date" type="date" value={form.closeDate} onChange={(v) => update("closeDate", v)} />
            </Section>

            <Section title="Office Routing">
              <Field label="Listing Agent" value={form.listingAgent} onChange={(v) => update("listingAgent", v)} />
              <Field label="Listing Office" value={form.listingOffice} onChange={(v) => update("listingOffice", v)} />
              <Field label="Sales Agent" value={form.salesAgent} onChange={(v) => update("salesAgent", v)} />
              <Field label="Sale Office" value={form.saleOffice} onChange={(v) => update("saleOffice", v)} />
            </Section>

            <Section title="Financial Calculation Matrix">
              <Field label="Sale Price" type="number" value={form.salePrice} onChange={(v) => update("salePrice", v)} />
              {side === "buyer" && (
                <Field label="Concession" type="number" value={form.concession} onChange={(v) => update("concession", v)} />
              )}
              <Readout label="Net Price" value={formatMoney(netPrice)} />
              <Field label="Total Commission" type="number" value={form.totalCommission} onChange={(v) => update("totalCommission", v)} />
              {side === "listing" && (
                <>
                  <Field label="Total Commission Due to Co-Broke" type="number" value={form.commissionDueCoBroke} onChange={(v) => update("commissionDueCoBroke", v)} />
                  <Field label="Less Escrow" type="number" value={form.lessEscrow} onChange={(v) => update("lessEscrow", v)} />
                </>
              )}
              <Readout label="Total Amount Due" value={formatMoney(totalAmountDue)} strong className="md:col-span-2" />
            </Section>

            <Section title="Commission Disbursement Authorization">
              <div className="md:col-span-2">
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Authorized Signature</Label>
                <input ref={uploadRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { uploadSig(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                <div className="overflow-hidden rounded-xl border-2 border-dashed border-border bg-white">
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="black"
                    backgroundColor="#ffffff"
                    canvasProps={{ className: "h-48 w-full rounded-xl" }}
                    onEnd={handleSig}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => uploadRef.current?.click()}>
                    <Upload className="h-4 w-4" /> Upload Signature
                  </Button>
                  <button type="button" className="text-sm font-medium text-primary hover:underline"
                    onClick={() => { sigRef.current?.clear(); update("signatureDataUrl", ""); }}>
                    Clear Signature
                  </button>
                </div>
              </div>
              <Field label="Admin/Broker Name" value={form.adminBrokerName} onChange={(v) => update("adminBrokerName", v)} />
              <Field label="Authorized Signature Date" type="date" value={form.signatureDate} onChange={(v) => update("signatureDate", v)} />
              <div className="md:col-span-2 grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Notes</Label>
                <Textarea
                  ref={notesRef}
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Add custom terms, transaction remarks, or situational instructions…"
                  className="min-h-24 resize-none overflow-hidden"
                />
              </div>
            </Section>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-8">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Commission
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 font-display text-lg font-bold">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label, value, onChange, type = "text", className = "",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; className?: string;
}) {
  return (
    <div className={`grid gap-2 ${className}`}>
      <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-11" />
    </div>
  );
}

function Readout({ label, value, strong = false, className = "" }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-muted/40 p-3 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display tabular-nums ${strong ? "text-2xl font-bold text-primary" : "text-lg font-semibold"}`}>{value}</div>
    </div>
  );
}
