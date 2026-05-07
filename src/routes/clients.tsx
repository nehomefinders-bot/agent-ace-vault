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
};

function Clients() {
  const { user, loading: authLoading } = useAuth();
  const pushOne = useServerFn(pushClientToGhl);

  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id,name,email,phone,company,notes,ghl_contact_id,last_synced_at,source,updated_at")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Client[]);
    setLoading(false);
  }

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", company: "", notes: "" });
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
    });
    setOpen(true);
  }

  async function save() {
    if (!user) return;
    if (!form.name.trim()) return toast.error("Name is required");
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      notes: form.notes.trim() || null,
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
                <th className="text-left font-medium py-3">Company</th>
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
                  <td className="py-4 text-muted-foreground text-xs">{c.company ?? "—"}</td>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit client" : "New client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input className="input" placeholder="Name *" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input className="input" placeholder="Phone" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <input className="input" placeholder="Company" value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
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
