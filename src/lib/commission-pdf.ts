import jsPDF from "jspdf";
import { formatMoney } from "@/lib/mock-data";

export type CommissionPdfSide = "buyer" | "listing";

export interface CommissionPdfData {
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
  grossCommission: number;
  concessionExpenses: number;
  netCompanyName: string;
  escrowHeld: number;
  adminBrokerName: string;
  signatureDate: string;
  signatureDataUrl: string;
  notes: string;
}

export function buildCommissionPdf(data: CommissionPdfData, side: CommissionPdfSide): jsPDF {
  const netCommission = Math.max(data.grossCommission - data.concessionExpenses, 0);
  const balanceSeller = netCommission - data.escrowHeld;

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
  doc.text(side === "buyer" ? "Buyer Agent Side" : "Listing Agent Side", M, y);
  doc.text(`Issued: ${data.signatureDate}`, W - M, y, { align: "right" });
  y += 18;

  const kv: Array<[string, string]> = [
    ["Property Address", data.propertyAddress],
    ["Buyer", data.buyerName || "—"],
    ["Seller", data.sellerName || "—"],
    ["P&S Date", data.psDate || "—"],
    ["Close Date", data.closeDate || "—"],
    ["Listing Agent", data.listingAgent || "—"],
    ["Listing Office", data.listingOffice || "—"],
    ["Sales Agent", data.salesAgent || "—"],
    ["Sale Office", data.saleOffice || "—"],
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

  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  const ledgerTop = y;
  const rows: Array<[string, number]> = [
    ["Gross Commission", data.grossCommission],
    ["Less: Concession / Expenses", -data.concessionExpenses],
    [`Net Commission due to ${data.netCompanyName.trim() || "—"}`, netCommission],
  ];
  if (side === "listing") rows.push(["Balance Due to / from Seller", balanceSeller]);
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SPECIAL TRANSACTION COMMENTARY", M, y);
  y += 8;
  const noteText = data.notes.trim() || "—";
  const noteLines = doc.splitTextToSize(noteText, W - M * 2 - 20);
  const noteH = Math.max(60, noteLines.length * 12 + 20);
  doc.setDrawColor(0);
  doc.rect(M, y, W - M * 2, noteH);
  doc.setFont("helvetica", "normal");
  doc.text(noteLines, M + 10, y + 16);
  y += noteH + 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SIGNATURES & EXECUTION", M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Admin / Broker: ${data.adminBrokerName || "—"}`, M, y);
  doc.text(`Date: ${data.signatureDate}`, W - M, y, { align: "right" });
  y += 30;

  const sigLineY = y + 36;
  doc.setLineWidth(0.6);
  doc.line(M, sigLineY, M + 280, sigLineY);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Authorized Signature", M, sigLineY + 12);
  doc.setTextColor(0);

  if (data.signatureDataUrl) {
    try { doc.addImage(data.signatureDataUrl, "PNG", M + 4, y, 240, 40); } catch { /* ignore */ }
  }

  return doc;
}

/**
 * Recover form-shaped snapshot fields from a deal's notes blob (the labels
 * written by CommissionSideForm.save()).
 */
export function parseFormSnapshotFromNotes(notes: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!notes) return out;
  const parts = notes.split(/\r?\n|\s\|\s/).map((p) => p.trim()).filter(Boolean);
  const extract = (key: string) => {
    const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*(.*)$`, "i");
    for (const p of parts) {
      const m = p.match(re);
      if (m) return m[1].trim();
    }
    return "";
  };
  const splitMls = (raw: string): [string, string] => {
    if (!raw) return ["", ""];
    const m = raw.match(/^(.*?)\s*\(MLS\s+([^)]+)\)\s*$/i);
    if (m) return [m[1].trim(), m[2].trim()];
    return [raw.trim(), ""];
  };

  out.sellerName = extract("Seller");
  out.buyerName = extract("Buyer");
  out.psDate = extract("P&S Date");
  [out.listingAgent, out.listingAgentMlsId] = splitMls(extract("Listing Agent"));
  [out.listingOffice, out.listingOfficeMlsId] = splitMls(extract("Listing Office"));
  [out.salesAgent, out.salesAgentMlsId] = splitMls(extract("Sales Agent"));
  [out.saleOffice, out.saleOfficeMlsId] = splitMls(extract("Sale Office"));

  const escrow = extract("Escrow Held").replace(/[^0-9.\-]/g, "");
  if (escrow) out.escrowHeld = escrow;

  const conc = extract("Concession/Expenses");
  if (conc) out.concession = conc;

  const netCompany = extract("Net Commission due to");
  if (netCompany) {
    const m = netCompany.match(/^(.*?)\s*=\s*/);
    out.netCompanyName = (m?.[1] ?? netCompany).trim();
  }

  const auth = extract("Authorized By");
  if (auth) {
    const m = auth.match(/^(.*?)\s+on\s+(\S+)$/);
    if (m) { out.adminBrokerName = m[1].trim(); out.signatureDate = m[2].trim(); }
    else out.adminBrokerName = auth;
  }

  const userNotes = extract("Notes");
  if (userNotes) out.notes = userNotes;

  return out;
}
