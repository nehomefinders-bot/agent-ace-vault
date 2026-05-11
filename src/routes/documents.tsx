import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Loader2, Trash2, Download, FolderOpen, PenLine, CheckCircle2, Eye } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SignDocumentModal } from "@/components/sign-document-modal";
import { toast } from "sonner";

export const Route = createFileRoute("/documents")({
  component: Documents,
  head: () => ({ meta: [{ title: "Documents — Agent Business Tracker" }] }),
});

interface Doc {
  id: string;
  name: string;
  folder: string;
  file_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  status: string;
  signed_at: string | null;
}

const FOLDERS = ["Miscellaneous", "Contracts", "Disclosures", "Listings", "Closing", "Marketing"];

function Documents() {
  const { user, loading: authLoading } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [signDoc, setSignDoc] = useState<Doc | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "signed">("all");

  const [name, setName] = useState("");
  const [folder, setFolder] = useState("Miscellaneous");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) { setDocs([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id,name,folder,file_path,size_bytes,mime_type,created_at,status,signed_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  }
  useEffect(() => { if (!authLoading) load(); /* eslint-disable-next-line */ }, [user, authLoading]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return toast.error("Pick a file");
    setSaving(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("documents").upload(path, file);
    if (up.error) { setSaving(false); return toast.error(up.error.message); }
    const { error } = await supabase.from("documents").insert({
      user_id: user.id,
      name: name.trim() || file.name,
      folder,
      file_path: up.data.path,
      size_bytes: file.size,
      mime_type: file.type || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Uploaded");
    setName(""); setFolder("Miscellaneous"); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(false);
    load();
  }

  async function remove(d: Doc) {
    if (!confirm(`Delete ${d.name}?`)) return;
    await supabase.storage.from("documents").remove([d.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function getUrl(d: Doc): Promise<string | null> {
    const bucket = d.status === "signed" ? "signed-documents" : "documents";
    const r = await supabase.storage.from(bucket).createSignedUrl(d.file_path, 60);
    if (!r.error && r.data) return r.data.signedUrl;
    const fb = await supabase.storage.from("documents").createSignedUrl(d.file_path, 60);
    if (!fb.error && fb.data) return fb.data.signedUrl;
    toast.error(r.error?.message ?? "Failed");
    return null;
  }

  async function download(d: Doc) {
    const url = await getUrl(d);
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = d.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  async function preview(d: Doc) {
    const url = await getUrl(d);
    if (url) window.open(url, "_blank");
  }

  if (authLoading) return <PageShell title="Documents"><div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></PageShell>;
  if (!user) return <PageShell title="Documents" subtitle="Sign in to manage documents."><Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Sign in</Link></PageShell>;

  const filtered = filter === "all" ? docs : docs.filter((d) => (d.status ?? "pending") === filter);
  const grouped = FOLDERS.map((f) => ({ folder: f, items: filtered.filter((d) => d.folder === f) })).filter((g) => g.items.length);

  return (
    <PageShell
      title="Documents"
      subtitle="Every contract, disclosure, and signed document — organized by folder."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-1.5" /> Upload Document</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <form onSubmit={upload} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fi">File *</Label>
                <Input id="fi" ref={fileRef} type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nm">Display Name</Label>
                <Input id="nm" value={name} onChange={(e) => setName(e.target.value)} placeholder="(defaults to file name)" />
              </div>
              <div className="space-y-1.5">
                <Label>Folder</Label>
                <Select value={folder} onValueChange={setFolder}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !file}>{saving ? "Uploading…" : "Upload"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "pending", "signed"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed rounded-xl py-16 text-center">
          <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <div className="font-medium">No documents{filter !== "all" ? ` (${filter})` : " yet"}</div>
          <div className="text-sm text-muted-foreground mt-1">Upload contracts, disclosures, and signed agreements.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.folder} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <header className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30">
                <h2 className="text-sm font-semibold inline-flex items-center gap-2"><FolderOpen className="h-4 w-4" /> {g.folder} <span className="text-muted-foreground font-normal">({g.items.length})</span></h2>
              </header>
              <ul className="divide-y divide-border">
                {g.items.map((d) => (
                  <li key={d.id} className="px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 basis-[60%] sm:basis-auto">
                      <div className="font-medium text-sm truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}{d.size_bytes ? ` · ${(d.size_bytes / 1024).toFixed(1)} KB` : ""}</div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
                      {d.status === "signed" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Signed
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setSignDoc(d)}>
                          <PenLine className="h-4 w-4 mr-1" /> Sign
                        </Button>
                      )}
                      <button onClick={() => download(d)} className="p-2 rounded-md hover:bg-muted text-muted-foreground"><Download className="h-4 w-4" /></button>
                      <button onClick={() => remove(d)} className="p-2 rounded-md hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {user && (
        <SignDocumentModal
          doc={signDoc}
          userId={user.id}
          open={!!signDoc}
          onOpenChange={(v) => !v && setSignDoc(null)}
          onSigned={load}
        />
      )}
    </PageShell>
  );
}
