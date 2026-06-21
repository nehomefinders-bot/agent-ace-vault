import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, FileText, ExternalLink, Download } from "lucide-react";
import {
  findListingMlsDocument,
  listingPdfDataUrl,
  shareListingViaEmail,
  buildShareBody,
  buildShareSubject,
  downloadListingPdf,
  type ShareableListing,
  type MlsAttachment,
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMls(null);
      setPdfUrl(null);
      const found = listing.id ? await findListingMlsDocument(listing.id) : null;
      if (cancelled) return;
      if (found) {
        setMls(found);
      } else {
        setPdfUrl(await listingPdfDataUrl(listing));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, listing]);

  const previewUrl = mls?.url ?? pdfUrl ?? null;
  const subject = buildShareSubject(listing);
  const body = buildShareBody(listing, mls?.url);

  function handleSend() {
    shareListingViaEmail(listing, mls?.url);
    onOpenChange(false);
  }

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

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_320px] overflow-hidden">
          <div className="bg-muted/30 overflow-y-auto min-h-[300px] flex items-center justify-center">
            {loading || !previewUrl ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <iframe
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
