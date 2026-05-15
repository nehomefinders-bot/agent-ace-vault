import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRightLeft, Building2, CreditCard, Pencil, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { BooksAccountDialog, type BooksAccountDraft } from "@/components/books-account-dialog";
import { useBooks, formatMoney, formatMoneyCents } from "@/hooks/use-books";
import { accountBalance, type Account, type AccountKind } from "@/lib/books-data";
import { toast } from "sonner";

export const Route = createFileRoute("/books/accounts")({
  component: AccountsPage,
});

const iconFor = (name: string) => {
  if (/credit|amex|ink|card/i.test(name)) return CreditCard;
  if (/saving/i.test(name)) return PiggyBank;
  if (/stripe|clearing/i.test(name)) return Wallet;
  return Building2;
};

function AccountsPage() {
  const { accounts, transactions, addTransaction, addAccount, updateAccount, removeAccount } = useBooks();
  const [showTransfer, setShowTransfer] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const cashAccts = accounts.filter((a) => a.kind === "Asset" && a.code !== "1100");
  const cardAccts = accounts.filter((a) => a.kind === "Liability" && a.code !== "2100");
  const ownerLoan = accounts.find((a) => a.code === "2100");

  const totalCash = cashAccts.reduce((s, a) => s + accountBalance(a.id, accounts, transactions), 0);
  const totalDebt = cardAccts.reduce((s, a) => s + accountBalance(a.id, accounts, transactions), 0);
  const ownerOwed = ownerLoan ? accountBalance(ownerLoan.id, accounts, transactions) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Every bank account and credit card lives here. Each transaction picks one as its "Paid from" - that's how
          balances stay accurate.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowTransfer((v) => !v)}
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <ArrowRightLeft className="h-4 w-4" /> Transfer
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add account
          </button>
        </div>
      </div>

      <BooksAccountDialog
        open={showNew}
        onOpenChange={setShowNew}
        title="Add account"
        submitLabel="Add account"
        initialValue={{ code: "", name: "", kind: "Asset" }}
        onSubmit={addAccount}
      />

      <BooksAccountDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit account"
        submitLabel="Save account"
        initialValue={editing ? accountToDraft(editing) : undefined}
        onSubmit={async (draft: BooksAccountDraft) => {
          if (!editing) return;
          await updateAccount(editing.id, draft);
          setEditing(null);
        }}
      />

      {showTransfer && cashAccts.length > 0 && (
        <TransferForm
          cash={cashAccts}
          cards={cardAccts}
          onDone={() => setShowTransfer(false)}
          onSubmit={addTransaction}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Summary label="Cash on hand" value={formatMoney(totalCash)} sub={`${cashAccts.length} accounts`} tone="success" />
        <Summary label="Credit card debt" value={formatMoney(totalDebt)} sub={`${cardAccts.length} cards`} tone="warning" />
        <Summary label="Owed to officer" value={formatMoney(ownerOwed)} sub="Loan from Officer" tone="muted" />
      </div>

      <Section
        title="Bank accounts"
        accts={cashAccts}
        accounts={accounts}
        transactions={transactions}
        positive
        onEdit={setEditing}
        onDelete={(acct) => {
          if (confirm(`Delete ${acct.name}?`)) {
            removeAccount(acct.id).catch((error) => console.error(error));
          }
        }}
      />
      <Section
        title="Credit cards"
        accts={cardAccts}
        accounts={accounts}
        transactions={transactions}
        positive={false}
        onEdit={setEditing}
        onDelete={(acct) => {
          if (confirm(`Delete ${acct.name}?`)) {
            removeAccount(acct.id).catch((error) => console.error(error));
          }
        }}
      />
      {ownerLoan && (
        <Section
          title="Officer loan"
          accts={[ownerLoan]}
          accounts={accounts}
          transactions={transactions}
          positive={false}
          onEdit={setEditing}
          onDelete={(acct) => {
            if (confirm(`Delete ${acct.name}?`)) {
              removeAccount(acct.id).catch((error) => console.error(error));
            }
          }}
        />
      )}
    </div>
  );
}

function Summary({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "success" | "warning" | "muted" }) {
  const tones = { success: "text-success", warning: "text-secondary-foreground", muted: "text-foreground" };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className={`text-2xl font-bold tabular-nums font-display ${tones[tone]}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

function Section({
  title,
  accts,
  accounts,
  transactions,
  positive,
  onEdit,
  onDelete,
}: {
  title: string;
  accts: Account[];
  accounts: Account[];
  transactions: { id: string; debitAccountId: string; creditAccountId: string }[];
  positive: boolean;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  return (
    <section>
      <h2 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground mb-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accts.map((a) => {
          const bal = accountBalance(a.id, accounts, transactions as never);
          const txnCount = transactions.filter((t) => t.debitAccountId === a.id || t.creditAccountId === a.id).length;
          const Icon = iconFor(a.name);
          return (
            <div key={a.id} className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">#{a.code}</div>
                  {a.description && <div className="text-xs text-muted-foreground mt-1">{a.description}</div>}
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold tabular-nums font-display ${positive ? "text-foreground" : "text-secondary-foreground"}`}>
                    {formatMoneyCents(bal)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{txnCount} txns</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-1">
                <button
                  onClick={() => onEdit(a)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => onDelete(a)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TransferForm({
  cash,
  cards,
  onDone,
  onSubmit,
}: {
  cash: Account[];
  cards: Account[];
  onDone: () => void;
  onSubmit: (t: { date: string; memo: string; amount: number; debitAccountId: string; creditAccountId: string; vendor?: string }) => Promise<void>;
}) {
  const [from, setFrom] = useState(cash[0]?.id ?? "");
  const [to, setTo] = useState(cards[0]?.id ?? cash[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const fromAcct = cash.find((a) => a.id === from);
  const toAcct = [...cards, ...cash].find((a) => a.id === to);
  const isCardPayment = toAcct?.kind === "Liability";

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || !from || !to) return;
    setSaving(true);
    try {
      await onSubmit({
        date: new Date().toISOString().slice(0, 10),
        memo: isCardPayment ? `Pay ${toAcct?.name}` : `Transfer to ${toAcct?.name}`,
        amount: amt,
        debitAccountId: to,
        creditAccountId: from,
      });
      onDone();
    } catch (err) {
      console.error("Transfer failed", err);
      toast.error(err instanceof Error ? err.message : "Could not record transfer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold">{isCardPayment ? "Pay credit card" : "Transfer between accounts"}</h3>
        <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="From">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm">
            {cash.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="To">
          <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm">
            <optgroup label="Pay credit card">{cards.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
            <optgroup label="Bank">{cash.filter((a) => a.id !== from).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
          </select>
        </Field>
        <Field label="Amount">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount here" inputMode="decimal"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm tabular-nums" />
        </Field>
        <div className="flex items-end">
          <button onClick={save} disabled={saving}
            className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? "Saving..." : "Record transfer"}
          </button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-3">
        Journal: debit <span className="font-medium text-foreground">{toAcct?.name}</span>, credit <span className="font-medium text-foreground">{fromAcct?.name}</span>. No P&amp;L impact.
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function accountToDraft(account: Account): BooksAccountDraft {
  return {
    code: account.code,
    name: account.name,
    kind: account.kind,
    taxLine: account.taxLine ?? undefined,
    description: account.description ?? undefined,
  };
}
