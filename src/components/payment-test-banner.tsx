import { isTestMode } from "@/lib/stripe";

export function PaymentTestBanner() {
  if (!isTestMode()) return null;
  return (
    <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning-foreground/90 flex items-center gap-2">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
      <span>
        <strong>Test mode.</strong> Use card <code className="font-mono">4242 4242 4242 4242</code>, any future expiry, any CVC, any ZIP. No real charge.
      </span>
    </div>
  );
}
