import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Send,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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

type PhoneImportCandidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  duplicate: boolean;
  duplicateReason: string | null;
};

type SmsMessage = {
  id: string;
  client_id: string;
  user_id: string;
  direction: string;
  status: string;
  body: string;
  created_at: string;
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
  const phoneFileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Client[]>([]);
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "phone_sync">("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [phoneSyncing, setPhoneSyncing] = useState(false);
  const [phoneImporting, setPhoneImporting] = useState(false);
  const [phoneDesyncing, setPhoneDesyncing] = useState(false);
  const [phoneConverting, setPhoneConverting] = useState(false);
  const [phoneReviewOpen, setPhoneReviewOpen] = useState(false);
  const [phoneCandidates, setPhoneCandidates] = useState<PhoneImportCandidate[]>([]);
  const [phoneCandidateSelectedIds, setPhoneCandidateSelectedIds] = useState<string[]>([]);
  const [selectedPhoneSyncIds, setSelectedPhoneSyncIds] = useState<string[]>([]);
  const [phoneSkippedCount, setPhoneSkippedCount] = useState(0);
  const [smsClient, setSmsClient] = useState<Client | null>(null);
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsDraft, setSmsDraft] = useState("");
  const [smsReplyDraft, setSmsReplyDraft] = useState("");
  const [smsPendingLogBody, setSmsPendingLogBody] = useState("");
  const [smsSaving, setSmsSaving] = useState(false);

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

  function resetPhoneReviewState() {
    setPhoneCandidates([]);
    setPhoneCandidateSelectedIds([]);
    setPhoneSkippedCount(0);
  }

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

  useEffect(() => {
    setSelectedPhoneSyncIds((current) =>
      current.filter((id) => rows.some((row) => row.id === id && row.source === "phone_sync")),
    );
  }, [rows]);

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

  async function loadSmsThread(clientId: string) {
    if (!user) return;

    setSmsLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_sms_messages")
        .select("id,client_id,user_id,direction,status,body,created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });
      if (error) return toast.error(error.message);
      setSmsMessages((data ?? []) as SmsMessage[]);
    } finally {
      setSmsLoading(false);
    }
  }

  function openSmsDialog(client: Client) {
    if (!client.phone) {
      toast.error("Add a phone number before sending SMS.");
      return;
    }

    setSmsClient(client);
    setSmsDraft("");
    setSmsReplyDraft("");
    setSmsPendingLogBody("");
    setSmsMessages([]);
    void loadSmsThread(client.id);
  }

  function closeSmsDialog() {
    setSmsClient(null);
    setSmsMessages([]);
    setSmsDraft("");
    setSmsReplyDraft("");
    setSmsPendingLogBody("");
    setSmsLoading(false);
    setSmsSaving(false);
  }

  async function openNativeSmsApp() {
    if (!smsClient?.phone) {
      toast.error("This contact does not have a phone number.");
      return;
    }
    if (!smsDraft.trim()) {
      toast.error("Write an SMS first.");
      return;
    }

    const nextBody = smsDraft.trim();
    setSmsPendingLogBody(nextBody);
    const opened = launchSmsComposer(smsClient.phone, nextBody);

    if (!opened) {
      try {
        await copySmsFallback(smsClient.phone, nextBody);
      } catch {
        // ignore clipboard fallback failures
      }
      toast.error("This device could not open an SMS app automatically. The phone number and message were copied so you can paste them manually.");
      return;
    }

    if (!isProbablyMobileDevice()) {
      try {
        await copySmsFallback(smsClient.phone, nextBody);
      } catch {
        // ignore clipboard fallback failures
      }
      toast.success("Tried to open your SMS app. The message was also copied in case your desktop browser does not handle SMS links.");
    }
  }

  async function saveSmsToConversation() {
    if (!user || !smsClient) return;
    if (!smsPendingLogBody.trim()) {
      toast.error("Open the SMS app first, then save the sent message here.");
      return;
    }

    setSmsSaving(true);
    try {
      const { error } = await supabase.from("client_sms_messages").insert({
        user_id: user.id,
        client_id: smsClient.id,
        direction: "outbound",
        status: "sent",
        body: smsPendingLogBody.trim(),
      });
      if (error) return toast.error(error.message);

      toast.success("SMS saved to the conversation.");
      setSmsDraft("");
      setSmsPendingLogBody("");
      void loadSmsThread(smsClient.id);
    } finally {
      setSmsSaving(false);
    }
  }

  async function saveReceivedReplyToConversation() {
    if (!user || !smsClient) return;
    if (!smsReplyDraft.trim()) {
      toast.error("Write the received reply before saving it.");
      return;
    }

    setSmsSaving(true);
    try {
      const { error } = await supabase.from("client_sms_messages").insert({
        user_id: user.id,
        client_id: smsClient.id,
        direction: "inbound",
        status: "received",
        body: smsReplyDraft.trim(),
      });
      if (error) return toast.error(error.message);

      toast.success("Received reply saved to the conversation.");
      setSmsReplyDraft("");
      void loadSmsThread(smsClient.id);
    } finally {
      setSmsSaving(false);
    }
  }

  async function syncPhoneContacts() {
    if (!user) return;

    const contactsApi = (navigator as ContactPickerNavigator).contacts;
    if (!contactsApi?.select) {
      phoneFileInputRef.current?.click();
      return;
    }

    setPhoneSyncing(true);
    try {
      const selected = await contactsApi.select(["name", "email", "tel"], { multiple: true });
      if (!selected.length) return;
      openPhoneReview(selected);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Contact access was blocked. You can still import an exported phone contacts file instead.");
        phoneFileInputRef.current?.click();
        return;
      }
      if (error instanceof TypeError) {
        toast.error("Direct contact access is not available in this browser. Import an exported phone contacts file instead.");
        phoneFileInputRef.current?.click();
        return;
      }
      toast.error(error instanceof Error ? error.message : "Could not sync phone contacts");
    } finally {
      setPhoneSyncing(false);
    }
  }

  function openPhoneReview(selected: DeviceContact[]) {
    const review = buildPhoneImportCandidates(selected, rows);
    if (!review.candidates.length) {
      toast.error("No usable contacts were found to add to the tracker.");
      return;
    }

    setPhoneCandidates(review.candidates);
    setPhoneCandidateSelectedIds(
      review.candidates.filter((candidate) => !candidate.duplicate).map((candidate) => candidate.id),
    );
    setPhoneSkippedCount(review.skippedWithoutDetails);
    setPhoneReviewOpen(true);
  }

  async function handlePhoneContactsFile(file: File) {
    if (!user) return;

    setPhoneSyncing(true);
    try {
      const importedContacts = await parsePhoneContactsFile(file);
      if (!importedContacts.length) {
        toast.error("No contacts were found in that file.");
        return;
      }

      openPhoneReview(importedContacts);
      toast.success(`Loaded ${importedContacts.length} contact${importedContacts.length === 1 ? "" : "s"} from file`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not read the contact file");
    } finally {
      setPhoneSyncing(false);
      if (phoneFileInputRef.current) phoneFileInputRef.current.value = "";
    }
  }

  async function importSelectedPhoneContacts() {
    if (!user) return;

    const selectedCandidates = phoneCandidates.filter(
      (candidate) => phoneCandidateSelectedIds.includes(candidate.id) && !candidate.duplicate,
    );

    if (!selectedCandidates.length) {
      toast.error("Select at least one new contact to add to the directory.");
      return;
    }

    setPhoneImporting(true);
    try {
      const inserts = selectedCandidates.map((candidate) => ({
        user_id: user.id,
        name: candidate.name,
        email: candidate.email || null,
        phone: candidate.phone || null,
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
      }));

      const { error } = await supabase.from("clients").insert(inserts);
      if (error) return toast.error(error.message);

      toast.success(
        `Added ${selectedCandidates.length} phone contact${selectedCandidates.length === 1 ? "" : "s"} to your directory`,
      );
      setPhoneReviewOpen(false);
      resetPhoneReviewState();
      void load();
    } finally {
      setPhoneImporting(false);
    }
  }

  async function desyncPhoneContacts(target?: Client | Client[]) {
    if (!user) return;

    const targets = Array.isArray(target)
      ? target
      : target
        ? [target]
        : selectedPhoneSyncIds.length
          ? rows.filter((row) => selectedPhoneSyncIds.includes(row.id))
        : rows.filter((row) => row.source === "phone_sync");
    const removable = targets.filter((row) => row.source === "phone_sync");

    if (!removable.length) {
      toast.error("No phone-synced contacts were found to remove.");
      return;
    }

    const message =
      removable.length === 1
        ? `Remove ${removable[0].name} from the tracker? This will not delete them from your phone address book.`
        : `Remove ${removable.length} phone-synced contacts from the tracker? This will not delete anything from your phone address book.`;
    if (!confirm(message)) return;

    setPhoneDesyncing(true);
    try {
      let query = supabase.from("clients").delete().eq("source", "phone_sync");
      if (removable.length === 1) {
        query = query.eq("id", removable[0].id);
      } else {
        query = query.in("id", removable.map((row) => row.id));
      }

      const { error } = await query;
      if (error) return toast.error(error.message);

      setSelectedPhoneSyncIds((current) => current.filter((id) => !removable.some((row) => row.id === id)));

      toast.success(
        removable.length === 1
          ? `${removable[0].name} was removed from phone sync`
          : `Removed ${removable.length} phone-synced contacts`,
      );
      void load();
    } finally {
      setPhoneDesyncing(false);
    }
  }

  async function convertPhoneSyncedContacts(target?: Client | Client[]) {
    if (!user) return;

    const targets = Array.isArray(target)
      ? target
      : target
        ? [target]
        : selectedPhoneSyncIds.length
          ? rows.filter((row) => selectedPhoneSyncIds.includes(row.id))
          : [];
    const convertible = targets.filter((row) => row.source === "phone_sync");

    if (!convertible.length) {
      toast.error("Select at least one phone-synced contact to convert.");
      return;
    }

    const message =
      convertible.length === 1
        ? `Convert ${convertible[0].name} to a manual tracker contact? They will stay in the directory and future phone desync will not remove them.`
        : `Convert ${convertible.length} phone-synced contacts to manual tracker contacts? They will stay in the directory and future phone desync will not remove them.`;
    if (!confirm(message)) return;

    setPhoneConverting(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ source: "manual" })
        .eq("source", "phone_sync")
        .in("id", convertible.map((row) => row.id));
      if (error) return toast.error(error.message);

      setSelectedPhoneSyncIds((current) => current.filter((id) => !convertible.some((row) => row.id === id)));
      toast.success(
        convertible.length === 1
          ? `${convertible[0].name} is now a manual tracker contact`
          : `Converted ${convertible.length} contacts to manual`,
      );
      void load();
    } finally {
      setPhoneConverting(false);
    }
  }

  function togglePhoneCandidateSelection(candidateId: string, checked: boolean) {
    setPhoneCandidateSelectedIds((current) =>
      checked ? Array.from(new Set([...current, candidateId])) : current.filter((id) => id !== candidateId),
    );
  }

  function togglePhoneSyncSelection(contactId: string, checked: boolean) {
    setSelectedPhoneSyncIds((current) =>
      checked ? Array.from(new Set([...current, contactId])) : current.filter((id) => id !== contactId),
    );
  }

  const phoneSyncedRows = rows.filter((row) => row.source === "phone_sync");
  const visibleRows = directoryFilter === "phone_sync" ? phoneSyncedRows : rows;
  const visiblePhoneSyncedRows = visibleRows.filter((row) => row.source === "phone_sync");
  const allVisiblePhoneSyncSelected =
    visiblePhoneSyncedRows.length > 0 &&
    visiblePhoneSyncedRows.every((row) => selectedPhoneSyncIds.includes(row.id));
  const someVisiblePhoneSyncSelected =
    !allVisiblePhoneSyncSelected &&
    visiblePhoneSyncedRows.some((row) => selectedPhoneSyncIds.includes(row.id));
  const selectablePhoneCandidates = phoneCandidates.filter((candidate) => !candidate.duplicate);
  const duplicatePhoneCandidates = phoneCandidates.filter((candidate) => candidate.duplicate);

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
            onClick={() => void desyncPhoneContacts()}
            disabled={phoneDesyncing || phoneSyncedRows.length === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {phoneDesyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {selectedPhoneSyncIds.length > 0 ? `Desync selected (${selectedPhoneSyncIds.length})` : "Desync phone contacts"}
          </button>
          <button
            type="button"
            onClick={() => void convertPhoneSyncedContacts()}
            disabled={phoneConverting || selectedPhoneSyncIds.length === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {phoneConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Convert selected to manual
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
      <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">
              Phone-synced contacts in tracker: {phoneSyncedRows.length}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Sync opens your device contact picker when the browser allows it, or falls back to importing an exported contacts file. In both cases, users can review, select, or deselect contacts before adding them here. Desync only removes tracker copies with the <span className="font-medium text-foreground">Phone sync</span> source.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Manual, imported, and GHL-linked contacts stay untouched.
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              { value: "all" as const, label: `All contacts (${rows.length})` },
              { value: "phone_sync" as const, label: `Phone sync only (${phoneSyncedRows.length})` },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDirectoryFilter(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  directoryFilter === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{selectedPhoneSyncIds.length} phone-synced contact{selectedPhoneSyncIds.length === 1 ? "" : "s"} selected</span>
            <button
              type="button"
              onClick={() =>
                setSelectedPhoneSyncIds((current) =>
                  Array.from(new Set([...current, ...visiblePhoneSyncedRows.map((row) => row.id)])),
                )
              }
              disabled={visiblePhoneSyncedRows.length === 0}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
            >
              Select visible phone sync
            </button>
            <button
              type="button"
              onClick={() => setSelectedPhoneSyncIds([])}
              disabled={selectedPhoneSyncIds.length === 0}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
            >
              Clear selected
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {directoryFilter === "phone_sync"
              ? "No phone-synced contacts yet. Sync your phone contacts on a supported device to see them here."
              : "No contacts yet. Add one, import a list, or sync your phone contacts on a supported device."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">
                    <Checkbox
                      checked={allVisiblePhoneSyncSelected ? true : someVisiblePhoneSyncSelected ? "indeterminate" : false}
                      disabled={visiblePhoneSyncedRows.length === 0}
                      onCheckedChange={(checked) =>
                        setSelectedPhoneSyncIds((current) =>
                          checked === true
                            ? Array.from(new Set([...current, ...visiblePhoneSyncedRows.map((row) => row.id)]))
                            : current.filter((id) => !visiblePhoneSyncedRows.some((row) => row.id === id))
                        )
                      }
                      aria-label="Select visible phone synced contacts"
                    />
                  </th>
                  <th className="px-6 py-3 text-left font-medium">Name</th>
                  <th className="py-3 text-left font-medium">Contact</th>
                  <th className="py-3 text-left font-medium">Type</th>
                  <th className="py-3 text-left font-medium">GHL Sync</th>
                  <th className="pr-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((client) => (
                  <tr key={client.id} className="row-hover-blue border-t border-border">
                    <td className="px-4 py-4">
                      {client.source === "phone_sync" ? (
                        <Checkbox
                          checked={selectedPhoneSyncIds.includes(client.id)}
                          onCheckedChange={(checked) => togglePhoneSyncSelection(client.id, checked === true)}
                          aria-label={`Select ${client.name}`}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
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
                        {client.phone ? (
                          <button
                            type="button"
                            onClick={() => openSmsDialog(client)}
                            title={`SMS ${client.name}`}
                            className="rounded-md p-2 text-primary hover:bg-muted"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        ) : null}
                        {client.source === "phone_sync" ? (
                          <button
                            type="button"
                            onClick={() => void desyncPhoneContacts(client)}
                            title="Desync from phone contacts"
                            className="rounded-md px-2 py-1.5 text-xs font-medium text-amber-600 hover:bg-muted"
                            disabled={phoneDesyncing}
                          >
                            Desync
                          </button>
                        ) : null}
                        {client.source === "phone_sync" ? (
                          <button
                            type="button"
                            onClick={() => void convertPhoneSyncedContacts(client)}
                            title="Convert to manual contact"
                            className="rounded-md px-2 py-1.5 text-xs font-medium text-green-600 hover:bg-muted"
                            disabled={phoneConverting}
                          >
                            Convert
                          </button>
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

      <input
        ref={phoneFileInputRef}
        type="file"
        accept=".vcf,.csv,.xlsx,.xls"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handlePhoneContactsFile(file);
        }}
      />

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

      <Dialog
        open={!!smsClient}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeSmsDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              SMS conversation{smsClient ? ` · ${smsClient.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Open your phone’s SMS app from here and save sent messages back into this tracker conversation. Replies from the native SMS app are not pulled in automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Phone number</div>
              <div className="mt-1 font-medium text-foreground">{smsClient?.phone ?? "-"}</div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
                Conversation log
              </div>
              <div className="max-h-64 space-y-3 overflow-y-auto p-4">
                {smsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : smsMessages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No SMS saved in the tracker yet. Send one from here and save it to start the conversation log.
                  </div>
                ) : (
                  smsMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          message.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{message.body}</div>
                        <div
                          className={`mt-2 text-[11px] ${
                            message.direction === "outbound"
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatDateTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <div className="text-sm font-medium text-foreground">Compose SMS</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Step 1: open the SMS app with your message. Step 2: come back and save it to the tracker conversation.
                </p>
              </div>

              <textarea
                className="input min-h-28"
                placeholder="Write your message here..."
                value={smsDraft}
                onChange={(event) => setSmsDraft(event.target.value)}
              />

              {smsPendingLogBody ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  SMS app opened with your latest draft. If you sent it, click <span className="font-medium">Save sent SMS</span> to add it to the tracker conversation.
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <div className="text-sm font-medium text-foreground">Log received reply</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  If the contact replied in your phone messages, paste or type that reply here so the tracker conversation stays complete.
                </p>
              </div>

              <textarea
                className="input min-h-24"
                placeholder="Type the reply you received..."
                value={smsReplyDraft}
                onChange={(event) => setSmsReplyDraft(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <button type="button" className="btn-secondary" onClick={closeSmsDialog} disabled={smsSaving}>
              Close
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={openNativeSmsApp}
              disabled={!smsDraft.trim() || smsSaving}
            >
              <Send className="h-4 w-4" />
              Open SMS app
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void saveSmsToConversation()}
              disabled={!smsPendingLogBody || smsSaving}
            >
              {smsSaving ? "Saving..." : "Save sent SMS"}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void saveReceivedReplyToConversation()}
              disabled={!smsReplyDraft.trim() || smsSaving}
            >
              {smsSaving ? "Saving..." : "Log received reply"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={phoneReviewOpen}
        onOpenChange={(nextOpen) => {
          setPhoneReviewOpen(nextOpen);
          if (!nextOpen && !phoneImporting) {
            resetPhoneReviewState();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review phone contacts before syncing</DialogTitle>
            <DialogDescription>
              Choose which contacts from your phone should be added to the tracker directory. Contacts already in the directory stay unchecked so you do not accidentally duplicate them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">
                  {phoneCandidateSelectedIds.length} selected of {selectablePhoneCandidates.length} new contacts
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {duplicatePhoneCandidates.length} already in your directory or repeated in this batch.
                  {phoneSkippedCount > 0 ? ` ${phoneSkippedCount} contact${phoneSkippedCount === 1 ? "" : "s"} had no usable details and were skipped.` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPhoneCandidateSelectedIds(selectablePhoneCandidates.map((candidate) => candidate.id))}
                  disabled={!selectablePhoneCandidates.length}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneCandidateSelectedIds([])}
                  disabled={!phoneCandidateSelectedIds.length}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 text-left font-medium">Select</th>
                      <th className="py-3 text-left font-medium">Name</th>
                      <th className="py-3 text-left font-medium">Email</th>
                      <th className="py-3 text-left font-medium">Phone</th>
                      <th className="pr-4 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phoneCandidates.map((candidate) => (
                      <tr key={candidate.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={phoneCandidateSelectedIds.includes(candidate.id)}
                            disabled={candidate.duplicate}
                            onCheckedChange={(checked) => togglePhoneCandidateSelection(candidate.id, checked === true)}
                            aria-label={`Select ${candidate.name}`}
                          />
                        </td>
                        <td className="py-3 font-medium text-foreground">{candidate.name}</td>
                        <td className="py-3 text-muted-foreground">{candidate.email || "-"}</td>
                        <td className="py-3 text-muted-foreground">{candidate.phone || "-"}</td>
                        <td className="pr-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              candidate.duplicate
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-green-500/10 text-green-600"
                            }`}
                          >
                            {candidate.duplicate ? candidate.duplicateReason ?? "Already in directory" : "Ready to add"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button type="button" className="btn-secondary" onClick={() => setPhoneReviewOpen(false)} disabled={phoneImporting}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void importSelectedPhoneContacts()}
              disabled={phoneImporting || phoneCandidateSelectedIds.length === 0}
            >
              {phoneImporting ? "Adding contacts..." : `Add selected (${phoneCandidateSelectedIds.length})`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

async function parsePhoneContactsFile(file: File): Promise<DeviceContact[]> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".vcf")) {
    const text = await file.text();
    return parseVcfContacts(text);
  }

  if (lowerName.endsWith(".csv") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
    return rows
      .map((row) => {
        const entries = Object.entries(row).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[normalizeHeaderKey(key)] = String(value ?? "").trim();
          return acc;
        }, {});

        const name = extractSpreadsheetContactName(entries);
        const email = extractSpreadsheetContactValue(entries, ["email", "mail"]);
        const phone = extractSpreadsheetContactValue(entries, ["phone", "mobile", "telephone", "tel", "cell"]);

        return {
          name: name ? [name] : [],
          email: email ? [email] : [],
          tel: phone ? [phone] : [],
        } satisfies DeviceContact;
      })
      .filter((contact) => firstValue(contact.name) || firstValue(contact.email) || firstValue(contact.tel));
  }

  throw new Error("Unsupported contact file. Please choose a .vcf, .csv, or Excel contact export.");
}

function parseVcfContacts(text: string): DeviceContact[] {
  const chunks = text
    .split(/END:VCARD/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks
    .map((chunk) => {
      const lines = chunk
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const unfolded: string[] = [];

      for (const line of lines) {
        if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length) {
          unfolded[unfolded.length - 1] += line.trim();
        } else {
          unfolded.push(line);
        }
      }

      const names: string[] = [];
      const emails: string[] = [];
      const phones: string[] = [];

      for (const line of unfolded) {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) continue;

        const rawKey = line.slice(0, separatorIndex).toUpperCase();
        const rawValue = decodeVcfValue(line.slice(separatorIndex + 1));

        if (!rawValue) continue;

        if (rawKey.startsWith("FN")) {
          names.push(rawValue);
          continue;
        }

        if (rawKey.startsWith("N") && !names.length) {
          const joined = rawValue
            .split(";")
            .map((part) => part.trim())
            .filter(Boolean)
            .reverse()
            .join(" ")
            .trim();
          if (joined) names.push(joined);
          continue;
        }

        if (rawKey.startsWith("EMAIL")) {
          emails.push(rawValue);
          continue;
        }

        if (rawKey.startsWith("TEL")) {
          phones.push(rawValue);
        }
      }

      return {
        name: names,
        email: emails,
        tel: phones,
      } satisfies DeviceContact;
    })
    .filter((contact) => firstValue(contact.name) || firstValue(contact.email) || firstValue(contact.tel));
}

function buildPhoneImportCandidates(selected: DeviceContact[], existingRows: Client[]) {
  const existingPhones = new Set(existingRows.map((row) => normalizePhone(row.phone)).filter(Boolean) as string[]);
  const existingEmails = new Set(existingRows.map((row) => normalizeEmail(row.email)).filter(Boolean) as string[]);
  const existingNames = new Set(existingRows.map((row) => normalizeName(row.name)).filter(Boolean) as string[]);
  const batchPhones = new Set<string>();
  const batchEmails = new Set<string>();
  const batchNames = new Set<string>();

  let skippedWithoutDetails = 0;
  const candidates: PhoneImportCandidate[] = [];

  selected.forEach((contact, index) => {
    const name = firstValue(contact.name);
    const email = firstValue(contact.email);
    const phone = firstValue(contact.tel);
    const displayName = name || phone || email;

    if (!displayName) {
      skippedWithoutDetails += 1;
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = normalizeName(displayName);
    let duplicateReason: string | null = null;

    if (normalizedPhone && (existingPhones.has(normalizedPhone) || batchPhones.has(normalizedPhone))) {
      duplicateReason = existingPhones.has(normalizedPhone) ? "Already in directory" : "Duplicate in this batch";
    } else if (normalizedEmail && (existingEmails.has(normalizedEmail) || batchEmails.has(normalizedEmail))) {
      duplicateReason = existingEmails.has(normalizedEmail) ? "Already in directory" : "Duplicate in this batch";
    } else if (
      !normalizedPhone &&
      !normalizedEmail &&
      normalizedName &&
      (existingNames.has(normalizedName) || batchNames.has(normalizedName))
    ) {
      duplicateReason = existingNames.has(normalizedName) ? "Already in directory" : "Duplicate in this batch";
    }

    candidates.push({
      id: `${index}-${normalizedName}-${normalizedEmail}-${normalizedPhone}`,
      name: displayName,
      email,
      phone,
      duplicate: !!duplicateReason,
      duplicateReason,
    });

    if (!duplicateReason) {
      if (normalizedPhone) batchPhones.add(normalizedPhone);
      if (normalizedEmail) batchEmails.add(normalizedEmail);
      if (normalizedName) batchNames.add(normalizedName);
    }
  });

  return { candidates, skippedWithoutDetails };
}

function firstValue(values?: string[]) {
  return values?.map((value) => value.trim()).find(Boolean) || "";
}

function normalizeHeaderKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractSpreadsheetContactName(record: Record<string, string>) {
  const directName = pickFirst(record, [
    "name",
    "fullname",
    "full_name",
    "displayname",
    "display_name",
    "formattedname",
    "fn",
  ]);
  if (directName) return directName;

  const first = pickFirst(record, ["firstname", "first_name", "givenname", "given_name"]);
  const last = pickFirst(record, ["lastname", "last_name", "familyname", "family_name", "surname"]);
  return [first, last].filter(Boolean).join(" ").trim();
}

function extractSpreadsheetContactValue(record: Record<string, string>, tokens: string[]) {
  const direct = pickFirst(record, tokens);
  if (direct) return direct;

  for (const [key, value] of Object.entries(record)) {
    if (!value) continue;
    if (tokens.some((token) => key.includes(normalizeHeaderKey(token)))) {
      return value;
    }
  }

  return "";
}

function pickFirst(record: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = record[normalizeHeaderKey(key)];
    if (value) return value;
  }
  return "";
}

function decodeVcfValue(value: string) {
  return value
    .replace(/=0D=0A/gi, "")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\n/gi, " ")
    .trim();
}

function buildSmsHref(phone: string, body: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return `sms:?body=${encodeURIComponent(body)}`;

  const isAppleDevice =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const separator = isAppleDevice ? "&" : "?";
  return `sms:${cleaned}${body ? `${separator}body=${encodeURIComponent(body)}` : ""}`;
}

function buildAlternateSmsHref(phone: string, body: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  const encodedBody = encodeURIComponent(body);
  return cleaned ? `smsto:${cleaned}${body ? `?body=${encodedBody}` : ""}` : `smsto:?body=${encodedBody}`;
}

function launchSmsComposer(phone: string, body: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const hrefs = [buildSmsHref(phone, body), buildAlternateSmsHref(phone, body)];
  for (const href of hrefs) {
    try {
      const link = document.createElement("a");
      link.href = href;
      link.style.position = "absolute";
      link.style.left = "-9999px";
      link.style.width = "1px";
      link.style.height = "1px";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    } catch {
      // try the next scheme
    }
  }

  return false;
}

async function copySmsFallback(phone: string, body: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
  const lines = [`Phone: ${phone}`, "", body];
  await navigator.clipboard.writeText(lines.join("\n"));
}

function isProbablyMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
