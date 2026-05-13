export interface ExportTableBundle {
  name: string;
  rows: Record<string, unknown>[];
}

export interface AccountExportBundle {
  exportedAt: string;
  user: {
    id: string;
    email: string | null;
  };
  profile: Record<string, unknown> | null;
  tables: ExportTableBundle[];
}

function escapeCsvValue(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toExportCell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalizeRow(row: Record<string, unknown>) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = toExportCell(value);
  }
  return normalized;
}

function csvRows(bundle: AccountExportBundle) {
  const rows: Array<Record<string, string>> = [
    {
      dataset: "__export_meta__",
      record_id: "meta",
      created_at: bundle.exportedAt,
      updated_at: "",
      payload_json: JSON.stringify({
        exported_at: bundle.exportedAt,
        user: bundle.user,
        profile: bundle.profile,
      }),
    },
  ];

  for (const table of bundle.tables) {
    for (const row of table.rows) {
      rows.push({
        dataset: table.name,
        record_id: toExportCell(row.id ?? row.record_id ?? row.key ?? ""),
        created_at: toExportCell(row.created_at ?? ""),
        updated_at: toExportCell(row.updated_at ?? ""),
        payload_json: JSON.stringify(row),
      });
    }
  }

  return rows;
}

function buildCsv(bundle: AccountExportBundle) {
  const rows = csvRows(bundle);
  const headers = ["dataset", "record_id", "created_at", "updated_at", "payload_json"];
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? "")).join(",")),
  ];
  return new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
}

function buildSummaryRows(bundle: AccountExportBundle) {
  return [
    ["Exported at", bundle.exportedAt],
    ["User id", bundle.user.id],
    ["Email", bundle.user.email ?? ""],
    ["Profile fields", bundle.profile ? Object.keys(bundle.profile).length : 0],
    ...bundle.tables.map((table) => [table.name, table.rows.length]),
  ];
}

function sanitizeSheetName(name: string) {
  const cleaned = name.replace(/[\\/?*\[\]:]/g, " ").trim();
  return cleaned.slice(0, 31) || "Sheet";
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadAccountExportCsv(bundle: AccountExportBundle) {
  const blob = buildCsv(bundle);
  downloadBlob(blob, `agent-tracker-export-${bundle.exportedAt.slice(0, 10)}.csv`);
}

export async function downloadAccountExportExcel(bundle: AccountExportBundle) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Field", "Value"],
    ...buildSummaryRows(bundle),
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  if (bundle.profile) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([normalizeRow(bundle.profile)]),
      "Profile",
    );
  }

  for (const table of bundle.tables) {
    const sheetName = sanitizeSheetName(table.name);
    const data = table.rows.map((row) => normalizeRow(row));
    const worksheet = data.length > 0
      ? XLSX.utils.json_to_sheet(data)
      : XLSX.utils.aoa_to_sheet([["No records"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  XLSX.writeFile(workbook, `agent-tracker-export-${bundle.exportedAt.slice(0, 10)}.xlsx`);
}
