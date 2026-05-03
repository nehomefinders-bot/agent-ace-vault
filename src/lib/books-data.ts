// Bookkeeping data model — double-entry ready, simple UI.
// Every Transaction has a debit account and a credit account.
// Account "kinds" mirror QuickBooks: Income, Expense, Asset, Liability, Equity.

export type AccountKind = "Income" | "Expense" | "Asset" | "Liability" | "Equity";

export interface Account {
  id: string;
  code: string;        // e.g. "6010"
  name: string;        // e.g. "Advertising"
  kind: AccountKind;
  taxLine?: string;    // e.g. "Schedule C — Line 8"
  description?: string;
}

// Real-estate-agent flavored Chart of Accounts (Schedule C friendly)
export const accounts: Account[] = [
  // Income
  { id: "4000", code: "4000", name: "Commission Income",      kind: "Income",  taxLine: "Schedule C — Line 1" },
  { id: "4010", code: "4010", name: "Referral Income",        kind: "Income",  taxLine: "Schedule C — Line 1" },
  { id: "4020", code: "4020", name: "Property Mgmt Fees",     kind: "Income",  taxLine: "Schedule C — Line 1" },
  { id: "4030", code: "4030", name: "Other Income",           kind: "Income",  taxLine: "Schedule C — Line 6" },

  // Expenses (real estate agent common categories)
  { id: "6010", code: "6010", name: "Advertising & Marketing",     kind: "Expense", taxLine: "Schedule C — Line 8" },
  { id: "6020", code: "6020", name: "Auto — Gas & Maintenance",    kind: "Expense", taxLine: "Schedule C — Line 9" },
  { id: "6021", code: "6021", name: "Auto — Mileage Deduction",    kind: "Expense", taxLine: "Schedule C — Line 9", description: "Standard IRS mileage" },
  { id: "6030", code: "6030", name: "Commissions Paid",            kind: "Expense", taxLine: "Schedule C — Line 10" },
  { id: "6040", code: "6040", name: "Continuing Education",        kind: "Expense", taxLine: "Schedule C — Line 27a" },
  { id: "6050", code: "6050", name: "Dues & Subscriptions (MLS)",  kind: "Expense", taxLine: "Schedule C — Line 27a" },
  { id: "6060", code: "6060", name: "Insurance (E&O, Liability)",  kind: "Expense", taxLine: "Schedule C — Line 15" },
  { id: "6070", code: "6070", name: "Legal & Professional Fees",   kind: "Expense", taxLine: "Schedule C — Line 17" },
  { id: "6080", code: "6080", name: "Meals (50% deductible)",      kind: "Expense", taxLine: "Schedule C — Line 24b" },
  { id: "6090", code: "6090", name: "Office Supplies",             kind: "Expense", taxLine: "Schedule C — Line 22" },
  { id: "6100", code: "6100", name: "Office Rent",                 kind: "Expense", taxLine: "Schedule C — Line 20b" },
  { id: "6110", code: "6110", name: "Software & Subscriptions",    kind: "Expense", taxLine: "Schedule C — Line 22" },
  { id: "6120", code: "6120", name: "Staging & Photography",       kind: "Expense", taxLine: "Schedule C — Line 8" },
  { id: "6130", code: "6130", name: "Travel",                      kind: "Expense", taxLine: "Schedule C — Line 24a" },
  { id: "6140", code: "6140", name: "Telephone & Internet",        kind: "Expense", taxLine: "Schedule C — Line 25" },
  { id: "6150", code: "6150", name: "Bank & Merchant Fees",        kind: "Expense", taxLine: "Schedule C — Line 17" },
  { id: "6160", code: "6160", name: "Gifts (capped $25/client)",   kind: "Expense", taxLine: "Schedule C — Line 27a" },
  { id: "6999", code: "6999", name: "Other Business Expenses",     kind: "Expense", taxLine: "Schedule C — Line 27a" },

  // Assets — Bank accounts
  { id: "1010", code: "1010", name: "Chase Business Checking",     kind: "Asset", description: "Primary operating account" },
  { id: "1011", code: "1011", name: "BofA Business Checking",      kind: "Asset", description: "Secondary operating account" },
  { id: "1015", code: "1015", name: "Business Savings",            kind: "Asset", description: "Tax & reserves" },
  { id: "1020", code: "1020", name: "Stripe Clearing",             kind: "Asset", description: "Funds in transit from Stripe" },
  { id: "1100", code: "1100", name: "Accounts Receivable",         kind: "Asset" },

  // Liabilities — Credit cards & officer loan
  { id: "2010", code: "2010", name: "Amex Business Platinum",      kind: "Liability", description: "Business credit card" },
  { id: "2020", code: "2020", name: "Chase Ink Business",          kind: "Liability", description: "Business credit card" },
  { id: "2100", code: "2100", name: "Loan from Officer",           kind: "Liability", description: "Money you've lent the company that hasn't been paid back" },

  // Equity
  { id: "3010", code: "3010", name: "Owner Contributions",         kind: "Equity" },
  { id: "3020", code: "3020", name: "Owner Draws",                 kind: "Equity" },
  { id: "3900", code: "3900", name: "Retained Earnings",           kind: "Equity" },
];

export const accountById = (id: string) => accounts.find((a) => a.id === id);

// Double-entry transaction: debit one account, credit another, equal amounts.
// For a non-accountant UI we'll show the friendly side ("Spent on", "Paid by")
// and derive the journal underneath.
export interface Transaction {
  id: string;
  date: string;          // ISO yyyy-mm-dd
  memo: string;
  amount: number;        // positive
  debitAccountId: string;
  creditAccountId: string;
  vendor?: string;
  reference?: string;    // invoice id, deal id, receipt id
  tags?: string[];
}

// Helper: friendly classification
export function classifyTxn(t: Transaction): "income" | "expense" | "owner-loan" | "transfer" {
  const d = accountById(t.debitAccountId);
  const c = accountById(t.creditAccountId);
  if (c?.kind === "Income") return "income";
  if (d?.kind === "Expense") return "expense";
  if (d?.id === "2100" || c?.id === "2100") return "owner-loan";
  return "transfer";
}

export const transactions: Transaction[] = [
  // Commission income — deposited to checking
  { id: "T-2210", date: "2025-10-30", memo: "Closing — 88 Bay Street #4B", amount: 36000, debitAccountId: "1010", creditAccountId: "4000", vendor: "Pacific Title", reference: "D-1041" },
  { id: "T-2209", date: "2025-10-22", memo: "Closing — 55 Elm St", amount: 17400, debitAccountId: "1010", creditAccountId: "4000", vendor: "Bay Escrow", reference: "D-1040" },
  { id: "T-2208", date: "2025-10-25", memo: "Property mgmt — Pacific Realty Co.", amount: 4200, debitAccountId: "1010", creditAccountId: "4020", vendor: "Pacific Realty Co.", reference: "INV-00876" },

  // Personal-card expenses → become Loan from Officer (you fronted it)
  { id: "T-2207", date: "2025-10-26", memo: "Lyft to Oakwood showing", amount: 45.5,  debitAccountId: "6130", creditAccountId: "2100", vendor: "Lyft", tags: ["personal-card"] },
  { id: "T-2206", date: "2025-10-25", memo: "Client lunch — Bistro Verde", amount: 78.20, debitAccountId: "6080", creditAccountId: "2100", vendor: "Bistro Verde", tags: ["personal-card"] },
  { id: "T-2205", date: "2025-10-22", memo: "Meta Ads — Willow Creek", amount: 420.00, debitAccountId: "6010", creditAccountId: "2100", vendor: "Meta", tags: ["personal-card"] },

  // Business-card expenses (paid from checking)
  { id: "T-2204", date: "2025-10-24", memo: "Canva Pro annual", amount: 99.00, debitAccountId: "6110", creditAccountId: "1010", vendor: "Canva" },
  { id: "T-2203", date: "2025-10-20", memo: "Office supplies", amount: 64.31, debitAccountId: "6090", creditAccountId: "1010", vendor: "Staples" },
  { id: "T-2202", date: "2025-10-15", memo: "MLS quarterly dues", amount: 185.00, debitAccountId: "6050", creditAccountId: "1010", vendor: "Local Board" },

  // Owner loan repayments — company pays you back from checking
  { id: "T-2201", date: "2025-10-28", memo: "Reimburse expenses (Oct batch 1)", amount: 200.00, debitAccountId: "2100", creditAccountId: "1010", vendor: "Self" },

  // Mileage deduction (non-cash, accrues to officer loan as effective owed reimbursement)
  { id: "T-2200", date: "2025-10-31", memo: "Oct mileage — 63.9 mi @ $0.67", amount: 42.81, debitAccountId: "6021", creditAccountId: "2100", vendor: "Self", tags: ["mileage"] },
];

export interface OwnerLoanEntry {
  id: string;
  date: string;
  memo: string;
  direction: "advance" | "repayment"; // advance = you lent the co; repayment = co paid you back
  amount: number;
  txnId: string;
}

export function ownerLoanLedger(): { entries: OwnerLoanEntry[]; balance: number } {
  const entries: OwnerLoanEntry[] = [];
  for (const t of transactions) {
    if (t.creditAccountId === "2100") {
      entries.push({ id: t.id, date: t.date, memo: t.memo, direction: "advance", amount: t.amount, txnId: t.id });
    } else if (t.debitAccountId === "2100") {
      entries.push({ id: t.id, date: t.date, memo: t.memo, direction: "repayment", amount: t.amount, txnId: t.id });
    }
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  const balance = entries.reduce((s, e) => s + (e.direction === "advance" ? e.amount : -e.amount), 0);
  return { entries, balance };
}

export interface PLLine { account: Account; amount: number; }
export interface PLReport {
  income: PLLine[];
  expense: PLLine[];
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
}

export function profitAndLoss(year = 2025): PLReport {
  const inYear = transactions.filter((t) => t.date.startsWith(String(year)));
  const sumByAccount = (kind: AccountKind, sideKey: "creditAccountId" | "debitAccountId") => {
    const map = new Map<string, number>();
    for (const t of inYear) {
      const acctId = t[sideKey];
      const acct = accountById(acctId);
      if (acct?.kind !== kind) continue;
      map.set(acctId, (map.get(acctId) ?? 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([id, amount]) => ({ account: accountById(id)!, amount }))
      .sort((a, b) => b.amount - a.amount);
  };
  const income = sumByAccount("Income", "creditAccountId");
  const expense = sumByAccount("Expense", "debitAccountId");
  const totalIncome = income.reduce((s, l) => s + l.amount, 0);
  const totalExpense = expense.reduce((s, l) => s + l.amount, 0);
  return { income, expense, totalIncome, totalExpense, netIncome: totalIncome - totalExpense };
}
