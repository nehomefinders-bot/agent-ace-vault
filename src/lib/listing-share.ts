import jsPDF from "jspdf";
import { formatMoney } from "@/lib/mock-data";

export interface ShareableListing {
  address: string;
  list_price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  notes: string | null;
}

function specsLine(l: ShareableListing) {
  const parts: string[] = [];
  if (l.beds != null) parts.push(`${l.beds} Beds`);
  if (l.baths != null) parts.push(`${l.baths} Baths`);
  if (l.sqft != null) parts.push(`${l.sqft.toLocaleString()} Sqft`);
  return parts.length ? parts.join(", ") : "—";
}

export function shareListingViaEmail(l: ShareableListing) {
  const address = l.address || "this property";
  const price = l.list_price != null ? formatMoney(Number(l.list_price)) : "—";
  const subject = `Property Details: ${address}`;
  const body =
    `Hi,\n\n` +
    `Here are the details for the property at ${address}:\n\n` +
    `- Price: ${price}\n` +
    `- Specs: ${specsLine(l)}\n` +
    `- Notes: ${l.notes || "—"}\n\n` +
    `Let me know if you would like to schedule a tour!`;
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

export function downloadListingPdf(l: ShareableListing) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Property Listing", 48, y);
  y += 28;

  doc.setDrawColor(220);
  doc.line(48, y, W - 48, y);
  y += 24;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const addressLines = doc.splitTextToSize(l.address || "—", W - 96);
  doc.text(addressLines, 48, y);
  y += addressLines.length * 20 + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(20);
  doc.setTextColor(20, 80, 180);
  doc.text(l.list_price != null ? formatMoney(Number(l.list_price)) : "Price on request", 48, y);
  doc.setTextColor(0);
  y += 28;

  doc.setFontSize(12);
  const rows: Array<[string, string]> = [
    ["Beds", l.beds != null ? String(l.beds) : "—"],
    ["Baths", l.baths != null ? String(l.baths) : "—"],
    ["Sqft", l.sqft != null ? l.sqft.toLocaleString() : "—"],
  ];
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 48, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, 110, y);
    y += 20;
  });

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Notes", 48, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  const noteLines = doc.splitTextToSize(l.notes || "—", W - 96);
  doc.text(noteLines, 48, y);

  const safe = (l.address || "listing").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60);
  doc.save(`${safe || "listing"}.pdf`);
}
