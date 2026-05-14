import { supabase } from "@/integrations/supabase/client";

const CATEGORY_TO_CODE: Record<string, string> = {
  Marketing: "6010",
  Auto: "6020",
  Office: "6090",
  Software: "6110",
  Meals: "6080",
  Travel: "6130",
  Education: "6040",
  Insurance: "6060",
  Other: "6999",
};

const DEFAULT_EXPENSE_CODE = "6999";
const DEFAULT_CASH_CODE = "1010";

interface AccountRow {
  id: string;
  code: string;
  kind: string;
}

async function fetchAccounts(userId: string): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id,code,kind")
    .eq("user_id", userId)
    .eq("archived", false);
  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

function pickByCode(rows: AccountRow[], code: string): AccountRow | undefined {
  return rows.find((r) => r.code === code);
}
function pickByKind(rows: AccountRow[], kind: string): AccountRow | undefined {
  return rows.find((r) => r.kind === kind);
}

export interface ExpenseSyncInput {
  vendor: string;
  category: string;
  amount: number;
  date: string;
  notes: string | null;
}

/**
 * Create or update the bookkeeping transaction tied to an expense.
 * Returns the transaction id (existing or newly created).
 */
export async function upsertExpenseTransaction(
  userId: string,
  input: ExpenseSyncInput,
  existingTransactionId: string | null,
): Promise<string> {
  const accounts = await fetchAccounts(userId);
  const expenseAcct =
    pickByCode(accounts, CATEGORY_TO_CODE[input.category] ?? DEFAULT_EXPENSE_CODE) ??
    pickByCode(accounts, DEFAULT_EXPENSE_CODE) ??
    pickByKind(accounts, "Expense");
  const cashAcct =
    pickByCode(accounts, DEFAULT_CASH_CODE) ?? pickByKind(accounts, "Asset");

  if (!expenseAcct || !cashAcct) {
    throw new Error("Could not find books accounts to record this expense.");
  }

  const memo = input.notes?.trim() ? `${input.vendor} — ${input.notes.trim()}` : input.vendor;

  const payload = {
    date: input.date,
    memo,
    amount: input.amount,
    debit_account_id: expenseAcct.id,
    credit_account_id: cashAcct.id,
    vendor: input.vendor,
  };

  if (existingTransactionId) {
    const { error } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", existingTransactionId);
    if (error) throw error;
    return existingTransactionId;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({ user_id: userId, ...payload })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Could not create books transaction");
  return data.id;
}

export async function deleteExpenseTransaction(transactionId: string | null): Promise<void> {
  if (!transactionId) return;
  await supabase.from("transactions").delete().eq("id", transactionId);
}
