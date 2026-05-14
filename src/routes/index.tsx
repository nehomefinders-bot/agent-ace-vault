import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, AlertCircle, Plus, Search, Pencil, Trash2, Home as HomeIcon } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { invoices, kpis, formatMoney } from "@/lib/mock-data";
import { YtdCommissionCard, PipelineGaugeCard, DealsClosedRingCard } from "@/components/dashboard-kpis";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard - Agent Business Tracker" },
      { name: "description", content: "YTD commission, pipeline, invoices, expenses - at a glance." },
    ],
  }),
});

interface DashDeal {
  id: string;
  address: string;
  client_name: string | null;
  sale_price: number;
  status: string;
  close_date: string | null;
}

interface DashExpense {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  receipt_path: string | null;
}

import { stageLabel, normalizeStage } from "@/lib/pipeline-stages";

const statusTone: Record<string, "success" | "warning" | "danger" | "muted"> = {
  Paid: "success",
  Pending: "warning",
  Overdue: "danger",
  Draft: "muted",
};

function stagePillClasses(status: string) {
  const k = normalizeStage(status);
  if (k === "closed") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30";
  if (k === "contract_signed" || k === "under_agreement" || k === "commitment" || k === "clear_to_close")
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30";
  if (k === "no_response") return "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30";
  return "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30";
}

function StagePill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${stagePillClasses(status)}`}>
      {stageLabel(status)}
    </span>
  );
}

function PropertyThumb({ address }: { address: string }) {
  // Deterministic gentle color from address
  let h = 0;
  for (let i = 0; i < address.length; i++) h = (h * 31 + address.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 ring-1 ring-border"
      style={{ background: `linear-gradient(135deg, oklch(85% 0.05 ${hue}), oklch(70% 0.08 ${hue}))` }}
    >
      <HomeIcon className="h-4 w-4 text-foreground/70" />
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<DashDeal[]>([]);
  const [expenses, setExpenses] = useState<DashExpense[]>([]);

  useEffect(() => {
    if (!user) { setDeals([]); setExpenses([]); return; }
    (async () => {
      const [d, e] = await Promise.all([
        supabase.from("deals").select("id,address,client_name,sale_price,status,close_date").order("created_at", { ascending: false }).limit(6),
        supabase.from("expenses").select("id,vendor,category,amount,date,receipt_path").order("date", { ascending: false }).limit(5),
      ]);
      setDeals((d.data ?? []) as DashDeal[]);
      setExpenses((e.data ?? []) as DashExpense[]);
    })();
  }, [user]);

  const activeDeals = deals.filter((d) => normalizeStage(d.status) !== "closed").length;
  const pipelineValue = deals.filter((d) => normalizeStage(d.status) !== "closed").reduce((s, d) => s + Number(d.sale_price), 0);

  const deleteDeal = async (dealId: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", dealId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDeals((current) => current.filter((item) => item.id !== dealId));
  };

  const deleteExpense = async (expenseId: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setExpenses((current) => current.filter((item) => item.id !== expenseId));
  };

  return (
    <PageShell
      title="Dashboard"
      subtitle="Welcome back. Here's how your business is tracking."
      actions={
        <>
          <div className="relative hidden md:block">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search deals, clients..."
              className="pl-9 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Link to="/deals" className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 min-h-11 md:min-h-0">
            <Plus className="h-4 w-4" /> New Deal
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <YtdCommissionCard
          value={kpis.ytdCommission}
          trend={[
            { m: "May", v: 22 },
            { m: "Jun", v: 28 },
            { m: "Jul", v: 31 },
            { m: "Aug", v: 27 },
            { m: "Sep", v: 38 },
            { m: "Oct", v: 45 },
          ]}
        />
        <PipelineGaugeCard value={pipelineValue || kpis.pipelineValue} goal={3_000_000} />
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Outstanding Commissions</span>
            <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="text-3xl font-bold tabular-nums font-display">{formatMoney(kpis.outstandingInvoices)}</div>
          <div className="text-xs mt-2 font-medium text-destructive">{invoices.filter(i => i.status === "Overdue").length} overdue</div>
        </div>
        <DealsClosedRingCard
          closed={deals.filter((d) => d.status === "closed").length || kpis.closedDealsMTD}
          goal={10}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <section className="xl:col-span-2 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <header className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div>
              <h2 className="text-lg font-bold">Deals Pipeline</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Active and recent transactions</p>
            </div>
            <Link to="/pipeline" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </header>
          {deals.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No deals yet. <Link to="/deals" className="text-primary font-medium">Add your first deal</Link>
            </div>
          ) : (
            <>
              <ul className="md:hidden divide-y divide-border">
                {deals.map((d) => (
                  <li key={d.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <PropertyThumb address={d.address} />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{d.address}</div>
                          {d.client_name && <div className="text-xs text-muted-foreground truncate">{d.client_name}</div>}
                        </div>
                      </div>
                      <div className="tabular-nums font-semibold text-sm shrink-0">{formatMoney(Number(d.sale_price))}</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <StagePill status={d.status} />
                      {d.close_date && <span className="text-[11px] text-muted-foreground truncate">{d.close_date}</span>}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <Link
                        to="/deals"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit deal"
                        title="Edit deal"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Delete this deal?")) void deleteDeal(d.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label="Delete deal"
                        title="Delete deal"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                      <th className="text-left font-medium py-3 px-6">Property</th>
                      <th className="text-left font-medium py-3">Client</th>
                      <th className="text-right font-medium py-3">Value</th>
                      <th className="text-left font-medium py-3 pl-6">Stage</th>
                      <th className="text-left font-medium py-3 pr-6">Close</th>
                      <th className="w-20 pr-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((d) => (
                      <tr key={d.id} className="border-t border-border row-hover-blue">
                        <td className="py-4 px-6 font-medium">
                          <div className="flex items-center gap-3 min-w-0">
                            <PropertyThumb address={d.address} />
                            <span className="truncate">{d.address}</span>
                          </div>
                        </td>
                        <td className="py-4 text-muted-foreground">{d.client_name ?? "N/A"}</td>
                        <td className="py-4 text-right tabular-nums font-medium">{formatMoney(Number(d.sale_price))}</td>
                        <td className="py-4 pl-6"><StagePill status={d.status} /></td>
                        <td className="py-4 pr-6 text-muted-foreground text-xs">{d.close_date ?? "N/A"}</td>
                        <td className="py-4 pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to="/deals"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label="Edit deal"
                              title="Edit deal"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => {
                                if (confirm("Delete this deal?")) void deleteDeal(d.id);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                              aria-label="Delete deal"
                              title="Delete deal"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <header className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div>
              <h2 className="text-lg font-bold">Recent Commissions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Stripe-ready</p>
            </div>
            <Link to="/commissions" className="text-xs text-primary font-medium hover:underline">View all</Link>
          </header>
          <ul className="divide-y divide-border">
            {invoices.slice(0, 5).map((inv) => (
              <li key={inv.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{inv.id}</div>
                  <div className="text-xs text-muted-foreground truncate">{inv.client} - {inv.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="tabular-nums font-medium text-sm">{formatMoney(inv.amount)}</div>
                  <div className="mt-1"><StatusPill tone={statusTone[inv.status]}>{inv.status}</StatusPill></div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <header className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Recent Expenses</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Snap a receipt and we'll categorize it</p>
          </div>
          <Link to="/expenses" className="text-xs text-primary font-medium hover:underline">View all</Link>
        </header>
        {expenses.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No expenses yet. <Link to="/expenses" className="text-primary font-medium">Log your first expense</Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e) => (
              <li key={e.id} className="px-6 py-4 grid grid-cols-12 items-center gap-4">
                <div className="col-span-5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {e.category.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{e.vendor}</div>
                    <div className="text-xs text-muted-foreground">{e.category}</div>
                  </div>
                </div>
                <div className="col-span-3 text-xs text-muted-foreground">{e.date}</div>
                <div className="col-span-2">
                  {e.receipt_path
                    ? <StatusPill tone="success">Receipt</StatusPill>
                    : <StatusPill tone="warning">Missing</StatusPill>}
                </div>
                <div className="col-span-2 text-right">
                  <div className="tabular-nums font-medium text-sm">{formatMoney(Number(e.amount))}</div>
                  <div className="mt-2 inline-flex gap-1">
                    <Link
                      to="/expenses"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Edit expense"
                      title="Edit expense"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm("Delete this expense?")) void deleteExpense(e.id);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label="Delete expense"
                      title="Delete expense"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
