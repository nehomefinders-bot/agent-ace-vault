import { formatMoneyCents } from "@/lib/mock-data";

export interface CommissionExportRow {
  property: string;
  agentName: string;
  closingDate: string;
  salePrice: number;
  gci: number;
  brokerSplit: number;
  deductions: number;
  netCommission: number;
  status: string;
}

function buildBaseName() {
  return `commissions-export-${new Date().toISOString().slice(0, 10)}`;
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildExportCells(rows: CommissionExportRow[]) {
  return rows.map((row) => ([
    row.property,
    row.agentName || "-",
    row.closingDate || "-",
    formatMoneyCents(row.salePrice),
    formatMoneyCents(row.gci),
    `${row.brokerSplit}%`,
    formatMoneyCents(row.deductions),
    formatMoneyCents(row.netCommission),
    row.status,
  ]));
}

function buildTotalsRow(rows: CommissionExportRow[]) {
  return [
    "Totals",
    "",
    "",
    formatMoneyCents(rows.reduce((sum, row) => sum + row.salePrice, 0)),
    formatMoneyCents(rows.reduce((sum, row) => sum + row.gci, 0)),
    "",
    formatMoneyCents(rows.reduce((sum, row) => sum + row.deductions, 0)),
    formatMoneyCents(rows.reduce((sum, row) => sum + row.netCommission, 0)),
    "",
  ];
}

export async function exportCommissionsCsv(rows: CommissionExportRow[]) {
  const headers = [
    "Property",
    "Agent Name",
    "Closing Date",
    "Sale Price",
    "GCI",
    "Broker Split",
    "Deductions",
    "Net Commission",
    "Status",
  ];
  const csvLines = [
    headers.map(escapeCsvValue).join(","),
    ...buildExportCells(rows).map((cells) => cells.map((cell) => escapeCsvValue(String(cell))).join(",")),
    buildTotalsRow(rows).map((cell) => escapeCsvValue(String(cell))).join(","),
  ];
  const blob = new Blob(["\ufeff" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${buildBaseName()}.csv`);
}

export async function exportCommissionsExcel(rows: CommissionExportRow[]) {
  const XLSX = await import("xlsx");
  const header = [
    "Property",
    "Agent Name",
    "Closing Date",
    "Sale Price",
    "GCI",
    "Broker Split",
    "Deductions",
    "Net Commission",
    "Status",
  ];
  const worksheet = XLSX.utils.aoa_to_sheet([
    header,
    ...buildExportCells(rows),
    buildTotalsRow(rows),
  ]);
  worksheet["!cols"] = [
    { wch: 34 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Commissions");
  XLSX.writeFile(workbook, `${buildBaseName()}.xlsx`);
}

export async function exportCommissionsPdf(rows: CommissionExportRow[]) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default ?? (autoTableModule as { autoTable?: typeof autoTableModule.default }).autoTable;
  if (!autoTable) throw new Error("PDF export helper failed to load.");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text("Commissions Export", 40, 36);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleString()}`, 40, 52);

  autoTable(doc, {
    startY: 68,
    head: [[
      "Property",
      "Agent",
      "Closing Date",
      "Sale Price",
      "GCI",
      "Split",
      "Deductions",
      "Net Commission",
      "Status",
    ]],
    body: buildExportCells(rows),
    foot: [buildTotalsRow(rows)],
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [29, 53, 87] },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 90 },
      2: { cellWidth: 76 },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { cellWidth: 56 },
    },
  });

  doc.save(`${buildBaseName()}.pdf`);
}
