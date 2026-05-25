import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Camera,
  CarFront,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  Facebook,
  ImagePlus,
  Instagram,
  Loader2,
  MapPin,
  PencilLine,
  RefreshCw,
  Save,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney, formatMoneyCents } from "@/hooks/use-books";
import { supabase } from "@/integrations/supabase/client";
import { normalizeStage } from "@/lib/pipeline-stages";
import { cn } from "@/lib/utils";

const IRS_RATE = 0.67;
const PROFILE_NAME = "Jackie Connolly";
const PROFILE_TITLE = "Realtor";
const LICENSE_NUMBER = "MA 9574862";
const LICENSE_EXPIRATION = "09/30/2026";
const JACKIE_EMAIL = "livingandlearningwithjackie@gmail.com";
const PROFESSIONAL_EMAIL = JACKIE_EMAIL;
const PERSONAL_EMAIL = JACKIE_EMAIL;
const PHONE_NUMBER = "(617) 555-0148";
const OFFICE_ADDRESS = "24 Beacon St, Suite 1200\nBoston, MA 02108";
const REFERRAL_SLUG = "jackie-connolly";
const REFERRAL_LINK = `https://endlessprospects.app/r/${REFERRAL_SLUG}`;
const MLS_SEARCH_LINK = "https://h3i.mlspin.com/signin.asp?lstpgckhd=1#ath";
const PROFILE_BIO =
  "Jackie is a relationship-first realtor who pairs calm guidance with fast follow-through, helping Massachusetts clients move with clarity and confidence.";

type ProfileTab = "professional" | "ghl" | "contact" | "financials";

type ProfileTabConfig = {
  value: ProfileTab;
  label: string;
  description: string;
  icon: LucideIcon;
};

type ProfileRecord = {
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
};

type IntegrationRecord = {
  location_id: string | null;
  enabled: boolean;
  last_full_sync_at: string | null;
};

type DealRecord = {
  gross_commission: number;
  agent_split_pct: number;
  referral_pct: number;
  status: string;
  close_date: string | null;
  created_at: string;
};

type MileageRecord = {
  miles: number;
  date: string;
};

type ListingRecord = {
  status: string;
};

const profileTabs: ProfileTabConfig[] = [
  {
    value: "professional",
    label: "Professional Info",
    description: "Licensing, public-facing profile details, and essential business links.",
    icon: BriefcaseBusiness,
  },
  {
    value: "ghl",
    label: "GHL Integration",
    description: "Connection status, sync health, and GoHighLevel location details.",
    icon: Activity,
  },
  {
    value: "contact",
    label: "Contact & Location",
    description: "Ready-to-share contact details for clients, referrals, and partners.",
    icon: MapPin,
  },
  {
    value: "financials",
    label: "Tax & Financials",
    description: "Commission, mileage, and tax-ready bookkeeping snapshots for the year.",
    icon: Wallet,
  },
];

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile - Agent Business Tracker" },
      {
        name: "description",
        content: "Luxury dark-mode agent profile with licensing, integrations, contact details, and yearly performance.",
      },
    ],
  }),
});

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [integration, setIntegration] = useState<IntegrationRecord | null>(null);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [mileageTrips, setMileageTrips] = useState<MileageRecord[]>([]);
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [bioText, setBioText] = useState(PROFILE_BIO);
  const [bioDraft, setBioDraft] = useState(PROFILE_BIO);
  const [bioEditing, setBioEditing] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("professional");

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIntegration(null);
      setDeals([]);
      setMileageTrips([]);
      setListings([]);
      setAvatarUrl("");
      setAvatarBusy(false);
      setCoverUrl("");
      setCoverBusy(false);
      setBioText(PROFILE_BIO);
      setBioDraft(PROFILE_BIO);
      setBioEditing(false);
      setBioBusy(false);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const authedUser = user;

    async function load() {
      setLoading(true);
      setLoadError(null);



      try {
        const [profileRes, integrationRes, dealsRes, mileageRes, listingsRes] = await Promise.all([
          supabase.from("profiles").select("display_name, avatar_url, cover_url").eq("id", authedUser.id).maybeSingle(),
          supabase
            .from("integration_settings")
            .select("location_id, enabled, last_full_sync_at")
            .eq("user_id", authedUser.id)
            .maybeSingle(),
          supabase
            .from("deals")
            .select("gross_commission, agent_split_pct, referral_pct, status, close_date, created_at")
            .eq("user_id", authedUser.id)
            .order("created_at", { ascending: false }),
          supabase.from("mileage_trips").select("miles, date").eq("user_id", authedUser.id).order("date", { ascending: false }),
          supabase.from("listings").select("status").eq("user_id", authedUser.id),
        ]);

        const error =
          profileRes.error ??
          integrationRes.error ??
          dealsRes.error ??
          mileageRes.error ??
          listingsRes.error;
        if (error) throw error;
        if (cancelled) return;

        setProfile(profileRes.data ?? null);
        setIntegration(integrationRes.data ?? null);
        setDeals((dealsRes.data ?? []) as DealRecord[]);
        setMileageTrips((mileageRes.data ?? []) as MileageRecord[]);
        setListings((listingsRes.data ?? []) as ListingRecord[]);
        setAvatarUrl(profileRes.data?.avatar_url?.trim() || "");
        setCoverUrl(profileRes.data?.cover_url?.trim() || "");
        const nextBio =
          typeof authedUser.user_metadata?.bio === "string" && authedUser.user_metadata.bio.trim()
            ? authedUser.user_metadata.bio.trim()
            : PROFILE_BIO;
        setBioText(nextBio);
        setBioDraft(nextBio);
        setBioEditing(false);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load profile data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, refreshSeed]);

  const currentYear = new Date().getFullYear();
  const displayName = profile?.display_name?.trim() || PROFILE_NAME;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const ytdDeals = deals.filter((deal) => {
    const dateSource = deal.close_date ?? deal.created_at;
    return Number.isFinite(new Date(dateSource).getTime()) && new Date(dateSource).getFullYear() === currentYear;
  });
  const closedYtdDeals = ytdDeals.filter((deal) => normalizeStage(deal.status) === "closed");
  const ytdCommission = closedYtdDeals.reduce((sum, deal) => sum + calculateNetCommission(deal), 0);
  const ytdMiles = mileageTrips
    .filter((trip) => {
      const dateValue = new Date(trip.date);
      return Number.isFinite(dateValue.getTime()) && dateValue.getFullYear() === currentYear;
    })
    .reduce((sum, trip) => sum + Number(trip.miles), 0);
  const mileageDeduction = ytdMiles * IRS_RATE;
  const leadConversionRate = ytdDeals.length > 0 ? (closedYtdDeals.length / ytdDeals.length) * 100 : 0;
  const avgSplit =
    deals.length > 0
      ? deals.reduce((sum, deal) => sum + Number(deal.agent_split_pct ?? 0), 0) / deals.length
      : 0;
  const avgReferral =
    deals.length > 0
      ? deals.reduce((sum, deal) => sum + Number(deal.referral_pct ?? 0), 0) / deals.length
      : 0;
  const syncEnabled = integration?.enabled ?? false;
  const lastSyncLabel = integration?.last_full_sync_at
    ? new Date(integration.last_full_sync_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";
  const activeTabConfig = profileTabs.find((tab) => tab.value === activeTab) ?? profileTabs[0];
  const avgTakePerClosedDeal = closedYtdDeals.length > 0 ? ytdCommission / closedYtdDeals.length : 0;

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 1500);
      toast.success("Referral link copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy the referral link");
    }
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }

    setAvatarBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: authedUser.id, avatar_url: dataUrl }, { onConflict: "id" });
      if (error) throw error;

      setAvatarUrl(dataUrl);
      setProfile((current) => ({
        display_name: current?.display_name ?? displayName,
        avatar_url: dataUrl,
        cover_url: current?.cover_url ?? coverUrl,
      }));
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the profile photo");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function uploadCover(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Cover image must be 8 MB or smaller");
      return;
    }

    let dimensions: { width: number; height: number };
    try {
      dimensions = await readImageDimensions(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not inspect the cover image");
      return;
    }

    if (dimensions.width <= dimensions.height) {
      toast.error("Please choose a landscape cover image");
      return;
    }

    setCoverBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: authedUser.id, cover_url: dataUrl }, { onConflict: "id" });
      if (error) throw error;

      setCoverUrl(dataUrl);
      setProfile((current) => ({
        display_name: current?.display_name ?? displayName,
        avatar_url: current?.avatar_url ?? avatarUrl,
        cover_url: dataUrl,
      }));
      toast.success("Cover image updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the cover image");
    } finally {
      setCoverBusy(false);
    }
  }

  async function saveBio() {
    if (!user) return;
    const nextBio = bioDraft.trim();
    if (!nextBio) {
      toast.error("Bio can't be empty");
      return;
    }

    setBioBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { bio: nextBio } });
      if (error) throw error;
      setBioText(nextBio);
      setBioDraft(nextBio);
      setBioEditing(false);
      toast.success("Bio updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the bio");
    } finally {
      setBioBusy(false);
    }
  }

  function cancelBioEdit() {
    setBioDraft(bioText);
    setBioEditing(false);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    await uploadAvatar(file);
  }

  function openAvatarPicker() {
    avatarInputRef.current?.click();
  }

  function openCoverPicker() {
    coverInputRef.current?.click();
  }

  async function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    await uploadCover(file);
  }

  function downloadVCard() {
    const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
    const familyName = nameParts.slice(-1).join(" ");
    const givenName = nameParts.slice(0, -1).join(" ");

    const vCard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${displayName}`,
      `N:${familyName};${givenName};;;`,
      `TITLE:${PROFILE_TITLE}`,
      `ORG:Endless Prospects`,
      `EMAIL;TYPE=WORK:${PROFESSIONAL_EMAIL}`,
      `EMAIL;TYPE=HOME:${PERSONAL_EMAIL}`,
      "TEL;TYPE=CELL:+16175550148",
      "ADR;TYPE=WORK:;;24 Beacon St, Suite 1200;Boston;MA;02108;USA",
      `URL:${REFERRAL_LINK}`,
      "END:VCARD",
      "",
    ].join("\r\n");

    const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${REFERRAL_SLUG}.vcf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("V-Card downloaded");
  }

  if (authLoading || loading) {
    return (
      <ProfileFrame>
        <CenteredState title="Loading profile" subtitle="Pulling profile details, YTD performance, and integrations.">
          <Loader2 className="h-5 w-5 animate-spin text-[#f4d27a]" />
        </CenteredState>
      </ProfileFrame>
    );
  }

  if (!user) {
    return (
      <ProfileFrame>
        <CenteredState
          title="Sign in required"
          subtitle="This profile experience lives inside the private agent workspace."
          actions={
            <Button
              asChild
              className="rounded-full border border-[#d4af37]/30 bg-[#d4af37] px-5 text-slate-950 hover:bg-[#e2bf56]"
            >
              <Link to="/auth">Sign in</Link>
            </Button>
          }
        />
      </ProfileFrame>
    );
  }

  if (loadError) {
    return (
      <ProfileFrame>
        <CenteredState
          title="Profile data could not load"
          subtitle={loadError}
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={() => setRefreshSeed((value) => value + 1)}
              className="rounded-full border-white/10 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      </ProfileFrame>
    );
  }

  const headerAction =
    activeTab === "contact" ? (
      <Button
        type="button"
        size="icon"
        onClick={downloadVCard}
        aria-label="Download vCard"
        className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/12 text-[#f4d27a] hover:bg-[#d4af37]/20"
      >
        <Download className="h-4 w-4" />
      </Button>
    ) : activeTab === "ghl" ? (
      <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-emerald-100">
        {syncEnabled ? "Sync live" : "Sync paused"}
      </Badge>
    ) : activeTab === "financials" ? (
      <Badge className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-1 text-[#f4d27a]">
        {currentYear} tax year
      </Badge>
    ) : (
      <Badge className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-1 text-[#f4d27a]">
        Public profile
      </Badge>
    );

  const panelContent = (() => {
    if (activeTab === "professional") {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingField label="MA License Number" value={LICENSE_NUMBER} />
          <SettingField label="Expiration Date" value={LICENSE_EXPIRATION} />
          <SettingField
            label="MLS Website Link"
            value={MLS_SEARCH_LINK}
            mono
            action={
              <Button
                asChild
                variant="outline"
                className="rounded-full border-[#d4af37]/20 bg-[#d4af37]/10 text-[#f4d27a] hover:bg-[#d4af37]/18 hover:text-[#f8e2a6]"
              >
                <a href={MLS_SEARCH_LINK} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              </Button>
            }
          />
          <SettingField
            label="Referral Link"
            value={REFERRAL_LINK}
            mono
            action={
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyReferralLink()}
                className="rounded-full border-[#d4af37]/20 bg-[#d4af37]/10 text-[#f4d27a] hover:bg-[#d4af37]/18 hover:text-[#f8e2a6]"
              >
                {copiedReferral ? <BadgeCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedReferral ? "Copied" : "Copy"}
              </Button>
            }
          />
        </div>
      );
    }

    if (activeTab === "ghl") {
      return (
        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-[#d4af37]/20 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(15,23,42,0.14))] p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#f4d27a]">GoHighLevel Sync</p>
                <h3 className="text-2xl font-semibold text-white">Connection health at a glance</h3>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">
                  Keep this integration visible so lead activity and closed business stay tied back to the profile workflow.
                </p>
              </div>
              <Badge
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm",
                  syncEnabled
                    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                    : "border border-amber-400/20 bg-amber-500/10 text-amber-100",
                )}
              >
                {syncEnabled ? "Connected" : "Needs setup"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SettingField label="GHL Location ID" value={integration?.location_id || "Not configured yet"} mono />
            <SettingField label="Sync Status" value={syncEnabled ? "Realtime sync enabled" : "Sync paused"} />
            <SettingField label="Last Sync Timestamp" value={lastSyncLabel} />
          </div>
        </div>
      );
    }

    if (activeTab === "contact") {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingField label="Phone" value={PHONE_NUMBER} />
          <SettingField label="Professional Email" value={PROFESSIONAL_EMAIL} />
          <SettingField label="Office Address" value={OFFICE_ADDRESS} multiline className="lg:col-span-2" />
        </div>
      );
    }

    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/12 text-[#f4d27a]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#cbb67b]">Commission Snapshot</p>
              <h3 className="text-lg font-semibold text-white">Closed production</h3>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SettingField label="Total YTD Commission" value={formatMoney(ytdCommission)} compact />
            <SettingField label="Closed Deals" value={`${closedYtdDeals.length}`} compact />
            <SettingField label="Average Take per Closed Deal" value={formatMoney(avgTakePerClosedDeal)} compact />
            <SettingField label="Lead Conversion Rate" value={`${leadConversionRate.toFixed(1)}%`} compact />
            <SettingField label="Average Agent Split" value={`${avgSplit.toFixed(0)}%`} compact />
            <SettingField label="Average Referral Fee" value={`${avgReferral.toFixed(0)}%`} compact />
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/12 text-[#f4d27a]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#cbb67b]">Tax-Ready Mileage</p>
              <h3 className="text-lg font-semibold text-white">Bookkeeping support</h3>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SettingField label="Total Miles Logged" value={`${ytdMiles.toFixed(1)} mi`} compact />
            <SettingField label="Mileage Deduction" value={formatMoneyCents(mileageDeduction)} compact />
            <SettingField label="IRS Mileage Rate" value={`$${IRS_RATE.toFixed(2)} / mi`} compact />
            <SettingField label="Listings Logged" value={`${listings.length}`} compact />
          </div>
        </Card>
      </div>
    );
  })();

  return (
    <ProfileFrame>
      <div className="space-y-6 lg:space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#cbb67b]">Endless Prospects</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Agent Profile</h1>
          </div>
          <Badge className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-emerald-100 shadow-[0_0_22px_rgba(74,222,128,0.16)]">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </Badge>
        </header>

        <section className={cn(glassCardClass, "overflow-hidden")}>
          <div className="relative">
            <div className="relative h-56 sm:h-72 lg:h-80">
              {coverUrl ? (
                <img src={coverUrl} alt={`${displayName} cover`} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.28),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.88),rgba(23,37,84,0.75))]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.15),rgba(2,6,23,0.45),rgba(2,6,23,0.92))]" />
              <button
                type="button"
                onClick={openCoverPicker}
                disabled={coverBusy}
                aria-label="Edit cover image"
                className="absolute inset-0 cursor-pointer transition disabled:cursor-not-allowed"
              >
                <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/75 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
                  {coverBusy ? <Loader2 className="h-4 w-4 animate-spin text-[#f4d27a]" /> : <ImagePlus className="h-4 w-4 text-[#f4d27a]" />}
                  Edit cover
                </span>
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleCoverChange(event)}
              />
            </div>

            <div className="relative px-4 pb-6 sm:px-8 sm:pb-8">
              <div className="relative -mt-16 flex justify-center sm:-mt-20">
                <div className="relative">
                  <Avatar className="h-32 w-32 border border-white/10 bg-slate-900 shadow-[0_30px_80px_rgba(2,6,23,0.7)] ring-4 ring-slate-950 sm:h-40 sm:w-40">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" /> : null}
                    <AvatarFallback className="bg-[radial-gradient(circle_at_top,rgba(244,210,122,0.55),rgba(120,53,15,0.32),rgba(15,23,42,0.9))] text-3xl font-semibold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={openAvatarPicker}
                    disabled={avatarBusy}
                    aria-label="Edit profile photo"
                    className="absolute -bottom-1 -right-1 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37]/25 bg-slate-950 text-[#f4d27a] shadow-[0_18px_40px_rgba(2,6,23,0.6)] transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {avatarBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleAvatarChange(event)}
                  />
                </div>
              </div>

              <div className="mx-auto mt-6 max-w-3xl text-center">
                <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{displayName}</h2>
                <p className="mt-2 text-sm font-medium uppercase tracking-[0.32em] text-[#f4d27a]">{PROFILE_TITLE}</p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <ProfileSocialBadge label="Facebook" icon={<Facebook className="h-4 w-4" />} />
                  <ProfileSocialBadge label="Instagram" icon={<Instagram className="h-4 w-4" />} />
                </div>

                <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-950/65 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-md sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[#cbb67b]">Bio / Description</p>
                    </div>

                    {!bioEditing ? (
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => {
                          setBioDraft(bioText);
                          setBioEditing(true);
                        }}
                        aria-label="Edit bio"
                        className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#f4d27a] hover:bg-[#d4af37]/18"
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => void saveBio()}
                          disabled={bioBusy}
                          aria-label="Save bio"
                          className="rounded-full border border-[#d4af37]/30 bg-[#d4af37] text-slate-950 hover:bg-[#e2bf56]"
                        >
                          {bioBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={cancelBioEdit}
                          disabled={bioBusy}
                          aria-label="Cancel bio edit"
                          className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    {bioEditing ? (
                      <Textarea
                        value={bioDraft}
                        onChange={(event) => setBioDraft(event.target.value)}
                        rows={5}
                        placeholder="Write a short bio about you..."
                        className="rounded-[1.25rem] border-white/10 bg-slate-900/70 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-500 focus-visible:border-[#d4af37]/35 focus-visible:ring-[#d4af37]/35"
                      />
                    ) : (
                      <p className="whitespace-pre-line text-base leading-7 text-slate-300">{bioText}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cn(glassCardClass, "px-4 py-4 sm:px-6 sm:py-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="xl:min-w-[220px]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#cbb67b]">YTD Performance</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{currentYear} performance bar</h3>
            </div>

            <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricPill icon={DollarSign} label="Total YTD Commission" value={formatMoney(ytdCommission)} />
              <MetricPill icon={TrendingUp} label="Deals Closed" value={`${closedYtdDeals.length}`} />
              <MetricPill icon={Building2} label="Listings Logged" value={`${listings.length}`} />
              <MetricPill icon={CarFront} label="Total Miles Logged" value={`${ytdMiles.toFixed(1)} mi`} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="lg:hidden">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.28em] text-[#cbb67b]">
              Menu
            </label>
            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as ProfileTab)}>
              <SelectTrigger className="h-12 rounded-[1.25rem] border-white/10 bg-white/5 px-4 text-left text-white shadow-[0_18px_40px_rgba(2,6,23,0.35)] focus:ring-[#d4af37]/35">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/10 bg-slate-950 text-white">
                {profileTabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value} className="rounded-xl focus:bg-[#d4af37]/10 focus:text-[#f4d27a]">
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className={cn(glassCardClass, "hidden h-fit p-3 lg:block")}>
            <div className="mb-3 px-2 pt-2">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#cbb67b]">Workflow Menu</p>
            </div>
            <div className="space-y-2">
              {profileTabs.map((tab) => (
                <SettingsNavItem
                  key={tab.value}
                  active={tab.value === activeTab}
                  label={tab.label}
                  description={tab.description}
                  icon={tab.icon}
                  onClick={() => setActiveTab(tab.value)}
                />
              ))}
            </div>
          </Card>

          <Card className={cn(glassCardClass, "p-5 sm:p-6 lg:p-7")}>
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#cbb67b]">Structured Settings</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{activeTabConfig.label}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{activeTabConfig.description}</p>
              </div>
              <div className="shrink-0">{headerAction}</div>
            </div>

            <div className="mt-6">{panelContent}</div>
          </Card>
        </section>
      </div>
    </ProfileFrame>
  );
}

function calculateNetCommission(deal: DealRecord) {
  const afterReferral = Number(deal.gross_commission) * (1 - Number(deal.referral_pct ?? 0) / 100);
  return afterReferral * (Number(deal.agent_split_pct ?? 0) / 100);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Could not read the selected image"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the selected image"));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not inspect the selected image"));
    };

    image.src = url;
  });
}

function ProfileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-[#d4af37]/14 blur-3xl" />
        <div className="absolute right-[-10rem] top-20 h-[30rem] w-[30rem] rounded-full bg-amber-700/12 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-blue-900/18 blur-3xl" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at top, rgba(212,175,55,0.16), transparent 28%), radial-gradient(circle at bottom right, rgba(59,130,246,0.08), transparent 30%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.94))",
          }}
        />
      </div>
      <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
    </div>
  );
}

function CenteredState({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-center shadow-[0_24px_80px_rgba(2,6,23,0.6)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10">
          {children ?? <Loader2 className="h-5 w-5 animate-spin text-[#f4d27a]" />}
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
        {actions && <div className="mt-5 flex justify-center">{actions}</div>}
      </div>
    </div>
  );
}

function ProfileSocialBadge({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f4d27a] shadow-[0_10px_30px_rgba(2,6,23,0.25)]"
      title={label}
      aria-label={label}
    >
      {icon}
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/12 text-[#f4d27a]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#cbb67b]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SettingsNavItem({
  active,
  label,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-[1.5rem] border px-4 py-4 text-left transition",
        active
          ? "border-[#d4af37]/25 bg-[#d4af37]/12 shadow-[0_18px_40px_rgba(212,175,55,0.08)]"
          : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
            active
              ? "border-[#d4af37]/25 bg-[#d4af37]/14 text-[#f4d27a]"
              : "border-white/10 bg-white/5 text-slate-300",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className={cn("text-base font-semibold", active ? "text-white" : "text-slate-100")}>{label}</div>
          <div className="mt-1 text-sm leading-6 text-slate-400">{description}</div>
        </div>
      </div>
    </button>
  );
}

function SettingField({
  label,
  value,
  action,
  mono = false,
  multiline = false,
  compact = false,
  className,
}: {
  label: string;
  value: string;
  action?: ReactNode;
  mono?: boolean;
  multiline?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      <div className={cn("flex gap-3", compact ? "flex-col" : "flex-col sm:flex-row sm:items-start sm:justify-between")}>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#cbb67b]">{label}</p>
          <div
            className={cn(
              "mt-2 break-words text-white",
              compact ? "text-lg font-semibold" : "text-base font-medium sm:text-lg",
              mono ? "font-mono text-xs sm:text-sm" : "",
              multiline ? "whitespace-pre-line leading-7" : "",
            )}
          >
            {value}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

const glassCardClass =
  "rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(2,6,23,0.6)] backdrop-blur-xl";
