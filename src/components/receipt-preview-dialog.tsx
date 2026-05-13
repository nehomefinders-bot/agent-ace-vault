import { ArrowUpRight, Download, FileQuestion, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getReceiptFileName, getReceiptPreviewKind, type ReceiptPreviewKind } from "@/lib/receipt-preview";

export function ReceiptPreviewDialog({
  open,
  onOpenChange,
  title,
  fileUrl,
  fileName,
  kind,
  subtitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileUrl: string | null;
  fileName?: string;
  kind?: ReceiptPreviewKind;
  subtitle?: string;
}) {
  const resolvedName = fileName ?? "receipt";
  const resolvedKind = kind ?? getReceiptPreviewKind(resolvedName);
  const isImage = resolvedKind === "image";
  const isPdf = resolvedKind === "pdf";
  const displayName = getReceiptFileName(resolvedName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="break-all">
            {subtitle ? <span className="block">{subtitle}</span> : null}
            <span className="block text-xs text-muted-foreground/80 mt-1">{displayName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-muted/30 overflow-hidden">
          <div className="h-[min(68dvh,42rem)] w-full bg-background">
            {fileUrl ? (
              isPdf ? (
                <iframe title={title} src={fileUrl} className="h-full w-full border-0" />
              ) : isImage ? (
                <img
                  src={fileUrl}
                  alt={title}
                  className="h-full w-full object-contain bg-black/5"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    <FileQuestion className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-medium">Preview unavailable</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Open the file in a new tab or download it to view the contents.
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div>Loading preview...</div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {fileUrl ? (
            <>
              <Button variant="outline" asChild>
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  <ArrowUpRight className="h-4 w-4" />
                  Open in new tab
                </a>
              </Button>
              <Button variant="secondary" asChild>
                <a href={fileUrl} download={displayName}>
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </Button>
            </>
          ) : null}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
