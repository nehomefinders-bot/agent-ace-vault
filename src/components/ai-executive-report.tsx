import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Download, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/mock-data";
import { toast } from "sonner";
import { generateExecutiveReport } from "@/lib/ai-report.functions";

export interface AIReportCommissionRow {
  property: string;
  agentName: string | null;
  closingDate: string;
  salePrice: number;
  gci: number;
  brokerSplit: number;
  deductions: number;
  netCommission: number;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: AIReportCommissionRow[];
  totals: { totalGci: number; totalNet: number; paidNet: number; pendingNet: number };
}

const SYSTEM_INSTRUCTION =
  "You are an elite enterprise CFO and real estate asset analyst. Audit this raw business ledger data. Highlight primary expense drivers, evaluate financial health velocity, and provide three strict operational improvements to maximize net commission margins.";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export function AIExecutiveReportModal({ open, onOpenChange, rows, totals }: Props) {
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [expenseTotal, setExpenseTotal] = useState<number>(0);
  const [topExpenseCategory, setTopExpenseCategory] = useState<string>("—");
  const [dealStatusBreakdown, setDealStatusBreakdown] = useState<Record<string, number>>({});
  const printRef = useRef<HTMLDivElement | null>(null);

  const healthScore = useMemo(() => {
    if (totals.totalGci <= 0) return 0;
    const netMargin = totals.totalNet / totals.totalGci;
    const paidRatio = totals.totalNet > 0 ? totals.paidNet / totals.totalNet : 0;
    const score = Math.round((netMargin * 0.6 + paidRatio * 0.4) * 100);
    return Math.max(0, Math.min(100, score));
  }, [totals]);

  const momentum = useMemo(() => {
    if (totals.totalNet <= 0) return "—";
    const ratio = totals.paidNet / totals.totalNet;
    if (ratio >= 0.75) return "Strong";
    if (ratio >= 0.45) return "Steady";
    return "Building";
  }, [totals]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setNarrative("");
    setError(null);

    const run = async () => {
      // Pull supporting data (expenses + deal statuses) for the payload
      const [{ data: expenses }, { data: deals }] = await Promise.all([
        supabase.from("expenses").select("category,amount"),
        supabase.from("deals").select("status"),
      ]);

      const expTotals = (expenses ?? []).reduce<Record<string, number>>((acc, e: any) => {
        const cat = e.category || "Uncategorized";
        acc[cat] = (acc[cat] ?? 0) + Number(e.amount || 0);
        return acc;
      }, {});
      const expSum = Object.values(expTotals).reduce((s, v) => s + v, 0);
      const topCat = Object.entries(expTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

      const statusBreak = (deals ?? []).reduce<Record<string, number>>((acc, d: any) => {
        const s = d.status || "unknown";
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {});

      if (cancelled) return;
      setExpenseTotal(expSum);
      setTopExpenseCategory(topCat);
      setDealStatusBreakdown(statusBreak);

      if (!GEMINI_KEY) {
        setError("Missing VITE_GEMINI_API_KEY. Add it to your local .env to enable AI analysis.");
        return;
      }

      const payload = {
        commissions: rows.map((r) => ({
          property: r.property,
          agent: r.agentName,
          closingDate: r.closingDate,
          salePrice: r.salePrice,
          gci: r.gci,
          brokerSplit: r.brokerSplit,
          deductions: r.deductions,
          net: r.netCommission,
          status: r.status,
        })),
        totals,
        dealStatuses: statusBreak,
        expenseTotalsByCategory: expTotals,
        expenseGrandTotal: expSum,
      };

      setLoading(true);
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text:
                        "Analyze the following ledger data and produce a markdown executive report with sections: Executive Summary, Primary Expense Drivers, Financial Health Velocity, and Three Operational Improvements.\n\n```json\n" +
                        JSON.stringify(payload, null, 2) +
                        "\n```",
                    },
                  ],
                },
              ],
            }),
          },
        );
        if (!resp.ok) {
          const t = await resp.text();
          throw new Error(`Gemini ${resp.status}: ${t.slice(0, 200)}`);
        }
        const data = await resp.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ?? "";
        if (cancelled) return;
        setNarrative(text || "No analysis returned.");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to fetch analysis");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, rows, totals]);

  const downloadPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      let y = margin;
      doc.setFontSize(18);
      doc.text("AI Executive Report", margin, y);
      y += 24;
      doc.setFontSize(10);
      doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
      y += 20;

      doc.setFontSize(12);
      doc.text(`Financial Health Score: ${healthScore}/100`, margin, y); y += 16;
      doc.text(`Primary Expense Driver: ${topExpenseCategory} (${formatMoney(expenseTotal)} total)`, margin, y); y += 16;
      doc.text(`Projected Payout Momentum: ${momentum}`, margin, y); y += 16;
      doc.text(`Total GCI: ${formatMoney(totals.totalGci)}  •  Net: ${formatMoney(totals.totalNet)}  •  Paid: ${formatMoney(totals.paidNet)}  •  Pending: ${formatMoney(totals.pendingNet)}`, margin, y);
      y += 24;

      doc.setFontSize(13);
      doc.text("Executive Narrative", margin, y); y += 18;
      doc.setFontSize(10);
      const wrapped = doc.splitTextToSize(narrative.replace(/[#*_`>]/g, ""), 515);
      for (const line of wrapped) {
        if (y > 800) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 14;
      }

      doc.save(`executive-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[min(1200px,95vw)] max-h-[90vh] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg">AI Executive Report</DialogTitle>
          </div>
        </div>

        <div ref={printRef} className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-0 max-h-[calc(90vh-120px)] overflow-hidden">
          {/* Left: metric cards */}
          <div className="border-r border-border bg-muted/30 p-5 space-y-4 overflow-y-auto">
            <MetricCard
              icon={Activity}
              label="Financial Health Score"
              value={`${healthScore}`}
              suffix="/100"
              tone={healthScore >= 70 ? "good" : healthScore >= 40 ? "warn" : "bad"}
              hint="Net margin × paid ratio"
            />
            <MetricCard
              icon={AlertTriangle}
              label="Primary Expense Driver"
              value={topExpenseCategory}
              hint={expenseTotal > 0 ? `${formatMoney(expenseTotal)} total expenses` : "No expenses logged"}
            />
            <MetricCard
              icon={TrendingUp}
              label="Projected Payout Momentum"
              value={momentum}
              hint={`${formatMoney(totals.paidNet)} paid / ${formatMoney(totals.totalNet)} net`}
            />

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Deal pipeline</div>
              <div className="space-y-1.5 text-sm">
                {Object.entries(dealStatusBreakdown).length === 0 ? (
                  <div className="text-muted-foreground text-xs">No deals found.</div>
                ) : (
                  Object.entries(dealStatusBreakdown).map(([s, n]) => (
                    <div key={s} className="flex justify-between">
                      <span className="capitalize">{s}</span>
                      <span className="tabular-nums font-medium">{n}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: narrative */}
          <div className="overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating executive analysis…
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            )}
            {!loading && !error && narrative && (
              <article className="prose prose-sm max-w-none font-display dark:prose-invert">
                <MarkdownLite text={narrative} />
              </article>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={downloadPdf} disabled={loading || !narrative} className="gap-2">
            <Download className="h-4 w-4" />
            Download Executive PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good" ? "text-success" : tone === "warn" ? "text-amber-500" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className={`text-3xl font-bold font-display tabular-nums ${toneClass}`}>
        {value}
        {suffix && <span className="text-base text-muted-foreground ml-1">{suffix}</span>}
      </div>
      {hint && <div className="text-xs text-muted-foreground mt-2">{hint}</div>}
    </div>
  );
}

// Lightweight markdown renderer (headings, bold, lists, paragraphs) so we don't pull a new dep.
function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (/^#{1,6}\s/.test(trimmed)) {
          const level = trimmed.match(/^(#{1,6})/)?.[1].length ?? 2;
          const content = trimmed.replace(/^#{1,6}\s/, "");
          const Tag = (`h${Math.min(level, 4)}`) as "h1" | "h2" | "h3" | "h4";
          return <Tag key={i} className="font-display">{inline(content)}</Tag>;
        }
        if (/^[-*]\s/m.test(trimmed)) {
          const items = trimmed.split(/\n/).filter((l) => /^[-*]\s/.test(l));
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {items.map((it, j) => (
                <li key={j}>{inline(it.replace(/^[-*]\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (/^\d+\.\s/m.test(trimmed)) {
          const items = trimmed.split(/\n/).filter((l) => /^\d+\.\s/.test(l));
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1">
              {items.map((it, j) => (
                <li key={j}>{inline(it.replace(/^\d+\.\s/, ""))}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{inline(trimmed)}</p>;
      })}
    </>
  );
}

function inline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-muted text-xs">{tok.slice(1, -1)}</code>);
    else parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    lastIndex = m.index + tok.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
