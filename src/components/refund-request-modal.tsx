import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitRefundRequest } from "@/utils/refunds.functions";

const REASONS = [
  "Accidental Purchase",
  "Not Using the App",
  "Technical Issues",
  "Other",
] as const;

type Reason = (typeof REASONS)[number];

export function RefundRequestModal({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}) {
  const submit = useServerFn(submitRefundRequest);
  const [reason, setReason] = useState<Reason>("Accidental Purchase");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submit({ data: { reason, details: details.trim() } });
      toast.success("Your refund request has been submitted. Our team will review it shortly.");
      setDetails("");
      setReason("Accidental Purchase");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a refund</DialogTitle>
          <DialogDescription>
            Tell us what happened and our team will review your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Your email</label>
            <input
              value={email}
              readOnly
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="refund-reason">
              Reason
            </label>
            <select
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as Reason)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="refund-details">
              Additional notes / feedback
            </label>
            <textarea
              id="refund-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Anything else we should know?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
