import { useEffect, useState } from "react";
import { Loader2, Plug, RefreshCw, Upload, Download, Copy, Check, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getGhlStatus, saveGhlSettings, pullAllFromGhl, pushAllToGhl } from "@/utils/ghl.functions";
import { withTimeout } from "@/components/async-section";
import type { SensitiveActionRunner } from "@/lib/security-gate";

type Status = Awaited<ReturnType<typeof getGhlStatus>>;

interface GhlIntegrationSectionProps {
  requireVerification?: SensitiveActionRunner;
  isSecurityUnlocked?: boolean;
}

export function GhlIntegrationSection({
  requireVerification,
  isSecurityUnlocked = false,
}: GhlIntegrationSectionProps = {}) {
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
  const recentLogs = Array.isArray(status?.recentLogs) ? status.recentLogs : [];

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await withTimeout(fetchStatus(), 15000, "GHL status");
      setStatus(data);
      setLocationId(data.settings?.location_id ?? "");
      setEnabled(data.settings?.enabled ?? true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load integration status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const webhookUrl =
    typeof window !== "undefined" && status?.settings?.webhook_secret
      ? `${window.location.origin}/api/public/ghl/webhook?key=${status.settings.webhook_secret}`
      : "";

  const displayWebhookUrl = isSecurityUnlocked ? webhookUrl : "Verify your email to reveal this webhook URL";

  async function onSave() {
    if (!locationId.trim()) return toast.error("Location ID is required");
    setBusy("save");
    try {
      const run = async () => {
        await withTimeout(save({ data: { locationId: locationId.trim(), enabled } }), 15000, "save");
        toast.success("GoHighLevel settings saved");
        await refresh();
      };
      if (requireVerification) {
        const verified = await requireVerification("Save GoHighLevel settings", run);
        if (!verified) return;
      } else {
        await run();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy("");
    }
  }

  async function onPull() {
    setBusy("pull");
    try {
      const run = async () => {
        const result = await withTimeout(pull({ data: undefined }), 60000, "pull");
        toast.success(`Pulled from GHL - ${result.imported} new, ${result.updated} updated`);
        await refresh();
      };
      if (requireVerification) {
        const verified = await requireVerification("Pull data from GoHighLevel", run);
        if (!verified) return;
      } else {
        await run();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pull failed");
    } finally {
      setBusy("");
    }
  }

  async function onPush() {
    setBusy("push");
    try {
      const run = async () => {
        const result = await withTimeout(push({ data: undefined }), 60000, "push");
        toast.success(`Pushed to GHL - ${result.pushed} synced, ${result.failed} failed`);
        await refresh();
      };
      if (requireVerification) {
        const verified = await requireVerification("Push data to GoHighLevel", run);
        if (!verified) return;
      } else {
        await run();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Push failed");
    } finally {
      setBusy("");
    }
  }

  async function copyWebhook() {
    if (!webhookUrl) return;
    const run = async () => {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    if (requireVerification && !isSecurityUnlocked) {
      const verified = await requireVerification("Reveal the GoHighLevel webhook URL", run);
      if (!verified) return;
    } else {
      await run();
    }
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
            <Loader2 className="h-4 w-4 animate-spin" /> Loading GoHighLevel status...
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
            <button onClick={() => void refresh()} className="btn-secondary text-xs" type="button">
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
          <button onClick={() => void onSave()} disabled={busy === "save"} className="btn-primary">
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
              <button onClick={() => void onPull()} disabled={busy === "pull"} className="btn-secondary">
                {busy === "pull" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Pull from GHL
              </button>
              <button onClick={() => void onPush()} disabled={busy === "push"} className="btn-secondary">
                {busy === "push" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Push to GHL
              </button>
              <button onClick={() => void refresh()} className="btn-secondary">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </button>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Inbound webhook URL (paste into GHL workflow - Webhook)
              </div>
              <div className="flex gap-2">
                <input readOnly value={displayWebhookUrl} className="input flex-1 font-mono text-xs" />
                <button onClick={() => void copyWebhook()} className="btn-secondary" type="button">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                In GHL, create a workflow with triggers <span className="font-mono">Contact Created</span>,{" "}
                <span className="font-mono">Contact Updated</span>, and{" "}
                <span className="font-mono">Contact Deleted</span>. Action:{" "}
                <span className="font-mono">Webhook</span> - POST to the URL above.
              </p>
            </div>

            {recentLogs.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Recent activity</div>
                <ul className="text-xs space-y-1 max-h-48 overflow-auto">
                  {recentLogs.map((log: any) => (
                    <li key={log.id} className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                          log.status === "ok"
                            ? "bg-green-500/10 text-green-600"
                            : log.status === "error"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                      <span>{log.direction} - {log.entity_type}</span>
                      {log.error && <span className="text-destructive truncate">- {log.error}</span>}
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
