import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, Save, UserRound, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile - Agent Business Tracker" },
      { name: "description", content: "Manage your agent profile: name, contact email, phone, brokerage and photo." },
    ],
  }),
});

const profileSchema = z.object({
  display_name: z.string().trim().max(100, "Name must be 100 characters or fewer").optional().or(z.literal("")),
  contact_email: z.string().trim().max(255).email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(32, "Phone must be 32 characters or fewer").optional().or(z.literal("")),
  agency_name: z.string().trim().max(150, "Agency name must be 150 characters or fewer").optional().or(z.literal("")),
});

type ProfileForm = {
  display_name: string;
  contact_email: string;
  phone: string;
  agency_name: string;
  avatar_url: string;
};

const EMPTY_FORM: ProfileForm = {
  display_name: "",
  contact_email: "",
  phone: "",
  agency_name: "",
  avatar_url: "",
};

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setForm(EMPTY_FORM);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, contact_email, phone, agency_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
      }
      setForm({
        display_name: data?.display_name ?? "",
        contact_email: data?.contact_email ?? "",
        phone: data?.phone ?? "",
        agency_name: data?.agency_name ?? "",
        avatar_url: data?.avatar_url ?? "",
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || saving) return;

    const parsed = profileSchema.safeParse({
      display_name: form.display_name,
      contact_email: form.contact_email,
      phone: form.phone,
      agency_name: form.agency_name,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your entries");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            display_name: form.display_name.trim() || null,
            contact_email: form.contact_email.trim() || null,
            phone: form.phone.trim() || null,
            agency_name: form.agency_name.trim() || null,
          },
          { onConflict: "id" },
        );
      if (error) throw error;
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    setAvatarBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: dataUrl }, { onConflict: "id" });
      if (error) throw error;
      update("avatar_url", dataUrl);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    if (!user) return;
    setAvatarBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: null }, { onConflict: "id" });
      if (error) throw error;
      update("avatar_url", "");
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setAvatarBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <PageShell title="Profile" description="Manage your personal and business details.">
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title="Profile" description="Sign in to manage your profile.">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">You need an account to view this page.</p>
          <Button asChild className="mt-4"><Link to="/auth">Sign in</Link></Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Profile" description="Manage your personal and business details.">
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
              )}
            </div>
            {avatarBusy ? (
              <div className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 text-center sm:text-left">
            <p className="text-sm font-medium text-foreground">Profile photo</p>
            <p className="text-xs text-muted-foreground">PNG or JPG, up to 5 MB.</p>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy}
              >
                <Camera className="mr-2 h-4 w-4" />
                {form.avatar_url ? "Change photo" : "Upload photo"}
              </Button>
              {form.avatar_url ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeAvatar}
                  disabled={avatarBusy}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              ) : null}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <div className="my-6 h-px w-full bg-border" />

        {/* Fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" htmlFor="full-name">
            <input
              id="full-name"
              type="text"
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              placeholder="e.g., Jane Doe"
              maxLength={100}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          <Field label="Contact Email" htmlFor="contact-email">
            <input
              id="contact-email"
              type="email"
              value={form.contact_email}
              onChange={(e) => update("contact_email", e.target.value)}
              placeholder="e.g., jane@example.com"
              maxLength={255}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          <Field label="Phone Number" htmlFor="phone">
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="e.g., (555) 123-4567"
              maxLength={32}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          <Field label="Agency / Brokerage Name" htmlFor="agency">
            <input
              id="agency"
              type="text"
              value={form.agency_name}
              onChange={(e) => update("agency_name", e.target.value)}
              placeholder="e.g., Horizon Realty"
              maxLength={150}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>
        </div>

        <div className="mt-8 flex justify-end">
          <Button type="submit" disabled={saving} className="min-w-[160px]">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
