import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ExternalLink, Loader2, ShieldAlert } from "lucide-react";

type LaunchMode = "new-tab" | "same-tab";

interface ExternalWorkspaceOverlayProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  hostLabel: string;
  /** Fallback behavior when the destination refuses to embed. */
  fallbackMode: LaunchMode;
  /** Milliseconds to wait for the iframe load event before assuming X-Frame-Options blocked it. */
  detectTimeoutMs?: number;
}

/**
 * In-app browser overlay for external tools (MLS PIN, Dotloop, etc.).
 *
 * These providers ship `X-Frame-Options: DENY` / `SAMEORIGIN` headers, which
 * the browser enforces at the network layer — no iframe/object/embed trick can
 * bypass it. We optimistically attempt the embed inside a full-screen modal
 * shell (so users stay inside the Agent Business Tracker chrome), detect the
 * block via a load-timeout, and fall back to a launcher card that opens the
 * destination via the appropriate secure route.
 */
export function ExternalWorkspaceOverlay({
  open,
  onClose,
  url,
  title,
  hostLabel,
  fallbackMode,
  detectTimeoutMs = 2500,
}: ExternalWorkspaceOverlayProps) {
  const [status, setStatus] = useState<"loading" | "embedded" | "blocked">(
    "loading",
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus("loading");

    // If the iframe never fires `load` within the window, assume the destination
    // rejected framing. Some browsers do fire `load` even on X-Frame-Options
    // blocks, but the document ends up inaccessible; the timeout is the reliable
    // signal in either case.
    timeoutRef.current = window.setTimeout(() => {
      setStatus((prev) => (prev === "embedded" ? prev : "blocked"));
    }, detectTimeoutMs);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [open, url, detectTimeoutMs]);

  // Lock body scroll while the overlay is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleIframeLoad = () => {
    // Best-effort check: if the iframe reports 0×0 or we can't touch it, the
    // browser blocked it. Cross-origin access will throw — that's expected and
    // fine, it means the frame DID load a real document.
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc === null) {
        setStatus("blocked");
        return;
      }
    } catch {
      // Cross-origin — good, means it loaded
    }
    setStatus("embedded");
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  };

  const launchFallback = () => {
    if (fallbackMode === "new-tab") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = url;
    }
  };

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Fixed top navigation bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 shadow-sm lg:px-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Close and Return to Dashboard
        </button>

        <div className="ml-2 hidden min-w-0 flex-1 items-center gap-2 md:flex">
          <div className="truncate text-sm font-semibold text-foreground">
            {title}
          </div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {hostLabel}
          </div>
        </div>

        <button
          type="button"
          onClick={launchFallback}
          className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ExternalLink className="h-4 w-4" />
          {fallbackMode === "new-tab" ? "Open in new tab" : "Open directly"}
        </button>
      </div>

      {/* Embed area */}
      <div className="relative flex-1 bg-muted/30">
        {status !== "blocked" && (
          <iframe
            ref={iframeRef}
            src={url}
            title={title}
            onLoad={handleIframeLoad}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
          />
        )}

        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="text-sm font-medium text-muted-foreground">
                Loading {hostLabel}…
              </div>
            </div>
          </div>
        )}

        {status === "blocked" && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                {hostLabel} can't be embedded
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This provider sends an{" "}
                <span className="font-mono text-xs">X-Frame-Options</span>{" "}
                header that blocks all in-page embedding (iframe, object, and
                embed). Your browser enforces this at the network layer, so
                nothing on our side can bypass it.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={launchFallback}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <ExternalLink className="h-4 w-4" />
                  {fallbackMode === "new-tab"
                    ? `Open ${hostLabel} in a new tab`
                    : `Continue to ${hostLabel}`}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
