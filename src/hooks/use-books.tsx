import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Account, Transaction, AccountKind } from "@/lib/books-data";

interface BooksCtx {
  loading: boolean;
  accounts: Account[];
  transactions: Transaction[];
  accountById: (id: string) => Account | undefined;
  accountByCode: (code: string) => Account | undefined;
  reload: () => Promise<void>;
  addTransaction: (t: NewTxn) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (a: NewAccount) => Promise<void>;
}

interface NewTxn {
  date: string;
  memo: string;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  vendor?: string;
  reference?: string;
  tags?: string[];
}
interface NewAccount {
  code: string;
  name: string;
  kind: AccountKind;
  taxLine?: string;
  description?: string;
}

const Ctx = createContext<BooksCtx | null>(null);

function isAccountKind(value: unknown): value is AccountKind {
  return value === "Income" || value === "Expense" || value === "Asset" || value === "Liability" || value === "Equity";
}

function normalizeAccountRow(row: Record<string, unknown>): Account | null {
  const id = typeof row.id === "string" ? row.id : "";
  const code = typeof row.code === "string" ? row.code : "";
  const name = typeof row.name === "string" ? row.name : "";
  const kind = isAccountKind(row.kind) ? row.kind : null;
  if (!id || !code || !name || !kind) return null;

  return {
    id,
    code,
    name,
    kind,
    taxLine: typeof row.tax_line === "string" ? row.tax_line : null,
    description: typeof row.description === "string" ? row.description : null,
  };
}

function normalizeTransactionRow(row: Record<string, unknown>): Transaction | null {
  const id = typeof row.id === "string" ? row.id : "";
  const date = typeof row.date === "string" ? row.date : "";
  const memo = typeof row.memo === "string" ? row.memo : "";
  const debitAccountId = typeof row.debit_account_id === "string" ? row.debit_account_id : "";
  const creditAccountId = typeof row.credit_account_id === "string" ? row.credit_account_id : "";
  const amount = Number(row.amount);
  if (!id || !date || !memo || !debitAccountId || !creditAccountId || !Number.isFinite(amount)) return null;

  return {
    id,
    date,
    memo,
    amount,
    debitAccountId,
    creditAccountId,
    vendor: typeof row.vendor === "string" ? row.vendor : null,
    reference: typeof row.reference === "string" ? row.reference : null,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : null,
  };
}

export function BooksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: accountRows, error: accountError }, { data: transactionRows, error: transactionError }] = await Promise.all([
        supabase.from("accounts").select("*").eq("archived", false).order("code"),
        supabase.from("transactions").select("*").order("date", { ascending: false }),
      ]);

      if (accountError) console.error("Failed to load accounts", accountError);
      if (transactionError) console.error("Failed to load transactions", transactionError);

      setAccounts((accountRows ?? [])
        .map((row) => normalizeAccountRow(row as Record<string, unknown>))
        .filter((row): row is Account => row !== null));
      setTransactions((transactionRows ?? [])
        .map((row) => normalizeTransactionRow(row as Record<string, unknown>))
        .filter((row): row is Transaction => row !== null));
    } catch (error) {
      console.error("Failed to reload books", error);
      setAccounts([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const accountById = useCallback((id: string) => accounts.find((a) => a.id === id), [accounts]);
  const accountByCode = useCallback((code: string) => accounts.find((a) => a.code === code), [accounts]);

  const addTransaction = useCallback(async (t: NewTxn) => {
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      date: t.date,
      memo: t.memo,
      amount: t.amount,
      debit_account_id: t.debitAccountId,
      credit_account_id: t.creditAccountId,
      vendor: t.vendor ?? null,
      reference: t.reference ?? null,
      tags: t.tags ?? null,
    });
    if (error) throw error;
    await reload();
  }, [user, reload]);

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const addAccount = useCallback(async (a: NewAccount) => {
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      code: a.code, name: a.name, kind: a.kind,
      tax_line: a.taxLine ?? null,
      description: a.description ?? null,
    });
    if (error) throw error;
    await reload();
  }, [user, reload]);

  const value = useMemo<BooksCtx>(() => ({
    loading, accounts, transactions, accountById, accountByCode,
    reload, addTransaction, deleteTransaction, addAccount,
  }), [loading, accounts, transactions, accountById, accountByCode, reload, addTransaction, deleteTransaction, addAccount]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooks() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBooks must be used within BooksProvider");
  return v;
}

export function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
export function formatMoneyCents(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
