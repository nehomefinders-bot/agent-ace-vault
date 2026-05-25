import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileText, FolderOpen, Image, Loader2, Tag, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

function MediaStorage() {
  const { user, loading: authLoading } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("General");
  const [labelsInput, setLabelsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    const names = new Set(DEFAULT_FOLDERS);
    for (const doc of docs) names.add(doc.folder);
    return Array.from(names);
  }, [docs]);

  const grouped = useMemo(() => {
    return folderNames
      .map((currentFolder) => ({
        folder: currentFolder,
        items: docs.filter((doc) => doc.folder === currentFolder),
      }))
      .filter((group) => group.items.length > 0);
  }, [docs, folderNames]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return toast.error("Pick a file first");

    setSaving(true);
    const safeFolder = folder.trim() || "General";
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
    setFolder("General");
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
    const r = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
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

  async function preview(doc: Doc) {
    const url = await getUrl(doc);
    if (url) window.open(url, "_blank");
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
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="Create or choose a folder"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {folderNames.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFolder(option)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        folder === option
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
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {folderNames.map((folderName) => (
          <button
            key={folderName}
            type="button"
            onClick={() => setFolder(folderName)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {folderName}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="border border-dashed rounded-xl py-16 text-center">
          <Image className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <div className="font-medium">No media files yet</div>
          <div className="text-sm text-muted-foreground mt-1">Upload files, create folders, and tag them with labels.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.folder} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <header className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
                <h2 className="text-sm font-semibold inline-flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {group.folder}
                  <span className="text-muted-foreground font-normal">({group.items.length})</span>
                </h2>
              </header>
              <ul className="divide-y divide-border">
                {group.items.map((doc) => {
                  const isImage = doc.mime_type?.startsWith("image/");
                  const icon = isImage ? <Image className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />;

                  return (
                    <li key={doc.id} className="px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0 basis-[60%] sm:basis-auto">
                        <div className="font-medium text-sm truncate">{doc.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                          {doc.size_bytes ? ` · ${(doc.size_bytes / 1024).toFixed(1)} KB` : ""}
                          {doc.mime_type ? ` · ${doc.mime_type}` : ""}
                        </div>
                        {doc.labels?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {doc.labels.map((label) => (
                              <span
                                key={label}
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                              >
                                <Tag className="h-3 w-3" />
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
                        <button
                          onClick={() => preview(doc)}
                          title="Preview"
                          className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => download(doc)}
                          title="Download"
                          className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(doc)} className="p-2 rounded-md hover:bg-muted text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
