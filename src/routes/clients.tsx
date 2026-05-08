import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Mail, Phone, RefreshCw, Loader2, Check, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pushClientToGhl } from "@/utils/ghl.functions";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/clients")({
  component: Clients,
  head: () => ({
    meta: [
      { title: "Clients — Agent Business Tracker" },
      { name: "description", content: "Manage your client list and sync contacts with GoHighLevel." },
    ],
  }),
});

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  ghl_contact_id: string | null;
  last_synced_at: string | null;
  source: string;
  updated_at: string;
  client_type: string | null;
  timeline: string | null;
  address: string | null;
  pre_approved: boolean | null;
  budget_min: number | null;
  budget_max: number | null;
  locality: string | null;
};

function Clients() {
  const { user, loading: authLoading } = useAuth();
  const pushOne = useServerFn(pushClientToGhl);

  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    client_type: "" as "" | "buyer" | "seller",
    timeline: "",
    address: "",
    pre_approved: "" as "" | "yes" | "no",
    budget_min: "",
    budget_max: "",
    locality: "",
  });

  const emptyForm = {
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    client_type: "" as "" | "buyer" | "seller",
    timeline: "",
    address: "",
    pre_approved: "" as "" | "yes" | "no",
    budget_min: "",
    budget_max: "",
    locality: "",
  };

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id,name,email,phone,company,notes,ghl_contact_id,last_synced_at,source,updated_at,client_type,timeline,address,pre_approved,budget_min,budget_max,locality")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Client[]);
    setLoading(false);
  }

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      company: c.company ?? "",
      notes: c.notes ?? "",
      client_type: (c.client_type as "buyer" | "seller" | null) ?? "",
      timeline: c.timeline ?? "",
      address: c.address ?? "",
      pre_approved: c.pre_approved === true ? "yes" : c.pre_approved === false ? "no" : "",
      budget_min: c.budget_min != null ? String(c.budget_min) : "",
      budget_max: c.budget_max != null ? String(c.budget_max) : "",
      locality: c.locality ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!user) return;
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.client_type) return toast.error("Please select Buyer or Seller");
    const isBuyer = form.client_type === "buyer";
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      notes: form.notes.trim() || null,
      client_type: form.client_type,
      timeline: form.timeline.trim() || null,
      address: !isBuyer ? (form.address.trim() || null) : null,
      pre_approved: isBuyer ? (form.pre_approved === "yes" ? true : form.pre_approved === "no" ? false : null) : null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      locality: isBuyer ? (form.locality.trim() || null) : null,
    };
    if (editing) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Client updated");
    } else {
      const { error } = await supabase.from("clients").insert({ ...payload, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("Client added");
    }
    setOpen(false);
    load();
  }

  async function remove(c: Client) {
    if (!confirm(`Delete ${c.name}?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  async function syncOne(c: Client) {
    setSyncing(c.id);
    try {
      await pushOne({ data: { clientId: c.id } });
      toast.success(`${c.name} synced to GHL`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  if (authLoading) {
    return (
      <PageShell title="Clients">
        <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Clients"
      subtitle="Your CRM — synced two-way with GoHighLevel."
      actions={
        <button onClick={openNew} className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Client
        </button>
      }
    >
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No clients yet. Add one or pull from GHL in Settings → GoHighLevel.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-medium py-3 px-6">Name</th>
                <th className="text-left font-medium py-3">Contact</th>
                <th className="text-left font-medium py-3">Type</th>
                <th className="text-left font-medium py-3">GHL Sync</th>
                <th className="text-right font-medium py-3 pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border row-hover-blue">
                  <td className="py-4 px-6">
                    <button onClick={() => openEdit(c)} className="flex items-center gap-3 text-left">
                      <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                        {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </button>
                  </td>
                  <td className="py-4 text-muted-foreground">
                    <div className="flex flex-col gap-0.5 text-xs">
                      {c.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</span>}
                      {c.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</span>}
                    </div>
                  </td>
                  <td className="py-4">
                    {c.client_type ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        c.client_type === "buyer"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {c.client_type}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-4">
                    {c.ghl_contact_id ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <Check className="h-3 w-3" />
                        {c.last_synced_at ? new Date(c.last_synced_at).toLocaleDateString() : "Linked"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <AlertCircle className="h-3 w-3" /> Not synced
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-6 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => syncOne(c)}
                        disabled={syncing === c.id}
                        title="Push to GHL"
                        className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                      >
                        {syncing === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </button>
                      <button onClick={() => openEdit(c)} title="Edit" className="p-2 rounded-md hover:bg-muted text-muted-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(c)} title="Delete" className="p-2 rounded-md hover:bg-muted text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit client" : "New client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input className="input" placeholder="Name *" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input className="input" placeholder="Phone Number" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Client type *</label>
              <div className="grid grid-cols-2 gap-2">
                {(["buyer", "seller"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, client_type: t }))}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      form.client_type === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {form.client_type && (
              <input
                className="input"
                placeholder={form.client_type === "buyer" ? "Timeline to buy (e.g. 1–3 months)" : "Timeline to sell (e.g. 1–3 months)"}
                value={form.timeline}
                onChange={(e) => setForm((f) => ({ ...f, timeline: e.target.value }))}
              />
            )}

            {form.client_type === "seller" && (
              <input className="input" placeholder="Property address" value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            )}

            {form.client_type === "buyer" && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Pre-approved?</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, pre_approved: v }))}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium uppercase transition-colors ${
                        form.pre_approved === v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-accent"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.client_type && (
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" inputMode="numeric"
                  placeholder={form.client_type === "buyer" ? "Budget min" : "Price range min"}
                  value={form.budget_min}
                  onChange={(e) => setForm((f) => ({ ...f, budget_min: e.target.value }))} />
                <input className="input" type="number" inputMode="numeric"
                  placeholder={form.client_type === "buyer" ? "Budget max" : "Price range max"}
                  value={form.budget_max}
                  onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value }))} />
              </div>
            )}

            {form.client_type === "buyer" && (
              <input className="input" placeholder="Town / locality looking to buy in" value={form.locality}
                onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))} />
            )}

            <textarea className="input min-h-20" placeholder="Notes" value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={save}>{editing ? "Save" : "Add"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
