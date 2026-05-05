import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, User as UserIcon, Lock, Palette, Download, ShieldAlert, Mail, CreditCard } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiKeysSection } from "@/components/api-keys-section";
import { GhlIntegrationSection } from "@/components/ghl-integration-section";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  errorComponent: SettingsErrorFallback,
  head: () => ({
    meta: [
      { title: "Settings — Agent Business Tracker" },
      { name: "description", content: "Manage your profile, security, appearance, notifications and data." },
    ],
  }),
});

function SettingsErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <PageShell title="Settings">
      <div className="max-w-xl mx-auto rounded-2xl border border-destructive/40 bg-destructive/5 p-6 mt-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-bold">Settings couldn't load</h2>
            <p className="text-sm text-muted-foreground mt-1 break-words">
              {error?.message || "An unexpected error occurred while loading your settings."}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { router.invalidate(); reset(); }}
                className="btn-primary inline-flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </button>
              <Link to="/" className="btn-secondary">Go home</Link>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}


type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}

function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const { subscription, isActive } = useSubscription();
  const [authTimedOut, setAuthTimedOut] = useState(false);

  // profile
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // email
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  // password
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // appearance
  const [theme, setTheme] = useState<Theme>("system");

  // notifications
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/auth" });
  }, [authLoading, user, nav]);

  // Safety net: if auth hangs for 10s, surface an actionable fallback
  // instead of an infinite spinner.
  useEffect(() => {
    if (!authLoading) return;
    const t = setTimeout(() => setAuthTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [authLoading]);


  // load profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(data?.display_name ?? "");
      setAvatarUrl(data?.avatar_url ?? "");
      setProfileLoaded(true);
    })();
  }, [user]);

  // load preferences (local-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = (localStorage.getItem("theme") as Theme | null) ?? "system";
    setTheme(t);
    applyTheme(t);
    setMarketingEmails(localStorage.getItem("notif:marketing") !== "false");
    setProductUpdates(localStorage.getItem("notif:product") !== "false");
    setWeeklyDigest(localStorage.getItem("notif:digest") === "true");
  }, []);

  function changeTheme(t: Theme) {
    setTheme(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  }

  function setNotif(key: string, v: boolean, setter: (b: boolean) => void) {
    setter(v);
    localStorage.setItem(key, String(v));
  }

  async function saveProfile() {
    if (!user) return;
    setProfileBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null, avatar_url: avatarUrl.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changeEmail() {
    if (!newEmail.trim()) return;
    setEmailBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success("Confirmation email sent. Check both inboxes to confirm the change.");
      setNewEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update email");
    } finally {
      setEmailBusy(false);
    }
  }

  async function changePassword() {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password updated");
      setPw(""); setPw2("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setPwBusy(false);
    }
  }

  async function exportData() {
    if (!user) return;
    toast.info("Preparing your data export…");
    try {
      const [accounts, transactions, deals, mileage, receipts, profile] = await Promise.all([
        supabase.from("accounts").select("*"),
        supabase.from("transactions").select("*"),
        supabase.from("deals").select("*"),
        supabase.from("mileage_trips").select("*"),
        supabase.from("receipts").select("*"),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        user: { id: user.id, email: user.email },
        profile: profile.data ?? null,
        accounts: accounts.data ?? [],
        transactions: transactions.data ?? [],
        deals: deals.data ?? [],
        mileage_trips: mileage.data ?? [],
        receipts: receipts.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agent-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  async function deleteAccount() {
    if (!user) return;
    if (deleteText !== "DELETE") return toast.error('Type "DELETE" to confirm');
    setDeleteBusy(true);
    try {
      // Wipe user-owned data (RLS scopes to auth.uid()).
      await Promise.all([
        supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("deals").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("mileage_trips").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("receipts").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("accounts").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      ]);
      await signOut();
      toast.success("Your data has been deleted. Contact support to fully remove your login.");
      nav({ to: "/landing" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete account");
    } finally {
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  }

  if (authLoading || !user) {
    return (
      <PageShell title="Settings">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Settings" subtitle="Manage your account, preferences and data.">
      <div className="space-y-6 max-w-3xl">
        {/* Profile */}
        <Section icon={<UserIcon className="h-4 w-4" />} title="Profile" desc="How you appear in the app.">
          <div className="grid gap-4">
            <Field label="Display name">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="input"
                disabled={!profileLoaded}
              />
            </Field>
            <Field label="Avatar URL (optional)">
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                className="input"
                disabled={!profileLoaded}
              />
            </Field>
            <div>
              <button onClick={saveProfile} disabled={profileBusy} className="btn-primary">
                {profileBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save profile
              </button>
            </div>
          </div>
        </Section>

        {/* Email */}
        <Section icon={<Mail className="h-4 w-4" />} title="Email" desc={`Current: ${user.email}`}>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              className="input"
            />
            <button onClick={changeEmail} disabled={emailBusy || !newEmail} className="btn-secondary">
              {emailBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Change email
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            We'll send a confirmation link to your new address.
          </p>
        </Section>

        {/* Password */}
        <Section icon={<Lock className="h-4 w-4" />} title="Password" desc="At least 8 characters.">
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
              placeholder="New password" className="input" />
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirm password" className="input" />
          </div>
          <div className="mt-3">
            <button onClick={changePassword} disabled={pwBusy || !pw} className="btn-primary">
              {pwBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Update password
            </button>
          </div>
        </Section>

        {/* Appearance */}
        <Section icon={<Palette className="h-4 w-4" />} title="Appearance" desc="Theme used across the app.">
          <div className="flex gap-2">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => changeTheme(t)}
                className={`px-4 py-2 rounded-lg border text-sm capitalize transition ${
                  theme === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" desc="Email preferences.">
          <div className="space-y-3">
            <Toggle label="Product updates" checked={productUpdates}
              onChange={(v) => setNotif("notif:product", v, setProductUpdates)} />
            <Toggle label="Marketing & tips" checked={marketingEmails}
              onChange={(v) => setNotif("notif:marketing", v, setMarketingEmails)} />
            <Toggle label="Weekly business digest" checked={weeklyDigest}
              onChange={(v) => setNotif("notif:digest", v, setWeeklyDigest)} />
          </div>
        </Section>

        {/* Subscription quick link */}
        <Section icon={<CreditCard className="h-4 w-4" />} title="Subscription"
          desc={isActive ? `Status: ${subscription?.status}` : "No active subscription"}>
          <div className="flex flex-wrap gap-2">
            <Link to="/billing" className="btn-secondary">Manage billing</Link>
            <Link to="/pricing" className="btn-secondary">View plans</Link>
          </div>
        </Section>

        {/* Integrations */}
        <GhlIntegrationSection />

        {/* API keys */}
        <ApiKeysSection />

        {/* Data */}
        <Section icon={<Download className="h-4 w-4" />} title="Your data"
          desc="Download a JSON copy of everything we store for you.">
          <button onClick={exportData} className="btn-secondary">
            <Download className="h-4 w-4 mr-2" /> Export my data
          </button>
        </Section>

        {/* Danger */}
        <Section icon={<ShieldAlert className="h-4 w-4 text-destructive" />} title="Danger zone"
          desc="Permanent actions. These cannot be undone.">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => { await signOut(); nav({ to: "/landing" }); }}
              className="btn-secondary"
            >
              Sign out
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90"
            >
              Delete account
            </button>
          </div>
        </Section>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your deals, transactions, accounts, mileage and receipts.
              Your subscription should be cancelled first from the Billing page. Type{" "}
              <span className="font-mono font-bold">DELETE</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            placeholder="DELETE"
            className="input"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              disabled={deleteBusy || deleteText !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:opacity-90"
            >
              {deleteBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function Section({
  title, desc, icon, children,
}: { title: string; desc?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-display text-lg font-bold">{title}</h2>
        </div>
        {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
