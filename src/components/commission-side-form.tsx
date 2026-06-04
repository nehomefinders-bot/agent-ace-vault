import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, Upload, Save, FileDown, Mail } from "lucide-react";
import jsPDF from "jspdf";
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
  listingAgentMlsId: string;
  listingOfficeMlsId: string;
  salesAgent: string;
  saleOffice: string;
  salesAgentMlsId: string;
  saleOfficeMlsId: string;
  grossCommission: string;
  concession: string;
  netCompanyName: string;
  escrowHeld: string;
  adminBrokerName: string;
  signatureDate: string;
  signatureDataUrl: string;
  notes: string;
}

function blankForm(_broker: string): FormState {
  return {
    propertyAddress: "",
    sellerName: "",
    buyerName: "",
    psDate: "",
    closeDate: "",
    listingAgent: "",
    listingOffice: "",
    listingAgentMlsId: "",
    listingOfficeMlsId: "",
    salesAgent: "",
    saleOffice: "",
    salesAgentMlsId: "",
    saleOfficeMlsId: "",
    grossCommission: "",
    concession: "",
    netCompanyName: "",
    escrowHeld: "",
    adminBrokerName: "",
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
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const sigRef = useRef<SignatureCanvas | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) setForm(blankForm(defaultBrokerName));
  }, [open, defaultBrokerName, side]);

  useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [form.notes, open]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((c) => ({ ...c, [k]: v }));

  const grossCommission = num(form.grossCommission);
  const concessionExpenses = num(form.concession);
  const netCommission = Math.max(grossCommission - concessionExpenses, 0);
  const escrowHeld = num(form.escrowHeld);
  const balanceSeller = netCommission - escrowHeld;

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

  const validate = () => {
    if (!form.propertyAddress.trim()) { toast.error("Property Address is required"); return false; }
    if (grossCommission <= 0) { toast.error("Gross Commission must be greater than 0"); return false; }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);

    const noteParts: string[] = [];
    if (form.concession) noteParts.push(`Concession/Expenses: ${form.concession}`);
    if (form.netCompanyName.trim()) noteParts.push(`Net Commission due to: ${form.netCompanyName.trim()} = ${formatMoney(netCommission)}`);
    if (side === "listing") {
      if (form.escrowHeld) noteParts.push(`Escrow Held: ${formatMoney(escrowHeld)}`);
      noteParts.push(`Balance Due to/from Seller: ${formatMoney(balanceSeller)}`);
    }
    if (form.sellerName) noteParts.push(`Seller: ${form.sellerName}`);
    if (form.buyerName) noteParts.push(`Buyer: ${form.buyerName}`);
    if (form.psDate) noteParts.push(`P&S Date: ${form.psDate}`);
    if (form.listingAgent) noteParts.push(`Listing Agent: ${form.listingAgent}${form.listingAgentMlsId ? ` (MLS ${form.listingAgentMlsId})` : ""}`);
    if (form.listingOffice) noteParts.push(`Listing Office: ${form.listingOffice}${form.listingOfficeMlsId ? ` (MLS ${form.listingOfficeMlsId})` : ""}`);
    if (form.salesAgent) noteParts.push(`Sales Agent: ${form.salesAgent}${form.salesAgentMlsId ? ` (MLS ${form.salesAgentMlsId})` : ""}`);
    if (form.saleOffice) noteParts.push(`Sale Office: ${form.saleOffice}${form.saleOfficeMlsId ? ` (MLS ${form.saleOfficeMlsId})` : ""}`);

    if (form.adminBrokerName) noteParts.push(`Authorized By: ${form.adminBrokerName} on ${form.signatureDate}`);
    if (form.notes.trim()) noteParts.push(`Notes: ${form.notes.trim()}`);

    const notes = mergeCommissionNotes(noteParts.join(" | ") || null, {
      status: "Pending",
      concessions: 0,
      deductions: concessionExpenses,
      deductionNotes: form.concession ? `Concession/Expenses ${form.concession}` : "",
    });

    const { error } = await supabase.from("deals").insert({
      user_id: userId,
      address: form.propertyAddress.trim(),
      side: sideValue,
      status: "sold",
      sale_price: grossCommission,
      gross_commission: grossCommission,
      agent_split_pct: 100,
      brokerage_split_pct: 0,
      close_date: form.closeDate || null,
      agent_name: primaryAgent.trim() || null,
      client_name: side === "buyer" ? form.buyerName.trim() || null : form.sellerName.trim() || null,
      notes,
    });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Commission saved & synced to tracker");
    onSaved();
    onOpenChange(false);
  };

  const buildPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const M = 48;
    let y = 56;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("COMMISSION DISBURSEMENT AUTHORIZATION", W / 2, y, { align: "center" });
    y += 10;
    doc.setLineWidth(0.8);
    doc.line(M, y, W - M, y);
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${side === "buyer" ? "Buyer Agent Side" : "Listing Agent Side"}`, M, y);
    doc.text(`Issued: ${form.signatureDate}`, W - M, y, { align: "right" });
    y += 18;

    // Key/value grid
    const kv: Array<[string, string]> = [
      ["Property Address", form.propertyAddress],
      ["Buyer", form.buyerName || "—"],
      ["Seller", form.sellerName || "—"],
      ["P&S Date", form.psDate || "—"],
      ["Close Date", form.closeDate || "—"],
      ["Listing Agent", form.listingAgent || "—"],
      ["Listing Office", form.listingOffice || "—"],
      ["Sales Agent", form.salesAgent || "—"],
      ["Sale Office", form.saleOffice || "—"],
    ];
    const colW = (W - M * 2) / 2;
    doc.setFontSize(10);
    kv.forEach((row, i) => {
      const col = i % 2;
      const x = M + col * colW;
      if (col === 0 && i > 0) y += 28;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(90);
      doc.text(row[0].toUpperCase(), x, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(row[1] || "—", colW - 12);
      doc.text(lines, x, y + 13);
    });
    y += 36;

    // Ledger box
    doc.setDrawColor(0);
    doc.setLineWidth(0.6);
    const ledgerTop = y;
    const rows: Array<[string, number, boolean?]> = [
      ["Gross Commission", grossCommission],
      ["Less: Concession / Expenses", -concessionExpenses],
      [`Net Commission due to ${form.netCompanyName.trim() || "—"}`, netCommission],
    ];
    if (side === "listing") {
      rows.push(["Balance Due to / from Seller", balanceSeller]);
    }
    const rowH = 20;
    const ledgerH = rows.length * rowH + rowH + 8;
    doc.rect(M, ledgerTop, W - M * 2, ledgerH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("FINANCIAL LEDGER", M + 10, ledgerTop + 16);
    y = ledgerTop + 30;
    doc.setFontSize(10);
    rows.forEach(([label, amt]) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, M + 10, y);
      doc.text(formatMoney(amt), W - M - 10, y, { align: "right" });
      y += rowH;
    });
    doc.setLineWidth(0.4);
    doc.line(M + 8, y - rowH + 4, W - M - 8, y - rowH + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(side === "listing" ? "BALANCE DUE TO / FROM SELLER" : "NET COMMISSION DUE", M + 10, y + 4);
    doc.text(formatMoney(side === "listing" ? balanceSeller : netCommission), W - M - 10, y + 4, { align: "right" });
    y = ledgerTop + ledgerH + 22;

    // Notes box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("SPECIAL TRANSACTION COMMENTARY", M, y);
    y += 8;
    const noteText = form.notes.trim() || "—";
    const noteLines = doc.splitTextToSize(noteText, W - M * 2 - 20);
    const noteH = Math.max(60, noteLines.length * 12 + 20);
    doc.setDrawColor(0);
    doc.rect(M, y, W - M * 2, noteH);
    doc.setFont("helvetica", "normal");
    doc.text(noteLines, M + 10, y + 16);
    y += noteH + 24;

    // Signatures
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SIGNATURES & EXECUTION", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Admin / Broker: ${form.adminBrokerName || "—"}`, M, y);
    doc.text(`Date: ${form.signatureDate}`, W - M, y, { align: "right" });
    y += 30;

    const sigLineY = y + 36;
    doc.setLineWidth(0.6);
    doc.line(M, sigLineY, M + 280, sigLineY);
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text("Authorized Signature", M, sigLineY + 12);
    doc.setTextColor(0);

    if (form.signatureDataUrl) {
      try { doc.addImage(form.signatureDataUrl, "PNG", M + 4, y, 240, 40); } catch { /* ignore */ }
    }

    return doc;
  };

  const downloadPdf = () => {
    if (!validate()) return;
    const doc = buildPdf();
    const slug = (form.propertyAddress || "commission").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    doc.save(`commission-${slug}.pdf`);
    toast.success("PDF downloaded");
  };

  const sendEmail = () => {
    const to = emailTo.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error("Enter a valid email address");
      return;
    }
    const subject = `Commission Disbursement Statement - ${form.propertyAddress || "Property"}`;
    const summary = [
      `Gross Commission: ${formatMoney(grossCommission)}`,
      `Concession / Expenses: ${formatMoney(concessionExpenses)}`,
      `Net Commission due to ${form.netCompanyName.trim() || "—"}: ${formatMoney(netCommission)}`,
      ...(side === "listing" ? [`Balance Due to / from Seller: ${formatMoney(balanceSeller)}`] : []),
    ].join("\n");
    const body =
      `Hello,\n\nPlease find the calculated Commission Statement breakdown for ${form.propertyAddress || "the subject property"} mapped out below.\n\n` +
      `${summary}\n\nNotes: ${form.notes.trim() || "—"}\n\n` +
      `Please find the official signed PDF authorization attached to this transmission.\n\n` +
      `Regards,\n${form.adminBrokerName || ""}`;
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    toast.message("Opening default email application…", {
      description: "Remember to attach your downloaded signed PDF before sending.",
    });
    setEmailOpen(false);
    setEmailTo("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !inset-0 !left-0 !top-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !overflow-hidden !rounded-none !border-0 !p-0 flex flex-col gap-0 bg-background text-foreground">
        <DialogHeader className="shrink-0 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-8">
          <DialogTitle className="font-display text-xl sm:text-3xl">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Fill out the closing details. Save syncs to the Commission Tracker; you can also export a signed PDF or send via email.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-8">
          <div className="mx-auto w-full max-w-5xl space-y-6">
            <Section title="Core Identifiers">
              <Field label="Property Address" value={form.propertyAddress} onChange={(v) => update("propertyAddress", v)} className="md:col-span-2" />
              <Field label="Seller Name" value={form.sellerName} onChange={(v) => update("sellerName", v)} />
              <Field label="Buyer Name" value={form.buyerName} onChange={(v) => update("buyerName", v)} />
              <Field label="P&S Date" type="date" value={form.psDate} onChange={(v) => update("psDate", v)} />
              <Field label="Close Date" type="date" value={form.closeDate} onChange={(v) => update("closeDate", v)} />
            </Section>

            <Section title="Agents">
              <Field label="Listing Agent" value={form.listingAgent} onChange={(v) => update("listingAgent", v)} />
              <Field label="Listing Office" value={form.listingOffice} onChange={(v) => update("listingOffice", v)} />
              <Field label="MLS ID" value={form.listingAgentMlsId} onChange={(v) => update("listingAgentMlsId", v)} />
              <Field label="Office MLS ID" value={form.listingOfficeMlsId} onChange={(v) => update("listingOfficeMlsId", v)} />
              <Field label="Sales Agent" value={form.salesAgent} onChange={(v) => update("salesAgent", v)} />
              <Field label="Sale Office" value={form.saleOffice} onChange={(v) => update("saleOffice", v)} />
              <Field label="MLS ID" value={form.salesAgentMlsId} onChange={(v) => update("salesAgentMlsId", v)} />
              <Field label="Office MLS ID" value={form.saleOfficeMlsId} onChange={(v) => update("saleOfficeMlsId", v)} />
            </Section>

            <Section title="Financial Calculation Matrix">
              <Field label="Gross Commission" type="number" value={form.grossCommission} onChange={(v) => update("grossCommission", v)} prefix="$" />
              <Field label="Concession / Expenses" type="number" value={form.concession} onChange={(v) => update("concession", v)} prefix="$" />
              <div className="md:col-span-2 rounded-xl border border-border bg-muted/40 p-4 text-foreground">
                <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Net Commission</Label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <span className="text-sm text-foreground whitespace-nowrap">Net Commission due to</span>
                  <Input
                    value={form.netCompanyName}
                    onChange={(e) => update("netCompanyName", e.target.value)}
                    placeholder="Company / Firm Name"
                    className="h-11 flex-1 min-w-0 bg-background text-foreground placeholder:text-muted-foreground"
                  />
                  <span className="font-display text-xl sm:text-2xl font-bold tabular-nums text-primary whitespace-nowrap">
                    {formatMoney(netCommission)}
                  </span>
                </div>
              </div>
              {side === "listing" && (
                <div className="md:col-span-2 rounded-xl border border-border bg-card p-4 text-card-foreground">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Label htmlFor="balance-seller" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:w-64 sm:shrink-0">
                      Balance Due to / from Seller
                    </Label>
                    <div className="relative flex-1 min-w-0">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-foreground/70">$</span>
                      <Input
                        id="balance-seller"
                        type="number"
                        value={form.balanceSeller}
                        onChange={(e) => update("balanceSeller", e.target.value)}
                        className="h-11 w-full pl-7 bg-background text-foreground placeholder:text-muted-foreground"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Commission Disbursement Authorization">
              <div className="md:col-span-2">
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Authorized Signature</Label>
                <input ref={uploadRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { uploadSig(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                <div className="overflow-hidden rounded-xl border-2 border-dashed border-border bg-white dark:bg-zinc-100">
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="black"
                    backgroundColor="#ffffff"
                    canvasProps={{
                      className: "h-48 w-full rounded-xl",
                      style: { touchAction: "none" },
                    }}
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
                  className="min-h-24 resize-none overflow-hidden bg-background text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </Section>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="sm:w-auto">Cancel</Button>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button type="button" variant="outline" onClick={downloadPdf} className="gap-2">
                <FileDown className="h-4 w-4" /> Download Signed PDF
              </Button>
              <Button type="button" variant="outline" onClick={() => setEmailOpen(true)} className="gap-2">
                <Mail className="h-4 w-4" /> Send via Email
              </Button>
              <Button type="button" onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save &amp; Sync
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send Commission Statement</DialogTitle>
              <DialogDescription>
                Enter the recipient's email. We'll open your default mail app pre-filled with the statement summary.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Label htmlFor="commission-email-to" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Recipient Email
              </Label>
              <Input
                id="commission-email-to"
                type="email"
                inputMode="email"
                placeholder="name@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="h-11"
              />
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Opening your default email application… please remember to attach the downloaded signed PDF before sending.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setEmailOpen(false)}>Cancel</Button>
              <Button type="button" onClick={sendEmail} className="gap-2"><Mail className="h-4 w-4" /> Open Mail App</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-card sm:p-5">
      <h3 className="mb-4 font-display text-base font-bold sm:text-lg">{title}</h3>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label, value, onChange, type = "text", className = "", prefix,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; className?: string; prefix?: string;
}) {
  return (
    <div className={`grid gap-2 min-w-0 ${className}`}>
      <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-foreground/70">
            {prefix}
          </span>
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-11 w-full bg-background text-foreground placeholder:text-muted-foreground ${prefix ? "pl-7" : ""}`}
        />
      </div>
    </div>
  );
}

