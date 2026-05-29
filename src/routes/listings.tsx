import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Bed, Bath, Maximize2, Loader2, Trash2, Home as HomeIcon, Upload, X, ImagePlus, ChevronLeft, ChevronRight, User, Mail, Phone, MapPin } from "lucide-react";
import { PageShell } from "@/components/page-shell";
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
import { ImportButton, type ImportColumn } from "@/components/import-button";

const LISTING_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "address", label: "Address", required: true, sample: "123 Main St" },
  { key: "list_price", label: "List Price", type: "number", sample: 500000 },
  { key: "status", label: "Status", enumValues: ["Active", "Pending", "Sold", "Not on MLS"], sample: "Active" },
  { key: "beds", label: "Beds", type: "number", sample: 3 },
  { key: "baths", label: "Baths", type: "number", sample: 2 },
  { key: "sqft", label: "Sqft", type: "number", sample: 1500 },
  { key: "notes", label: "Notes", sample: "" },
];

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
  seller_name: string | null;
  seller_phone: string | null;
  seller_email: string | null;
  seller_new_address: string | null;
}

const STATUS_OPTIONS = ["Active", "Pending", "Sold", "Not on MLS"] as const;

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
  const [viewing, setViewing] = useState<Listing | null>(null);

  async function load() {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("id,address,list_price,status,beds,baths,sqft,image_paths,seller_name,seller_phone,seller_email,seller_new_address")
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
        <div className="flex flex-wrap items-center gap-2">
          <ImportButton
            table="listings"
            userId={user.id}
            columns={LISTING_IMPORT_COLUMNS}
            templateName="listings-template"
            entityLabel="listings"
            onImported={load}
            transformRow={(r) => ({ ...r, image_paths: [] })}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> New Listing</Button></DialogTrigger>
            <NewListingDialog
              userId={user.id}
              onClose={() => setOpen(false)}
              onSaved={() => { setOpen(false); load(); }}
            />
          </Dialog>
        </div>
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
        <>
        <BulkStatusBar
          count={selected.size}
          itemLabel="listings"
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          onApply={bulkUpdateStatus}
          onClear={() => setSelected(new Set())}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              selected={selected.has(l.id)}
              onToggleSelect={() => toggleOne(l.id)}
              onStatusChange={(s) => updateStatus(l.id, s)}
              onRemove={() => remove(l)}
              onOpen={() => setViewing(l)}
            />
          ))}
        </div>
        </>
      )}

      {viewing && (
        <ListingFullscreen listing={viewing} onClose={() => setViewing(null)} />
      )}
    </PageShell>
  );
}

function ListingCard({
  listing: l, selected: isSel, onToggleSelect, onStatusChange, onRemove, onOpen,
}: {
  listing: Listing;
  selected: boolean;
  onToggleSelect: () => void;
  onStatusChange: (s: string) => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const images = l.image_paths ?? [];
  const [idx, setIdx] = useState(0);
  const cover = images[idx];
  const hasMulti = images.length > 1;

  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); };
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); };

  return (
    <div className={`bg-card border rounded-2xl shadow-card overflow-hidden group ${isSel ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
      <div
        className="aspect-[16/10] bg-gradient-to-br from-primary/80 to-primary relative cursor-pointer"
        onClick={onOpen}
      >
        <div className={`absolute top-3 right-12 z-10 transition ${isSel ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <div className="rounded-md bg-background p-0.5 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={isSel} onCheckedChange={onToggleSelect} aria-label="Select listing" />
          </div>
        </div>
        {cover && (
          <img
            src={publicUrl(cover)}
            alt={l.address}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
          <Select value={l.status} onValueChange={onStatusChange}>
            <SelectTrigger className={`h-7 px-2.5 text-xs font-medium border-0 rounded-full shadow-sm ${
              l.status === "Active" ? "bg-success/90 text-white" :
              l.status === "Pending" ? "bg-warning/90 text-white" :
              "bg-black/60 text-white"
            }`}>
              <SelectValue>{l.status}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {hasMulti && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/65 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/65 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/55"}`}
                />
              ))}
            </div>
            <div className="absolute bottom-3 right-3 bg-black/55 text-white text-[11px] font-medium rounded-md px-2 py-0.5 tabular-nums">
              {idx + 1}/{images.length}
            </div>
          </>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition bg-black/50 hover:bg-destructive text-white rounded-md p-1.5"
        >
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

        {(l.seller_name || l.seller_email || l.seller_phone || l.seller_new_address) && (
          <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-xs">
            {l.seller_name && (
              <div className="flex items-center gap-2 text-foreground font-medium">
                <User className="h-3.5 w-3.5 text-muted-foreground" />{l.seller_name}
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {l.seller_email && (
                <a href={`mailto:${l.seller_email}`} className="inline-flex items-center gap-1.5 hover:text-primary truncate" onClick={(e) => e.stopPropagation()}>
                  <Mail className="h-3.5 w-3.5" />{l.seller_email}
                </a>
              )}
              {l.seller_phone && (
                <a href={`tel:${l.seller_phone}`} className="inline-flex items-center gap-1.5 hover:text-primary" onClick={(e) => e.stopPropagation()}>
                  <Phone className="h-3.5 w-3.5" />{l.seller_phone}
                </a>
              )}
            </div>
            {l.seller_new_address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="leading-snug">Moving to: <span className="text-foreground">{l.seller_new_address}</span></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ListingFullscreen({ listing: l, onClose }: { listing: Listing; onClose: () => void }) {
  const images = l.image_paths ?? [];
  const [idx, setIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const cover = images[idx];
  const hasMulti = images.length > 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && hasMulti) setIdx((i) => (i + 1) % images.length);
      else if (e.key === "ArrowLeft" && hasMulti) setIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, hasMulti, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      {cover ? (
        <img
          src={publicUrl(cover)}
          alt={l.address}
          className="max-w-full max-h-full object-contain select-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="text-white/60">No photos</div>
      )}

      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-black/70 hover:bg-black/85 text-white rounded-full p-2"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {hasMulti && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }}
            aria-label="Previous"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/85 text-white rounded-full p-3"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}
            aria-label="Next"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/85 text-white rounded-full p-3"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs font-medium rounded-full px-3 py-1 tabular-nums">
            {idx + 1} / {images.length}
          </div>
        </>
      )}

      {/* Toggle for details overlay */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
        className="absolute top-4 right-16 bg-black/70 hover:bg-black/85 text-white text-xs font-medium rounded-full px-3 py-2"
      >
        {showInfo ? "Hide details" : "Show details"}
      </button>

      {showInfo && (
        <div
          className="absolute left-0 right-0 bottom-0 p-5 sm:p-7 bg-gradient-to-t from-black/85 via-black/55 to-transparent text-white pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-3xl sm:text-4xl font-bold tabular-nums font-display">{formatMoney(Number(l.list_price))}</div>
                <div className="text-sm text-white/80 mt-1">{l.address}</div>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/85">
                {l.beds != null && <span className="inline-flex items-center gap-1.5"><Bed className="h-4 w-4" />{l.beds}</span>}
                {l.baths != null && <span className="inline-flex items-center gap-1.5"><Bath className="h-4 w-4" />{l.baths}</span>}
                {l.sqft != null && <span className="inline-flex items-center gap-1.5 tabular-nums"><Maximize2 className="h-4 w-4" />{l.sqft.toLocaleString()} sqft</span>}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  l.status === "Active" ? "bg-success/90" :
                  l.status === "Pending" ? "bg-warning/90" : "bg-black/80"
                }`}>{l.status}</span>
              </div>
            </div>
            {(l.seller_name || l.seller_email || l.seller_phone || l.seller_new_address) && (
              <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:text-sm text-white/85">
                {l.seller_name && <div className="inline-flex items-center gap-2"><User className="h-4 w-4" />{l.seller_name}</div>}
                {l.seller_email && <a href={`mailto:${l.seller_email}`} className="inline-flex items-center gap-2 hover:text-white"><Mail className="h-4 w-4" />{l.seller_email}</a>}
                {l.seller_phone && <a href={`tel:${l.seller_phone}`} className="inline-flex items-center gap-2 hover:text-white"><Phone className="h-4 w-4" />{l.seller_phone}</a>}
                {l.seller_new_address && <div className="inline-flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /><span>Moving to: {l.seller_new_address}</span></div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerNewAddress, setSellerNewAddress] = useState("");
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

  useEffect(() => () => { images.forEach((i) => URL.revokeObjectURL(i.preview)); /* eslint-disable-next-line */ }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return toast.error("Address is required");
    setSaving(true);

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

      const { error: insErr } = await supabase.from("listings").insert({
        user_id: userId,
        address: address.trim(),
        list_price: parseFloat(price) || 0,
        status,
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseFloat(baths) : null,
        sqft: sqft ? parseInt(sqft) : null,
        image_paths: uploaded,
        seller_name: sellerName.trim() || null,
        seller_email: sellerEmail.trim() || null,
        seller_phone: sellerPhone.trim() || null,
        seller_new_address: sellerNewAddress.trim() || null,
      });
      if (insErr) throw insErr;

      toast.success("Listing added");
      images.forEach((i) => URL.revokeObjectURL(i.preview));
      onSaved();
    } catch (err) {
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
          <Input id="addr" autoFocus required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter property address here" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lp">List Price *</Label>
            <Input id="lp" type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter sale price" className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label htmlFor="bd">Beds</Label><Input id="bd" type="number" min="0" value={beds} onChange={(e) => setBeds(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="ba">Baths</Label><Input id="ba" type="number" min="0" step="0.5" value={baths} onChange={(e) => setBaths(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="sf">Sqft</Label><Input id="sf" type="number" min="0" value={sqft} onChange={(e) => setSqft(e.target.value)} /></div>
        </div>

        {/* Seller info */}
        <div className="space-y-3 pt-2 border-t">
          <div className="text-sm font-medium text-foreground">Seller</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sn">Name</Label>
              <Input id="sn" value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Enter seller name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp">Phone</Label>
              <Input id="sp" type="tel" value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} placeholder="Enter seller phone number" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="se">Email</Label>
              <Input id="se" type="email" value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)} placeholder="Enter seller email" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sna">Seller's New Address</Label>
              <Input id="sna" value={sellerNewAddress} onChange={(e) => setSellerNewAddress(e.target.value)} placeholder="Enter seller's new address" />
            </div>
          </div>
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
              First photo becomes the thumbnail · up to {MAX_FILE_MB}MB each
            </div>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
              {images.map((img, i) => (
                <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] font-medium rounded px-1.5 py-0.5">
                      Thumbnail
                    </div>
                  )}
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
