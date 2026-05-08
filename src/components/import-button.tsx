import { useRef, useState } from "react";
import { Upload, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ImportFieldType = "string" | "number" | "boolean" | "date";

export interface ImportColumn {
  key: string;            // db column name
  label: string;          // header in sample file
  type?: ImportFieldType; // default string
  required?: boolean;
  enumValues?: string[];  // accepted values (case-insensitive)
  sample?: string | number | boolean;
}

interface ImportButtonProps {
  table: string;          // supabase table name
  userId: string;
  columns: ImportColumn[];
  templateName: string;   // e.g. "clients-template"
  entityLabel: string;    // e.g. "clients"
  onImported?: () => void;
  transformRow?: (row: Record<string, any>) => Record<string, any> | null;
}

function normalizeHeader(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function coerce(value: any, type: ImportFieldType, enumValues?: string[]): any {
  if (value === undefined || value === null || value === "") return null;
  const s = String(value).trim();
  if (s === "") return null;
  if (enumValues && enumValues.length) {
    const found = enumValues.find((v) => v.toLowerCase() === s.toLowerCase());
    if (!found) throw new Error(`must be one of: ${enumValues.join(", ")}`);
    return found;
  }
  switch (type) {
    case "number": {
      const n = Number(s.replace(/[$,\s]/g, ""));
      if (!Number.isFinite(n)) throw new Error("not a number");
      return n;
    }
    case "boolean": {
      const t = s.toLowerCase();
      if (["true", "yes", "y", "1"].includes(t)) return true;
      if (["false", "no", "n", "0"].includes(t)) return false;
      throw new Error("not a boolean (yes/no)");
    }
    case "date": {
      const d = new Date(s);
      if (isNaN(d.getTime())) throw new Error("invalid date");
      return d.toISOString().slice(0, 10);
    }
    default:
      return s;
  }
}

export function ImportButton(props: ImportButtonProps) {
  const { table, userId, columns, templateName, entityLabel, onImported, transformRow } = props;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function downloadTemplate(format: "csv" | "xlsx") {
    const headers = columns.map((c) => c.label);
    const sampleRow = columns.map((c) => {
      if (c.sample !== undefined) return c.sample;
      if (c.enumValues?.length) return c.enumValues[0];
      switch (c.type) {
        case "number": return 0;
        case "boolean": return "yes";
        case "date": return new Date().toISOString().slice(0, 10);
        default: return "";
      }
    });
    if (format === "csv") {
      const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [headers.map(esc).join(","), sampleRow.map(esc).join(",")].join("\r\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      triggerDownload(blob, `${templateName}.csv`);
    } else {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
      ws["!cols"] = headers.map(() => ({ wch: 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, `${templateName}.xlsx`);
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function parseFile(file: File): Promise<Record<string, any>[]> {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
  }

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const raw = await parseFile(file);
      if (!raw.length) { toast.error("File is empty"); return; }

      // build header map
      const headerMap: Record<string, ImportColumn> = {};
      for (const col of columns) headerMap[normalizeHeader(col.label)] = col;

      const rowsToInsert: any[] = [];
      const errors: string[] = [];

      raw.forEach((row, idx) => {
        const out: Record<string, any> = {};
        try {
          for (const [k, v] of Object.entries(row)) {
            const col = headerMap[normalizeHeader(k)];
            if (!col) continue;
            try {
              out[col.key] = coerce(v, col.type ?? "string", col.enumValues);
            } catch (e: any) {
              throw new Error(`"${col.label}" ${e.message}`);
            }
          }
          for (const col of columns) {
            if (col.required && (out[col.key] === undefined || out[col.key] === null || out[col.key] === "")) {
              throw new Error(`"${col.label}" is required`);
            }
          }
          const finalRow = transformRow ? transformRow(out) : out;
          if (!finalRow) throw new Error("row skipped");
          rowsToInsert.push({ ...finalRow, user_id: userId });
        } catch (e: any) {
          errors.push(`Row ${idx + 2}: ${e.message}`);
        }
      });

      if (!rowsToInsert.length) {
        toast.error(`No valid rows. ${errors.slice(0, 3).join(" • ")}`);
        return;
      }

      const { error } = await supabase.from(table as any).insert(rowsToInsert);
      if (error) { toast.error(error.message); return; }

      if (errors.length) {
        toast.success(`Imported ${rowsToInsert.length} ${entityLabel}. Skipped ${errors.length} row(s).`);
        console.warn("Import skipped rows:", errors);
      } else {
        toast.success(`Imported ${rowsToInsert.length} ${entityLabel}.`);
      }
      setOpen(false);
      onImported?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="inline-flex items-center gap-2">
        <Upload className="h-4 w-4" /> Import
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import {entityLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Download a sample file, fill in your data, then upload it back. Supported formats: CSV and Excel (.xlsx).
            </p>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="font-medium flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Sample template</div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => downloadTemplate("csv")}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={() => downloadTemplate("xlsx")}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Excel
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={busy}>
                {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importing…</> : <><Upload className="h-4 w-4 mr-1.5" /> Choose file</>}
              </Button>
              <div className="text-xs text-muted-foreground mt-2">CSV or .xlsx up to a few MB</div>
            </div>
            <div className="text-xs text-muted-foreground">
              Required columns: {columns.filter((c) => c.required).map((c) => c.label).join(", ") || "none"}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
