import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { PDFDocument } from "pdf-lib";
import { Upload, Pen, Loader2, Copy, Trash2 } from "lucide-react";
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
type Placement = { id: string; page: number; x: number; y: number; w: number; h: number };

const DEFAULT_W = 180;
const DEFAULT_H = 70;

export function SignDocumentModal({ doc, userId, open, onOpenChange, onSigned }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const [step, setStep] = useState<Step>("capture");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfPageImages, setPdfPageImages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const dragState = useRef<{ id: string; mode: "move" | "resize"; startX: number; startY: number; orig: Placement } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("capture");
      setSignatureDataUrl(null);
      setDocUrl(null);
      setPlacements([]);
      setSelectedId(null);
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
      try {
        const pdfjsUrl = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs";
        const pdfjs: any = await import(/* @vite-ignore */ pdfjsUrl);
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
        const buf = await fetch(data.signedUrl).then(r => r.arrayBuffer());
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
    if (dragState.current) return;
    // Don't add when clicking on existing placement
    if ((e.target as HTMLElement).closest("[data-placement]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left - DEFAULT_W / 2;
    const y = e.clientY - rect.top - DEFAULT_H / 2;
    const p: Placement = { id: crypto.randomUUID(), page: pageIndex, x, y, w: DEFAULT_W, h: DEFAULT_H };
    setPlacements(prev => [...prev, p]);
    setSelectedId(p.id);
  }

  function startDrag(e: React.PointerEvent, p: Placement, mode: "move" | "resize") {
    e.stopPropagation();
    setSelectedId(p.id);
    dragState.current = { id: p.id, mode, startX: e.clientX, startY: e.clientY, orig: { ...p } };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDrag(e: React.PointerEvent) {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setPlacements(prev => prev.map(p => {
      if (p.id !== d.id) return p;
      if (d.mode === "move") return { ...p, x: d.orig.x + dx, y: d.orig.y + dy };
      return { ...p, w: Math.max(40, d.orig.w + dx), h: Math.max(20, d.orig.h + dy) };
    }));
  }
  function endDrag(e: React.PointerEvent) {
    if (!dragState.current) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    setTimeout(() => { dragState.current = null; }, 50);
  }

  function duplicateSelected() {
    const sel = placements.find(p => p.id === selectedId);
    if (!sel) return toast.error("Select a signature to duplicate");
    const copy: Placement = { ...sel, id: crypto.randomUUID(), x: sel.x + 20, y: sel.y + 20, page: pageIndex };
    setPlacements(prev => [...prev, copy]);
    setSelectedId(copy.id);
  }
  function deleteSelected() {
    if (!selectedId) return;
    setPlacements(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(null);
  }
  function updateSize(dim: "w" | "h", val: number) {
    if (!selectedId) return;
    setPlacements(prev => prev.map(p => p.id === selectedId ? { ...p, [dim]: Math.max(dim === "w" ? 40 : 20, val) } : p));
  }

  async function confirmSign() {
    if (!doc || !signatureDataUrl) return;
    if (placements.length === 0) return toast.error("Place at least one signature");
    setSaving(true);
    try {
      const sigPath = `${userId}/${Date.now()}-sig.png`;
      const sigBlob = await (await fetch(signatureDataUrl)).blob();
      const sigUp = await supabase.storage.from("signatures").upload(sigPath, sigBlob, { contentType: "image/png" });
      if (sigUp.error) throw sigUp.error;

      const origBuf = await fetch(docUrl!).then(r => r.arrayBuffer());
      const sigBuf = await sigBlob.arrayBuffer();
      let signedBytes: Uint8Array;
      let signedExt = "png";
      let signedMime = "image/png";

      const imgEl = containerRef.current?.querySelector("img") as HTMLImageElement | null;
      const renderedW = imgEl?.clientWidth ?? 1;
      const renderedH = imgEl?.clientHeight ?? 1;

      if (isPdf) {
        const pdfDoc = await PDFDocument.load(origBuf);
        const sigImg = await pdfDoc.embedPng(sigBuf);
        // Group placements per page; assume each page rendered to same scale ratio
        for (const p of placements) {
          const page = pdfDoc.getPage(p.page);
          const { width: pw, height: ph } = page.getSize();
          // Use current rendered dims (all pages rendered at scale 1.5 — proportional)
          const sx = pw / renderedW;
          const sy = ph / renderedH;
          page.drawImage(sigImg, {
            x: p.x * sx,
            y: ph - (p.y + p.h) * sy,
            width: p.w * sx,
            height: p.h * sy,
          });
        }
        signedBytes = await pdfDoc.save();
        signedExt = "pdf";
        signedMime = "application/pdf";
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = docUrl!;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const sx = img.naturalWidth / renderedW;
        const sy = img.naturalHeight / renderedH;
        const sigImg = new Image();
        sigImg.src = signatureDataUrl;
        await new Promise((res, rej) => { sigImg.onload = res; sigImg.onerror = rej; });
        for (const p of placements) {
          ctx.drawImage(sigImg, p.x * sx, p.y * sy, p.w * sx, p.h * sy);
        }
        const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), "image/png"));
        signedBytes = new Uint8Array(await blob.arrayBuffer());
      }

      const signedPath = `${userId}/${Date.now()}-${doc.name.replace(/\.[^.]+$/, "")}.${signedExt}`;
      const upSigned = await supabase.storage.from("signed-documents").upload(signedPath, signedBytes, { contentType: signedMime });
      if (upSigned.error) throw upSigned.error;
      const newDocPath = `${userId}/${Date.now()}-signed-${doc.name.replace(/\.[^.]+$/, "")}.${signedExt}`;
      await supabase.storage.from("documents").upload(newDocPath, signedBytes, { contentType: signedMime });

      // Persist all placement coordinates
      const rows = placements.map(p => ({
        user_id: userId,
        document_id: doc.id,
        signature_path: sigPath,
        page_number: p.page + 1,
        pos_x: p.x,
        pos_y: p.y,
        width: p.w,
        height: p.h,
      }));
      await supabase.from("signature_coordinates").insert(rows);

      await supabase.from("documents").update({
        status: "signed",
        signed_at: new Date().toISOString(),
        file_path: newDocPath,
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
  const visiblePlacements = placements.filter(p => p.page === pageIndex || !isPdf);
  const selected = placements.find(p => p.id === selectedId) ?? null;

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
              Click anywhere to place a signature. Drag to move, drag the corner to resize. Add as many as you need.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isPdf && pdfPageImages.length > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <Button size="sm" variant="outline" disabled={pageIndex === 0} onClick={() => { setPageIndex(p => p - 1); setSelectedId(null); }}>Prev</Button>
                  <span>Page {pageIndex + 1} / {pdfPageImages.length}</span>
                  <Button size="sm" variant="outline" disabled={pageIndex >= pdfPageImages.length - 1} onClick={() => { setPageIndex(p => p + 1); setSelectedId(null); }}>Next</Button>
                </div>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {selected && (
                  <>
                    <label className="text-xs text-muted-foreground">W</label>
                    <input type="number" value={Math.round(selected.w)} onChange={(e) => updateSize("w", Number(e.target.value))}
                      className="w-16 h-8 px-2 rounded border bg-background text-sm" />
                    <label className="text-xs text-muted-foreground">H</label>
                    <input type="number" value={Math.round(selected.h)} onChange={(e) => updateSize("h", Number(e.target.value))}
                      className="w-16 h-8 px-2 rounded border bg-background text-sm" />
                    <Button size="sm" variant="outline" onClick={duplicateSelected}><Copy className="h-3.5 w-3.5 mr-1" />Duplicate</Button>
                    <Button size="sm" variant="outline" onClick={deleteSelected}><Trash2 className="h-3.5 w-3.5 mr-1" />Remove</Button>
                  </>
                )}
                <span className="text-xs text-muted-foreground">{placements.length} placed</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto border rounded-lg bg-muted/30">
              {loading || !currentImg ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div ref={containerRef} className="relative inline-block w-full" onClick={handleDocClick}>
                  <img src={currentImg} alt="Document" className="block w-full select-none" draggable={false} />
                  {visiblePlacements.map(p => {
                    const isSel = p.id === selectedId;
                    return (
                      <div
                        key={p.id}
                        data-placement
                        className={`absolute touch-none cursor-move rounded ${isSel ? "border-2 border-primary bg-primary/10" : "border border-primary/40 bg-background"}`}
                        style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
                        onPointerDown={(e) => startDrag(e, p, "move")}
                        onPointerMove={onDrag}
                        onPointerUp={endDrag}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(p.id); }}
                      >
                        {signatureDataUrl && (
                          <img src={signatureDataUrl} alt="" className="w-full h-full object-contain pointer-events-none" />
                        )}
                        {isSel && (
                          <div
                            className="absolute -bottom-1.5 -right-1.5 h-4 w-4 bg-primary rounded-sm cursor-nwse-resize border-2 border-background"
                            onPointerDown={(e) => startDrag(e, p, "resize")}
                            onPointerMove={onDrag}
                            onPointerUp={endDrag}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    );
                  })}
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
              <Button onClick={confirmSign} disabled={saving || placements.length === 0}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Signing…</> : `Confirm & Sign (${placements.length})`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
