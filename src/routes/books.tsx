import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BookOpen, ListOrdered, Tags, HandCoins, FileBarChart, Wallet } from "lucide-react";
import { ownerLoanLedger, profitAndLoss, formatMoney } from "@/lib/books-helpers";

export const Route = createFileRoute("/books")({
  component: BooksLayout,
  head: () => ({ meta: [{ title: "Books — Apex Realty OS" }] }),
});

const tabs = [
  { to: "/books", label: "Overview", icon: BookOpen, exact: true as boolean },
  { to: "/books/accounts", label: "Accounts", icon: Wallet, exact: false as boolean },
  { to: "/books/transactions", label: "Transactions", icon: ListOrdered, exact: false as boolean },
  { to: "/books/categories", label: "Categories", icon: Tags, exact: false as boolean },
  { to: "/books/owner-loan", label: "Owner Loan", icon: HandCoins, exact: false as boolean },
  { to: "/books/reports", label: "Reports", icon: FileBarChart, exact: false as boolean },
] as const;

function BooksLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { balance } = ownerLoanLedger();
  const pl = profitAndLoss();

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
          <BookOpen className="h-3.5 w-3.5" /> Bookkeeping
        </div>
        <h1 className="text-3xl font-bold font-display">Books</h1>
        <p className="text-muted-foreground mt-1.5 text-sm max-w-2xl">
          Tax-ready ledger for your real estate business. Every dollar in or out gets categorized — Schedule C friendly.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="YTD Income"  value={formatMoney(pl.totalIncome)}  tone="success" />
        <Stat label="YTD Expenses" value={formatMoney(pl.totalExpense)} tone="muted" />
        <Stat label="Net Income"  value={formatMoney(pl.netIncome)}    tone="primary" />
        <Stat label="Co. owes you" value={formatMoney(balance)}        tone="warning" sub="Loan from Officer" />
      </div>

      <div className="border-b border-border mb-6 flex gap-1 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? path === to : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "success" | "muted" | "primary" | "warning" }) {
  const tones = {
    success: "text-success",
    muted: "text-foreground",
    primary: "text-primary",
    warning: "text-secondary-foreground",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className={`text-2xl font-bold tabular-nums font-display ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
