import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Mail,
  FileText,
  ExternalLink,
  Download,
  LayoutGrid,
  Images,
  History,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findListingMlsDocument,
  buildListingPdfPreview,
  buildShareBody,
  buildShareSubject,
  shareListingViaEmail,
  downloadListingPdf,
  copyEmailContentToClipboard,
  shortenUrl,
  type ShareableListing,
  type MlsAttachment,
  type PdfPageMap,
} from "@/lib/listing-share";

export function ShareListingModal({
  listing,
  open,
  onOpenChange,
}: {
  listing: ShareableListing;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [mls, setMls] = useState<MlsAttachment | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<PdfPageMap | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMls(null);
      setPdfUrl(null);
      setPages(null);
      setCurrentPage(1);
      setShortUrl(null);
      setRecipient("");
      const phoneOk = !listing.agent_phone || /^[+()\-\s.\d]{7,30}$/.test(listing.agent_phone.trim());
      const emailOk = !listing.agent_email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(listing.agent_email.trim());
      if (!phoneOk) toast.error("Agent phone number looks invalid — fix it in Edit Listing before sharing.");
      if (!emailOk) toast.error("Agent email looks invalid — fix it in Edit Listing before sharing.");
      const found = listing.id ? await findListingMlsDocument(listing.id) : null;
      if (cancelled) return;
      if (found) {
        setMls(found);
        // Shorten the long signed Supabase URL so mailto: stays compact.
        const s = await shortenUrl(found.url);
        if (!cancelled) setShortUrl(s);
      } else {
        const preview = await buildListingPdfPreview(listing);
        if (cancelled) return;
        setPdfUrl(preview.url);
        setPages(preview.pages);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, listing]);

  const baseUrl = mls?.url ?? pdfUrl ?? null;
  const previewUrl = useMemo(() => {
    if (!baseUrl) return null;
    if (mls) return baseUrl;
    return `${baseUrl}#page=${currentPage}&zoom=page-width`;
  }, [baseUrl, currentPage, mls]);

  // Use the shortened URL in the email body whenever available.
  const linkForEmail = shortUrl ?? mls?.url;
  const subject = buildShareSubject(listing);
  const body = buildShareBody(listing, linkForEmail);

  function handleOpenEmail() {
    shareListingViaEmail(listing, linkForEmail, recipient);
  }

  async function handleCopy() {
    try {
      await copyEmailContentToClipboard(listing, linkForEmail);
      toast.success("Email text copied! Paste directly into Gmail or Outlook.");
    } catch {
      toast.error("Couldn't copy to clipboard — please copy manually from the preview.");
    }
  }

  const navItems: Array<{ label: string; page: number | null; icon: typeof LayoutGrid }> =
    pages
      ? [
          { label: "Details", page: pages.details, icon: LayoutGrid },
          { label: "Market History", page: pages.market, icon: History },
          { label: "Gallery", page: pages.gallery, icon: Images },
        ]
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-3 border-b border-border">
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Share Listing — Preview
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            {loading
              ? "Preparing preview…"
              : mls
                ? `Using uploaded MLS document: ${mls.name}`
                : "No MLS document found — auto-generated property feature sheet."}
          </div>
        </DialogHeader>

        {!mls && pages && (
          <div className="flex flex-wrap items-center gap-1.5 px-5 py-2 border-b border-border bg-muted/30">
            <span className="text-xs text-muted-foreground mr-1">Jump to:</span>
            {navItems.map((item) => {
              const disabled = item.page == null;
              const active = item.page === currentPage;
              const Icon = item.icon;
              return (
                <Button
                  key={item.label}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => item.page && setCurrentPage(item.page)}
                  className={cn("h-7 px-2.5 text-xs", disabled && "opacity-50")}
                  title={disabled ? `${item.label} not in this sheet` : `Go to ${item.label}`}
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {item.label}
                  {item.page != null && (
                    <span className="ml-1 text-[10px] opacity-70">p.{item.page}</span>
                  )}
                </Button>
              );
            })}
            <span className="ml-auto text-xs text-muted-foreground">
              Page {currentPage} / {pages.total}
            </span>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_320px] overflow-hidden">
          <div className="bg-muted/30 overflow-y-auto min-h-[300px] flex items-center justify-center">
            {loading || !previewUrl ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <iframe
                key={previewUrl}
                src={previewUrl}
                title="Listing preview"
                className="w-full h-[70vh] md:h-full border-0 bg-background"
              />
            )}
          </div>
          <aside className="border-t md:border-t-0 md:border-l border-border p-4 overflow-y-auto space-y-4 bg-muted/10 w-full md:w-[340px] flex flex-col">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold tracking-tight text-foreground">Email Composition</h4>
              <p className="text-xs text-muted-foreground">Preview your email & shortened sheet link.</p>
            </div>

            {/* Email Composer Window Mockup */}
            <div className="rounded-lg border border-border bg-card shadow-sm text-card-foreground flex flex-col overflow-hidden text-xs">
              {/* Header metadata */}
              <div className="border-b border-border bg-muted/40 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-12 font-medium">From:</span>
                  <span className="text-foreground truncate select-none">
                    {listing.agent_name ? `${listing.agent_name} <${listing.agent_email || "you@tracker.com"}>` : "You"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-12 font-medium">To:</span>
                  <Input
                    type="email"
                    placeholder="recipient@email.com (optional)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="h-7 text-xs py-0.5 px-2 bg-background border-muted flex-1"
                  />
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-12 font-medium pt-0.5">Subject:</span>
                  <span className="text-foreground font-medium flex-1 line-clamp-2 leading-relaxed">
                    {subject}
                  </span>
                </div>
              </div>

              {/* Document attachment/shortened URL section */}
              <div className="border-b border-border bg-muted/20 p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Feature Sheet Link:</span>
                  {mls && shortUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        navigator.clipboard.writeText(shortUrl);
                        toast.success("Short link copied!");
                      }}
                      title="Copy Short Link"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {mls ? (
                  shortUrl ? (
                    <div className="bg-background border border-border rounded p-1.5 font-mono text-[10px] break-all flex items-center justify-between text-primary">
                      <span>{shortUrl}</span>
                      <a href={mls.url} target="_blank" rel="noreferrer" title="Open original long link" className="inline-flex">
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary ml-1" />
                      </a>
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground italic flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating shortened secure URL...
                    </div>
                  )
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground block italic leading-normal">
                      Auto-generated feature sheet PDF.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-[11px] px-2"
                      onClick={() => downloadListingPdf(listing)}
                    >
                      <Download className="h-3 w-3 mr-1" /> Download PDF
                    </Button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-2.5 bg-background">
                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Email Body Preview</div>
                <div className="max-h-[220px] overflow-y-auto pr-1 select-text">
                  <pre className="whitespace-pre-wrap break-words font-sans text-xs text-foreground/90 leading-relaxed bg-muted/30 p-2 rounded border border-border/60">
                    {body}
                  </pre>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleCopy} disabled={loading}>
            <Copy className="h-4 w-4 mr-1.5" /> Copy Email Content
          </Button>
          <Button onClick={handleOpenEmail} disabled={loading}>
            <Mail className="h-4 w-4 mr-1.5" /> Open Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
