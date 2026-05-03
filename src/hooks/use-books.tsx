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

export function BooksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) { setAccounts([]); setTransactions([]); setLoading(false); return; }
    setLoading(true);
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from("accounts").select("*").eq("archived", false).order("code"),
      supabase.from("transactions").select("*").order("date", { ascending: false }),
    ]);
    setAccounts((a ?? []).map((r) => ({
      id: r.id, code: r.code, name: r.name, kind: r.kind as AccountKind,
      taxLine: r.tax_line, description: r.description,
    })));
    setTransactions((t ?? []).map((r) => ({
      id: r.id, date: r.date, memo: r.memo, amount: Number(r.amount),
      debitAccountId: r.debit_account_id, creditAccountId: r.credit_account_id,
      vendor: r.vendor, reference: r.reference, tags: r.tags,
    })));
    setLoading(false);
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
