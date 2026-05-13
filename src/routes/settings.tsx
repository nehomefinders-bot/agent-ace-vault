import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  User as UserIcon,
  Lock,
  Palette,
  Download,
  ShieldAlert,
  Mail,
  CreditCard,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiKeysSection } from "@/components/api-keys-section";
import { GhlIntegrationSection } from "@/components/ghl-integration-section";
import { SecurityOtpDialog } from "@/components/security-otp-dialog";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import {
  downloadAccountExportCsv,
  downloadAccountExportExcel,
  type AccountExportBundle,
} from "@/lib/account-export";
import {
  SECURITY_UNLOCK_STORAGE_KEY,
  SECURITY_UNLOCK_TTL_MS,
  type SensitiveActionRunner,
} from "@/lib/security-gate";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  errorComponent: SettingsErrorFallback,
  head: () => ({
    meta: [
      { title: "Settings - Agent Business Tracker" },
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
            <h2 className="font-display text-lg font-bold">Settings could not load</h2>
            <p className="text-sm text-muted-foreground mt-1 break-words">
              {error?.message || "An unexpected error occurred while loading your settings."}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  router.invalidate();
                  reset();
                }}
                className="btn-primary inline-flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </button>
              <Link to="/" className="btn-secondary">
                Go home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const { subscription, isActive } = useSubscription();
  const [authTimedOut, setAuthTimedOut] = useState(false);

  const pendingSensitiveAction = useRef<{
    action: () => Promise<void>;
    resolve: (value: boolean) => void;
  } | null>(null);

  // profile
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // security verification
  const [securityUnlockedUntil, setSecurityUnlockedUntil] = useState(0);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationPurpose, setVerificationPurpose] = useState("Verify your account");

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

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/auth" });
  }, [authLoading, user, nav]);

  useEffect(() => {
    if (!authLoading) return;
    const t = setTimeout(() => setAuthTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, [authLoading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = Number(window.sessionStorage.getItem(SECURITY_UNLOCK_STORAGE_KEY) ?? "0");
    if (Number.isFinite(stored) && stored > Date.now()) {
      setSecurityUnlockedUntil(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!securityUnlockedUntil || securityUnlockedUntil <= Date.now()) {
      window.sessionStorage.removeItem(SECURITY_UNLOCK_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(SECURITY_UNLOCK_STORAGE_KEY, String(securityUnlockedUntil));
    const timeout = window.setTimeout(() => setSecurityUnlockedUntil(0), securityUnlockedUntil - Date.now());
    return () => window.clearTimeout(timeout);
  }, [securityUnlockedUntil]);

  const securityUnlocked = securityUnlockedUntil > Date.now();

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
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
    setMarketingEmails(localStorage.getItem("notif:marketing") !== "false");
    setProductUpdates(localStorage.getItem("notif:product") !== "false");
    setWeeklyDigest(localStorage.getItem("notif:digest") === "true");
  }, []);

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  }

  function setNotif(key: string, nextValue: boolean, setter: (value: boolean) => void) {
    setter(nextValue);
    localStorage.setItem(key, String(nextValue));
  }

  function unlockSecurity() {
    const until = Date.now() + SECURITY_UNLOCK_TTL_MS;
    setSecurityUnlockedUntil(until);
  }

  const requestVerification: SensitiveActionRunner = async (purpose, action) => {
    if (securityUnlocked) {
      await action();
      return true;
    }

    return new Promise<boolean>((resolve) => {
      pendingSensitiveAction.current = { action, resolve };
      setVerificationPurpose(purpose);
      setVerificationOpen(true);
    });
  };

  async function completeVerification(): Promise<boolean> {
    unlockSecurity();
    const pending = pendingSensitiveAction.current;
    pendingSensitiveAction.current = null;
    setVerificationOpen(false);

    if (!pending) return false;

    try {
      await pending.action();
      pending.resolve(true);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete the requested action");
      pending.resolve(false);
      return false;
    }
  }

  function cancelVerification() {
    const pending = pendingSensitiveAction.current;
    pendingSensitiveAction.current = null;
    setVerificationOpen(false);
    if (pending) pending.resolve(false);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changeEmail() {
    if (!newEmail.trim()) return;
    setEmailBusy(true);
    try {
      const verified = await requestVerification("Confirm your current email before changing it", async () => {
        const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
        if (error) throw error;
        toast.success("Confirmation email sent. Check both inboxes to confirm the change.");
        setNewEmail("");
      });
      if (!verified) return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update email");
    } finally {
      setEmailBusy(false);
    }
  }

  async function changePassword() {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setPwBusy(true);
    try {
      const verified = await requestVerification("Confirm your current email before changing your password", async () => {
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) throw error;
        toast.success("Password updated");
        setPw("");
        setPw2("");
      });
      if (!verified) return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setPwBusy(false);
    }
  }

  async function buildExportBundle(): Promise<AccountExportBundle> {
    if (!user) {
      throw new Error("You must be signed in to export data.");
    }

    const [
      accounts,
      apiKeys,
      clients,
      deals,
      documents,
      expenses,
      integrationSettings,
      integrationSyncLog,
      listings,
      mileageTrips,
      receipts,
      signatureCoordinates,
      subscriptions,
      tasks,
      transactions,
      profile,
    ] = await Promise.all([
      supabase.from("accounts").select("*").eq("user_id", user.id),
      supabase.from("api_keys").select("*").eq("user_id", user.id),
      supabase.from("clients").select("*").eq("user_id", user.id),
      supabase.from("deals").select("*").eq("user_id", user.id),
      supabase.from("documents").select("*").eq("user_id", user.id),
      supabase.from("expenses").select("*").eq("user_id", user.id),
      supabase.from("integration_settings").select("*").eq("user_id", user.id),
      supabase.from("integration_sync_log").select("*").eq("user_id", user.id),
      supabase.from("listings").select("*").eq("user_id", user.id),
      supabase.from("mileage_trips").select("*").eq("user_id", user.id),
      supabase.from("receipts").select("*").eq("user_id", user.id),
      supabase.from("signature_coordinates").select("*").eq("user_id", user.id),
      supabase.from("subscriptions").select("*").eq("user_id", user.id),
      supabase.from("tasks").select("*").eq("user_id", user.id),
      supabase.from("transactions").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);

    const queryErrors = [
      accounts.error,
      apiKeys.error,
      clients.error,
      deals.error,
      documents.error,
      expenses.error,
      integrationSettings.error,
      integrationSyncLog.error,
      listings.error,
      mileageTrips.error,
      receipts.error,
      signatureCoordinates.error,
      subscriptions.error,
      tasks.error,
      transactions.error,
      profile.error,
    ].filter(Boolean);
    if (queryErrors.length > 0) {
      throw queryErrors[0] as Error;
    }

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      profile: profile.data ?? null,
      tables: [
        { name: "accounts", rows: (accounts.data ?? []) as Record<string, unknown>[] },
        { name: "api_keys", rows: (apiKeys.data ?? []) as Record<string, unknown>[] },
        { name: "clients", rows: (clients.data ?? []) as Record<string, unknown>[] },
        { name: "deals", rows: (deals.data ?? []) as Record<string, unknown>[] },
        { name: "documents", rows: (documents.data ?? []) as Record<string, unknown>[] },
        { name: "expenses", rows: (expenses.data ?? []) as Record<string, unknown>[] },
        { name: "integration_settings", rows: (integrationSettings.data ?? []) as Record<string, unknown>[] },
        { name: "integration_sync_log", rows: (integrationSyncLog.data ?? []) as Record<string, unknown>[] },
        { name: "listings", rows: (listings.data ?? []) as Record<string, unknown>[] },
        { name: "mileage_trips", rows: (mileageTrips.data ?? []) as Record<string, unknown>[] },
        { name: "receipts", rows: (receipts.data ?? []) as Record<string, unknown>[] },
        { name: "signature_coordinates", rows: (signatureCoordinates.data ?? []) as Record<string, unknown>[] },
        { name: "subscriptions", rows: (subscriptions.data ?? []) as Record<string, unknown>[] },
        { name: "tasks", rows: (tasks.data ?? []) as Record<string, unknown>[] },
        { name: "transactions", rows: (transactions.data ?? []) as Record<string, unknown>[] },
      ],
    };
  }

  async function exportData(format: "csv" | "xlsx") {
    if (!user) return;
    try {
      const verified = await requestVerification("Confirm your current email before exporting your data", async () => {
        toast.info("Preparing your data export...");
        const bundle = await buildExportBundle();
        if (format === "csv") {
          downloadAccountExportCsv(bundle);
        } else {
          await downloadAccountExportExcel(bundle);
        }
      });
      if (!verified) return;
      toast.success("Export downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  }

  if (authLoading || !user) {
    return (
      <PageShell title="Settings">
        {authTimedOut ? (
          <div className="max-w-xl mx-auto rounded-2xl border border-destructive/40 bg-destructive/5 p-6 mt-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
              <div className="flex-1">
                <h2 className="font-display text-lg font-bold">Taking longer than usual</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We could not confirm your session. Please reload the page or sign in again.
                </p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => window.location.reload()} className="btn-primary inline-flex items-center">
                    <RefreshCw className="h-4 w-4 mr-2" /> Reload
                  </button>
                  <Link to="/auth" className="btn-secondary">
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell title="Settings" subtitle="Manage your account, preferences and data.">
      <div className="space-y-6 max-w-3xl">
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
                placeholder="https://..."
                className="input"
                disabled={!profileLoaded}
              />
            </Field>
            <div>
              <button onClick={() => void saveProfile()} disabled={profileBusy} className="btn-primary">
                {profileBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save profile
              </button>
            </div>
          </div>
        </Section>

        <Section icon={<Lock className="h-4 w-4" />} title="Account security" desc="Verify your current email once to unlock email changes, password changes, API keys, GoHighLevel and exports.">
          {securityUnlocked ? (
            <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
              Verified. Sensitive actions stay unlocked for 10 minutes.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We will send a one-time code to your current email before you can change your email, update your password,
                manage API keys, edit GoHighLevel settings, or export data.
              </p>
              <button onClick={() => void requestVerification("Unlock your account settings", async () => {})} className="btn-primary">
                Verify current email
              </button>
            </div>
          )}
        </Section>

        {securityUnlocked ? (
          <>
            <Section icon={<Mail className="h-4 w-4" />} title="Email" desc={`Current: ${user.email}`}>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@email.com"
                  className="input"
                />
                <button onClick={() => void changeEmail()} disabled={emailBusy || !newEmail.trim()} className="btn-secondary">
                  {emailBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Change email
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                We will send a confirmation link to your new address.
              </p>
            </Section>

            <Section icon={<Lock className="h-4 w-4" />} title="Password" desc="At least 8 characters.">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="New password"
                  className="input"
                />
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Confirm password"
                  className="input"
                />
              </div>
              <div className="mt-3">
                <button onClick={() => void changePassword()} disabled={pwBusy || !pw} className="btn-primary">
                  {pwBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Update password
                </button>
              </div>
            </Section>
          </>
        ) : (
          <Section icon={<Mail className="h-4 w-4" />} title="Email and password" desc="Locked until you verify your current email.">
            <button onClick={() => void requestVerification("Unlock your account settings", async () => {})} className="btn-primary">
              Verify current email
            </button>
          </Section>
        )}

        <Section icon={<Palette className="h-4 w-4" />} title="Appearance" desc="Theme used across the app.">
          <div className="flex gap-2 flex-wrap">
            {(["light", "dark", "system"] as Theme[]).map((nextTheme) => (
              <button
                key={nextTheme}
                onClick={() => changeTheme(nextTheme)}
                className={`px-4 py-2 rounded-lg border text-sm capitalize transition ${
                  theme === nextTheme
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {nextTheme}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Notifications" desc="Email preferences.">
          <div className="space-y-3">
            <Toggle
              label="Product updates"
              checked={productUpdates}
              onChange={(nextValue) => setNotif("notif:product", nextValue, setProductUpdates)}
            />
            <Toggle
              label="Marketing and tips"
              checked={marketingEmails}
              onChange={(nextValue) => setNotif("notif:marketing", nextValue, setMarketingEmails)}
            />
            <Toggle
              label="Weekly business digest"
              checked={weeklyDigest}
              onChange={(nextValue) => setNotif("notif:digest", nextValue, setWeeklyDigest)}
            />
          </div>
        </Section>

        <Section
          icon={<CreditCard className="h-4 w-4" />}
          title="Subscription"
          desc={isActive ? `Status: ${subscription?.status}` : "No active subscription"}
        >
          <div className="flex flex-wrap gap-2">
            <Link to="/billing" className="btn-secondary">
              Manage billing
            </Link>
            <Link to="/pricing" className="btn-secondary">
              View plans
            </Link>
          </div>
        </Section>

        <GhlIntegrationSection requireVerification={requestVerification} isSecurityUnlocked={securityUnlocked} />

        <ApiKeysSection requireVerification={requestVerification} />

        <Section icon={<Download className="h-4 w-4" />} title="Your data" desc="Download your data as CSV or Excel. Excel keeps one sheet per table.">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="btn-secondary">
                <Download className="h-4 w-4 mr-2" /> Export my data
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => void exportData("xlsx")}>Export Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportData("csv")}>Export CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Section>

        <Section icon={<ShieldAlert className="h-4 w-4 text-destructive" />} title="Account access" desc="Sign out when you are done. To delete your account, contact support by email and a team member will handle it.">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={async () => {
                await signOut();
                nav({ to: "/landing" });
              }}
              className="btn-secondary"
            >
              Sign out
            </button>
            <a href="mailto:livingandlearningwithjackie@gmail.com" className="text-sm text-muted-foreground hover:text-foreground underline">
              livingandlearningwithjackie@gmail.com
            </a>
          </div>
        </Section>
      </div>

      <SecurityOtpDialog
        open={verificationOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            cancelVerification();
            return;
          }
          setVerificationOpen(nextOpen);
        }}
        email={user.email ?? ""}
        purpose={verificationPurpose}
        onVerified={completeVerification}
      />
    </PageShell>
  );
}

function Section({
  title,
  desc,
  icon,
  children,
}: {
  title: string;
  desc?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
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
