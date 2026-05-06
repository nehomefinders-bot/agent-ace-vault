import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, TrendingUp, DollarSign, AlertCircle, CheckCircle2, Plus, Search } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { invoices, kpis, formatMoney, formatMoneyCents } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Agent Business Tracker" },
      { name: "description", content: "YTD commission, pipeline, invoices, expenses — at a glance." },
    ],
  }),
});

interface DashDeal { id: string; address: string; client_name: string | null; sale_price: number; status: string; close_date: string | null; }
interface DashExpense { id: string; vendor: string; category: string; amount: number; date: string; receipt_path: string | null; }

const stageLabel: Record<string, string> = {
  closed: "Closed", closing: "Closing", under_contract: "Under Contract", pending: "Lead", dead: "Dead",
};
const stageTone: Record<string, "success" | "warning" | "primary" | "muted"> = {
  closed: "success", closing: "primary", under_contract: "warning", pending: "muted", dead: "muted",
};

const statusTone: Record<string, "success" | "warning" | "danger" | "muted"> = {
  Paid: "success",
  Pending: "warning",
  Overdue: "danger",
  Draft: "muted",
};

function KpiCard({
  label, value, delta, deltaTone = "muted", icon: Icon,
}: {
  label: string; value: string; delta: string;
  deltaTone?: "success" | "danger" | "muted"; icon: React.ComponentType<{ className?: string }>;
}) {
  const toneCls = deltaTone === "success" ? "text-success" : deltaTone === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="text-3xl font-bold tabular-nums font-display">{value}</div>
      <div className={`text-xs mt-2 font-medium ${toneCls}`}>{delta}</div>
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

  const activeDeals = deals.filter((d) => d.status !== "closed" && d.status !== "dead").length;
  const pipelineValue = deals.filter((d) => d.status !== "closed" && d.status !== "dead").reduce((s, d) => s + Number(d.sale_price), 0);

  return (
    <PageShell
      title="Dashboard"
      subtitle="Welcome back. Here's how your business is tracking."
      actions={
        <>
          <div className="relative hidden md:block">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search deals, clients…"
              className="pl-9 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Link to="/deals" className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 min-h-11 md:min-h-0">
            <Plus className="h-4 w-4" /> New Deal
          </Link>
        </>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KpiCard label="YTD Commission" value={formatMoney(kpis.ytdCommission)} delta="+12.5% vs last year" deltaTone="success" icon={TrendingUp} />
        <KpiCard label="Pipeline Value" value={formatMoney(pipelineValue || kpis.pipelineValue)} delta={`${activeDeals} active deals`} icon={DollarSign} />
        <KpiCard label="Outstanding Commissions" value={formatMoney(kpis.outstandingInvoices)} delta={`${invoices.filter(i => i.status === "Overdue").length} overdue`} deltaTone="danger" icon={AlertCircle} />
        <KpiCard label="Deals Closed (MTD)" value={String(deals.filter((d) => d.status === "closed").length || kpis.closedDealsMTD)} delta={`Avg ${formatMoney(kpis.avgDealSize)}`} deltaTone="success" icon={CheckCircle2} />
      </div>

      {/* Pipeline + Commissions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <section className="xl:col-span-2 glass rounded-2xl overflow-hidden">
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
              No deals yet. <Link to="/deals" className="text-primary font-medium">Add your first deal →</Link>
            </div>
          ) : (
            <>
              {/* Mobile: card view */}
              <ul className="md:hidden divide-y divide-border">
                {deals.map((d) => (
                  <li key={d.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{d.address}</div>
                        {d.client_name && <div className="text-xs text-muted-foreground truncate">{d.client_name}</div>}
                      </div>
                      <div className="tabular-nums font-semibold text-sm shrink-0">{formatMoney(Number(d.sale_price))}</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill tone={stageTone[d.status] ?? "muted"}>{stageLabel[d.status] ?? d.status}</StatusPill>
                      {d.close_date && <span className="text-[11px] text-muted-foreground truncate">{d.close_date}</span>}
                    </div>
                  </li>
                ))}
              </ul>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                      <th className="text-left font-medium py-3 px-6">Property</th>
                      <th className="text-left font-medium py-3">Client</th>
                      <th className="text-right font-medium py-3">Value</th>
                      <th className="text-left font-medium py-3 pl-6">Stage</th>
                      <th className="text-left font-medium py-3 pr-6">Close</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((d) => (
                      <tr key={d.id} className="border-t border-border row-hover-blue">
                        <td className="py-4 px-6 font-medium">{d.address}</td>
                        <td className="py-4 text-muted-foreground">{d.client_name ?? "—"}</td>
                        <td className="py-4 text-right tabular-nums font-medium">{formatMoney(Number(d.sale_price))}</td>
                        <td className="py-4 pl-6"><StatusPill tone={stageTone[d.status] ?? "muted"}>{stageLabel[d.status] ?? d.status}</StatusPill></td>
                        <td className="py-4 pr-6 text-muted-foreground text-xs">{d.close_date ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="glass rounded-2xl overflow-hidden">
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
                  <div className="text-xs text-muted-foreground truncate">{inv.client} · {inv.description}</div>
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

      {/* Expenses feed */}
      <section className="glass rounded-2xl overflow-hidden">
        <header className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Recent Expenses</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Snap a receipt and we'll categorize it</p>
          </div>
          <Link to="/expenses" className="text-xs text-primary font-medium hover:underline">View all</Link>
        </header>
        {expenses.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No expenses yet. <Link to="/expenses" className="text-primary font-medium">Log your first →</Link>
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
                <div className="col-span-2 text-right tabular-nums font-medium text-sm">{formatMoney(Number(e.amount))}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
    </PageShell>
  );
}
