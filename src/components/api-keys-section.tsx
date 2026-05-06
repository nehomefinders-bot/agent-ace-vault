import { useEffect, useState } from "react";
import { Loader2, KeyRound, Copy, Check, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listApiKeys, createApiKey, revokeApiKey } from "@/utils/api-keys.functions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { withTimeout } from "@/components/async-section";

interface ApiKeyRow {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function ApiKeysSection() {
  const fetchKeys = useServerFn(listApiKeys);
  const createKey = useServerFn(createApiKey);
  const revokeKey = useServerFn(revokeApiKey);

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<string>("never");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKeyRow | null>(null);
  const [revoking, setRevoking] = useState(false);
  const safeKeys = Array.isArray(keys) ? keys : [];

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const { keys } = await withTimeout(fetchKeys(), 15000, "API keys");
      setKeys(keys as ApiKeyRow[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load API keys");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);


  async function create() {
    if (!name.trim()) return toast.error("Name your key first");
    setCreating(true);
    try {
      const days = expiry === "never" ? null : Number(expiry);
      const { token } = await createKey({ data: { name: name.trim(), expiresInDays: days } });
      setNewToken(token);
      setName("");
      setExpiry("never");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create key");
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function revoke() {
    if (!confirmRevoke) return;
    setRevoking(true);
    try {
      await revokeKey({ data: { id: confirmRevoke.id } });
      toast.success("Key revoked");
      setConfirmRevoke(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <section className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          <h2 className="font-display text-lg font-bold">API keys</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Personal access tokens for programmatic access. Treat them like passwords.
        </p>
      </div>

      {/* Create form */}
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto] mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. Zapier integration)"
          className="input"
          maxLength={60}
        />
        <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="input">
          <option value="never">No expiry</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
        </select>
        <button onClick={create} disabled={creating || !name.trim()} className="btn-primary">
          {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create key
        </button>
      </div>

      {/* New token reveal */}
      {newToken && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-sm font-medium mb-1">Save this token now</div>
          <div className="text-xs text-muted-foreground mb-3">
            We only show it once. If you lose it, revoke and create a new key.
          </div>
          <div className="flex items-stretch gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono break-all">
              {newToken}
            </code>
            <button onClick={copy} className="btn-secondary">
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setNewToken(null)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
          >
            I've saved it — dismiss
          </button>
        </div>
      )}

      {/* Inline status banners — never block the create form above */}
      {loadError && (
        <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-medium">Couldn't load your API keys</div>
            <div className="text-muted-foreground text-xs mt-0.5 break-words">{loadError}</div>
          </div>
          <button onClick={load} className="btn-secondary text-xs" type="button">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading API keys…
        </div>
      ) : safeKeys.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
          {loadError ? "No keys to display." : "No API keys yet."}
        </div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {safeKeys.map((k) => {
            const expired = k.expires_at && new Date(k.expires_at).getTime() < Date.now();
            const status = k.revoked_at ? "revoked" : expired ? "expired" : "active";
            const tone =
              status === "active" ? "bg-success/10 text-success"
              : status === "expired" ? "bg-secondary/20 text-secondary-foreground"
              : "bg-destructive/10 text-destructive";
            return (
              <div key={k.id} className="flex items-center gap-4 p-3.5 bg-background">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{k.name}</span>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${tone}`}>
                      {status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {k.token_prefix}…••••
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created {new Date(k.created_at).toLocaleDateString()}
                    {" · "}
                    {k.last_used_at
                      ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}`
                      : "Never used"}
                    {k.expires_at && ` · Expires ${new Date(k.expires_at).toLocaleDateString()}`}
                  </div>
                </div>
                {status === "active" && (
                  <button
                    onClick={() => setConfirmRevoke(k)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}


      <AlertDialog open={!!confirmRevoke} onOpenChange={(o) => !o && setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke "{confirmRevoke?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Any integration using this key will stop working immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={revoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
            >
              {revoking && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
