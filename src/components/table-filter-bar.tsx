import { useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterSelectConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface TableFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  selects: Record<string, string>;
}

export const EMPTY_FILTERS: TableFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
  selects: {},
};

export function useTableFilters(
  initial?: Partial<TableFilters>,
): [TableFilters, (next: Partial<TableFilters>) => void, () => void] {
  const [filters, setFilters] = useState<TableFilters>({
    ...EMPTY_FILTERS,
    ...initial,
    selects: { ...(initial?.selects ?? {}) },
  });
  const update = (next: Partial<TableFilters>) =>
    setFilters((cur) => ({
      ...cur,
      ...next,
      selects: { ...cur.selects, ...(next.selects ?? {}) },
    }));
  const reset = () =>
    setFilters({ ...EMPTY_FILTERS, selects: {} });
  return [filters, update, reset];
}

export function activeFilterCount(f: TableFilters): number {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.dateFrom) n++;
  if (f.dateTo) n++;
  if (f.amountMin) n++;
  if (f.amountMax) n++;
  for (const v of Object.values(f.selects)) if (v && v !== "all") n++;
  return n;
}

export interface FilterRowAccessors<T> {
  searchText?: (row: T) => string;
  date?: (row: T) => string | null | undefined;
  amount?: (row: T) => number | null | undefined;
  selectValue?: (row: T, key: string) => string | null | undefined;
}

export function applyTableFilters<T>(
  rows: T[],
  f: TableFilters,
  acc: FilterRowAccessors<T>,
): T[] {
  const q = f.search.trim().toLowerCase();
  const min = f.amountMin === "" ? null : parseFloat(f.amountMin);
  const max = f.amountMax === "" ? null : parseFloat(f.amountMax);
  return rows.filter((row) => {
    if (q && acc.searchText) {
      const hay = acc.searchText(row).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (acc.date && (f.dateFrom || f.dateTo)) {
      const d = acc.date(row);
      if (!d) return false;
      if (f.dateFrom && d < f.dateFrom) return false;
      if (f.dateTo && d > f.dateTo) return false;
    }
    if (acc.amount && (min !== null || max !== null)) {
      const n = Number(acc.amount(row) ?? 0);
      if (min !== null && n < min) return false;
      if (max !== null && n > max) return false;
    }
    if (acc.selectValue) {
      for (const [key, val] of Object.entries(f.selects)) {
        if (!val || val === "all") continue;
        const got = acc.selectValue(row, key);
        if ((got ?? "") !== val) return false;
      }
    }
    return true;
  });
}

interface TableFilterBarProps {
  filters: TableFilters;
  onChange: (next: Partial<TableFilters>) => void;
  onReset: () => void;
  searchPlaceholder?: string;
  showDate?: boolean;
  showAmount?: boolean;
  selects?: FilterSelectConfig[];
  className?: string;
  trailing?: React.ReactNode;
}

export function TableFilterBar({
  filters,
  onChange,
  onReset,
  searchPlaceholder = "Search...",
  showDate = true,
  showAmount = false,
  selects = [],
  className = "",
  trailing,
}: TableFilterBarProps) {
  const count = useMemo(() => activeFilterCount(filters), [filters]);

  return (
    <div className={`flex flex-wrap items-center gap-2 mb-4 ${className}`}>
      <div className="relative flex-1 min-w-[200px]">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {count > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold px-1.5">
                {count}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-3">
          {showDate && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onChange({ dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onChange({ dateTo: e.target.value })}
                />
              </div>
            </div>
          )}

          {showAmount && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Min amount</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={filters.amountMin}
                  onChange={(e) => onChange({ amountMin: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Max amount</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="∞"
                  value={filters.amountMax}
                  onChange={(e) => onChange({ amountMax: e.target.value })}
                />
              </div>
            </div>
          )}

          {selects.map((s) => (
            <div key={s.key} className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</label>
              <Select
                value={filters.selects[s.key] ?? "all"}
                onValueChange={(v) => onChange({ selects: { [s.key]: v } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {s.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="flex justify-between pt-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
            <span className="text-xs text-muted-foreground self-center">
              {count} active
            </span>
          </div>
        </PopoverContent>
      </Popover>

      {trailing}
    </div>
  );
}
