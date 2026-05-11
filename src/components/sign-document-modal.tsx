import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { PDFDocument } from "pdf-lib";
import { Upload, Pen, X, Loader2, Move } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Doc {
  id: string;
  name: string;
  file_path: string;
  mime_type: string | null;
  user_id?: string;
}

interface Props {
  doc: Doc | null;
  userId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSigned: () => void;
}

type Step = "capture" | "place";

export function SignDocumentModal({ doc, userId, open, onOpenChange, onSigned }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const [step, setStep] = useState<Step>("capture");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfPageImages, setPdfPageImages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [sigSize] = useState({ w: 180, h: 70 });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("capture");
      setSignatureDataUrl(null);
      setDocUrl(null);
      setPos(null);
      setPdfPageImages([]);
      setPageIndex(0);
      sigRef.current?.clear();
    }
  }, [open]);

  async function loadDoc() {
    if (!doc) return;
    setLoading(true);
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 600);
    if (error || !data) { toast.error("Failed to load document"); setLoading(false); return; }
    const mime = doc.mime_type ?? "";
    const pdf = mime.includes("pdf") || doc.file_path.toLowerCase().endsWith(".pdf");
    setIsPdf(pdf);
    setDocUrl(data.signedUrl);
    if (pdf) {
      // Render PDF pages to images via pdf-lib + canvas using pdfjs from CDN
      try {
        const pdfjs = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/+esm" as string);
        // @ts-ignore
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
        const buf = await fetch(data.signedUrl).then(r => r.arrayBuffer());
        // @ts-ignore
        const pdfDoc = await pdfjs.getDocument({ data: buf }).promise;
        const imgs: string[] = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          imgs.push(canvas.toDataURL("image/png"));
        }
        setPdfPageImages(imgs);
      } catch (e: any) {
        toast.error("Couldn't render PDF: " + (e?.message ?? ""));
      }
    }
    setLoading(false);
  }

  async function handleCapture() {
    if (tab === "draw") {
      if (!sigRef.current || sigRef.current.isEmpty()) return toast.error("Draw your signature first");
      const dataUrl = sigRef.current.getCanvas().toDataURL("image/png");
      setSignatureDataUrl(dataUrl);
    } else if (!signatureDataUrl) {
      return toast.error("Upload a signature image");
    }
    setStep("place");
    await loadDoc();
  }

  function onUpload(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Please upload PNG or JPG");
    const reader = new FileReader();
    reader.onload = () => setSignatureDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleDocClick(e: React.MouseEvent) {
    if (dragging.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: e.clientX - rect.left - sigSize.w / 2, y: e.clientY - rect.top - sigSize.h / 2 });
  }

  function startDrag(e: React.PointerEvent) {
    e.stopPropagation();
    dragging.current = true;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
  }
  function onDrag(e: React.PointerEvent) {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left - sigSize.w / 2, y: e.clientY - rect.top - sigSize.h / 2 });
  }
  function endDrag(e: React.PointerEvent) {
    dragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setTimeout(() => { dragging.current = false; }, 50);
  }

  async function confirmSign() {
    if (!doc || !signatureDataUrl || !pos) return toast.error("Place the signature first");
    setSaving(true);
    try {
      // Upload signature image
      const sigPath = `${userId}/${Date.now()}-sig.png`;
      const sigBlob = await (await fetch(signatureDataUrl)).blob();
      const sigUp = await supabase.storage.from("signatures").upload(sigPath, sigBlob, { contentType: "image/png" });
      if (sigUp.error) throw sigUp.error;

      // Build signed file
      const origBuf = await fetch(docUrl!).then(r => r.arrayBuffer());
      const sigBuf = await sigBlob.arrayBuffer();
      let signedBytes: Uint8Array;
      let signedExt = "png";
      let signedMime = "image/png";

      if (isPdf) {
        const pdfDoc = await PDFDocument.load(origBuf);
        const sigImg = await pdfDoc.embedPng(sigBuf);
        const page = pdfDoc.getPage(pageIndex);
        const { width: pw, height: ph } = page.getSize();
        // Map from rendered image pixel coords to PDF pts
        const imgEl = containerRef.current?.querySelector("img");
        const renderedW = imgEl?.clientWidth ?? pw;
        const renderedH = imgEl?.clientHeight ?? ph;
        const sx = pw / renderedW;
        const sy = ph / renderedH;
        const x = pos.x * sx;
        const y = ph - (pos.y + sigSize.h) * sy;
        page.drawImage(sigImg, { x, y, width: sigSize.w * sx, height: sigSize.h * sy });
        signedBytes = await pdfDoc.save();
        signedExt = "pdf";
        signedMime = "application/pdf";
      } else {
        // Composite onto image via canvas
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = docUrl!;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const imgEl = containerRef.current?.querySelector("img");
        const renderedW = imgEl?.clientWidth ?? img.naturalWidth;
        const renderedH = imgEl?.clientHeight ?? img.naturalHeight;
        const sx = img.naturalWidth / renderedW;
        const sy = img.naturalHeight / renderedH;
        const sigImg = new Image();
        sigImg.src = signatureDataUrl;
        await new Promise((res, rej) => { sigImg.onload = res; sigImg.onerror = rej; });
        ctx.drawImage(sigImg, pos.x * sx, pos.y * sy, sigSize.w * sx, sigSize.h * sy);
        const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), "image/png"));
        signedBytes = new Uint8Array(await blob.arrayBuffer());
        signedExt = "png";
        signedMime = "image/png";
      }

      const signedPath = `${userId}/${Date.now()}-${doc.name.replace(/\.[^.]+$/, "")}.${signedExt}`;
      const upSigned = await supabase.storage.from("signed-documents").upload(signedPath, signedBytes, { contentType: signedMime });
      if (upSigned.error) throw upSigned.error;

      // Save coordinates
      await supabase.from("signature_coordinates").insert({
        user_id: userId,
        document_id: doc.id,
        signature_path: sigPath,
        page_number: pageIndex + 1,
        pos_x: pos.x,
        pos_y: pos.y,
        width: sigSize.w,
        height: sigSize.h,
      });

      // Update document
      await supabase.from("documents").update({
        status: "signed",
        signed_at: new Date().toISOString(),
        file_path: signedPath,
        mime_type: signedMime,
      }).eq("id", doc.id);

      toast.success("Document signed");
      onSigned();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to sign");
    } finally {
      setSaving(false);
    }
  }

  const currentImg = isPdf ? pdfPageImages[pageIndex] : docUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{step === "capture" ? "Sign Document" : "Place Your Signature"}</DialogTitle>
        </DialogHeader>

        {step === "capture" && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="draw"><Pen className="h-4 w-4 mr-1.5" />Draw</TabsTrigger>
              <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1.5" />Upload</TabsTrigger>
            </TabsList>
            <TabsContent value="draw" className="space-y-3">
              <div className="border-2 border-dashed rounded-lg bg-muted/20 touch-none">
                <SignatureCanvas
                  ref={(r) => { sigRef.current = r; }}
                  penColor="black"
                  canvasProps={{ className: "w-full h-48 sm:h-56 rounded-lg" }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => sigRef.current?.clear()}>Clear</Button>
              </div>
            </TabsContent>
            <TabsContent value="upload" className="space-y-3">
              <label
                className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-48 sm:h-56 cursor-pointer hover:bg-muted/30"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onUpload(f); }}
              >
                <input type="file" accept="image/png,image/jpeg" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
                {signatureDataUrl ? (
                  <img src={signatureDataUrl} alt="Signature preview" className="max-h-40" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <div className="text-sm">Drop PNG/JPG or click to upload</div>
                  </>
                )}
              </label>
            </TabsContent>
          </Tabs>
        )}

        {step === "place" && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Tap or click anywhere on the document to place your signature, then drag to fine-tune.
            </div>
            {isPdf && pdfPageImages.length > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <Button size="sm" variant="outline" disabled={pageIndex === 0} onClick={() => { setPageIndex(p => p - 1); setPos(null); }}>Prev</Button>
                <span>Page {pageIndex + 1} / {pdfPageImages.length}</span>
                <Button size="sm" variant="outline" disabled={pageIndex >= pdfPageImages.length - 1} onClick={() => { setPageIndex(p => p + 1); setPos(null); }}>Next</Button>
              </div>
            )}
            <div className="max-h-[60vh] overflow-auto border rounded-lg bg-muted/30">
              {loading || !currentImg ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div ref={containerRef} className="relative inline-block w-full" onClick={handleDocClick}>
                  <img src={currentImg} alt="Document" className="block w-full select-none" draggable={false} />
                  {pos && signatureDataUrl && (
                    <div
                      className="absolute border-2 border-primary/60 bg-white/40 rounded touch-none cursor-move"
                      style={{ left: pos.x, top: pos.y, width: sigSize.w, height: sigSize.h }}
                      onPointerDown={startDrag}
                      onPointerMove={onDrag}
                      onPointerUp={endDrag}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img src={signatureDataUrl} alt="" className="w-full h-full object-contain pointer-events-none" />
                      <Move className="absolute -top-2 -right-2 h-4 w-4 bg-primary text-primary-foreground rounded p-0.5" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "capture" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleCapture}>Capture & Continue</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("capture")}>Back</Button>
              <Button onClick={confirmSign} disabled={saving || !pos}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Signing…</> : "Confirm Placement & Sign"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
