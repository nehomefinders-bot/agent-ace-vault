export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => unknown;
}

function toCell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsv(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildBody<T>(rows: T[], columns: ExportColumn<T>[]) {
  return rows.map((row) => columns.map((c) => toCell(c.accessor(row))));
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportRowsCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const headers = columns.map((c) => escapeCsv(c.header)).join(",");
  const body = buildBody(rows, columns)
    .map((line) => line.map((v) => escapeCsv(v)).join(","))
    .join("\r\n");
  const blob = new Blob(["\ufeff" + headers + "\r\n" + body], {
    type: "text/csv;charset=utf-8",
  });
  downloadBlob(blob, `${filename}-${dateStamp()}.csv`);
}

export async function exportRowsExcel<T>(
  filename: string,
  rows: T[],
  columns: ExportColumn<T>[],
  sheetName = "Sheet1",
) {
  const XLSX = await import("xlsx");
  const aoa = [columns.map((c) => c.header), ...buildBody(rows, columns)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.header.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Sheet1");
  XLSX.writeFile(wb, `${filename}-${dateStamp()}.xlsx`);
}
