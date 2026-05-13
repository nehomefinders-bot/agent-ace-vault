import { useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function SecurityOtpDialog({
  open,
  onOpenChange,
  email,
  purpose,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  purpose: string;
  onVerified: () => Promise<boolean>;
}) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendCode() {
    if (!email) return;
    setSending(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      toast.success(`Verification code sent to ${email}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not send verification code";
      setMessage(text);
      toast.error(text);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!open) {
      setCode("");
      setMessage(null);
      setSending(false);
      setVerifying(false);
      return;
    }
    void sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, email]);

  async function verify() {
    if (code.length < 6) {
      setMessage("Enter the 6-digit code from your email.");
      return;
    }
    setVerifying(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) throw error;
      const ok = await onVerified();
      if (ok) {
        toast.success("Email verification complete");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not verify code";
      setMessage(text);
      toast.error(text);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setCode("");
          setMessage(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{purpose}</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              We sent a one-time code to your current email. Enter it here to confirm the change.
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground break-all">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {message && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {message}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Codes expire quickly. Check spam if you do not see it.</span>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={sending || verifying}
              className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Resend
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending || verifying}>
            Cancel
          </Button>
          <Button onClick={verify} disabled={sending || verifying || code.length < 6}>
            {verifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Verify code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
