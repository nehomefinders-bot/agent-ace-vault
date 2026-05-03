// Bookkeeping types and pure helpers. Data lives in Supabase; see use-books.tsx.

export type AccountKind = "Income" | "Expense" | "Asset" | "Liability" | "Equity";

export interface Account {
  id: string;
  code: string;
  name: string;
  kind: AccountKind;
  taxLine?: string | null;
  description?: string | null;
}

export interface Transaction {
  id: string;
  date: string;
  memo: string;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  vendor?: string | null;
  reference?: string | null;
  tags?: string[] | null;
}

export function classifyTxn(
  t: Transaction,
  accountById: (id: string) => Account | undefined,
): "income" | "expense" | "owner-loan" | "transfer" {
  const d = accountById(t.debitAccountId);
  const c = accountById(t.creditAccountId);
  if (c?.kind === "Income") return "income";
  if (d?.kind === "Expense") return "expense";
  if (d?.code === "2100" || c?.code === "2100") return "owner-loan";
  return "transfer";
}

export function accountBalance(
  accountId: string,
  accounts: Account[],
  transactions: Transaction[],
): number {
  const acct = accounts.find((a) => a.id === accountId);
  if (!acct) return 0;
  let bal = 0;
  for (const t of transactions) {
    if (t.debitAccountId === accountId) bal += Number(t.amount);
    if (t.creditAccountId === accountId) bal -= Number(t.amount);
  }
  if (acct.kind === "Liability" || acct.kind === "Equity" || acct.kind === "Income") return -bal;
  return bal;
}

export interface OwnerLoanEntry {
  id: string;
  date: string;
  memo: string;
  direction: "advance" | "repayment";
  amount: number;
  txnId: string;
}

export function ownerLoanLedger(
  accounts: Account[],
  transactions: Transaction[],
): { entries: OwnerLoanEntry[]; balance: number } {
  const officer = accounts.find((a) => a.code === "2100");
  const entries: OwnerLoanEntry[] = [];
  if (!officer) return { entries, balance: 0 };
  for (const t of transactions) {
    if (t.creditAccountId === officer.id) {
      entries.push({ id: t.id, date: t.date, memo: t.memo, direction: "advance", amount: Number(t.amount), txnId: t.id });
    } else if (t.debitAccountId === officer.id) {
      entries.push({ id: t.id, date: t.date, memo: t.memo, direction: "repayment", amount: Number(t.amount), txnId: t.id });
    }
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  const balance = entries.reduce((s, e) => s + (e.direction === "advance" ? e.amount : -e.amount), 0);
  return { entries, balance };
}

export interface PLLine { account: Account; amount: number }
export interface PLReport {
  income: PLLine[];
  expense: PLLine[];
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
}

export function profitAndLoss(
  accounts: Account[],
  transactions: Transaction[],
  year = new Date().getFullYear(),
): PLReport {
  const inYear = transactions.filter((t) => t.date.startsWith(String(year)));
  const sumByKind = (kind: AccountKind, side: "creditAccountId" | "debitAccountId") => {
    const map = new Map<string, number>();
    for (const t of inYear) {
      const acct = accounts.find((a) => a.id === t[side]);
      if (acct?.kind !== kind) continue;
      map.set(acct.id, (map.get(acct.id) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries())
      .map(([id, amount]) => ({ account: accounts.find((a) => a.id === id)!, amount }))
      .sort((a, b) => b.amount - a.amount);
  };
  const income = sumByKind("Income", "creditAccountId");
  const expense = sumByKind("Expense", "debitAccountId");
  const totalIncome = income.reduce((s, l) => s + l.amount, 0);
  const totalExpense = expense.reduce((s, l) => s + l.amount, 0);
  return { income, expense, totalIncome, totalExpense, netIncome: totalIncome - totalExpense };
}
