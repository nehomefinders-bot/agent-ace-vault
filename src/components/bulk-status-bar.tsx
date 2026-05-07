import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface BulkStatusOption {
  value: string;
  label: string;
}

export function BulkStatusBar({
  count,
  options,
  onApply,
  onClear,
  itemLabel = "items",
}: {
  count: number;
  options: BulkStatusOption[];
  onApply: (status: string) => Promise<void> | void;
  onClear: () => void;
  itemLabel?: string;
}) {
  const [value, setValue] = useState<string>("");
  const [busy, setBusy] = useState(false);
  if (count === 0) return null;

  const apply = async () => {
    if (!value) return;
    setBusy(true);
    try { await onApply(value); setValue(""); } finally { setBusy(false); }
  };

  return (
    <div className="sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 shadow-sm">
      <span className="text-sm font-medium pl-1">
        {count} {itemLabel} selected
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Set status to…" /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={apply} disabled={!value || busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          Apply
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
