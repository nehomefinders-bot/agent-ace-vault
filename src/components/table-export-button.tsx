import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  exportRowsCsv,
  exportRowsExcel,
  type ExportColumn,
} from "@/lib/table-export";

interface TableExportButtonProps<T> {
  filename: string;
  rows: T[];
  columns: ExportColumn<T>[];
  sheetName?: string;
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  disabled?: boolean;
}

export function TableExportButton<T>({
  filename,
  rows,
  columns,
  sheetName,
  label = "Export",
  size = "sm",
  variant = "outline",
  disabled,
}: TableExportButtonProps<T>) {
  const isEmpty = !rows || rows.length === 0;

  const run = async (kind: "csv" | "xlsx") => {
    if (isEmpty) {
      toast.error("Nothing to export");
      return;
    }
    try {
      if (kind === "csv") {
        exportRowsCsv(filename, rows, columns);
      } else {
        await exportRowsExcel(filename, rows, columns, sheetName);
      }
      toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled} className="gap-2">
          <Download className="h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("csv")}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("xlsx")}>Export as Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
