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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findListingMlsDocument,
  buildListingPdfPreview,
  shareListingViaEmail,
  buildShareBody,
  buildShareSubject,
  downloadListingPdf,
  copyEmailContentToClipboard,
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMls(null);
      setPdfUrl(null);
      setPages(null);
      setCurrentPage(1);
      // Friendly validation for agent branding before generating the PDF.
      const phoneOk = !listing.agent_phone || /^[+()\-\s.\d]{7,30}$/.test(listing.agent_phone.trim());
      const emailOk = !listing.agent_email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(listing.agent_email.trim());
      if (!phoneOk) {
        toast.error("Agent phone number looks invalid — fix it in Edit Listing before sharing.");
      }
      if (!emailOk) {
        toast.error("Agent email looks invalid — fix it in Edit Listing before sharing.");
      }
      const found = listing.id ? await findListingMlsDocument(listing.id) : null;
      if (cancelled) return;
      if (found) {
        setMls(found);
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

  const subject = buildShareSubject(listing);
  const body = buildShareBody(listing, mls?.url);

  function handleSend() {
    shareListingViaEmail(listing, mls?.url);
    onOpenChange(false);
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
          <aside className="border-t md:border-t-0 md:border-l border-border p-4 overflow-y-auto space-y-3 bg-background">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Subject</div>
              <div className="text-sm font-medium mt-0.5 break-words">{subject}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Body</div>
              <pre className="text-xs whitespace-pre-wrap break-words mt-0.5 p-2 rounded-md bg-muted/50 border border-border max-h-72 overflow-y-auto">
                {body}
              </pre>
            </div>
            {mls && (
              <a
                href={mls.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open MLS document
              </a>
            )}
            {!mls && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => downloadListingPdf(listing)}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
              </Button>
            )}
          </aside>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            <Mail className="h-4 w-4 mr-1.5" /> Open Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
