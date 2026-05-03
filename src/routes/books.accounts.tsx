import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Building2, CreditCard, PiggyBank, ArrowRightLeft, Wallet } from "lucide-react";
import { useBooks, formatMoney, formatMoneyCents } from "@/hooks/use-books";
import { accountBalance, type Account, type AccountKind } from "@/lib/books-data";

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
  const { accounts, transactions, addTransaction, addAccount } = useBooks();
  const [showTransfer, setShowTransfer] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const cashAccts  = accounts.filter((a) => a.kind === "Asset" && a.code !== "1100");
  const cardAccts  = accounts.filter((a) => a.kind === "Liability" && a.code !== "2100");
  const ownerLoan  = accounts.find((a) => a.code === "2100");

  const totalCash  = cashAccts.reduce((s, a) => s + accountBalance(a.id, accounts, transactions), 0);
  const totalDebt  = cardAccts.reduce((s, a) => s + accountBalance(a.id, accounts, transactions), 0);
  const ownerOwed  = ownerLoan ? accountBalance(ownerLoan.id, accounts, transactions) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Every bank account and credit card lives here. Each transaction picks one as its "Paid from" — that's how
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
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add account
          </button>
        </div>
      </div>

      {showNew && (
        <NewAccountForm
          onDone={() => setShowNew(false)}
          onSubmit={(a) => addAccount(a)}
        />
      )}

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

      <Section title="Bank accounts" accts={cashAccts} accounts={accounts} transactions={transactions} positive />
      <Section title="Credit cards" accts={cardAccts} accounts={accounts} transactions={transactions} positive={false} />
      {ownerLoan && (
        <Section title="Officer loan" accts={[ownerLoan]} accounts={accounts} transactions={transactions} positive={false} />
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
  title, accts, accounts, transactions, positive,
}: {
  title: string;
  accts: Account[];
  accounts: Account[];
  transactions: { id: string; debitAccountId: string; creditAccountId: string }[];
  positive: boolean;
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
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TransferForm({
  cash, cards, onDone, onSubmit,
}: {
  cash: Account[]; cards: Account[]; onDone: () => void;
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
      // Transfer journal: debit destination, credit source
      await onSubmit({
        date: new Date().toISOString().slice(0, 10),
        memo: isCardPayment ? `Pay ${toAcct?.name}` : `Transfer to ${toAcct?.name}`,
        amount: amt,
        debitAccountId: to,
        creditAccountId: from,
      });
      onDone();
    } finally { setSaving(false); }
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
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm tabular-nums" />
        </Field>
        <div className="flex items-end">
          <button onClick={save} disabled={saving}
            className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? "Saving…" : "Record transfer"}
          </button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-3">
        Journal: debit <span className="font-medium text-foreground">{toAcct?.name}</span>, credit <span className="font-medium text-foreground">{fromAcct?.name}</span>. No P&amp;L impact.
      </div>
    </div>
  );
}

function NewAccountForm({
  onDone,
  onSubmit,
}: {
  onDone: () => void;
  onSubmit: (a: { code: string; name: string; kind: AccountKind; description?: string }) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("Asset");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!code || !name) return;
    setSaving(true);
    try { await onSubmit({ code, name, kind }); onDone(); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card grid grid-cols-1 md:grid-cols-5 gap-3">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (e.g. 1012)"
        className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name"
        className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm md:col-span-2" />
      <select value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}
        className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm">
        <option value="Asset">Bank / Asset</option>
        <option value="Liability">Credit card / Liability</option>
        <option value="Income">Income</option>
        <option value="Expense">Expense</option>
        <option value="Equity">Equity</option>
      </select>
      <div className="flex justify-end gap-2 items-end">
        <button onClick={onDone} className="px-3 py-2 text-sm text-muted-foreground">Cancel</button>
        <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Add"}
        </button>
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
