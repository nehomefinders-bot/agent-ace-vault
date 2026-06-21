import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Download,
  Trash2,
  Upload,
  Loader2,
  FileText,
  FileImage,
  File as FileIcon,
  X,
  Pencil,
  Check,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const BUCKET = "listing-documents";
const MAX_FILE_MB = 25;

export interface ListingDocumentRow {
  id: string;
  listing_id: string;
  user_id: string;
  name: string;
  path: string;
  size: number;
  mime_type: string | null;
  created_at: string;
}

function formatBytes(n: number) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function iconFor(mime: string | null, name: string) {
  const m = (mime ?? "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext))
    return <FileImage className="h-5 w-5 text-blue-500" />;
  if (m === "application/pdf" || ext === "pdf")
    return <FileText className="h-5 w-5 text-red-500" />;
  if (ext === "doc" || ext === "docx")
    return <FileText className="h-5 w-5 text-sky-600" />;
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

async function downloadOne(path: string, name: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, {
    download: name,
  });
  if (error || !data?.signedUrl) {
    toast.error(error?.message || "Failed to fetch file");
    return;
  }
  const a = document.createElement("a");
  a.href = data.signedUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ListingDocumentsModal({
  open,
  onOpenChange,
  listingId,
  userId,
  listingLabel,
  onCountChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listingId: string;
  userId: string;
  listingLabel?: string;
  onCountChange?: (n: number) => void;
}) {
  const [docs, setDocs] = useState<ListingDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("listing_documents")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const rows = (data ?? []) as ListingDocumentRow[];
    setDocs(rows);
    setSelected(new Set());
    onCountChange?.(rows.length);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listingId]);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    const uploaded: { path: string; row: Omit<ListingDocumentRow, "id" | "created_at"> }[] = [];
    try {
      for (const f of arr) {
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          toast.error(`${f.name}: over ${MAX_FILE_MB}MB`);
          continue;
        }
        const ext = f.name.split(".").pop() || "bin";
        const path = `${userId}/${listingId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, f, {
          contentType: f.type || "application/octet-stream",
          upsert: false,
        });
        if (error) {
          toast.error(`${f.name}: ${error.message}`);
          continue;
        }
        uploaded.push({
          path,
          row: {
            listing_id: listingId,
            user_id: userId,
            name: f.name,
            path,
            size: f.size,
            mime_type: f.type || null,
          },
        });
      }
      if (uploaded.length) {
        const { error: insErr } = await supabase
          .from("listing_documents")
          .insert(uploaded.map((u) => u.row));
        if (insErr) {
          await supabase.storage.from(BUCKET).remove(uploaded.map((u) => u.path)).catch(() => {});
          throw insErr;
        }
        toast.success(`Uploaded ${uploaded.length} file${uploaded.length > 1 ? "s" : ""}`);
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(d: ListingDocumentRow) {
    if (!confirm(`Delete ${d.name}?`)) return;
    await supabase.storage.from(BUCKET).remove([d.path]).catch(() => {});
    const { error } = await supabase.from("listing_documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Document deleted");
    await load();
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === docs.length) setSelected(new Set());
    else setSelected(new Set(docs.map((d) => d.id)));
  }

  async function downloadSelected() {
    const chosen = docs.filter((d) => selected.has(d.id));
    if (!chosen.length) return;
    toast.info(`Downloading ${chosen.length} file${chosen.length > 1 ? "s" : ""}…`);
    for (const d of chosen) {
      await downloadOne(d.path, d.name);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Documents</DialogTitle>
          {listingLabel && (
            <div className="text-sm text-muted-foreground truncate">{listingLabel}</div>
          )}
        </DialogHeader>

        <div className="px-6 pt-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {uploading ? (
              <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            )}
            <div className="text-sm font-medium">
              {uploading ? "Uploading…" : "Drag & drop files or click to upload"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              PDF, PNG, JPEG, DOCX · up to {MAX_FILE_MB}MB each
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[180px]">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No documents uploaded yet.
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
                <Checkbox
                  checked={selected.size === docs.length && docs.length > 0}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
                <span className="flex-1">Name</span>
                <span className="w-20 text-right">Size</span>
                <span className="w-20 text-right">Actions</span>
              </div>
              <ul className="divide-y divide-border">
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition"
                  >
                    <Checkbox
                      checked={selected.has(d.id)}
                      onCheckedChange={() => toggle(d.id)}
                      aria-label={`Select ${d.name}`}
                    />
                    <div className="shrink-0">{iconFor(d.mime_type, d.name)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="w-20 text-right text-xs tabular-nums text-muted-foreground">
                      {formatBytes(d.size)}
                    </div>
                    <div className="w-20 flex items-center justify-end gap-1">
                      <button
                        onClick={() => downloadOne(d.path, d.name)}
                        className="p-1.5 rounded-md hover:bg-primary/10 text-primary"
                        aria-label="Download"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeDoc(d)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {selected.size > 0 && (
          <div className="sticky bottom-0 left-0 right-0 px-6 py-3 bg-background/95 backdrop-blur border-t border-border flex items-center justify-between gap-3">
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" /> Clear selection
            </button>
            <Button onClick={downloadSelected} className="shadow-lg">
              <Download className="h-4 w-4 mr-1.5" />
              Download Selected ({selected.size})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
