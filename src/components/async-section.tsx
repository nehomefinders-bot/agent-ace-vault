import { ReactNode } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

type Props = {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
  /** Shown above the spinner / error to identify which section failed. */
  label?: string;
};

/**
 * Wraps an async section so the user always sees either:
 * - a bounded spinner (with manual retry escape hatch),
 * - a friendly error card with a retry button,
 * - or the loaded content.
 *
 * Prevents the "infinite spinner" failure mode when a server function
 * rejects, times out, or returns 401/500.
 */
export function AsyncSection({ loading, error, onRetry, children, label }: Props) {
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">
              {label ? `Couldn't load ${label}` : "Something went wrong"}
            </div>
            <div className="text-sm text-muted-foreground mt-1 break-words">{error}</div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="btn-secondary mt-3 inline-flex items-center"
                type="button"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading{label ? ` ${label}` : ""}…
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Race a promise against a timeout so a hung server function can never
 * leave the UI buffering forever. Rejects with a clear message on timeout.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 15000, label = "request"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`The ${label} took too long to respond. Please try again.`));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
