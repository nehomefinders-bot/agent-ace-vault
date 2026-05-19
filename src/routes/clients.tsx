import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Mail,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImportButton, type ImportColumn } from "@/components/import-button";
import { PageShell } from "@/components/page-shell";
import { TableExportButton } from "@/components/table-export-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pushClientToGhl } from "@/utils/ghl.functions";

const CLIENT_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Name", required: true, sample: "Jane Smith" },
  { key: "email", label: "Email", sample: "jane@example.com" },
  { key: "phone", label: "Phone", sample: "555-123-4567" },
  { key: "client_type", label: "Contact Type", enumValues: ["buyer", "seller"], sample: "buyer" },
  { key: "timeline", label: "Timeline", sample: "1-3 months" },
  { key: "address", label: "Property Address (sellers)", sample: "" },
  { key: "pre_approved", label: "Pre Approved (buyers)", type: "boolean", sample: "yes" },
  { key: "budget_min", label: "Budget Min", type: "number", sample: 200000 },
  { key: "budget_max", label: "Budget Max", type: "number", sample: 400000 },
  { key: "locality", label: "Town / Locality (buyers)", sample: "Brooklyn" },
  { key: "notes", label: "Notes", sample: "" },
];

type DeviceContact = {
  email?: string[];
  name?: string[];
  tel?: string[];
};

type ContactPickerNavigator = Navigator & {
  contacts?: {
    select: (
      properties: string[],
      options?: {
        multiple?: boolean;
      },
    ) => Promise<DeviceContact[]>;
  };
};

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

export const Route = createFileRoute("/clients")({
  component: DirectoryPage,
  head: () => ({
    meta: [
      { title: "Directory - Agent Business Tracker" },
      {
        name: "description",
        content: "Manage your directory, sync phone contacts on supported devices, and call people directly from the app.",
      },
    ],
  }),
});

function DirectoryPage() {
  const { user, loading: authLoading } = useAuth();
  const pushOne = useServerFn(pushClientToGhl);

  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [phoneSyncing, setPhoneSyncing] = useState(false);

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
      .select(
        "id,name,email,phone,company,notes,ghl_contact_id,last_synced_at,source,updated_at,client_type,timeline,address,pre_approved,budget_min,budget_max,locality",
      )
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Client[]);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      company: client.company ?? "",
      notes: client.notes ?? "",
      client_type: (client.client_type as "buyer" | "seller" | null) ?? "",
      timeline: client.timeline ?? "",
      address: client.address ?? "",
      pre_approved: client.pre_approved === true ? "yes" : client.pre_approved === false ? "no" : "",
      budget_min: client.budget_min != null ? String(client.budget_min) : "",
      budget_max: client.budget_max != null ? String(client.budget_max) : "",
      locality: client.locality ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!user) return;
    if (!form.name.trim()) return toast.error("Name is required");

    const isBuyer = form.client_type === "buyer";
    const isSeller = form.client_type === "seller";
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      notes: form.notes.trim() || null,
      client_type: form.client_type || null,
      timeline: form.client_type ? (form.timeline.trim() || null) : null,
      address: isSeller ? (form.address.trim() || null) : null,
      pre_approved: isBuyer ? (form.pre_approved === "yes" ? true : form.pre_approved === "no" ? false : null) : null,
      budget_min: form.client_type && form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.client_type && form.budget_max ? Number(form.budget_max) : null,
      locality: isBuyer ? (form.locality.trim() || null) : null,
    };

    if (editing) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Contact updated");
    } else {
      const { error } = await supabase.from("clients").insert({ ...payload, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("Contact added");
    }

    setOpen(false);
    void load();
  }

  async function remove(client: Client) {
    if (!confirm(`Delete ${client.name}?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) return toast.error(error.message);
    toast.success("Contact deleted");
    void load();
  }

  async function syncOne(client: Client) {
    setSyncing(client.id);
    try {
      await pushOne({ data: { clientId: client.id } });
      toast.success(`${client.name} synced to GHL`);
      void load();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  async function syncPhoneContacts() {
    if (!user) return;

    const contactsApi = (navigator as ContactPickerNavigator).contacts;
    if (!contactsApi?.select) {
      toast.error("Phone contact sync is supported in compatible mobile browsers. You can still import contacts with CSV.");
      return;
    }

    setPhoneSyncing(true);
    try {
      const selected = await contactsApi.select(["name", "email", "tel"], { multiple: true });
      if (!selected.length) return;

      const existingPhones = new Set(rows.map((row) => normalizePhone(row.phone)).filter(Boolean) as string[]);
      const existingEmails = new Set(rows.map((row) => normalizeEmail(row.email)).filter(Boolean) as string[]);
      const existingNames = new Set(rows.map((row) => normalizeName(row.name)).filter(Boolean) as string[]);
      const batchPhones = new Set<string>();
      const batchEmails = new Set<string>();
      const batchNames = new Set<string>();

      let skipped = 0;
      const inserts: Array<{
        user_id: string;
        name: string;
        email: string | null;
        phone: string | null;
        company: string | null;
        notes: string | null;
        client_type: null;
        timeline: null;
        address: null;
        pre_approved: null;
        budget_min: null;
        budget_max: null;
        locality: null;
        source: string;
      }> = [];

      for (const contact of selected) {
        const name = firstValue(contact.name);
        const email = firstValue(contact.email);
        const phone = firstValue(contact.tel);
        const displayName = name || phone || email;

        if (!displayName) {
          skipped += 1;
          continue;
        }

        const normalizedPhone = normalizePhone(phone);
        const normalizedEmail = normalizeEmail(email);
        const normalizedName = normalizeName(displayName);
        const duplicate =
          (normalizedPhone && (existingPhones.has(normalizedPhone) || batchPhones.has(normalizedPhone))) ||
          (normalizedEmail && (existingEmails.has(normalizedEmail) || batchEmails.has(normalizedEmail))) ||
          (!normalizedPhone &&
            !normalizedEmail &&
            normalizedName &&
            (existingNames.has(normalizedName) || batchNames.has(normalizedName)));

        if (duplicate) {
          skipped += 1;
          continue;
        }

        inserts.push({
          user_id: user.id,
          name: displayName,
          email: email || null,
          phone: phone || null,
          company: null,
          notes: null,
          client_type: null,
          timeline: null,
          address: null,
          pre_approved: null,
          budget_min: null,
          budget_max: null,
          locality: null,
          source: "phone_sync",
        });

        if (normalizedPhone) batchPhones.add(normalizedPhone);
        if (normalizedEmail) batchEmails.add(normalizedEmail);
        if (normalizedName) batchNames.add(normalizedName);
      }

      if (!inserts.length) {
        toast.success(skipped > 0 ? "All selected contacts were already in your directory" : "No contacts were selected");
        return;
      }

      const { error } = await supabase.from("clients").insert(inserts);
      if (error) return toast.error(error.message);

      toast.success(
        skipped > 0
          ? `Synced ${inserts.length} contacts and skipped ${skipped} duplicates`
          : `Synced ${inserts.length} contacts`,
      );
      void load();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Contact access was blocked. Please allow contact permissions and try again.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Could not sync phone contacts");
    } finally {
      setPhoneSyncing(false);
    }
  }

  if (authLoading) {
    return (
      <PageShell title="Directory">
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title="Directory" subtitle="Sign in to access your contact directory and phone sync tools.">
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground shadow-card">
          Sign in to manage your directory, sync contacts, and call people from the tracker.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Directory"
      subtitle="Keep your contact directory in one place, sync phone contacts on supported devices, and call people directly from the app."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <TableExportButton
            filename="directory"
            sheetName="Directory"
            rows={rows}
            columns={[
              { header: "Name", accessor: (row) => row.name },
              { header: "Email", accessor: (row) => row.email },
              { header: "Phone", accessor: (row) => row.phone },
              { header: "Company", accessor: (row) => row.company },
              { header: "Type", accessor: (row) => row.client_type ?? "general" },
              { header: "Timeline", accessor: (row) => row.timeline },
              { header: "Address", accessor: (row) => row.address },
              { header: "Pre-Approved", accessor: (row) => row.pre_approved == null ? "" : row.pre_approved ? "Yes" : "No" },
              { header: "Budget Min", accessor: (row) => row.budget_min },
              { header: "Budget Max", accessor: (row) => row.budget_max },
              { header: "Locality", accessor: (row) => row.locality },
              { header: "Source", accessor: (row) => sourceLabel(row.source) },
              { header: "GHL Synced", accessor: (row) => row.ghl_contact_id ? "Yes" : "No" },
              { header: "Last Synced", accessor: (row) => row.last_synced_at },
              { header: "Notes", accessor: (row) => row.notes },
            ]}
          />
          <ImportButton
            table="clients"
            userId={user.id}
            columns={CLIENT_IMPORT_COLUMNS}
            templateName="directory-template"
            entityLabel="contacts"
            onImported={load}
            transformRow={(row) => {
              const isBuyer = row.client_type === "buyer";
              const isSeller = row.client_type === "seller";
              return {
                ...row,
                client_type: row.client_type ?? null,
                address: isSeller ? row.address ?? null : null,
                pre_approved: isBuyer ? row.pre_approved ?? null : null,
                locality: isBuyer ? row.locality ?? null : null,
                source: "import",
              };
            }}
          />
          <button
            type="button"
            onClick={() => void syncPhoneContacts()}
            disabled={phoneSyncing}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {phoneSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            Sync phone contacts
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground"
          >
            <Plus className="h-4 w-4" />
            Add contact
          </button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No contacts yet. Add one, import a list, or sync your phone contacts on a supported device.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 text-left font-medium">Name</th>
                  <th className="py-3 text-left font-medium">Contact</th>
                  <th className="py-3 text-left font-medium">Type</th>
                  <th className="py-3 text-left font-medium">GHL Sync</th>
                  <th className="pr-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((client) => (
                  <tr key={client.id} className="row-hover-blue border-t border-border">
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => openEdit(client)} className="flex items-center gap-3 text-left">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {client.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">{client.name}</div>
                          <div className="text-xs text-muted-foreground">{sourceLabel(client.source)}</div>
                        </div>
                      </button>
                    </td>
                    <td className="py-4 text-muted-foreground">
                      <div className="flex flex-col gap-1 text-xs">
                        {client.email ? (
                          <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{client.email}</span>
                          </a>
                        ) : null}
                        {client.phone ? (
                          <a href={toTelHref(client.phone)} className="inline-flex items-center gap-1.5 hover:text-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </a>
                        ) : null}
                        {!client.email && !client.phone ? <span>-</span> : null}
                      </div>
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          client.client_type === "buyer"
                            ? "bg-blue-500/10 text-blue-500"
                            : client.client_type === "seller"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {client.client_type ?? "General"}
                      </span>
                    </td>
                    <td className="py-4">
                      {client.ghl_contact_id ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <Check className="h-3 w-3" />
                          {client.last_synced_at ? new Date(client.last_synced_at).toLocaleDateString() : "Linked"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <AlertCircle className="h-3 w-3" />
                          Not synced
                        </span>
                      )}
                    </td>
                    <td className="pr-6 py-4 text-right">
                      <div className="inline-flex gap-1">
                        {client.phone ? (
                          <a
                            href={toTelHref(client.phone)}
                            title={`Call ${client.name}`}
                            className="rounded-md p-2 text-primary hover:bg-muted"
                          >
                            <PhoneCall className="h-4 w-4" />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void syncOne(client)}
                          disabled={syncing === client.id}
                          title="Push to GHL"
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                        >
                          {syncing === client.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(client)}
                          title="Edit"
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(client)}
                          title="Delete"
                          className="rounded-md p-2 text-destructive hover:bg-muted"
                        >
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
            <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <input
              className="input"
              placeholder="Name *"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Phone Number"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Company"
              value={form.company}
              onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Contact type</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { value: "", label: "General" },
                  { value: "buyer", label: "Buyer" },
                  { value: "seller", label: "Seller" },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        client_type: option.value as "" | "buyer" | "seller",
                      }))
                    }
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      form.client_type === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {form.client_type ? (
              <input
                className="input"
                placeholder={
                  form.client_type === "buyer"
                    ? "Timeline to buy (e.g. 1-3 months)"
                    : "Timeline to sell (e.g. 1-3 months)"
                }
                value={form.timeline}
                onChange={(event) => setForm((current) => ({ ...current, timeline: event.target.value }))}
              />
            ) : null}

            {form.client_type === "seller" ? (
              <input
                className="input"
                placeholder="Property address"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              />
            ) : null}

            {form.client_type === "buyer" ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Pre-approved?</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(["yes", "no"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, pre_approved: value }))}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-medium uppercase transition-colors ${
                        form.pre_approved === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {form.client_type ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  placeholder={form.client_type === "buyer" ? "Budget min" : "Price range min"}
                  value={form.budget_min}
                  onChange={(event) => setForm((current) => ({ ...current, budget_min: event.target.value }))}
                />
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  placeholder={form.client_type === "buyer" ? "Budget max" : "Price range max"}
                  value={form.budget_max}
                  onChange={(event) => setForm((current) => ({ ...current, budget_max: event.target.value }))}
                />
              </div>
            ) : null}

            {form.client_type === "buyer" ? (
              <input
                className="input"
                placeholder="Town / locality"
                value={form.locality}
                onChange={(event) => setForm((current) => ({ ...current, locality: event.target.value }))}
              />
            ) : null}

            <textarea
              className="input min-h-24"
              placeholder="Notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>

          <DialogFooter>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => void save()}>
              {editing ? "Save" : "Add"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function firstValue(values?: string[]) {
  return values?.map((value) => value.trim()).find(Boolean) || "";
}

function normalizePhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/[^\d+]/g, "");
  return digits || "";
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function sourceLabel(source: string) {
  if (source === "phone_sync") return "Phone sync";
  if (source === "import") return "Imported";
  if (source === "manual") return "Manual";
  return source;
}

function toTelHref(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}
