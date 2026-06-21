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
  client_name?: string | null;
  image_urls?: string[];
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

const NA = "N/A";
const v = (x: unknown) =>
  x === null || x === undefined || x === "" ? NA : String(x);

function specsLine(l: ShareableListing) {
  const parts: string[] = [];
  if (l.beds != null) parts.push(`${l.beds} Beds`);
  if (l.baths != null) parts.push(`${l.baths} Baths`);
  if (l.sqft != null) parts.push(`${l.sqft.toLocaleString()} Sqft`);
  return parts.length ? parts.join(", ") : NA;
}

export function buildShareSubject(l: ShareableListing) {
  return `Property Details: ${l.address || "this property"}`;
}

export function buildShareBody(l: ShareableListing, attachmentUrl?: string) {
  const address = l.address || "this property";
  const price = l.list_price != null ? formatMoney(Number(l.list_price)) : NA;
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
    `- Notes: ${l.notes || NA}\n\n` +
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

async function loadImage(
  url: string,
): Promise<{ data: string; w: number; h: number; fmt: "JPEG" | "PNG" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 800, h: 600 });
      img.src = data;
    });
    const fmt: "JPEG" | "PNG" =
      blob.type.includes("png") ? "PNG" : "JPEG";
    return { data, w: dims.w, h: dims.h, fmt };
  } catch {
    return null;
  }
}

function shortMls(id?: string) {
  if (!id) return NA;
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Build a high-fidelity MLS-style property feature sheet. */
export async function buildListingPdfDoc(l: ShareableListing): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 28; // margin
  const cw = W - M * 2;

  const BORDER: [number, number, number] = [60, 60, 60];
  const HEAD_BG: [number, number, number] = [30, 58, 95];
  const BAND_BG: [number, number, number] = [232, 236, 244];
  const ZEBRA: [number, number, number] = [245, 247, 250];

  const setStroke = () => doc.setDrawColor(...BORDER);
  setStroke();
  doc.setLineWidth(0.6);

  // ===== TOP HEADER BAR =====
  let y = M;
  doc.setFillColor(...HEAD_BG);
  doc.rect(M, y, cw, 28, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const leftHead = `MLS# ${shortMls(l.id)}   |   ${(l.status || "Active").toUpperCase()}   |   ${l.property_type || "Residential"}`;
  doc.text(leftHead, M + 8, y + 18);
  const priceTxt =
    l.list_price != null ? formatMoney(Number(l.list_price)) : "Price on request";
  doc.text(priceTxt, W - M - 8, y + 18, { align: "right" });
  doc.setTextColor(0);
  y += 28;

  // Address sub-bar
  doc.setFillColor(245, 245, 245);
  doc.rect(M, y, cw, 22, "F");
  setStroke();
  doc.rect(M, y, cw, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(l.address || NA, M + 8, y + 15);
  y += 22;

  // ===== HERO SPLIT: 40% image / 60% schools+directions =====
  const heroH = 180;
  const leftW = cw * 0.4;
  const rightW = cw - leftW;
  setStroke();
  doc.rect(M, y, leftW, heroH);
  doc.rect(M + leftW, y, rightW, heroH);

  // Left: image
  const firstUrl = l.image_urls?.[0];
  if (firstUrl) {
    const img = await loadImage(firstUrl);
    if (img) {
      const pad = 4;
      const boxW = leftW - pad * 2;
      const boxH = heroH - pad * 2;
      const ratio = Math.min(boxW / img.w, boxH / img.h);
      const dw = img.w * ratio;
      const dh = img.h * ratio;
      const dx = M + pad + (boxW - dw) / 2;
      const dy = y + pad + (boxH - dh) / 2;
      try {
        doc.addImage(img.data, img.fmt, dx, dy, dw, dh);
      } catch {
        /* ignore decode errors */
      }
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("No photo available", M + leftW / 2, y + heroH / 2, {
      align: "center",
    });
    doc.setTextColor(0);
  }

  // Right: key/value rows
  const rightX = M + leftW;
  const kvRows: Array<[string, string]> = [
    ["Grade School", NA],
    ["Middle School", NA],
    ["High School", NA],
    ["Directions", "Use GPS for Direction"],
    ["Listed By", v(l.client_name)],
    ["Closing Date", v(l.closing_date)],
  ];
  doc.setFontSize(9.5);
  const rowH = heroH / kvRows.length;
  kvRows.forEach(([k, val], i) => {
    const ry = y + i * rowH;
    if (i > 0) {
      doc.setDrawColor(220);
      doc.line(rightX + 4, ry, rightX + rightW - 4, ry);
      setStroke();
    }
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, rightX + 8, ry + rowH / 2 + 3);
    doc.setFont("helvetica", "normal");
    const valLines = doc.splitTextToSize(val, rightW - 110);
    doc.text(valLines, rightX + 100, ry + rowH / 2 + 3);
  });
  y += heroH;

  // ===== REMARKS BANNER =====
  const remarkPad = 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const remarksText = l.notes || NA;
  const remarksLines = doc.splitTextToSize(`Remarks: ${remarksText}`, cw - remarkPad * 2);
  const remarksH = Math.max(34, remarksLines.length * 12 + remarkPad * 2);
  doc.setFillColor(...BAND_BG);
  doc.rect(M, y, cw, remarksH, "F");
  setStroke();
  doc.rect(M, y, cw, remarksH);
  doc.setFont("helvetica", "bold");
  doc.text("REMARKS", M + remarkPad, y + 14);
  doc.setFont("helvetica", "normal");
  doc.text(remarksLines, M + remarkPad, y + 28);
  y += remarksH + 6;

  // ===== SECTION HEADER helper =====
  const sectionHeader = (label: string, startY: number) => {
    doc.setFillColor(...HEAD_BG);
    doc.rect(M, startY, cw, 16, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(label, M + 8, startY + 11);
    doc.setTextColor(0);
    return startY + 16;
  };

  const kvCell = (
    label: string,
    val: string,
    cx: number,
    cy: number,
    cwCell: number,
    chCell: number,
  ) => {
    setStroke();
    doc.rect(cx, cy, cwCell, chCell);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`${label}:`, cx + 6, cy + 11);
    doc.setFont("helvetica", "normal");
    const labelW = doc.getTextWidth(`${label}: `);
    const lines = doc.splitTextToSize(val, cwCell - labelW - 10);
    doc.text(lines, cx + 6 + labelW, cy + 11);
  };

  // ===== PROPERTY INFORMATION (3-column grid) =====
  y = sectionHeader("PROPERTY INFORMATION", y);
  const propRows: Array<[string, string]> = [
    ["Total Approx Acres", v(l.lot_size)],
    ["Lot Number", NA],
    ["Frontage", NA],
    ["Cultivation Acres", NA],
    ["Disclosures", NA],
    ["Year Built", v(l.year_built)],
    ["Beds", v(l.beds)],
    ["Baths", v(l.baths)],
    ["Approx Sqft", l.sqft != null ? l.sqft.toLocaleString() : NA],
  ];
  const cols = 3;
  const cellH = 22;
  const cellW = cw / cols;
  propRows.forEach((row, i) => {
    const col = i % cols;
    const r = Math.floor(i / cols);
    kvCell(row[0], row[1], M + col * cellW, y + r * cellH, cellW, cellH);
  });
  y += Math.ceil(propRows.length / cols) * cellH + 6;

  // ===== SPLIT: FEATURES (left) | OTHER + TAX (right) =====
  const splitH = 150;
  const leftPanelW = cw * 0.55;
  const rightPanelW = cw - leftPanelW;

  // Left: Features
  let ly = sectionHeader("FEATURES", y);
  setStroke();
  doc.rect(M, ly, leftPanelW, splitH - 16);
  const features: Array<[string, string]> = [
    ["Area Amenities", NA],
    ["Beach", NA],
    ["Cable", NA],
    ["Gas", NA],
    ["Sewer", NA],
    ["Waterfront", "No"],
    ["Parking Spaces", v(l.parking_spaces)],
    ["Property Type", v(l.property_type)],
  ];
  doc.setFontSize(9);
  features.forEach((f, i) => {
    const fy = ly + 14 + i * 14;
    doc.setFont("helvetica", "bold");
    doc.text(`${f[0]}:`, M + 8, fy);
    doc.setFont("helvetica", "normal");
    doc.text(f[1], M + 130, fy);
  });

  // Right: Other Property Info + Tax (stacked)
  const rx = M + leftPanelW;
  let ry = y;
  doc.setFillColor(...HEAD_BG);
  doc.rect(rx, ry, rightPanelW, 16, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("OTHER PROPERTY INFO", rx + 8, ry + 11);
  doc.setTextColor(0);
  ry += 16;
  const otherH = (splitH - 32) / 2;
  setStroke();
  doc.rect(rx, ry, rightPanelW, otherH);
  const otherRows: Array<[string, string]> = [
    ["Status", v(l.status)],
    ["Listed By", v(l.client_name)],
    ["Closing Date", v(l.closing_date)],
  ];
  doc.setFontSize(9);
  otherRows.forEach((r, i) => {
    const fy = ry + 13 + i * 13;
    doc.setFont("helvetica", "bold");
    doc.text(`${r[0]}:`, rx + 8, fy);
    doc.setFont("helvetica", "normal");
    doc.text(r[1], rx + 110, fy);
  });
  ry += otherH;

  doc.setFillColor(...HEAD_BG);
  doc.rect(rx, ry, rightPanelW, 16, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INFORMATION", rx + 8, ry + 11);
  doc.setTextColor(0);
  ry += 16;
  setStroke();
  doc.rect(rx, ry, rightPanelW, otherH);
  const taxRows: Array<[string, string]> = [
    ["Annual Tax", NA],
    ["Tax Year", NA],
    ["PID", NA],
  ];
  taxRows.forEach((r, i) => {
    const fy = ry + 13 + i * 13;
    doc.setFont("helvetica", "bold");
    doc.text(`${r[0]}:`, rx + 8, fy);
    doc.setFont("helvetica", "normal");
    doc.text(r[1], rx + 110, fy);
  });

  y += splitH + 8;

  // ===== MARKET HISTORY =====
  if (y > H - 120) {
    doc.addPage();
    y = M;
  }
  const marketPage = doc.getNumberOfPages();
  y = sectionHeader(`MARKET HISTORY FOR ${(l.address || NA).toUpperCase()}`, y);
  const histCols = [
    { h: "MLS #", w: cw * 0.14 },
    { h: "Date", w: cw * 0.16 },
    { h: "Status/Activity", w: cw * 0.32 },
    { h: "DOM", w: cw * 0.08 },
    { h: "DTO", w: cw * 0.08 },
    { h: "Price", w: cw * 0.22 },
  ];
  // header row
  doc.setFillColor(220, 225, 235);
  doc.rect(M, y, cw, 18, "F");
  setStroke();
  doc.rect(M, y, cw, 18);
  let cx = M;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  histCols.forEach((c) => {
    doc.text(c.h, cx + 6, y + 12);
    cx += c.w;
  });
  y += 18;
  const today = new Date().toISOString().slice(0, 10);
  const histRows = [
    [
      shortMls(l.id),
      today,
      `Listed - ${l.status || "Active"}`,
      "0",
      "0",
      l.list_price != null ? formatMoney(Number(l.list_price)) : NA,
    ],
  ];
  if (l.closing_date) {
    histRows.push([
      shortMls(l.id),
      l.closing_date,
      "Sold",
      "—",
      "—",
      l.list_price != null ? formatMoney(Number(l.list_price)) : NA,
    ]);
  }
  doc.setFont("helvetica", "normal");
  histRows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...ZEBRA);
      doc.rect(M, y, cw, 16, "F");
    }
    setStroke();
    doc.rect(M, y, cw, 16);
    let xx = M;
    row.forEach((cell, ci) => {
      doc.text(String(cell), xx + 6, y + 11);
      xx += histCols[ci].w;
    });
    y += 16;
  });

  // ===== GALLERY PAGE (2x2) =====
  const urls = (l.image_urls ?? []).filter(Boolean);
  let galleryPage: number | null = null;
  if (urls.length > 1) {
    doc.addPage();
    galleryPage = doc.getNumberOfPages();
    let gy = M;
    doc.setFillColor(...HEAD_BG);
    doc.rect(M, gy, cw, 22, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`PHOTO GALLERY — ${l.address || NA}`, M + 8, gy + 15);
    doc.setTextColor(0);
    gy += 30;

    const gap = 10;
    const cellGW = (cw - gap) / 2;
    const cellGH = (H - gy - M - gap) / 2;
    for (let i = 0; i < Math.min(4, urls.length); i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = M + col * (cellGW + gap);
      const cy = gy + row * (cellGH + gap);
      setStroke();
      doc.setLineWidth(1);
      doc.rect(cx, cy, cellGW, cellGH);
      doc.setLineWidth(0.6);
      const img = await loadImage(urls[i]);
      if (img) {
        const pad = 4;
        const boxW = cellGW - pad * 2;
        const boxH = cellGH - pad * 2 - 14;
        const ratio = Math.min(boxW / img.w, boxH / img.h);
        const dw = img.w * ratio;
        const dh = img.h * ratio;
        const dx = cx + pad + (boxW - dw) / 2;
        const dy = cy + pad + 14 + (boxH - dh) / 2;
        try {
          doc.addImage(img.data, img.fmt, dx, dy, dw, dh);
        } catch {
          /* ignore */
        }
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(`Photo ${i + 1}`, cx + 6, cy + 11);
    }
  }

  (doc as unknown as { __pageMap: PdfPageMap }).__pageMap = {
    details: 1,
    market: marketPage,
    gallery: galleryPage,
    total: doc.getNumberOfPages(),
  };

  return doc;
}

export interface PdfPageMap {
  details: number;
  market: number;
  gallery: number | null;
  total: number;
}

export interface ListingPdfPreview {
  url: string;
  pages: PdfPageMap;
}


export async function downloadListingPdf(l: ShareableListing) {
  const doc = await buildListingPdfDoc(l);
  const safe = (l.address || "listing")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .slice(0, 60);
  doc.save(`${safe || "listing"}.pdf`);
}

export async function listingPdfDataUrl(l: ShareableListing): Promise<string> {
  const doc = await buildListingPdfDoc(l);
  return doc.output("datauristring");
}
