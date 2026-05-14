import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BookOpen, ListOrdered, Tags, HandCoins, FileBarChart, Wallet, Calculator } from "lucide-react";
import { BooksProvider, useBooks, formatMoney } from "@/hooks/use-books";
import { ownerLoanLedger, profitAndLoss } from "@/lib/books-data";

export const Route = createFileRoute("/books")({
  component: BooksLayout,
  head: () => ({ meta: [{ title: "Books - Agent Business Tracker" }] }),
});

const tabs = [
  { to: "/books", label: "Overview", icon: BookOpen, exact: true as boolean },
  { to: "/books/accounts", label: "Accounts", icon: Wallet, exact: false as boolean },
  { to: "/books/transactions", label: "Transactions", icon: ListOrdered, exact: false as boolean },
  { to: "/books/categories", label: "Categories", icon: Tags, exact: false as boolean },
  { to: "/books/owner-loan", label: "Owner Loan", icon: HandCoins, exact: false as boolean },
  { to: "/books/reports", label: "Reports", icon: FileBarChart, exact: false as boolean },
  { to: "/books/taxes", label: "Tax Estimator", icon: Calculator, exact: false as boolean },
] as const;

function BooksLayout() {
  return (
    <BooksProvider>
      <BooksLayoutContent />
    </BooksProvider>
  );
}

function BooksLayoutContent() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { accounts, transactions, loading } = useBooks();
  const { balance } = ownerLoanLedger(accounts, transactions);
  const pl = profitAndLoss(accounts, transactions);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6 rounded-3xl border border-border/70 bg-background px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <header className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" /> Bookkeeping
          </div>
          <h1 className="font-display text-3xl font-bold">Books</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Tax-ready ledger for your real estate business. Every dollar in or out gets categorized - Schedule C friendly.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="YTD Income" value={formatMoney(pl.totalIncome)} tone="success" />
          <Stat label="YTD Expenses" value={formatMoney(pl.totalExpense)} tone="muted" />
          <Stat label="Net Income" value={formatMoney(pl.netIncome)} tone="primary" />
          <Stat label="Co. owes you" value={formatMoney(balance)} tone="warning" sub="Loan from Officer" />
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? path === to : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
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

      {loading && accounts.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading your books...</div>
      ) : (
        <Outlet />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "success" | "muted" | "primary" | "warning";
}) {
  const tones = {
    success: "text-success",
    muted: "text-foreground",
    primary: "text-primary",
    warning: "text-secondary-foreground",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
