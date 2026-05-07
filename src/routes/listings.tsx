import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Bed, Bath, Maximize2, Loader2, Trash2, Home as HomeIcon, Upload, X, ImagePlus } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkStatusBar } from "@/components/bulk-status-bar";
import { toast } from "sonner";

export const Route = createFileRoute("/listings")({
  component: Listings,
  head: () => ({ meta: [{ title: "Listings — Agent Business Tracker" }] }),
});

interface Listing {
  id: string;
  address: string;
  list_price: number;
  status: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  image_paths: string[] | null;
}

const tone: Record<string, "success" | "warning" | "muted"> = { Active: "success", Pending: "warning", Sold: "muted" };

const BUCKET = "listing-images";
const MAX_FILE_MB = 8;

function publicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function Listings() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("id,address,list_price,status,beds,baths,sqft,image_paths")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Listing[]);
    setSelected(new Set());
    setLoading(false);
  }
  useEffect(() => { if (!authLoading) load(); /* eslint-disable-next-line */ }, [user, authLoading]);

  async function remove(l: Listing) {
    if (!confirm("Delete this listing?")) return;
    if (l.image_paths?.length) {
      await supabase.storage.from(BUCKET).remove(l.image_paths).catch(() => {});
    }
    const { error } = await supabase.from("listings").delete().eq("id", l.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function updateStatus(id: string, status: string) {
    const prev = rows;
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) { setRows(prev); toast.error(error.message); }
  }

  const toggleOne = (id: string) =>
    setSelected((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function bulkUpdateStatus(status: string) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const prev = rows;
    setRows((cur) => cur.map((r) => (selected.has(r.id) ? { ...r, status } : r)));
    const { error } = await supabase.from("listings").update({ status }).in("id", ids);
    if (error) { setRows(prev); toast.error(error.message); return; }
    toast.success(`Updated ${ids.length} listing${ids.length > 1 ? "s" : ""}`);
    setSelected(new Set());
  }

  if (authLoading) return <PageShell title="Listings"><div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></PageShell>;
  if (!user) return <PageShell title="Listings" subtitle="Sign in to manage listings."><Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Sign in</Link></PageShell>;

  return (
    <PageShell
      title="Listings"
      subtitle="Active inventory across your portfolio."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> New Listing</Button></DialogTrigger>
          <NewListingDialog
            userId={user.id}
            onClose={() => setOpen(false)}
            onSaved={() => { setOpen(false); load(); }}
          />
        </Dialog>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="border border-dashed rounded-xl py-16 text-center">
          <HomeIcon className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <div className="font-medium">No listings yet</div>
          <div className="text-sm text-muted-foreground mt-1">Add your first listing to get started.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((l) => {
            const cover = l.image_paths?.[0];
            return (
              <div key={l.id} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden group">
                <div className="aspect-[16/10] bg-gradient-to-br from-primary/80 to-primary relative">
                  {cover && (
                    <img
                      src={publicUrl(cover)}
                      alt={l.address}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 left-3">
                    <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                      <SelectTrigger className={`h-7 px-2.5 text-xs font-medium border-0 rounded-full backdrop-blur ${
                        l.status === "Active" ? "bg-success/90 text-white" :
                        l.status === "Pending" ? "bg-warning/90 text-white" :
                        "bg-black/60 text-white"
                      }`} onClick={(e) => e.stopPropagation()}>
                        <SelectValue>{l.status}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {l.image_paths && l.image_paths.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-black/55 text-white text-[11px] font-medium rounded-md px-2 py-0.5">
                      +{l.image_paths.length - 1} photos
                    </div>
                  )}
                  <button onClick={() => remove(l)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition bg-black/50 hover:bg-destructive text-white rounded-md p-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-5">
                  <div className="text-2xl font-bold tabular-nums font-display">{formatMoney(Number(l.list_price))}</div>
                  <div className="text-sm text-muted-foreground mt-1">{l.address}</div>
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    {l.beds != null && <span className="inline-flex items-center gap-1.5"><Bed className="h-4 w-4" />{l.beds}</span>}
                    {l.baths != null && <span className="inline-flex items-center gap-1.5"><Bath className="h-4 w-4" />{l.baths}</span>}
                    {l.sqft != null && <span className="inline-flex items-center gap-1.5 tabular-nums"><Maximize2 className="h-4 w-4" />{l.sqft.toLocaleString()} sqft</span>}
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

interface PendingImage {
  id: string;
  file: File;
  preview: string;
}

function NewListingDialog({
  userId, onClose, onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("Active");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const next: PendingImage[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: not an image`);
        continue;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name}: over ${MAX_FILE_MB}MB`);
        continue;
      }
      next.push({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        preview: URL.createObjectURL(f),
      });
    }
    setImages((prev) => [...prev, ...next]);
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  // Cleanup previews on unmount
  useEffect(() => () => { images.forEach((i) => URL.revokeObjectURL(i.preview)); /* eslint-disable-next-line */ }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return toast.error("Address is required");
    setSaving(true);

    // 1. Upload images first, collect storage paths
    const uploaded: string[] = [];
    try {
      for (const img of images) {
        const ext = img.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, img.file, { contentType: img.file.type, upsert: false });
        if (upErr) throw upErr;
        uploaded.push(path);
      }

      // 2. Create the listing row
      const { error: insErr } = await supabase.from("listings").insert({
        user_id: userId,
        address: address.trim(),
        list_price: parseFloat(price) || 0,
        status,
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseFloat(baths) : null,
        sqft: sqft ? parseInt(sqft) : null,
        image_paths: uploaded,
      });
      if (insErr) throw insErr;

      toast.success("Listing added");
      // Cleanup previews
      images.forEach((i) => URL.revokeObjectURL(i.preview));
      onSaved();
    } catch (err) {
      // Roll back uploaded files on failure
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded).catch(() => {});
      toast.error(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New Listing</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="addr">Property Address *</Label>
          <Input id="addr" autoFocus required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="412 Oakwood Dr, Austin TX" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lp">List Price *</Label>
            <Input id="lp" type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="750000" className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label htmlFor="bd">Beds</Label><Input id="bd" type="number" min="0" value={beds} onChange={(e) => setBeds(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="ba">Baths</Label><Input id="ba" type="number" min="0" step="0.5" value={baths} onChange={(e) => setBaths(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="sf">Sqft</Label><Input id="sf" type="number" min="0" value={sqft} onChange={(e) => setSqft(e.target.value)} /></div>
        </div>

        {/* Image dropzone */}
        <div className="space-y-2">
          <Label>Photos</Label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
            <Upload className="h-8 w-8 text-muted-foreground/70 mx-auto mb-2" />
            <div className="text-sm font-medium">Drag & drop photos here</div>
            <div className="text-xs text-muted-foreground mt-1">
              or <span className="text-primary font-medium">click to browse</span> · up to {MAX_FILE_MB}MB each
            </div>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
              {images.map((img) => (
                <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-muted/30 flex flex-col items-center justify-center text-muted-foreground text-xs"
              >
                <ImagePlus className="h-5 w-5 mb-1" /> Add more
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving || !address.trim()}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</> : "Add Listing"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
