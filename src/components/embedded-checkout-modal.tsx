import { useCallback, useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X, Loader2 } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";
import { PaymentTestBanner } from "@/components/payment-test-banner";

export function EmbeddedCheckoutModal({
  priceId,
  open,
  onClose,
  returnUrl,
}: {
  priceId: string | null;
  open: boolean;
  onClose: () => void;
  returnUrl: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [keyVersion, setKeyVersion] = useState(0);

  // Reset internal Stripe instance whenever priceId changes
  useEffect(() => {
    if (open && priceId) {
      setError(null);
      setKeyVersion((v) => v + 1);
    }
  }, [open, priceId]);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!priceId) throw new Error("No price selected");
    try {
      const { clientSecret } = await createCheckoutSession({
        data: { priceId, environment: getStripeEnvironment(), returnUrl },
      });
      return clientSecret;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      setError(msg);
      throw e;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceId, returnUrl, keyVersion]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-card relative">
        <button
          onClick={onClose}
          aria-label="Close checkout"
          className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-muted hover:bg-muted/70 inline-flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-5 pt-6">
          <PaymentTestBanner />
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-4 py-6 text-sm text-center">
              <div className="font-medium mb-1">Couldn't start checkout</div>
              <div className="text-xs opacity-90">{error}</div>
            </div>
          ) : priceId ? (
            <div key={keyVersion} className="min-h-[420px]">
              <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
