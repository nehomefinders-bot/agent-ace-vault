import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Download, Search } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { formatMoney } from "@/lib/mock-data";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/commissions")({
  component: Commissions,
  head: () => ({ meta: [{ title: "Commissions — Agent Business Tracker" }] }),
});

interface CommissionRow {
  id: string;
  property: string;
  closingDate: string;
  salePrice: number;
  gci: number;
  brokerSplit: number; // percent kept by agent
  deductions: number;
  status: "Paid" | "Pending";
}

const rows: CommissionRow[] = [
  { id: "C-2041", property: "Oakwood Residence, 412 Oakwood Dr", closingDate: "2025-12-15", salePrice: 750000, gci: 22500, brokerSplit: 70, deductions: 850, status: "Pending" },
  { id: "C-2040", property: "Downtown Loft 4B, 88 Market St", closingDate: "2025-11-30", salePrice: 1200000, gci: 36000, brokerSplit: 75, deductions: 1200, status: "Pending" },
  { id: "C-2039", property: "Elm Street Townhouse, 219 Elm St", closingDate: "2025-10-22", salePrice: 580000, gci: 17400, brokerSplit: 70, deductions: 600, status: "Paid" },
  { id: "C-2038", property: "Harbor View Condo, 7 Harbor Ln #14", closingDate: "2025-12-05", salePrice: 920000, gci: 27600, brokerSplit: 72, deductions: 950, status: "Pending" },
  { id: "C-2037", property: "Sunset Ridge Villa, 1140 Ridge Way", closingDate: "2025-12-01", salePrice: 1850000, gci: 55500, brokerSplit: 80, deductions: 2100, status: "Pending" },
  { id: "C-2036", property: "Maple Grove House, 56 Maple Grove", closingDate: "2025-09-18", salePrice: 465000, gci: 13950, brokerSplit: 65, deductions: 420, status: "Paid" },
  { id: "C-2035", property: "Cedar Park Bungalow, 304 Cedar Park", closingDate: "2025-08-30", salePrice: 612000, gci: 18360, brokerSplit: 70, deductions: 540, status: "Paid" },
];

function netCommission(r: CommissionRow): number {
  return r.gci * (r.brokerSplit / 100) - r.deductions;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function StatusBadge({ status }: { status: "Paid" | "Pending" }) {
  const cls =
    status === "Paid"
      ? "bg-success/15 text-success ring-1 ring-inset ring-success/30"
      : "bg-warning/15 text-warning ring-1 ring-inset ring-warning/30";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "Paid" ? "bg-success" : "bg-warning"}`} />
      {status}
    </span>
  );
}

function Commissions() {
  const totalGci = rows.reduce((s, r) => s + r.gci, 0);
  const totalNet = rows.reduce((s, r) => s + netCommission(r), 0);
  const paidNet = rows.filter(r => r.status === "Paid").reduce((s, r) => s + netCommission(r), 0);
  const pendingNet = rows.filter(r => r.status === "Pending").reduce((s, r) => s + netCommission(r), 0);

  return (
    <PageShell
      title="Commissions"
      subtitle="Track gross commission income, broker splits, and net payouts per closing."
      actions={
        <>
          <button className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted/50">
            <Download className="h-4 w-4" /> Export
          </button>
          <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> New Commission
          </button>
        </>
      }
    >
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total GCI</div>
          <div className="text-2xl font-bold tabular-nums font-display">{formatMoney(totalGci)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Net Commission</div>
          <div className="text-2xl font-bold tabular-nums font-display">{formatMoney(totalNet)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Paid</div>
          <div className="text-2xl font-bold tabular-nums font-display text-success">{formatMoney(paidNet)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Pending</div>
          <div className="text-2xl font-bold tabular-nums font-display text-warning">{formatMoney(pendingNet)}</div>
        </div>
      </div>

      {/* Commission Tracker Table */}
      <section className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Commission Tracker</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{rows.length} closings · sorted by most recent</p>
          </div>
          <div className="relative hidden md:block">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search property…"
              className="pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-medium py-3 px-6">Property Address</th>
                <th className="text-left font-medium py-3">Closing Date</th>
                <th className="text-right font-medium py-3">Sale Price</th>
                <th className="text-right font-medium py-3">GCI</th>
                <th className="text-right font-medium py-3">Broker Split</th>
                <th className="text-right font-medium py-3">Deductions</th>
                <th className="text-right font-medium py-3">Net Commission</th>
                <th className="text-left font-medium py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const net = netCommission(r);
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-medium">{r.property}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{r.id}</div>
                    </td>
                    <td className="py-4 text-muted-foreground whitespace-nowrap">{formatDate(r.closingDate)}</td>
                    <td className="py-4 text-right tabular-nums">{formatMoney(r.salePrice)}</td>
                    <td className="py-4 text-right tabular-nums font-medium">{formatMoney(r.gci)}</td>
                    <td className="py-4 text-right tabular-nums text-muted-foreground">{r.brokerSplit}%</td>
                    <td className="py-4 text-right tabular-nums text-destructive">−{formatMoney(r.deductions)}</td>
                    <td className="py-4 text-right tabular-nums font-semibold">{formatMoney(net)}</td>
                    <td className="py-4 px-6"><StatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30 text-sm">
                <td className="py-3 px-6 font-medium" colSpan={3}>Totals</td>
                <td className="py-3 text-right tabular-nums font-semibold">{formatMoney(totalGci)}</td>
                <td />
                <td className="py-3 text-right tabular-nums text-destructive">−{formatMoney(rows.reduce((s, r) => s + r.deductions, 0))}</td>
                <td className="py-3 text-right tabular-nums font-bold">{formatMoney(totalNet)}</td>
                <td className="py-3 px-6" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
