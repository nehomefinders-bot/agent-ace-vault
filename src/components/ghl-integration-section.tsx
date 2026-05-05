import { useEffect, useState } from "react";
import { Loader2, Plug, RefreshCw, Upload, Download, Copy, Check, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getGhlStatus, saveGhlSettings, pullAllFromGhl, pushAllToGhl } from "@/utils/ghl.functions";
import { withTimeout } from "@/components/async-section";

type Status = Awaited<ReturnType<typeof getGhlStatus>>;

export function GhlIntegrationSection() {
  const fetchStatus = useServerFn(getGhlStatus);
  const save = useServerFn(saveGhlSettings);
  const pull = useServerFn(pullAllFromGhl);
  const push = useServerFn(pushAllToGhl);

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState<"" | "save" | "pull" | "push">("");
  const [copied, setCopied] = useState(false);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const s = await withTimeout(fetchStatus(), 15000, "GHL status");
      setStatus(s);
      setLocationId(s.settings?.location_id ?? "");
      setEnabled(s.settings?.enabled ?? true);
    } catch (e: any) {
      setLoadError(e?.message ?? "Could not load integration status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const webhookUrl =
    typeof window !== "undefined" && status?.settings?.webhook_secret
      ? `${window.location.origin}/api/public/ghl/webhook?key=${status.settings.webhook_secret}`
      : "";

  async function onSave() {
    if (!locationId.trim()) return toast.error("Location ID is required");
    setBusy("save");
    try {
      await withTimeout(save({ data: { locationId: locationId.trim(), enabled } }), 15000, "save");
      toast.success("GoHighLevel settings saved");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally { setBusy(""); }
  }

  async function onPull() {
    setBusy("pull");
    try {
      const r = await withTimeout(pull({ data: undefined }), 60000, "pull");
      toast.success(`Pulled from GHL — ${r.imported} new, ${r.updated} updated`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Pull failed");
    } finally { setBusy(""); }
  }

  async function onPush() {
    setBusy("push");
    try {
      const r = await withTimeout(push({ data: undefined }), 60000, "push");
      toast.success(`Pushed to GHL — ${r.pushed} synced, ${r.failed} failed`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Push failed");
    } finally { setBusy(""); }
  }

  function copyWebhook() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4" />
          <h2 className="font-display text-lg font-bold">GoHighLevel</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Two-way sync between your Clients and GHL Contacts.
        </p>
      </div>

      <div className="space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading GoHighLevel status…
          </div>
        )}
        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-medium">Couldn't load GoHighLevel status</div>
              <div className="text-muted-foreground text-xs mt-0.5 break-words">{loadError}</div>
              <div className="text-muted-foreground text-xs mt-1">
                You can still enter your Location ID below and save it.
              </div>
            </div>
            <button onClick={refresh} className="btn-secondary text-xs" type="button">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
            </button>
          </div>
        )}
        
          {!status?.tokenConfigured && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              GHL_PRIVATE_TOKEN is not configured on the server.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <label className="block">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Location ID
              </div>
              <input
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="e.g. ve9EPM428h8vShlRW1KT"
                className="input"
              />
            </label>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Enabled
            </label>
          </div>
          <div>
            <button onClick={onSave} disabled={busy === "save"} className="btn-primary">
              {busy === "save" && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save
            </button>
          </div>

          {status?.settings && (
            <>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <Stat label="Total clients" value={String(status.totalClients)} />
                <Stat label="Linked to GHL" value={String(status.linkedClients)} />
                <Stat
                  label="Last full sync"
                  value={status.settings.last_full_sync_at
                    ? new Date(status.settings.last_full_sync_at).toLocaleString()
                    : "Never"}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={onPull} disabled={busy === "pull"} className="btn-secondary">
                  {busy === "pull" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  Pull from GHL
                </button>
                <button onClick={onPush} disabled={busy === "push"} className="btn-secondary">
                  {busy === "push" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Push to GHL
                </button>
                <button onClick={refresh} className="btn-secondary">
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </button>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                  Inbound webhook URL (paste into GHL workflow → Webhook)
                </div>
                <div className="flex gap-2">
                  <input readOnly value={webhookUrl} className="input flex-1 font-mono text-xs" />
                  <button onClick={copyWebhook} className="btn-secondary">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  In GHL, create a workflow with triggers <span className="font-mono">Contact Created</span>,{" "}
                  <span className="font-mono">Contact Updated</span>, and{" "}
                  <span className="font-mono">Contact Deleted</span>. Action: <span className="font-mono">Webhook</span> → POST to the URL above.
                </p>
              </div>

              {status.recentLogs.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Recent activity</div>
                  <ul className="text-xs space-y-1 max-h-48 overflow-auto">
                    {status.recentLogs.map((l: any) => (
                      <li key={l.id} className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                          l.status === "ok" ? "bg-green-500/10 text-green-600" :
                          l.status === "error" ? "bg-destructive/10 text-destructive" :
                          "bg-muted text-muted-foreground"
                        }`}>{l.status}</span>
                        <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                        <span>{l.direction} · {l.entity_type}</span>
                        {l.error && <span className="text-destructive truncate">— {l.error}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}
