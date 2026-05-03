import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, AlertTriangle } from "lucide-react";
import { useBooks, formatMoney } from "@/hooks/use-books";
import { profitAndLoss } from "@/lib/books-data";

export const Route = createFileRoute("/books/taxes")({
  component: TaxesPage,
});

const FED_BRACKETS_2025_SINGLE = [
  { upTo: 11600,  rate: 0.10 },
  { upTo: 47150,  rate: 0.12 },
  { upTo: 100525, rate: 0.22 },
  { upTo: 191950, rate: 0.24 },
  { upTo: 243725, rate: 0.32 },
  { upTo: 609350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

function calcFederalTax(taxable: number) {
  let tax = 0; let prev = 0;
  for (const b of FED_BRACKETS_2025_SINGLE) {
    if (taxable <= prev) break;
    const slice = Math.min(taxable, b.upTo) - prev;
    tax += slice * b.rate;
    prev = b.upTo;
  }
  return tax;
}

function TaxesPage() {
  const { accounts, transactions } = useBooks();
  const pl = useMemo(() => profitAndLoss(accounts, transactions), [accounts, transactions]);

  const [statePct, setStatePct] = useState(5);
  const [otherIncome, setOtherIncome] = useState(0);
  const [w2Withheld, setW2Withheld] = useState(0);

  const seSubject = Math.max(pl.netIncome, 0) * 0.9235;
  const ssCap = 168600; // 2024-ish; close enough for estimator
  const ss = Math.min(seSubject, ssCap) * 0.124;
  const medicare = seSubject * 0.029;
  const seTax = ss + medicare;
  const seDeduction = seTax / 2;

  const agi = Math.max(pl.netIncome, 0) + otherIncome - seDeduction;
  // Standard deduction single 2025 ~ $15,000
  const taxableIncome = Math.max(agi - 15000, 0);
  const fedIncomeTax = calcFederalTax(taxableIncome);
  const stateTax = taxableIncome * (statePct / 100);

  const totalTax = seTax + fedIncomeTax + stateTax;
  const owed = Math.max(totalTax - w2Withheld, 0);
  const quarterly = owed / 4;
  const setAside = pl.totalIncome > 0 ? (totalTax / pl.totalIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calculator className="h-4 w-4" />
        Quarterly self-employment tax estimator. Figures are estimates — confirm with your CPA before sending payments.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card label="Net business income (YTD)" value={formatMoney(pl.netIncome)} accent="primary" />
        <Card label="Estimated total tax" value={formatMoney(totalTax)} accent="warning" />
        <Card label="Set aside %" value={`${setAside.toFixed(0)}%`} accent="success" sub="of gross revenue" />
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card p-6">
        <h3 className="font-display font-bold mb-4">Inputs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumField label="State income tax rate (%)" value={statePct} onChange={setStatePct} step={0.5} />
          <NumField label="Other income (W-2, spouse, etc.)" value={otherIncome} onChange={setOtherIncome} step={1000} />
          <NumField label="Already withheld (W-2)" value={w2Withheld} onChange={setW2Withheld} step={500} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card p-6">
        <h3 className="font-display font-bold mb-4">Breakdown</h3>
        <Row label="Self-employment tax (SS 12.4% + Medicare 2.9%)" value={seTax} />
        <Row label="½ SE tax deduction" value={-seDeduction} muted />
        <Row label="Federal income tax (after std. deduction)" value={fedIncomeTax} />
        <Row label={`State income tax (${statePct}%)`} value={stateTax} />
        <div className="border-t border-border mt-3 pt-3">
          <Row label="Total estimated tax" value={totalTax} bold />
          <Row label="Less W-2 withholding" value={-w2Withheld} muted />
          <Row label="Estimated balance owed" value={owed} bold accent />
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-2xl shadow-card p-6">
        <div className="text-xs uppercase tracking-wider opacity-80 mb-2">Send to IRS each quarter</div>
        <div className="text-4xl font-bold font-display tabular-nums">{formatMoney(quarterly)}</div>
        <div className="text-xs opacity-80 mt-2">
          Due dates: Apr 15, Jun 15, Sep 15, Jan 15. Use IRS Direct Pay → "Estimated Tax (1040-ES)".
        </div>
      </div>

      {pl.netIncome <= 0 && (
        <div className="flex items-start gap-2 text-xs bg-warning/10 text-secondary-foreground p-3 rounded-lg">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          You're running at a loss YTD — no estimated tax due on business income.
        </div>
      )}
    </div>
  );
}

function Card({ label, value, accent, sub }: { label: string; value: string; accent: "primary" | "warning" | "success"; sub?: string }) {
  const tones = { primary: "text-primary", warning: "text-secondary-foreground", success: "text-success" };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className={`text-2xl font-bold tabular-nums font-display ${tones[accent]}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function NumField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</span>
      <input type="number" value={value} step={step} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm tabular-nums" />
    </label>
  );
}

function Row({ label, value, muted, bold, accent }: { label: string; value: number; muted?: boolean; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className={`text-sm ${muted ? "text-muted-foreground" : ""} ${bold ? "font-bold font-display" : ""}`}>{label}</span>
      <span className={`tabular-nums text-sm ${bold ? "font-bold font-display text-base" : ""} ${accent ? "text-primary" : ""}`}>
        {formatMoney(value)}
      </span>
    </div>
  );
}
