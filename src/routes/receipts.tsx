import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ScanLine, Upload, Camera, Loader2, X, Check, Trash2, FileText } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { ReceiptPreviewDialog } from "@/components/receipt-preview-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoneyCents } from "@/lib/mock-data";
import { getReceiptFileName, getReceiptPreviewKind } from "@/lib/receipt-preview";

export const Route = createFileRoute("/receipts")({
  component: Receipts,
  head: () => ({ meta: [{ title: "Receipts - Agent Business Tracker" }] }),
});

interface ReceiptRow {
  id: string;
  image_path: string;
  status: string;
  vendor: string | null;
  receipt_date: string | null;
  total: number | null;
  suggested_category: string | null;
  created_at: string;
}

function Receipts() {
  const { user, loading: authLoading } = useAuth();
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{
    title: string;
    subtitle: string;
    fileUrl: string;
    fileName: string;
    kind: "image" | "pdf" | "other";
  } | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!user) return;
    const { data, error } = await supabase
      .from("receipts")
      .select("id,image_path,status,vendor,receipt_date,total,suggested_category,created_at")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) setError(error.message);
    else setReceipts(data ?? []);
    setLoading(false);

    // Generate signed URLs for thumbnails
    const urls: Record<string, string> = {};
    for (const r of data ?? []) {
      const { data: signed } = await supabase.storage
        .from("receipts")
        .createSignedUrl(r.image_path, 60 * 30);
      if (signed?.signedUrl) urls[r.id] = signed.signedUrl;
    }
    setPreviewUrls(urls);
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleFile(file: File) {
    if (!user) { setError("Sign in to scan receipts."); return; }
    setError(null);
    setScanning(true);
    try {
      // 1. Upload
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("receipts").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      // 2. Insert pending row
      const { data: inserted, error: insErr } = await supabase
        .from("receipts")
        .insert({ user_id: user.id, image_path: path, status: "pending" })
        .select().single();
      if (insErr) throw insErr;

      // 3. Convert to data URL and call scan-receipt
      const dataUrl = await fileToDataUrl(file);
      const { data: scan, error: fnErr } = await supabase.functions.invoke("scan-receipt", {
        body: { imageDataUrl: dataUrl },
      });
      if (fnErr) throw fnErr;
      if (scan?.error) throw new Error(scan.error);

      const ex = scan.extracted ?? {};
      await supabase.from("receipts").update({
        status: "scanned",
        vendor: ex.vendor,
        receipt_date: ex.receipt_date,
        subtotal: ex.subtotal,
        tax: ex.tax,
        total: ex.total,
        suggested_category: ex.suggested_category,
        notes: ex.notes,
        raw_ai: scan.raw,
      }).eq("id", inserted.id);

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function deleteReceipt(r: ReceiptRow) {
    await supabase.storage.from("receipts").remove([r.image_path]);
    await supabase.from("receipts").delete().eq("id", r.id);
    setReceipts((rs) => rs.filter((x) => x.id !== r.id));
  }

  async function openReceiptPreview(r: ReceiptRow) {
    setPreviewingId(r.id);
    try {
      const fileUrl = previewUrls[r.id] ?? (await supabase.storage.from("receipts").createSignedUrl(r.image_path, 60 * 30)).data?.signedUrl;
      if (!fileUrl) throw new Error("Could not open this receipt.");

      setPreview({
        title: r.vendor ? `${r.vendor} receipt` : "Receipt preview",
        subtitle: [r.receipt_date, r.total != null ? formatMoneyCents(Number(r.total)) : null].filter(Boolean).join(" - "),
        fileUrl,
        fileName: getReceiptFileName(r.image_path),
        kind: getReceiptPreviewKind(r.image_path),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this receipt.");
    } finally {
      setPreviewingId(null);
    }
  }

  if (authLoading) return <PageShell title="Receipts"><div /></PageShell>;
  if (!user) {
    return (
      <PageShell title="Receipts" subtitle="Sign in to start scanning receipts.">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <a href="/auth" className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">Sign in</a>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Receipts"
      subtitle="Snap, scan, and auto-categorize. Powered by AI - extracts vendor, date, total and Schedule C category."
      actions={
        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {scanning ? "Scanning..." : "Upload"}
        </button>
      }
    >
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      <ReceiptPreviewDialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        title={preview?.title ?? "Receipt preview"}
        subtitle={preview?.subtitle}
        fileUrl={preview?.fileUrl ?? null}
        fileName={preview?.fileName}
        kind={preview?.kind}
      />

      {error && (
        <div className="mb-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={scanning}
          className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-card hover:border-primary/50 transition disabled:opacity-60"
        >
          <div className="h-12 w-12 mx-auto rounded-xl bg-secondary/20 flex items-center justify-center mb-3">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <div className="font-display font-bold mb-1">Scan with camera</div>
          <div className="text-xs text-muted-foreground">Snap a photo - AI extracts vendor, date and total.</div>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-card hover:border-primary/50 transition disabled:opacity-60"
        >
          <div className="h-12 w-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            {scanning ? <Loader2 className="h-6 w-6 text-primary animate-spin" /> : <Upload className="h-6 w-6 text-primary" />}
          </div>
          <div className="font-display font-bold mb-1">{scanning ? "Scanning..." : "Upload a file"}</div>
          <div className="text-xs text-muted-foreground">JPG or PNG. We auto-categorize for Schedule C.</div>
        </button>
      </div>

      <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Recently scanned
      </h2>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : receipts.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No receipts yet. Scan your first one above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {receipts.map((r) => {
            const kind = getReceiptPreviewKind(r.image_path);
            const canPreview = kind === "image" && !!previewUrls[r.id];

            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                aria-label={`Open receipt preview for ${r.vendor ?? "Untitled"}`}
                onClick={() => openReceiptPreview(r)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openReceiptPreview(r);
                  }
                }}
                className="bg-card border border-border rounded-2xl shadow-card overflow-hidden group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                  {canPreview ? (
                    <img src={previewUrls[r.id]} alt={r.vendor ?? "Receipt"} className="w-full h-full object-cover" />
                  ) : kind === "pdf" ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-center px-4">
                      <FileText className="h-10 w-10 text-muted-foreground/40" />
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">PDF receipt</span>
                    </div>
                  ) : (
                    <ScanLine className="h-10 w-10 text-muted-foreground/40" />
                  )}
                  {previewingId === r.id ? (
                    <div className="absolute inset-0 bg-background flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : null}
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm truncate">{r.vendor ?? "Untitled"}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{r.receipt_date ?? "-"}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {r.total != null ? formatMoneyCents(Number(r.total)) : "-"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {r.status === "scanned" ? (
                      <StatusPill tone="success">
                        <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" />{r.suggested_category ?? "Scanned"}</span>
                      </StatusPill>
                    ) : r.status === "failed" ? (
                      <StatusPill tone="danger">Failed</StatusPill>
                    ) : (
                      <StatusPill tone="warning">Pending</StatusPill>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteReceipt(r);
                      }}
                      className="opacity-100 text-muted-foreground hover:text-destructive transition sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
