import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Bed, Bath, Maximize2, Loader2, Trash2, Home as HomeIcon } from "lucide-react";
import { PageShell, StatusPill } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
}

const tone: Record<string, "success" | "warning" | "muted"> = { Active: "success", Pending: "warning", Sold: "muted" };

function Listings() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("Active");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("id,address,list_price,status,beds,baths,sqft")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Listing[]);
    setLoading(false);
  }
  useEffect(() => { if (!authLoading) load(); /* eslint-disable-next-line */ }, [user, authLoading]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !address.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("listings").insert({
      user_id: user.id,
      address: address.trim(),
      list_price: parseFloat(price) || 0,
      status,
      beds: beds ? parseInt(beds) : null,
      baths: baths ? parseFloat(baths) : null,
      sqft: sqft ? parseInt(sqft) : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Listing added");
    setAddress(""); setPrice(""); setStatus("Active"); setBeds(""); setBaths(""); setSqft("");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
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
          <DialogContent>
            <DialogHeader><DialogTitle>New Listing</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="addr">Address *</Label>
                <Input id="addr" autoFocus required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="412 Oakwood Dr" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lp">List Price *</Label>
                  <Input id="lp" type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="750000" />
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
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label htmlFor="bd">Beds</Label><Input id="bd" type="number" min="0" value={beds} onChange={(e) => setBeds(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="ba">Baths</Label><Input id="ba" type="number" min="0" step="0.5" value={baths} onChange={(e) => setBaths(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="sf">Sqft</Label><Input id="sf" type="number" min="0" value={sqft} onChange={(e) => setSqft(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !address.trim()}>{saving ? "Saving…" : "Add Listing"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
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
          {rows.map((l) => (
            <div key={l.id} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden group">
              <div className="aspect-[16/10] bg-gradient-to-br from-primary/80 to-primary relative">
                <div className="absolute top-3 left-3"><StatusPill tone={tone[l.status] ?? "muted"}>{l.status}</StatusPill></div>
                <button onClick={() => remove(l.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition bg-black/40 hover:bg-destructive text-white rounded-md p-1.5">
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
          ))}
        </div>
      )}
    </PageShell>
  );
}
