import jsPDF from "jspdf";
import { formatMoney } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";

export interface ShareableListing {
  id?: string;
  address: string;
  list_price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  notes: string | null;
  property_type?: string | null;
  year_built?: number | null;
  lot_size?: string | null;
  parking_spaces?: number | null;
  closing_date?: string | null;
  status?: string | null;
}

const MLS_KEYWORDS = ["mls", "listing sheet", "feature sheet", "property sheet"];

export interface MlsAttachment {
  name: string;
  path: string;
  url: string;
}

/** Look up an MLS-style document attached to the listing. Returns a signed URL if found. */
export async function findListingMlsDocument(
  listingId: string,
): Promise<MlsAttachment | null> {
  const { data, error } = await supabase
    .from("listing_documents")
    .select("name, path, mime_type")
    .eq("listing_id", listingId);
  if (error || !data?.length) return null;

  const match =
    data.find((d) => {
      const n = (d.name || "").toLowerCase();
      return MLS_KEYWORDS.some((k) => n.includes(k));
    }) ??
    data.find((d) => (d.mime_type || "").toLowerCase() === "application/pdf") ??
    null;

  if (!match) return null;
  const { data: signed } = await supabase.storage
    .from("listing-documents")
    .createSignedUrl(match.path, 60 * 60 * 24 * 7);
  if (!signed?.signedUrl) return null;
  return { name: match.name, path: match.path, url: signed.signedUrl };
}

function specsLine(l: ShareableListing) {
  const parts: string[] = [];
  if (l.beds != null) parts.push(`${l.beds} Beds`);
  if (l.baths != null) parts.push(`${l.baths} Baths`);
  if (l.sqft != null) parts.push(`${l.sqft.toLocaleString()} Sqft`);
  return parts.length ? parts.join(", ") : "—";
}

export function buildShareSubject(l: ShareableListing) {
  return `Property Details: ${l.address || "this property"}`;
}

export function buildShareBody(l: ShareableListing, attachmentUrl?: string) {
  const address = l.address || "this property";
  const price = l.list_price != null ? formatMoney(Number(l.list_price)) : "—";
  const extras: string[] = [];
  if (l.property_type) extras.push(`- Type: ${l.property_type}`);
  if (l.year_built != null) extras.push(`- Year Built: ${l.year_built}`);
  if (l.lot_size) extras.push(`- Lot Size: ${l.lot_size}`);
  if (l.parking_spaces != null) extras.push(`- Parking: ${l.parking_spaces}`);
  return (
    `Hi,\n\n` +
    `Here are the details for the property at ${address}:\n\n` +
    `- Price: ${price}\n` +
    `- Specs: ${specsLine(l)}\n` +
    (extras.length ? extras.join("\n") + "\n" : "") +
    `- Notes: ${l.notes || "—"}\n\n` +
    (attachmentUrl
      ? `Full MLS sheet: ${attachmentUrl}\n\n`
      : `A property feature sheet is attached for your review.\n\n`) +
    `Let me know if you would like to schedule a tour!`
  );
}

export function shareListingViaEmail(l: ShareableListing, attachmentUrl?: string) {
  const href = `mailto:?subject=${encodeURIComponent(
    buildShareSubject(l),
  )}&body=${encodeURIComponent(buildShareBody(l, attachmentUrl))}`;
  window.location.href = href;
}

/** Build a property feature sheet PDF as a jsPDF doc. */
export function buildListingPdfDoc(l: ShareableListing): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Property Feature Sheet", 48, y);
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
  doc.text(
    l.list_price != null ? formatMoney(Number(l.list_price)) : "Price on request",
    48,
    y,
  );
  doc.setTextColor(0);
  y += 28;

  doc.setFontSize(12);
  const rows: Array<[string, string]> = [
    ["Status", l.status || "—"],
    ["Type", l.property_type || "—"],
    ["Beds", l.beds != null ? String(l.beds) : "—"],
    ["Baths", l.baths != null ? String(l.baths) : "—"],
    ["Sqft", l.sqft != null ? l.sqft.toLocaleString() : "—"],
    ["Year Built", l.year_built != null ? String(l.year_built) : "—"],
    ["Lot Size", l.lot_size || "—"],
    ["Parking", l.parking_spaces != null ? String(l.parking_spaces) : "—"],
  ];
  if (l.closing_date) rows.push(["Closing Date", l.closing_date]);

  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 48, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, 140, y);
    y += 20;
  });

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Notes", 48, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  const noteLines = doc.splitTextToSize(l.notes || "—", W - 96);
  doc.text(noteLines, 48, y);

  return doc;
}

export function downloadListingPdf(l: ShareableListing) {
  const doc = buildListingPdfDoc(l);
  const safe = (l.address || "listing")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .slice(0, 60);
  doc.save(`${safe || "listing"}.pdf`);
}

export function listingPdfDataUrl(l: ShareableListing): string {
  return buildListingPdfDoc(l).output("datauristring");
}
