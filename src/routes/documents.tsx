import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Presentation,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/documents")({
  component: MediaStorage,
  head: () => ({ meta: [{ title: "Media Storage - Agent Business Tracker" }] }),
});

interface Doc {
  id: string;
  name: string;
  folder: string;
  labels: string[] | null;
  file_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

const DEFAULT_FOLDERS = ["General", "Marketing", "Property Media", "Spreadsheets", "Slides", "Archive"];
const DIRECTORY_OPTIONS = ["My Media", "Shared files"] as const;
type Directory = (typeof DIRECTORY_OPTIONS)[number];
type SortKey = "newest" | "oldest" | "alpha";
type TypeKey = "all" | "image" | "pdf" | "sheet" | "doc";
type ViewMode = "grid" | "list";

const STORAGE_QUOTA_BYTES = 2 * 1024 ** 4; // 2 TB display

function parseLabels(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function classifyType(mime: string | null | undefined, name: string): TypeKey {
  const m = (mime ?? "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.includes("sheet") || ["xlsx", "xls", "csv", "numbers"].includes(ext)) return "sheet";
  if (
    m.includes("presentation") ||
    m.includes("word") ||
    ["doc", "docx", "ppt", "pptx", "key", "txt", "md"].includes(ext)
  )
    return "doc";
  return "doc";
}

function typeLabel(t: TypeKey) {
  return { all: "All", image: "Images", pdf: "PDFs", sheet: "Spreadsheets", doc: "Documents" }[t];
}

function MediaStorage() {
  const { user, loading: authLoading } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload dialog
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [uploadFolder, setUploadFolder] = useState("General");
  const [labelsInput, setLabelsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Toolbar state
  const [directory, setDirectory] = useState<Directory>("My Media");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [typeFilter, setTypeFilter] = useState<TypeKey>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);

  // New folder dialog
  const [folderOpen, setFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderCategory, setNewFolderCategory] = useState("General");

  // Lightbox
  const [lightbox, setLightbox] = useState<{ doc: Doc; url: string } | null>(null);
  const [lightboxLoading, setLightboxLoading] = useState(false);

  async function load() {
    if (!user) {
      setDocs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id,name,folder,labels,file_path,size_bytes,mime_type,created_at")
      .order("created_at", { ascending: false });

    if (error) toast.error(error.message);
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const folderNames = useMemo(() => {
    const names = new Set<string>(DEFAULT_FOLDERS);
    for (const doc of docs) names.add(doc.folder);
    for (const f of customFolders) names.add(f);
    return Array.from(names);
  }, [docs, customFolders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = docs.filter((d) => {
      if (activeFolder && d.folder !== activeFolder) return false;
      if (typeFilter !== "all" && classifyType(d.mime_type, d.name) !== typeFilter) return false;
      if (q) {
        const hay = `${d.name} ${d.folder} ${(d.labels ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sort === "alpha") return a.name.localeCompare(b.name);
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [docs, activeFolder, typeFilter, search, sort]);

  const grouped = useMemo(() => {
    if (activeFolder) return [{ folder: activeFolder, items: filtered }];
    const map = new Map<string, Doc[]>();
    for (const d of filtered) {
      const arr = map.get(d.folder) ?? [];
      arr.push(d);
      map.set(d.folder, arr);
    }
    return Array.from(map.entries())
      .map(([folder, items]) => ({ folder, items }))
      .sort((a, b) => a.folder.localeCompare(b.folder));
  }, [filtered, activeFolder]);

  const totalBytes = useMemo(
    () => docs.reduce((s, d) => s + (d.size_bytes ?? 0), 0),
    [docs],
  );
  const usagePct = Math.min(100, (totalBytes / STORAGE_QUOTA_BYTES) * 100);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return toast.error("Pick a file first");

    setSaving(true);
    const safeFolder = uploadFolder.trim() || "General";
    const labels = parseLabels(labelsInput);
    const path = `${user.id}/${Date.now()}-${file.name}`;

    const up = await supabase.storage.from("documents").upload(path, file);
    if (up.error) {
      setSaving(false);
      return toast.error(up.error.message);
    }

    const { error } = await supabase.from("documents").insert({
      user_id: user.id,
      name: name.trim() || file.name,
      folder: safeFolder,
      labels,
      file_path: up.data.path,
      size_bytes: file.size,
      mime_type: file.type || null,
    });

    setSaving(false);
    if (error) return toast.error(error.message);

    toast.success("Uploaded");
    setName("");
    setUploadFolder("General");
    setLabelsInput("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(false);
    load();
  }

  async function remove(doc: Doc) {
    if (!confirm(`Delete ${doc.name}?`)) return;
    await supabase.storage.from("documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function getUrl(doc: Doc): Promise<string | null> {
    const r = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60 * 30);
    if (!r.error && r.data) return r.data.signedUrl;
    toast.error(r.error?.message ?? "Failed to open file");
    return null;
  }

  async function download(doc: Doc) {
    const url = await getUrl(doc);
    if (!url) return;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  async function openLightbox(doc: Doc) {
    setLightboxLoading(true);
    const url = await getUrl(doc);
    setLightboxLoading(false);
    if (!url) return;
    setLightbox({ doc, url });
  }

  function createFolder() {
    const trimmed = newFolderName.trim();
    if (!trimmed) return toast.error("Folder name is required");
    if (folderNames.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error("That folder already exists");
    }
    setCustomFolders((prev) => [...prev, trimmed]);
    setActiveFolder(trimmed);
    setNewFolderName("");
    setNewFolderCategory("General");
    setFolderOpen(false);
    toast.success(`Folder "${trimmed}" created`);
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
      <PageShell title="Media Storage" subtitle="Sign in to manage your files.">
        <Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
          Sign in
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Media Storage"
      subtitle="Drop PDFs, spreadsheets, slides, images, and other files into organized folders with labels."
      actions={
        <div className="flex items-center gap-2">
          {/* Storage capsule */}
          <div className="hidden lg:flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs">
            <HardDrive className="h-3.5 w-3.5 text-primary" />
            <div className="flex flex-col">
              <div className="font-medium text-foreground tabular-nums">
                {formatBytes(totalBytes)} / 2 TB Used
              </div>
              <div className="h-1 w-32 rounded-full bg-white/10 mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-amber-300"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFolderOpen(true)}
            title="New folder"
            className="border-white/10 bg-slate-900/60"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-1.5" /> Upload Media
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Media</DialogTitle>
              </DialogHeader>
              <form onSubmit={upload} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fi">File *</Label>
                  <Input
                    id="fi"
                    ref={fileRef}
                    type="file"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nm">Display Name</Label>
                  <Input
                    id="nm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="(defaults to file name)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="folder">Folder</Label>
                  <Input
                    id="folder"
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    placeholder="Create or choose a folder"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {folderNames.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setUploadFolder(option)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          uploadFolder === option
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="labels">Labels</Label>
                  <Input
                    id="labels"
                    value={labelsInput}
                    onChange={(e) => setLabelsInput(e.target.value)}
                    placeholder="marketing, tax, clients, q2"
                  />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    Comma-separated labels help you find files faster.
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
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
      {/* TOP CONTROL TOOLBAR */}
      <div className="mb-5 rounded-2xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Directory selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-white/10 bg-slate-950/60 gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="font-medium">{directory}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Directory</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DIRECTORY_OPTIONS.map((d) => (
                <DropdownMenuItem key={d} onClick={() => setDirectory(d)}>
                  {d}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media or files..."
              className="pl-9 bg-slate-950/60 border-white/10"
            />
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-white/10 bg-slate-950/60 gap-2">
                Sort: {sort === "newest" ? "Newest First" : sort === "oldest" ? "Oldest" : "Alphabetical"}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSort("newest")}>Newest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("oldest")}>Oldest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("alpha")}>Alphabetical</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Type filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-white/10 bg-slate-950/60 gap-2">
                {typeLabel(typeFilter)}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["all", "image", "pdf", "sheet", "doc"] as TypeKey[]).map((t) => (
                <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)}>
                  {typeLabel(t)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="inline-flex rounded-md border border-white/10 bg-slate-950/60 p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`px-2 py-1.5 rounded-sm ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-2 py-1.5 rounded-sm ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="List view"
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Folder chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveFolder(null)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
              activeFolder === null
                ? "border-primary bg-primary/15 text-primary"
                : "border-white/10 bg-slate-950/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            All files
            <span className="opacity-70">({docs.length})</span>
          </button>
          {folderNames.map((f) => {
            const count = docs.filter((d) => d.folder === f).length;
            const active = activeFolder === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFolder(active ? null : f)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/10 bg-slate-950/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {f}
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl py-16 text-center bg-slate-900/30">
          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <div className="font-medium">No media files match your filters</div>
          <div className="text-sm text-muted-foreground mt-1">
            Try clearing the search or changing the folder filter.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.folder}>
              <header className="mb-3 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">{group.folder}</h2>
                <span className="text-xs text-muted-foreground">({group.items.length})</span>
              </header>

              {view === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {group.items.map((doc) => (
                    <AssetCard
                      key={doc.id}
                      doc={doc}
                      onOpen={() => openLightbox(doc)}
                      onDownload={() => download(doc)}
                      onDelete={() => remove(doc)}
                    />
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden">
                  {group.items.map((doc) => (
                    <AssetRow
                      key={doc.id}
                      doc={doc}
                      onOpen={() => openLightbox(doc)}
                      onDownload={() => download(doc)}
                      onDelete={() => remove(doc)}
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* NEW FOLDER MODAL */}
      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newFolderName">Folder Name</Label>
              <Input
                id="newFolderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Q3 Listing Photos"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newFolderCategory">Category Designation</Label>
              <Input
                id="newFolderCategory"
                value={newFolderCategory}
                onChange={(e) => setNewFolderCategory(e.target.value)}
                placeholder="e.g. General, Marketing, Contracts"
              />
              <div className="text-xs text-muted-foreground">
                Used to group similar folders inside the workspace.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFolderOpen(false)}>Cancel</Button>
            <Button onClick={createFolder}>Create folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LIGHTBOX */}
      {lightbox && (
        <Lightbox
          doc={lightbox.doc}
          url={lightbox.url}
          loading={lightboxLoading}
          onClose={() => setLightbox(null)}
          onDownload={() => download(lightbox.doc)}
        />
      )}
    </PageShell>
  );
}

function TypeIcon({ type, className }: { type: TypeKey; className?: string }) {
  const c = className ?? "h-10 w-10";
  if (type === "image") return <ImageIcon className={c} />;
  if (type === "pdf") return <FileText className={c} />;
  if (type === "sheet") return <FileSpreadsheet className={c} />;
  return <Presentation className={c} />;
}

function AssetCard({
  doc,
  onOpen,
  onDownload,
  onDelete,
}: {
  doc: Doc;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const type = classifyType(doc.mime_type, doc.name);
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (type !== "image") return;
    supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60 * 30)
      .then((r) => {
        if (!cancelled && !r.error && r.data) setThumb(r.data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [doc.file_path, type]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-card transition hover:border-primary/40 hover:shadow-lg">
      <button
        onClick={onOpen}
        className="block w-full aspect-video relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"
        aria-label={`Preview ${doc.name}`}
      >
        {type === "image" && thumb ? (
          <img src={thumb} alt={doc.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
              <TypeIcon type={type} className="h-10 w-10 text-primary" />
            </div>
          </div>
        )}

        {/* glassmorphism bottom ribbon */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-slate-950/70 backdrop-blur-md border-t border-white/10 px-3 py-2">
          <span className="flex-1 truncate text-xs font-medium text-white">{doc.name}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white/80"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onOpen}>Preview</DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" /> Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </button>

      <div className="px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
        <span>{doc.size_bytes ? formatBytes(doc.size_bytes) : ""}</span>
      </div>
    </div>
  );
}

function AssetRow({
  doc,
  onOpen,
  onDownload,
  onDelete,
}: {
  doc: Doc;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const type = classifyType(doc.mime_type, doc.name);
  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
      <button
        onClick={onOpen}
        className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"
        aria-label={`Preview ${doc.name}`}
      >
        <TypeIcon type={type} className="h-5 w-5 text-primary" />
      </button>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="font-medium text-sm truncate">{doc.name}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(doc.created_at).toLocaleDateString()}
          {doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ""}
          {doc.mime_type ? ` · ${doc.mime_type}` : ""}
        </div>
      </button>
      <div className="flex items-center gap-1">
        <button onClick={onDownload} title="Download" className="p-2 rounded-md hover:bg-white/10 text-muted-foreground">
          <Download className="h-4 w-4" />
        </button>
        <button onClick={onDelete} title="Delete" className="p-2 rounded-md hover:bg-white/10 text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function Lightbox({
  doc,
  url,
  loading,
  onClose,
  onDownload,
}: {
  doc: Doc;
  url: string;
  loading: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  const type = classifyType(doc.mime_type, doc.name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <TypeIcon type={type} className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{doc.name}</div>
            <div className="text-xs text-muted-foreground">
              {doc.folder}
              {doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onDownload} className="gap-2">
            <Download className="h-4 w-4" /> Download file
          </Button>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-slate-900/60 text-white/80 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : type === "image" ? (
          <img
            src={url}
            alt={doc.name}
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
          />
        ) : type === "pdf" ? (
          <iframe
            title={doc.name}
            src={url}
            className="h-[80vh] w-full max-w-5xl rounded-xl border border-white/10 bg-white"
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center max-w-md">
            <TypeIcon type={type} className="h-12 w-12 text-primary mx-auto mb-4" />
            <div className="text-white font-medium mb-1">{doc.name}</div>
            <div className="text-sm text-muted-foreground mb-5">
              No inline preview available for this file type.
            </div>
            <Button onClick={onDownload} className="gap-2">
              <Download className="h-4 w-4" /> Download file
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
