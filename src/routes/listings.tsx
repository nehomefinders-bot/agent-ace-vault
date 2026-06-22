import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Bed,
  Bath,
  Maximize2,
  Loader2,
  Trash2,
  Home as HomeIcon,
  Upload,
  X,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  Pencil,
  FolderOpen,
  FileText,
  Share2,
  Download,
} from "lucide-react";
import { downloadListingPdf } from "@/lib/listing-share";
import { ListingDocumentsModal } from "@/components/listing-documents-modal";
import { ShareListingModal } from "@/components/share-listing-modal";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkStatusBar } from "@/components/bulk-status-bar";
import { toast } from "sonner";
import { ImportButton, type ImportColumn } from "@/components/import-button";
import { z } from "zod";

const agentBrandingSchema = z.object({
  agent_name: z.string().trim().max(100, "Agent name must be under 100 characters").optional(),
  agent_brokerage: z.string().trim().max(120, "Brokerage must be under 120 characters").optional(),
  agent_phone: z
    .string()
    .trim()
    .max(30, "Phone must be under 30 characters")
    .refine(
      (v) => !v || /^[+()\-\s.\d]{7,30}$/.test(v),
      "Enter a valid phone number (digits, spaces, +, -, (), . only)",
    )
    .optional(),
  agent_email: z
    .string()
    .trim()
    .max(255, "Email must be under 255 characters")
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address")
    .optional(),
});

function validateAgentBranding(fields: {
  agent_name: string;
  agent_brokerage: string;
  agent_phone: string;
  agent_email: string;
}): string | null {
  const result = agentBrandingSchema.safeParse(fields);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid agent branding details";
}
function agentPhoneError(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (t.length > 30) return "Phone must be under 30 characters";
  if (!/^[+()\-\s.\d]{7,30}$/.test(t))
    return "Use digits with + - ( ) . or spaces (7–30 chars)";
  return null;
}
function agentEmailError(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (t.length > 255) return "Email must be under 255 characters";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "Enter a valid email address";
  return null;
}


const LISTING_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "address", label: "Address", required: true, sample: "123 Main St" },
  { key: "list_price", label: "List Price", type: "number", sample: 500000 },
  {
    key: "status",
    label: "Status",
    enumValues: ["Active", "Pending", "Sold", "Not on MLS"],
    sample: "Active",
  },
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
  client_name: string | null;
  deal_side: string | null;
  close_date: string | null;
  gross_commission: number;
  agent_split_pct: number;
  brokerage_split_pct: number;
  referral_pct: number;
  referral_to: string | null;
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
  notes: string | null;
  property_type: string | null;
  year_built: number | null;
  lot_size: string | null;
  parking_spaces: number | null;
  closing_date: string | null;
  description: string | null;
  mls_number: string | null;
  agent_name: string | null;
  agent_brokerage: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  image_urls?: string[];
}

const STATUS_OPTIONS = ["Active", "Pending", "Sold", "Not on MLS"] as const;

const BUCKET = "listing-images";
const MAX_FILE_MB = 8;

async function attachSignedImageUrls(rows: Listing[]) {
  const paths = rows.flatMap((row) => row.image_paths ?? []);
  if (!paths.length) return rows.map((row) => ({ ...row, image_urls: [] }));

  const signedEntries = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) return [path, ""] as const;
      return [path, data.signedUrl] as const;
    }),
  );

  const signedMap = new Map<string, string>(signedEntries);
  return rows.map((row) => ({
    ...row,
    image_urls: (row.image_paths ?? []).map((path) => signedMap.get(path) ?? "").filter(Boolean),
  }));
}

function Listings() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<Listing | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [docsListing, setDocsListing] = useState<Listing | null>(null);
  const [sharingListing, setSharingListing] = useState<Listing | null>(null);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});

  async function loadDocCounts(ids: string[]) {
    if (!ids.length) {
      setDocCounts({});
      return;
    }
    const { data, error } = await supabase
      .from("listing_documents")
      .select("listing_id")
      .in("listing_id", ids);
    if (error) return;
    const counts: Record<string, number> = {};
    for (const r of (data ?? []) as { listing_id: string }[]) {
      counts[r.listing_id] = (counts[r.listing_id] ?? 0) + 1;
    }
    setDocCounts(counts);
  }

  async function load() {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,address,client_name,deal_side,close_date,gross_commission,agent_split_pct,brokerage_split_pct,referral_pct,referral_to,list_price,status,beds,baths,sqft,image_paths,seller_name,seller_phone,seller_email,seller_new_address,notes,property_type,year_built,lot_size,parking_spaces,closing_date,description,mls_number,agent_name,agent_brokerage,agent_phone,agent_email",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    const nextRows = await attachSignedImageUrls((data ?? []) as Listing[]);
    setRows(nextRows);
    setSelected(new Set());
    setLoading(false);
    loadDocCounts(nextRows.map((r) => r.id));
  }
  useEffect(() => {
    if (!authLoading) load(); /* eslint-disable-next-line */
  }, [user, authLoading]);

  async function remove(l: Listing) {
    if (!confirm("Delete this listing?")) return;
    if (l.image_paths?.length) {
      await supabase.storage
        .from(BUCKET)
        .remove(l.image_paths)
        .catch(() => {});
    }
    const { error } = await supabase.from("listings").delete().eq("id", l.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function updateStatus(id: string, status: string) {
    const prev = rows;
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(error.message);
    }
  }

  const toggleOne = (id: string) =>
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });

  async function bulkUpdateStatus(status: string) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const prev = rows;
    setRows((cur) => cur.map((r) => (selected.has(r.id) ? { ...r, status } : r)));
    const { error } = await supabase.from("listings").update({ status }).in("id", ids);
    if (error) {
      setRows(prev);
      toast.error(error.message);
      return;
    }
    toast.success(`Updated ${ids.length} listing${ids.length > 1 ? "s" : ""}`);
    setSelected(new Set());
  }

  if (authLoading)
    return (
      <PageShell title="Listings">
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  if (!user)
    return (
      <PageShell title="Listings" subtitle="Sign in to manage listings.">
        <Link
          to="/auth"
          className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
        >
          Sign in
        </Link>
      </PageShell>
    );

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
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1.5" /> New Listing
              </Button>
            </DialogTrigger>
            <NewListingDialog
              userId={user.id}
              onClose={() => setOpen(false)}
              onSaved={() => {
                setOpen(false);
                load();
              }}
            />
          </Dialog>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
            <HomeIcon className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No listings yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Add your first property to start tracking inventory across your portfolio.
          </p>
          <Button className="mt-5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Listing
          </Button>
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
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                selected={selected.has(l.id)}
                onToggleSelect={() => toggleOne(l.id)}
                onStatusChange={(s) => updateStatus(l.id, s)}
                onRemove={() => remove(l)}
                onEdit={() => setEditing(l)}
                onOpen={() => setViewing(l)}
                onOpenDocs={() => setDocsListing(l)}
                onShare={() => setSharingListing(l)}
                docCount={docCounts[l.id] ?? 0}
              />
            ))}
          </div>
        </>
      )}

      {viewing && (
        <ListingFullscreen
          listing={viewing}
          onClose={() => setViewing(null)}
          onOpenDocs={() => setDocsListing(viewing)}
          onShare={() => setSharingListing(viewing)}
          docCount={docCounts[viewing.id] ?? 0}
        />
      )}
      {sharingListing && (
        <ShareListingModal
          listing={sharingListing}
          open={!!sharingListing}
          onOpenChange={(v) => !v && setSharingListing(null)}
        />
      )}
      {docsListing && (
        <ListingDocumentsModal
          open={!!docsListing}
          onOpenChange={(v) => {
            if (!v) {
              setDocsListing(null);
              if (user) loadDocCounts(rows.map((r) => r.id));
            }
          }}
          listingId={docsListing.id}
          userId={user.id}
          listingLabel={docsListing.address}
          onCountChange={(n) =>
            setDocCounts((prev) => ({ ...prev, [docsListing.id]: n }))
          }
        />
      )}
      {editing && (
        <Dialog
          open={!!editing}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditing(null);
          }}
        >
          <EditListingDialog
            listing={editing}
            userId={user.id}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              setViewing(null);
              load();
            }}
          />
        </Dialog>
      )}
    </PageShell>
  );
}

function ListingCard({
  listing: l,
  selected: isSel,
  onToggleSelect,
  onStatusChange,
  onRemove,
  onEdit,
  onOpen,
  onOpenDocs,
  onShare,
  docCount,
}: {
  listing: Listing;
  selected: boolean;
  onToggleSelect: () => void;
  onStatusChange: (s: string) => void;
  onRemove: () => void;
  onEdit: () => void;
  onOpen: () => void;
  onOpenDocs: () => void;
  onShare: () => void;
  docCount: number;
}) {
  const images = l.image_paths ?? [];
  const imageUrls = l.image_urls ?? [];
  const [idx, setIdx] = useState(0);
  const cover = imageUrls[idx];
  const hasMulti = images.length > 1;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % images.length);
  };
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + images.length) % images.length);
  };

  return (
    <div
      className={`bg-card border rounded-2xl shadow-card overflow-hidden group ${isSel ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
    >
      <div
        className="aspect-[16/10] bg-gradient-to-br from-primary/80 to-primary relative cursor-pointer"
        onClick={onOpen}
      >
        <div
          className={`absolute top-3 right-24 z-10 transition ${isSel ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          <div
            className="rounded-md bg-background p-0.5 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSel}
              onCheckedChange={onToggleSelect}
              aria-label="Select listing"
            />
          </div>
        </div>
        {cover && (
          <img
            src={cover}
            alt={l.address}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
          <Select value={l.status} onValueChange={onStatusChange}>
            <SelectTrigger
              className={`h-7 px-2.5 text-xs font-medium border-0 rounded-full shadow-sm ${
                l.status === "Active"
                  ? "bg-success/90 text-white"
                  : l.status === "Pending"
                    ? "bg-warning/90 text-white"
                    : "bg-black/60 text-white"
              }`}
            >
              <SelectValue>{l.status}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
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
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-3 right-12 opacity-100 transition bg-black/50 hover:bg-primary text-white rounded-md p-1.5 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Edit listing"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-3 right-3 opacity-100 transition bg-black/50 hover:bg-destructive text-white rounded-md p-1.5 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Delete listing"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-4 sm:p-5">
        <div className="text-xl sm:text-2xl font-bold tabular-nums font-display text-foreground">
          {formatMoney(Number(l.list_price))}
        </div>
        <div className="text-sm text-muted-foreground mt-1 break-words">{l.address}</div>
        {l.notes && (
          <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {l.notes}
          </p>
        )}
        {(l.client_name || l.deal_side || l.close_date) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {l.client_name && <span>Client: {l.client_name}</span>}
            {l.deal_side && <span>Side: {formatDealSide(l.deal_side)}</span>}
            {l.close_date && <span>Close: {l.close_date}</span>}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          {l.beds != null && (
            <span className="inline-flex items-center gap-1.5">
              <Bed className="h-4 w-4" />
              {l.beds}
            </span>
          )}
          {l.baths != null && (
            <span className="inline-flex items-center gap-1.5">
              <Bath className="h-4 w-4" />
              {l.baths}
            </span>
          )}
          {l.sqft != null && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Maximize2 className="h-4 w-4" />
              {l.sqft.toLocaleString()} sqft
            </span>
          )}
        </div>

        {(l.gross_commission || l.agent_split_pct || l.referral_pct || l.referral_to) && (
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs">
            <div>
              <div className="text-muted-foreground">Gross commission</div>
              <div className="font-medium tabular-nums">
                {formatMoney(Number(l.gross_commission || 0))}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Split</div>
              <div className="font-medium tabular-nums">
                {Number(l.agent_split_pct || 0)}/{Number(l.brokerage_split_pct || 0)}
              </div>
            </div>
            {Number(l.referral_pct || 0) > 0 && (
              <div className="col-span-2">
                <div className="text-muted-foreground">Referral</div>
                <div className="font-medium">
                  {l.referral_pct}%{l.referral_to ? ` to ${l.referral_to}` : ""}
                </div>
              </div>
            )}
          </div>
        )}

        {(l.seller_name || l.seller_email || l.seller_phone || l.seller_new_address) && (
          <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-xs">
            {l.seller_name && (
              <div className="flex items-center gap-2 text-foreground font-medium">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {l.seller_name}
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {l.seller_email && (
                <a
                  href={`mailto:${l.seller_email}`}
                  className="inline-flex items-center gap-1.5 hover:text-primary truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {l.seller_email}
                </a>
              )}
              {l.seller_phone && (
                <a
                  href={`tel:${l.seller_phone}`}
                  className="inline-flex items-center gap-1.5 hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {l.seller_phone}
                </a>
              )}
            </div>
            {l.seller_new_address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="leading-snug">
                  Moving to: <span className="text-foreground">{l.seller_new_address}</span>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border space-y-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDocs();
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted px-3 py-2 text-sm font-medium text-foreground transition"
          >
            <FolderOpen className="h-4 w-4 text-primary" />
            Documents
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs tabular-nums">
              {docCount}
            </span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted px-3 py-2 text-sm font-medium text-foreground transition"
            >
              <Share2 className="h-4 w-4 text-primary" />
              Share
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadListingPdf(l);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted px-3 py-2 text-sm font-medium text-foreground transition"
            >
              <Download className="h-4 w-4 text-primary" />
              PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingFullscreen({
  listing: l,
  onClose,
  onOpenDocs,
  onShare,
  docCount,
}: {
  listing: Listing;
  onClose: () => void;
  onOpenDocs: () => void;
  onShare: () => void;
  docCount: number;
}) {
  const images = l.image_paths ?? [];
  const imageUrls = l.image_urls ?? [];
  const [idx, setIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const cover = imageUrls[idx];
  const hasMulti = images.length > 1;

  useEffect(() => {
    setIdx(0);
    setShowInfo(true);
  }, [l.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && hasMulti) setIdx((i) => (i + 1) % images.length);
      else if (e.key === "ArrowLeft" && hasMulti)
        setIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, hasMulti, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {cover ? (
        <img
          src={cover}
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
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i - 1 + images.length) % images.length);
            }}
            aria-label="Previous"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/85 text-white rounded-full p-3"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i + 1) % images.length);
            }}
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

      {/* Action buttons */}
      <div className="absolute top-4 right-40 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDocs();
          }}
          className="bg-black/70 hover:bg-black/85 text-white text-xs font-medium rounded-full px-3 py-2 inline-flex items-center gap-1.5"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Documents
          {docCount > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] tabular-nums">
              {docCount}
            </span>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="bg-black/70 hover:bg-black/85 text-white text-xs font-medium rounded-full px-3 py-2 inline-flex items-center gap-1.5"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadListingPdf(l);
          }}
          className="bg-black/70 hover:bg-black/85 text-white text-xs font-medium rounded-full px-3 py-2 inline-flex items-center gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          PDF
        </button>
      </div>

      {/* Toggle for details overlay */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowInfo((v) => !v);
        }}
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
                <div className="text-3xl sm:text-4xl font-bold tabular-nums font-display">
                  {formatMoney(Number(l.list_price))}
                </div>
                <div className="text-sm text-white/80 mt-1">{l.address}</div>
                {(l.client_name || l.deal_side || l.close_date) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80 sm:text-sm">
                    {l.client_name && <span>Client: {l.client_name}</span>}
                    {l.deal_side && <span>Side: {formatDealSide(l.deal_side)}</span>}
                    {l.close_date && <span>Close date: {l.close_date}</span>}
                  </div>
                )}
                {l.notes && (
                  <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-xs leading-relaxed text-white/75 sm:text-sm">
                    {l.notes}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-white/85">
                {l.beds != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Bed className="h-4 w-4" />
                    {l.beds}
                  </span>
                )}
                {l.baths != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Bath className="h-4 w-4" />
                    {l.baths}
                  </span>
                )}
                {l.sqft != null && (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Maximize2 className="h-4 w-4" />
                    {l.sqft.toLocaleString()} sqft
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    l.status === "Active"
                      ? "bg-success/90"
                      : l.status === "Pending"
                        ? "bg-warning/90"
                        : "bg-black/80"
                  }`}
                >
                  {l.status}
                </span>
              </div>
            </div>
            {(l.gross_commission || l.agent_split_pct || l.referral_pct || l.referral_to) && (
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-white/15 bg-black/25 p-4 text-xs sm:grid-cols-3 sm:text-sm">
                <div>
                  <div className="text-white/60">Gross commission</div>
                  <div className="mt-1 font-display text-lg font-bold tabular-nums">
                    {formatMoney(Number(l.gross_commission || 0))}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Split</div>
                  <div className="mt-1 font-display text-lg font-bold tabular-nums">
                    {Number(l.agent_split_pct || 0)}/{Number(l.brokerage_split_pct || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Referral</div>
                  <div className="mt-1 font-medium">
                    {Number(l.referral_pct || 0) > 0
                      ? `${l.referral_pct}%${l.referral_to ? ` to ${l.referral_to}` : ""}`
                      : "No referral"}
                  </div>
                </div>
              </div>
            )}
            {(l.seller_name || l.seller_email || l.seller_phone || l.seller_new_address) && (
              <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:text-sm text-white/85">
                {l.seller_name && (
                  <div className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {l.seller_name}
                  </div>
                )}
                {l.seller_email && (
                  <a
                    href={`mailto:${l.seller_email}`}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    <Mail className="h-4 w-4" />
                    {l.seller_email}
                  </a>
                )}
                {l.seller_phone && (
                  <a
                    href={`tel:${l.seller_phone}`}
                    className="inline-flex items-center gap-2 hover:text-white"
                  >
                    <Phone className="h-4 w-4" />
                    {l.seller_phone}
                  </a>
                )}
                {l.seller_new_address && (
                  <div className="inline-flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Moving to: {l.seller_new_address}</span>
                  </div>
                )}
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
  userId,
  onClose,
  onSaved,
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
  const [propertyType, setPropertyType] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [parkingSpaces, setParkingSpaces] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [mlsNumber, setMlsNumber] = useState("");
  const [description, setDescription] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentBrokerage, setAgentBrokerage] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerNewAddress, setSellerNewAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [pendingDocs, setPendingDocs] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<PendingImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

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

  useEffect(
    () => () => {
      imagesRef.current.forEach((i) => URL.revokeObjectURL(i.preview));
    },
    [],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return toast.error("Address is required");
    const brandErr = validateAgentBranding({
      agent_name: agentName,
      agent_brokerage: agentBrokerage,
      agent_phone: agentPhone,
      agent_email: agentEmail,
    });
    if (brandErr) return toast.error(brandErr);
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

      const { data: insertedRows, error: insErr } = await supabase
        .from("listings")
        .insert({
          user_id: userId,
          address: address.trim(),
          list_price: parseFloat(price) || 0,
          status,
          beds: beds ? parseInt(beds) : null,
          baths: baths ? parseFloat(baths) : null,
          sqft: sqft ? parseInt(sqft) : null,
          property_type: propertyType || null,
          year_built: yearBuilt ? parseInt(yearBuilt) : null,
          lot_size: lotSize.trim() || null,
          parking_spaces: parkingSpaces ? parseInt(parkingSpaces) : null,
          closing_date: status === "Sold" && closingDate ? closingDate : null,
          mls_number: mlsNumber.trim() || null,
          description: description.trim() || null,
          agent_name: agentName.trim() || null,
          agent_brokerage: agentBrokerage.trim() || null,
          agent_phone: agentPhone.trim() || null,
          agent_email: agentEmail.trim() || null,
          image_paths: uploaded,
          seller_name: sellerName.trim() || null,
          seller_email: sellerEmail.trim() || null,
          seller_phone: sellerPhone.trim() || null,
          seller_new_address: sellerNewAddress.trim() || null,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const newListingId = insertedRows?.id as string | undefined;
      if (newListingId && pendingDocs.length) {
        type DocInsert = {
          listing_id: string;
          user_id: string;
          name: string;
          path: string;
          size: number;
          mime_type: string | null;
        };
        const docUploads: { path: string; row: DocInsert }[] = [];
        for (const f of pendingDocs) {
          if (f.size > 25 * 1024 * 1024) {
            toast.error(`${f.name}: over 25MB, skipped`);
            continue;
          }
          const ext = f.name.split(".").pop() || "bin";
          const path = `${userId}/${newListingId}/${crypto.randomUUID()}.${ext}`;
          const { error: dupErr } = await supabase.storage
            .from("listing-documents")
            .upload(path, f, {
              contentType: f.type || "application/octet-stream",
              upsert: false,
            });
          if (dupErr) {
            toast.error(`${f.name}: ${dupErr.message}`);
            continue;
          }
          docUploads.push({
            path,
            row: {
              listing_id: newListingId,
              user_id: userId,
              name: f.name,
              path,
              size: f.size,
              mime_type: f.type || null,
            },
          });
        }
        if (docUploads.length) {
          const { error: docInsErr } = await supabase
            .from("listing_documents")
            .insert(docUploads.map((u) => u.row));
          if (docInsErr) {
            await supabase.storage
              .from("listing-documents")
              .remove(docUploads.map((u) => u.path))
              .catch(() => {});
            toast.error(`Documents: ${docInsErr.message}`);
          }
        }
      }

      toast.success("Listing added");
      images.forEach((i) => URL.revokeObjectURL(i.preview));
      onSaved();
    } catch (err) {
      if (uploaded.length)
        await supabase.storage
          .from(BUCKET)
          .remove(uploaded)
          .catch(() => {});
      toast.error(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle>New Listing</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="addr">Property Address *</Label>
          <Input
            id="addr"
            autoFocus
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter property address here"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mlsn">MLS Number</Label>
            <Input
              id="mlsn"
              value={mlsNumber}
              onChange={(e) => setMlsNumber(e.target.value)}
              placeholder="Leave blank for N/A"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="public-remarks">Public Remarks / Description</Label>
          <Textarea
            id="public-remarks"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Write a detailed marketing description for this property. This appears in the REMARKS section of the auto-generated MLS sheet."
          />
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lp">List Price *</Label>
            <Input
              id="lp"
              type="number"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter sale price"
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {status === "Sold" && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <Label htmlFor="cd">Closing Date</Label>
            <Input
              id="cd"
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="bd">Beds</Label>
            <Input
              id="bd"
              type="number"
              min="0"
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ba">Baths</Label>
            <Input
              id="ba"
              type="number"
              min="0"
              step="0.5"
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sf">Sqft</Label>
            <Input
              id="sf"
              type="number"
              min="0"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Property Type</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single Family">Single Family</SelectItem>
                <SelectItem value="Condo">Condo</SelectItem>
                <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                <SelectItem value="Land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yb">Year Built</Label>
            <Input
              id="yb"
              type="number"
              min="1700"
              max="2100"
              value={yearBuilt}
              onChange={(e) => setYearBuilt(e.target.value)}
              placeholder="e.g. 1998"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ls">Lot Size / Acreage</Label>
            <Input
              id="ls"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              placeholder="e.g. 0.25 acres"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pk">Garage / Parking Spaces</Label>
            <Input
              id="pk"
              type="number"
              min="0"
              value={parkingSpaces}
              onChange={(e) => setParkingSpaces(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
        </div>


        {/* Seller info */}
        <div className="space-y-3 pt-2 border-t">
          <div className="text-sm font-medium text-foreground">Seller</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sn">Name</Label>
              <Input
                id="sn"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Enter seller name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp">Phone</Label>
              <Input
                id="sp"
                type="tel"
                value={sellerPhone}
                onChange={(e) => setSellerPhone(e.target.value)}
                placeholder="Enter seller phone number"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="se">Email</Label>
              <Input
                id="se"
                type="email"
                value={sellerEmail}
                onChange={(e) => setSellerEmail(e.target.value)}
                placeholder="Enter seller email"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sna">Seller's New Address</Label>
              <Input
                id="sna"
                value={sellerNewAddress}
                onChange={(e) => setSellerNewAddress(e.target.value)}
                placeholder="Enter seller's new address"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="text-sm font-medium text-foreground">Agent Branding / Contact Details</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="an">Agent Full Name</Label>
              <Input id="an" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="e.g. Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ab">Company / Brokerage</Label>
              <Input id="ab" value={agentBrokerage} onChange={(e) => setAgentBrokerage(e.target.value)} placeholder="e.g. Acme Realty" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap">Contact Phone</Label>
              <Input
                id="ap"
                type="tel"
                value={agentPhone}
                onChange={(e) => setAgentPhone(e.target.value)}
                placeholder="(555) 555-1234"
                aria-invalid={!!agentPhoneError(agentPhone)}
                className={agentPhoneError(agentPhone) ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {agentPhoneError(agentPhone) && (
                <p className="text-xs text-destructive">{agentPhoneError(agentPhone)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ae">Contact Email</Label>
              <Input
                id="ae"
                type="email"
                value={agentEmail}
                onChange={(e) => setAgentEmail(e.target.value)}
                placeholder="agent@brokerage.com"
                aria-invalid={!!agentEmailError(agentEmail)}
                className={agentEmailError(agentEmail) ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {agentEmailError(agentEmail) && (
                <p className="text-xs text-destructive">{agentEmailError(agentEmail)}</p>
              )}
            </div>
          </div>
        </div>


        <div className="space-y-1.5">
          <Label htmlFor="listing-notes">Notes</Label>
          <Textarea
            id="listing-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add listing notes"
          />
        </div>

        {/* Documents upload */}
        <div className="space-y-2">
          <Label>Documents</Label>
          <div
            onClick={() => docFileRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 rounded-xl p-5 text-center cursor-pointer transition"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length)
                setPendingDocs((p) => [...p, ...Array.from(e.dataTransfer.files)]);
            }}
          >
            <input
              ref={docFileRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                if (e.target.files)
                  setPendingDocs((p) => [...p, ...Array.from(e.target.files!)]);
                e.target.value = "";
              }}
            />
            <Upload className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground" />
            <div className="text-sm font-medium">Drag & drop or click to attach files</div>
            <div className="text-xs text-muted-foreground mt-1">
              PDF, PNG, JPEG, DOCX · up to 25MB each
            </div>
          </div>

          {pendingDocs.length > 0 && (
            <ul className="space-y-1.5 mt-2">
              {pendingDocs.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {(f.size / 1024 / 1024).toFixed(f.size > 1024 * 1024 ? 1 : 2)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDocs((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="p-1 rounded hover:bg-destructive/10 text-destructive shrink-0"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Image dropzone */}
        <div className="space-y-2">
          <Label>Photos</Label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
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
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
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
                <div
                  key={img.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                >
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] font-medium rounded px-1.5 py-0.5">
                      Thumbnail
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.id);
                    }}
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
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !address.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…
              </>
            ) : (
              "Add Listing"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditListingDialog({
  listing,
  userId,
  onClose,
  onSaved,
}: {
  listing: Listing;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [address, setAddress] = useState(listing.address ?? "");
  const [price, setPrice] = useState(String(listing.list_price ?? ""));
  const [status, setStatus] = useState(listing.status ?? "Active");
  const [beds, setBeds] = useState(listing.beds == null ? "" : String(listing.beds));
  const [baths, setBaths] = useState(listing.baths == null ? "" : String(listing.baths));
  const [sqft, setSqft] = useState(listing.sqft == null ? "" : String(listing.sqft));
  const [propertyType, setPropertyType] = useState(listing.property_type ?? "");
  const [yearBuilt, setYearBuilt] = useState(
    listing.year_built == null ? "" : String(listing.year_built),
  );
  const [lotSize, setLotSize] = useState(listing.lot_size ?? "");
  const [parkingSpaces, setParkingSpaces] = useState(
    listing.parking_spaces == null ? "" : String(listing.parking_spaces),
  );
  const [closingDate, setClosingDate] = useState(listing.closing_date ?? "");
  const [sellerName, setSellerName] = useState(listing.seller_name ?? "");
  const [sellerEmail, setSellerEmail] = useState(listing.seller_email ?? "");
  const [sellerPhone, setSellerPhone] = useState(listing.seller_phone ?? "");
  const [sellerNewAddress, setSellerNewAddress] = useState(listing.seller_new_address ?? "");
  const [notes, setNotes] = useState(listing.notes ?? "");
  const [mlsNumber, setMlsNumber] = useState(listing.mls_number ?? "");
  const [description, setDescription] = useState(listing.description ?? "");
  const [agentName, setAgentName] = useState(listing.agent_name ?? "");
  const [agentBrokerage, setAgentBrokerage] = useState(listing.agent_brokerage ?? "");
  const [agentPhone, setAgentPhone] = useState(listing.agent_phone ?? "");
  const [agentEmail, setAgentEmail] = useState(listing.agent_email ?? "");
  const [imagePaths, setImagePaths] = useState<string[]>(listing.image_paths ?? []);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<PendingImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview));
    },
    [],
  );

  function existingImageUrl(path: string) {
    const index = (listing.image_paths ?? []).indexOf(path);
    return index >= 0 ? (listing.image_urls?.[index] ?? "") : "";
  }

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

  function removeNewImage(id: string) {
    setImages((prev) => {
      const found = prev.find((image) => image.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return prev.filter((image) => image.id !== id);
    });
  }

  function removeExistingImage(path: string) {
    setImagePaths((prev) => prev.filter((imagePath) => imagePath !== path));
    setRemovedPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return toast.error("Address is required");
    const brandErr = validateAgentBranding({
      agent_name: agentName,
      agent_brokerage: agentBrokerage,
      agent_phone: agentPhone,
      agent_email: agentEmail,
    });
    if (brandErr) return toast.error(brandErr);
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

      const nextImagePaths = [...imagePaths, ...uploaded];
      const { error: updateErr } = await supabase
        .from("listings")
        .update({
          address: address.trim(),
          list_price: parseFloat(price) || 0,
          status,
          beds: beds ? parseInt(beds) : null,
          baths: baths ? parseFloat(baths) : null,
          sqft: sqft ? parseInt(sqft) : null,
          property_type: propertyType || null,
          year_built: yearBuilt ? parseInt(yearBuilt) : null,
          lot_size: lotSize.trim() || null,
          parking_spaces: parkingSpaces ? parseInt(parkingSpaces) : null,
          closing_date: status === "Sold" && closingDate ? closingDate : null,
          mls_number: mlsNumber.trim() || null,
          description: description.trim() || null,
          agent_name: agentName.trim() || null,
          agent_brokerage: agentBrokerage.trim() || null,
          agent_phone: agentPhone.trim() || null,
          agent_email: agentEmail.trim() || null,
          image_paths: nextImagePaths,
          seller_name: sellerName.trim() || null,
          seller_email: sellerEmail.trim() || null,
          seller_phone: sellerPhone.trim() || null,
          seller_new_address: sellerNewAddress.trim() || null,
          notes: notes.trim() || null,
        })
        .eq("id", listing.id);
      if (updateErr) throw updateErr;

      if (removedPaths.length) {
        await supabase.storage
          .from(BUCKET)
          .remove(removedPaths)
          .catch(() => {});
      }

      images.forEach((image) => URL.revokeObjectURL(image.preview));
      toast.success("Listing updated");
      onSaved();
    } catch (err) {
      if (uploaded.length)
        await supabase.storage
          .from(BUCKET)
          .remove(uploaded)
          .catch(() => {});
      toast.error(err instanceof Error ? err.message : "Failed to update listing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle>Edit Listing</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="edit-addr">Property Address *</Label>
          <Input
            id="edit-addr"
            autoFocus
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter property address here"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-mlsn">MLS Number</Label>
            <Input
              id="edit-mlsn"
              value={mlsNumber}
              onChange={(e) => setMlsNumber(e.target.value)}
              placeholder="Leave blank for N/A"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-public-remarks">Public Remarks / Description</Label>
          <Textarea
            id="edit-public-remarks"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Write a detailed marketing description for this property. This appears in the REMARKS section of the auto-generated MLS sheet."
          />
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-lp">List Price *</Label>
            <Input
              id="edit-lp"
              type="number"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter sale price"
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {status === "Sold" && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <Label htmlFor="edit-cd">Closing Date</Label>
            <Input
              id="edit-cd"
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-bd">Beds</Label>
            <Input
              id="edit-bd"
              type="number"
              min="0"
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-ba">Baths</Label>
            <Input
              id="edit-ba"
              type="number"
              min="0"
              step="0.5"
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-sf">Sqft</Label>
            <Input
              id="edit-sf"
              type="number"
              min="0"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Property Type</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single Family">Single Family</SelectItem>
                <SelectItem value="Condo">Condo</SelectItem>
                <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                <SelectItem value="Land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-yb">Year Built</Label>
            <Input
              id="edit-yb"
              type="number"
              min="1700"
              max="2100"
              value={yearBuilt}
              onChange={(e) => setYearBuilt(e.target.value)}
              placeholder="e.g. 1998"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-ls">Lot Size / Acreage</Label>
            <Input
              id="edit-ls"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              placeholder="e.g. 0.25 acres"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-pk">Garage / Parking Spaces</Label>
            <Input
              id="edit-pk"
              type="number"
              min="0"
              value={parkingSpaces}
              onChange={(e) => setParkingSpaces(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
        </div>


        <div className="space-y-3 pt-2 border-t">
          <div className="text-sm font-medium text-foreground">Seller</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sn">Name</Label>
              <Input
                id="edit-sn"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Enter seller name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-sp">Phone</Label>
              <Input
                id="edit-sp"
                type="tel"
                value={sellerPhone}
                onChange={(e) => setSellerPhone(e.target.value)}
                placeholder="Enter seller phone number"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-se">Email</Label>
              <Input
                id="edit-se"
                type="email"
                value={sellerEmail}
                onChange={(e) => setSellerEmail(e.target.value)}
                placeholder="Enter seller email"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-sna">Seller's New Address</Label>
              <Input
                id="edit-sna"
                value={sellerNewAddress}
                onChange={(e) => setSellerNewAddress(e.target.value)}
                placeholder="Enter seller's new address"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="text-sm font-medium text-foreground">Agent Branding / Contact Details</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-an">Agent Full Name</Label>
              <Input id="edit-an" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="e.g. Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-ab">Company / Brokerage</Label>
              <Input id="edit-ab" value={agentBrokerage} onChange={(e) => setAgentBrokerage(e.target.value)} placeholder="e.g. Acme Realty" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-ap">Contact Phone</Label>
              <Input id="edit-ap" type="tel" value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} placeholder="(555) 555-1234" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-ae">Contact Email</Label>
              <Input id="edit-ae" type="email" value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} placeholder="agent@brokerage.com" />
            </div>
          </div>
        </div>


        <div className="space-y-1.5">
          <Label htmlFor="edit-listing-notes">Notes</Label>
          <Textarea
            id="edit-listing-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add listing notes"
          />
        </div>

        <div className="space-y-2">
          <Label>Photos</Label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
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
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Upload className="h-8 w-8 text-muted-foreground/70 mx-auto mb-2" />
            <div className="text-sm font-medium">Drag & drop photos here</div>
            <div className="text-xs text-muted-foreground mt-1">
              Keep, remove, or add photos up to {MAX_FILE_MB}MB each
            </div>
          </div>

          {(imagePaths.length > 0 || images.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
              {imagePaths.map((path, i) => {
                const url = existingImageUrl(path);
                return (
                  <div
                    key={path}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                  >
                    {url ? (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                        Photo unavailable
                      </div>
                    )}
                    {i === 0 && (
                      <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] font-medium rounded px-1.5 py-0.5">
                        Thumbnail
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExistingImage(path);
                      }}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-destructive text-white rounded-full p-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}

              {images.map((img, i) => (
                <div
                  key={img.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                >
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  {imagePaths.length === 0 && i === 0 && (
                    <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] font-medium rounded px-1.5 py-0.5">
                      Thumbnail
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNewImage(img.id);
                    }}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-destructive text-white rounded-full p-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
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
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !address.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving...
              </>
            ) : (
              "Save Listing"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function formatDealSide(side: string) {
  if (side === "sell") return "Seller side";
  if (side === "both") return "Both sides";
  return "Buyer side";
}
