import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  FolderPlus,
  ImageIcon,
  Loader2,
  Presentation,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/media-storage")({
  component: MediaStorage,
  head: () => ({ meta: [{ title: "Media Storage - Agent Business Tracker" }] }),
});

interface MediaItem {
  id: string;
  name: string;
  folder: string;
  file_path: string;
  labels: string[];
  library_scope: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

type FileTypeFilter = "all" | "images" | "pdfs" | "spreadsheets" | "presentations" | "documents" | "other";

const DEFAULT_FOLDERS = ["Property Photos", "Flyers", "Canva Mockups", "Brand Assets", "Open House Kits"];

function MediaStorage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>("all");
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState(DEFAULT_FOLDERS[0]);
  const [newFolderName, setNewFolderName] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const storageKey = user ? `media-storage-folders:${user.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setCustomFolders(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(customFolders));
  }, [customFolders, storageKey]);

  async function load() {
    if (!user) {
      setItems([]);
      setPreviewUrls({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id,name,folder,file_path,labels,library_scope,mime_type,size_bytes,created_at")
      .eq("library_scope", "media")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setItems([]);
      setPreviewUrls({});
      setLoading(false);
      return;
    }

    const nextItems = (data ?? []) as MediaItem[];
    setItems(nextItems);

    const signedEntries = await Promise.all(
      nextItems.map(async (item) => {
        const { data: signed } = await supabase.storage.from("documents").createSignedUrl(item.file_path, 60 * 30);
        return [item.id, signed?.signedUrl ?? ""] as const;
      }),
    );

    setPreviewUrls(
      Object.fromEntries(signedEntries.filter((entry) => entry[1])),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const folders = useMemo(() => {
    return Array.from(new Set([...DEFAULT_FOLDERS, ...customFolders, ...items.map((item) => item.folder).filter(Boolean)])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [customFolders, items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.folder.toLowerCase().includes(q) ||
        item.labels.some((label) => label.toLowerCase().includes(q));
      const matchesFolder = folderFilter === "all" || item.folder === folderFilter;
      const matchesType = fileTypeFilter === "all" || getFileType(item) === fileTypeFilter;
      return matchesSearch && matchesFolder && matchesType;
    });
  }, [fileTypeFilter, folderFilter, items, search]);

  useEffect(() => {
    if (!previewItem || previewUrls[previewItem.id]) return;

    let cancelled = false;

    void supabase.storage
      .from("documents")
      .createSignedUrl(previewItem.file_path, 60 * 30)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          toast.error(error?.message ?? "Could not open this file.");
          return;
        }
        setPreviewUrls((current) => ({ ...current, [previewItem.id]: data.signedUrl }));
      });

    return () => {
      cancelled = true;
    };
  }, [previewItem, previewUrls]);

  async function uploadMedia(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !file) {
      toast.error("Choose a file to upload.");
      return;
    }

    const targetFolder = folder.trim() || "Unsorted";
    const labels = labelsInput
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);

    setSaving(true);
    const path = `${user.id}/media/${Date.now()}-${file.name}`;
    const upload = await supabase.storage.from("documents").upload(path, file, {
      contentType: file.type || undefined,
    });

    if (upload.error) {
      setSaving(false);
      toast.error(upload.error.message);
      return;
    }

    const { error } = await supabase.from("documents").insert({
      user_id: user.id,
      name: name.trim() || file.name,
      folder: targetFolder,
      labels,
      library_scope: "media",
      file_path: upload.data.path,
      size_bytes: file.size,
      mime_type: file.type || null,
      status: "media",
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!folders.includes(targetFolder)) {
      setCustomFolders((current) => Array.from(new Set([...current, targetFolder])));
    }

    toast.success("Media uploaded.");
    resetUploadForm(targetFolder);
    setUploadOpen(false);
    await load();
  }

  function resetUploadForm(nextFolder?: string) {
    setName("");
    setLabelsInput("");
    setFile(null);
    setFolder(nextFolder ?? folders[0] ?? DEFAULT_FOLDERS[0]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function createFolder(event: React.FormEvent) {
    event.preventDefault();
    const value = newFolderName.trim();
    if (!value) {
      toast.error("Enter a folder name.");
      return;
    }

    setCustomFolders((current) => Array.from(new Set([...current, value])));
    setFolder(value);
    setFolderFilter(value);
    setNewFolderName("");
    setFolderDialogOpen(false);
    toast.success(`Folder "${value}" added.`);
  }

  async function removeItem(item: MediaItem) {
    if (!window.confirm(`Delete ${item.name}?`)) return;

    await supabase.storage.from("documents").remove([item.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Media deleted.");
    if (previewItem?.id === item.id) setPreviewItem(null);
    await load();
  }

  async function downloadItem(item: MediaItem) {
    const url = await getSignedUrl(item);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function getSignedUrl(item: MediaItem) {
    const existing = previewUrls[item.id];
    if (existing) return existing;

    const { data, error } = await supabase.storage.from("documents").createSignedUrl(item.file_path, 60 * 30);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "Could not open this file.");
      return null;
    }

    setPreviewUrls((current) => ({ ...current, [item.id]: data.signedUrl }));
    return data.signedUrl;
  }

  if (authLoading) {
    return (
      <PageShell title="Media Storage">
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title="Media Storage" subtitle="Sign in to manage your creative library.">
        <Link to="/auth" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Sign in
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Media Storage"
      subtitle="A visual drop zone for property media, flyers, PDFs, decks, and marketing assets."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="mr-1.5 h-4 w-4" /> New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create folder</DialogTitle>
                <DialogDescription>
                  Add a saved folder name for your media library so new uploads stay organized.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createFolder} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="folder-name">Folder name</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Example: Listing 24 Evergreen"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setFolderDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save folder</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={uploadOpen}
            onOpenChange={(open) => {
              setUploadOpen(open);
              if (!open) resetUploadForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-1.5 h-4 w-4" /> Upload Media
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload to Media Storage</DialogTitle>
                <DialogDescription>
                  Drop in images, PDFs, spreadsheets, decks, CSVs, or creative files and tag them for quick retrieval.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={uploadMedia} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="media-file">File</Label>
                  <Input
                    id="media-file"
                    ref={fileRef}
                    type="file"
                    required
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Accepts images, PDFs, spreadsheets, CSVs, presentations, and general documents.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="media-name">Display name</Label>
                  <Input
                    id="media-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Optional. Defaults to the file name."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Folder</Label>
                  <Select value={folder} onValueChange={setFolder}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((folderName) => (
                        <SelectItem key={folderName} value={folderName}>
                          {folderName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="media-labels">Labels</Label>
                  <Input
                    id="media-labels"
                    value={labelsInput}
                    onChange={(event) => setLabelsInput(event.target.value)}
                    placeholder="listing, spring-campaign, seller"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !file}>
                    {saving ? "Uploading..." : "Upload"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search media, labels, or folder names..."
                className="pl-10"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[26rem]">
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All folders</SelectItem>
                  {folders.map((folderName) => (
                    <SelectItem key={folderName} value={folderName}>
                      {folderName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fileTypeFilter} onValueChange={(value) => setFileTypeFilter(value as FileTypeFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by file type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All file types</SelectItem>
                  <SelectItem value="images">Images</SelectItem>
                  <SelectItem value="pdfs">PDFs</SelectItem>
                  <SelectItem value="spreadsheets">Sheets / CSVs</SelectItem>
                  <SelectItem value="presentations">Presentations</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="other">Other files</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <FolderOpen className="h-4 w-4 text-primary" />
            Folders
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFolderFilter("all")}
              className={folderFilter === "all" ? activePillClass : pillClass}
            >
              All files
              <span className="text-xs text-current/70">{items.length}</span>
            </button>
            {folders.map((folderName) => {
              const count = items.filter((item) => item.folder === folderName).length;
              return (
                <button
                  key={folderName}
                  type="button"
                  onClick={() => setFolderFilter(folderName)}
                  className={folderFilter === folderName ? activePillClass : pillClass}
                >
                  {folderName}
                  <span className="text-xs text-current/70">{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-card">
            <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <div className="font-medium">No media files found</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Upload flyers, images, PDFs, and marketing assets to build your library.
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredItems.map((item) => {
              const signedUrl = previewUrls[item.id];
              const type = getFileType(item);
              const isImage = type === "images" && !!signedUrl;

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreviewItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPreviewItem(item);
                    }
                  }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {isImage ? (
                      <img src={signedUrl} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
                        <FileTypeIcon item={item} className="h-16 w-16 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{item.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.folder} · {formatFileSize(item.size_bytes)} · {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void downloadItem(item);
                        }}
                        className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label={`Download ${item.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>

                    {item.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.labels.slice(0, 3).map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                          >
                            <Tag className="h-3 w-3" />
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No labels added</div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {typeLabel(type)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreviewItem(item);
                          }}
                          className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label={`Preview ${item.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeItem(item);
                          }}
                          className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MediaPreviewDialog
        item={previewItem}
        open={!!previewItem}
        onOpenChange={(open) => {
          if (!open) setPreviewItem(null);
        }}
        fileUrl={previewItem ? previewUrls[previewItem.id] ?? null : null}
        onDownload={previewItem ? () => void downloadItem(previewItem) : undefined}
      />
    </PageShell>
  );
}

function MediaPreviewDialog({
  item,
  open,
  onOpenChange,
  fileUrl,
  onDownload,
}: {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  onDownload?: () => void;
}) {
  const type = item ? getFileType(item) : "other";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden border-white/10 bg-slate-950 p-0 text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{item?.name ?? "Preview"}</div>
            <div className="mt-1 text-sm text-white/60">
              {[item?.folder, item ? formatFileSize(item.size_bytes) : null].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDownload ? (
              <Button type="button" variant="secondary" onClick={onDownload}>
                <Download className="mr-1.5 h-4 w-4" /> Download
              </Button>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-[24rem] items-center justify-center bg-black/50 p-4">
          {type === "images" && fileUrl ? (
            <img src={fileUrl} alt={item?.name ?? "Preview"} className="max-h-[75vh] w-auto rounded-lg object-contain" />
          ) : type === "pdfs" && fileUrl ? (
            <iframe title={item?.name ?? "PDF preview"} src={fileUrl} className="h-[75vh] w-full rounded-lg bg-white" />
          ) : fileUrl ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-8 py-12 text-center">
              <File className="h-14 w-14 text-white/70" />
              <div className="max-w-md text-sm leading-6 text-white/70">
                This file type is ready to download and store here, but it does not support a rich inline preview yet.
              </div>
              <Button type="button" variant="secondary" onClick={onDownload}>
                Open file
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing preview...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FileTypeIcon({ item, className }: { item: MediaItem; className?: string }) {
  const type = getFileType(item);
  if (type === "images") return <FileImage className={className} />;
  if (type === "pdfs" || type === "documents") return <FileText className={className} />;
  if (type === "spreadsheets") return <FileSpreadsheet className={className} />;
  if (type === "presentations") return <Presentation className={className} />;
  return <File className={className} />;
}

function getFileType(item: Pick<MediaItem, "mime_type" | "name">): FileTypeFilter {
  const mime = item.mime_type?.toLowerCase() ?? "";
  const name = item.name.toLowerCase();

  if (mime.startsWith("image/")) return "images";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdfs";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("csv") ||
    name.endsWith(".csv") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx")
  ) {
    return "spreadsheets";
  }
  if (
    mime.includes("presentation") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx") ||
    name.endsWith(".key")
  ) {
    return "presentations";
  }
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt")
  ) {
    return "documents";
  }
  return "other";
}

function typeLabel(type: FileTypeFilter) {
  if (type === "images") return "Image";
  if (type === "pdfs") return "PDF";
  if (type === "spreadsheets") return "Sheet / CSV";
  if (type === "presentations") return "Presentation";
  if (type === "documents") return "Document";
  return "File";
}

function formatFileSize(size: number | null) {
  if (!size) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const pillClass =
  "inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground";
const activePillClass =
  "inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary";
