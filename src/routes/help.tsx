import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  LifeBuoy, Search, BookOpen, Receipt, Wallet, Car, ScanLine,
  FileBarChart, HandCoins, ArrowRightLeft, Plus, Download, ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/help")({
  component: HelpPage,
  head: () => ({ meta: [{ title: "How-to - Agent Business Tracker" }] }),
});

type Article = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
};

type Section = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  articles: Article[];
};

const sections: Section[] = [
  {
    label: "Bookkeeping",
    icon: BookOpen,
    articles: [
      {
        id: "add-txn",
        title: "Add a transaction (income or expense)",
        summary: "Log money in or out and tag it to the right tax category.",
        steps: [
          "Go to Books → Transactions.",
          'Click "New transaction" in the top right.',
          'Pick a date, then choose a Category (e.g. "MLS Dues" or "Commission Income").',
          'Pick the "Paid from" account (Chase, Amex, etc.) so balances stay accurate.',
          "Enter the amount and a short memo, then Save.",
        ],
        tip: "Categories map to Schedule C lines automatically — no extra work at tax time.",
      },
      {
        id: "categories",
        title: "Add or edit a category",
        summary: "Customize your chart of accounts.",
        steps: [
          "Go to Books → Categories.",
          'Click "New category" in the top right.',
          "Choose the kind (Income, Expense, Asset, Liability, Equity).",
          "Give it a code (e.g. 6075) and name, then optionally pick a Schedule C tax line.",
          "Save — it now shows up in the dropdown when adding transactions.",
        ],
      },
      {
        id: "accounts",
        title: "Add a bank account or credit card",
        summary: "Track multiple accounts side-by-side.",
        steps: [
          "Go to Books → Accounts.",
          'Click "Add account".',
          'Pick "Bank" (Asset) or "Credit card" (Liability).',
          "Name it (e.g. Chase Business 1234) and save.",
          'It will now appear in the "Paid from" dropdown.',
        ],
      },
      {
        id: "transfer",
        title: "Pay a credit card or transfer between accounts",
        summary: "Record card payments without double-counting expenses.",
        steps: [
          "Go to Books → Accounts.",
          'Click "Transfer" in the top right.',
          "From = the bank you're paying with. To = the credit card (or other bank).",
          "Enter the amount and click Record transfer.",
        ],
        tip: "Transfers don't hit your P&L — only the original card purchases do.",
      },
    ],
  },
  {
    label: "Owner Loan",
    icon: HandCoins,
    articles: [
      {
        id: "owner-advance",
        title: "Record money you lent to the business",
        summary: "When you pay a business expense from your personal card.",
        steps: [
          "Go to Books → Owner Loan.",
          'Click "New advance".',
          "Enter the date, amount, and what it was for (e.g. signage, gas, lunch with client).",
          "Save — your running balance (what the company owes you) updates automatically.",
        ],
      },
      {
        id: "owner-reimburse",
        title: "Reimburse yourself from the business",
        summary: "Pay back what you advanced.",
        steps: [
          "Go to Books → Owner Loan.",
          'Click "Reimburse".',
          'Pick the bank account paying you back (the "From" account).',
          "Enter the amount and save. Balance owed decreases.",
        ],
      },
    ],
  },
  {
    label: "Invoices & Stripe",
    icon: Receipt,
    articles: [
      {
        id: "new-invoice",
        title: "Send an invoice",
        summary: "Bill a client and get paid online.",
        steps: [
          "Go to Invoices.",
          'Click "New invoice".',
          "Pick the client (or add a new one), enter line items and amounts.",
          'Click "Send" — your client gets an email with a Stripe payment link.',
          "Once paid, the income is auto-categorized in your Books.",
        ],
        tip: "You'll need to connect Stripe once under Settings → Payments before you can send the first invoice.",
      },
    ],
  },
  {
    label: "Mileage",
    icon: Car,
    articles: [
      {
        id: "live-gps",
        title: "Track a drive live with GPS",
        summary: "Best while you're actually driving.",
        steps: [
          'Go to Mileage and pick the "Live GPS" tab.',
          'Tap "Start trip" before pulling out of the driveway.',
          "Allow location access when your browser asks.",
          'Tap "Stop" when you arrive. Distance and time are filled in for you.',
          "Add purpose (e.g. Showing — 123 Main St) and Save.",
        ],
        tip: "Keep the tab open while driving. Browsers can't track in the background — for that you'd need a native app.",
      },
      {
        id: "address",
        title: "Calculate mileage from two addresses",
        summary: "Use this after the fact when you forgot to start a live trip.",
        steps: [
          'Go to Mileage → "Address to address".',
          "Enter the start address and the destination.",
          'Click "Calculate" — distance and a one-tap log entry appear.',
        ],
        tip: "Add a Google Maps API key in settings to switch from estimates to real driving distances.",
      },
      {
        id: "manual-mileage",
        title: "Add a trip manually",
        summary: "Quick entry when you already know the miles.",
        steps: [
          'Go to Mileage → "Manual".',
          "Enter date, miles, purpose, and save.",
        ],
      },
    ],
  },
  {
    label: "Receipts",
    icon: ScanLine,
    articles: [
      {
        id: "scan-receipt",
        title: "Scan a receipt",
        summary: "Snap a photo and let the app pull out the amount and vendor.",
        steps: [
          "Go to Receipts.",
          'Click "Scan receipt" and either take a photo or upload an image.',
          "Review the extracted vendor, date, and amount — fix anything that's off.",
          "Pick a category and the account it was paid from, then Save.",
          "The receipt image stays attached to the transaction for audit backup.",
        ],
      },
    ],
  },
  {
    label: "Reports & Tax Time",
    icon: FileBarChart,
    articles: [
      {
        id: "pl",
        title: "Print the Profit & Loss for your CPA",
        summary: "The one report your accountant actually wants.",
        steps: [
          "Go to Books → Reports.",
          "Confirm the date range (defaults to YTD).",
          'Click "Export PDF" in the top right.',
          "Email the PDF to your CPA — it's already grouped by Schedule C line.",
        ],
      },
      {
        id: "mileage-log",
        title: "Print the IRS mileage log",
        summary: "Required if you ever get audited.",
        steps: [
          "Go to Books → Reports.",
          'Click the "Mileage Log" card.',
          'Pick the year and click "Export PDF".',
        ],
      },
      {
        id: "1099",
        title: "Pull the 1099-NEC summary",
        summary: "See every contractor you paid $600+ during the year.",
        steps: [
          "Go to Books → Reports.",
          'Click "1099-NEC Summary".',
          "Review the list, then export as PDF or CSV to send to your CPA.",
        ],
      },
    ],
  },
];

function HelpPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = sections
    .map((s) => ({
      ...s,
      articles: q
        ? s.articles.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              a.summary.toLowerCase().includes(q) ||
              a.steps.some((step) => step.toLowerCase().includes(q)),
          )
        : s.articles,
    }))
    .filter((s) => s.articles.length > 0);

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
          <LifeBuoy className="h-3.5 w-3.5" /> Help center
        </div>
        <h1 className="text-3xl font-bold font-display">How-to guides</h1>
        <p className="text-muted-foreground mt-1.5 text-sm max-w-2xl">
          Short, plain-English walkthroughs for every common task. If you ever get stuck, this is the place.
        </p>
      </header>

      <div className="relative mb-6">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search - try "invoice", "mileage", "1099"...'
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-sm text-muted-foreground bg-card border border-border rounded-2xl p-8 text-center">
          No matches. Try a different search term.
        </div>
      )}

      <div className="space-y-8">
        {filtered.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.label}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="font-display font-bold">{section.label}</h2>
              </div>
              <div className="bg-card border border-border rounded-2xl shadow-card divide-y divide-border overflow-hidden">
                {section.articles.map((a) => (
                  <ArticleRow key={a.id} article={a} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 bg-primary text-primary-foreground rounded-2xl p-5 sm:p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-lg sm:text-xl">Still stuck?</h3>
            <p className="text-sm sm:text-base opacity-80 mt-2 leading-6">
              <span className="block">Email</span>
              <a
                href="mailto:livingandlearningwithjackie@gmail.com"
                className="block break-all underline underline-offset-2"
              >
                livingandlearningwithjackie@gmail.com
              </a>
              <span className="block mt-1">with a screenshot - typical reply under 4 business hours.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticleRow({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium">{article.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{article.summary}</div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1">
          <ol className="space-y-2.5">
            {article.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {article.tip && (
            <div className="mt-4 text-xs bg-muted/50 border border-border rounded-lg px-3 py-2 text-muted-foreground">
              <span className="font-semibold text-foreground">Tip:</span> {article.tip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

void Plus; void Download; void Wallet; void ArrowRightLeft;



