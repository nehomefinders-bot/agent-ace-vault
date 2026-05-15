import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRightLeft,
  BadgeCheck,
  Building2,
  Camera,
  CalendarDays,
  Copy,
  Download,
  Facebook,
  Instagram,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney, formatMoneyCents } from "@/hooks/use-books";
import { normalizeStage } from "@/lib/pipeline-stages";

const IRS_RATE = 0.67;
const PROFILE_NAME = "Kimberly Graham";
const PROFILE_TITLE = "Realtor";
const LICENSE_NUMBER = "MA 9574862";
const LICENSE_EXPIRATION = "09/30/2026";
const PROFESSIONAL_EMAIL = "kimberly.graham@endlessprospects.com";
const PERSONAL_EMAIL = "kimberly.graham@gmail.com";
const PHONE_NUMBER = "(617) 555-0148";
const OFFICE_ADDRESS = "24 Beacon St, Suite 1200\nBoston, MA 02108";
const REFERRAL_LINK = "https://endlessprospects.app/r/kimberly-graham";
type SummaryAccent = "cyan" | "emerald" | "violet";
type MetricTone = "teal" | "blue" | "rose";
type PillTone = "success" | "info" | "warning" | "muted";

type ProfileRecord = {
  display_name: string | null;
  avatar_url: string | null;
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

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile - Agent Business Tracker" },
      {
        name: "description",
        content: "High-density agent profile with licensing, integrations, contact details, and yearly production.",
      },
    ],
  }),
});

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [integration, setIntegration] = useState<IntegrationRecord | null>(null);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [mileageTrips, setMileageTrips] = useState<MileageRecord[]>([]);
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIntegration(null);
      setDeals([]);
      setMileageTrips([]);
      setListings([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [profileRes, integrationRes, dealsRes, mileageRes, listingsRes] = await Promise.all([
          supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
          supabase
            .from("integration_settings")
            .select("location_id, enabled, last_full_sync_at")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("deals")
            .select("gross_commission, agent_split_pct, referral_pct, status, close_date, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase.from("mileage_trips").select("miles, date").eq("user_id", user.id).order("date", { ascending: false }),
          supabase.from("listings").select("status").eq("user_id", user.id),
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
  const avatarUrl = profile?.avatar_url?.trim() || "";
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

  const ytdMiles = mileageTrips.filter((trip) => {
    const dateValue = new Date(trip.date);
    return Number.isFinite(dateValue.getTime()) && dateValue.getFullYear() === currentYear;
  }).reduce((sum, trip) => sum + Number(trip.miles), 0);
  const mileageDeduction = ytdMiles * IRS_RATE;

  const leadConversionRate = ytdDeals.length > 0 ? (closedYtdDeals.length / ytdDeals.length) * 100 : 0;

  const transactionClosedCount = deals.filter((deal) => normalizeStage(deal.status) === "closed").length;
  const transactionTerminatedCount = deals.filter((deal) => normalizeStage(deal.status) === "no_response").length;
  const transactionActiveCount = Math.max(deals.length - transactionClosedCount - transactionTerminatedCount, 0);

  const listingActiveCount = listings.filter((listing) => listing.status === "Active" || listing.status === "Pending").length;
  const listingClosedCount = listings.filter((listing) => listing.status === "Sold").length;
  const listingTerminatedCount = listings.filter((listing) => listing.status === "Not on MLS").length;

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

  async function copyReferralLink() {
    try {
      const link = typeof window !== "undefined" ? `${window.location.origin}/r/kimberly-graham` : REFERRAL_LINK;
      await navigator.clipboard.writeText(link);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 1500);
      toast.success("Referral link copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy the referral link");
    }
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
    anchor.download = "kimberly-graham.vcf";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("V-Card downloaded");
  }

  if (authLoading || loading) {
    return (
      <ProfileFrame>
        <CenteredState title="Loading profile" subtitle="Fetching licensing, integrations, and production data...">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
        </CenteredState>
      </ProfileFrame>
    );
  }

  if (!user) {
    return (
      <ProfileFrame>
        <CenteredState
          title="Sign in required"
          subtitle="This profile page is part of the private agent workspace."
          actions={
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Sign in
            </Link>
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
            <button
              type="button"
              onClick={() => setRefreshSeed((value) => value + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          }
        />
      </ProfileFrame>
    );
  }

  return (
    <ProfileFrame>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/75">Endless Prospects</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Agent Profile</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
            A high-density view of identity, licensing, contact details, production, and workspace integrations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProfilePill tone="success">
            <BadgeCheck className="h-3.5 w-3.5" />
            Producing
          </ProfilePill>
          <ProfilePill tone="info">
            <Activity className="h-3.5 w-3.5" />
            Active
          </ProfilePill>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1.15fr_0.95fr]">
        <Card className={glassCardClass}>
          <div className="flex h-full flex-col p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Profile Header</p>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Producing
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ProfileIconBadge label="Facebook" icon={<Facebook className="h-4 w-4" />} />
                <ProfileIconBadge label="Instagram" icon={<Instagram className="h-4 w-4" />} />
              </div>
            </div>

            <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
              <div className="relative">
                <Avatar className="h-36 w-36 border border-white/10 bg-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:h-44 sm:w-44">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" /> : null}
                  <AvatarFallback className="bg-gradient-to-br from-cyan-400/35 via-sky-500/35 to-indigo-500/35 text-3xl font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  aria-label="Edit profile photo"
                  className="absolute bottom-2 right-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/90 text-white shadow-lg transition hover:bg-slate-900"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.5rem]">{displayName}</h2>
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">{PROFILE_TITLE}</p>
                <p className="mx-auto max-w-xs text-sm leading-6 text-slate-400">
                  Massachusetts-focused real estate production with a polished client experience across deals, listings, and
                  referrals.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <ProfilePill tone="muted">
                  <MapPin className="h-3.5 w-3.5" />
                  Massachusetts
                </ProfilePill>
                <ProfilePill tone="info">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  MLS Ready
                </ProfilePill>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className={glassCardClass}>
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Professional Credentials</p>
                  <h2 className="mt-1 text-xl font-bold text-white">Licensing and referral access</h2>
                </div>
                <ProfilePill tone="muted">
                  <CalendarDays className="h-3.5 w-3.5" />
                  MA Active
                </ProfilePill>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoBlock label="MA License Number" value={LICENSE_NUMBER} />
                <InfoBlock label="Expiration Date" value={LICENSE_EXPIRATION} />
                <InfoBlock label="Professional Email" value={PROFESSIONAL_EMAIL} icon={<Mail className="h-3.5 w-3.5" />} />
                <div className="sm:col-span-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">Referral Link</div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-200">
                        {REFERRAL_LINK}
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyReferralLink()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                      >
                        {copiedReferral ? <BadgeCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedReferral ? "Copied" : "Copy Referral Link"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className={glassCardClass}>
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Business Integration</p>
                  <h2 className="mt-1 text-xl font-bold text-white">GoHighLevel sync</h2>
                </div>
                <ProfilePill tone={syncEnabled ? "success" : "warning"}>
                  <Activity className="h-3.5 w-3.5" />
                  {syncEnabled ? "Realtime" : "Paused"}
                </ProfilePill>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                <InfoBlock label="GHL Location ID" value={integration?.location_id || "Not configured yet"} mono />
                <InfoBlock label="Realtime Sync Status" value={syncEnabled ? "Enabled" : "Not active"} />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Last full sync</div>
                    <div className="mt-1 text-sm font-medium text-white">{lastSyncLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Provider</div>
                    <div className="mt-1 text-sm font-medium text-white">GoHighLevel</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className={glassCardClass}>
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Contact & Location</p>
                  <h2 className="mt-1 text-xl font-bold text-white">Direct contact details</h2>
                </div>
                <button
                  type="button"
                  onClick={downloadVCard}
                  aria-label="Download V-Card"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value={PHONE_NUMBER} />
                <ContactRow icon={<Mail className="h-4 w-4" />} label="Personal Email" value={PERSONAL_EMAIL} />
                <ContactRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Office Address"
                  value={OFFICE_ADDRESS}
                  multiline
                />
              </div>
            </div>
          </Card>

          <Card className={glassCardClass}>
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Performance Metrics</p>
                  <h2 className="mt-1 text-xl font-bold text-white">Transactions and listings</h2>
                </div>
                <ProfilePill tone="info">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Portfolio
                </ProfilePill>
              </div>

              <div className="mt-5 space-y-4">
                <MetricRow
                  title="Transactions"
                  icon={<ArrowRightLeft className="h-4 w-4" />}
                  active={transactionActiveCount}
                  closed={transactionClosedCount}
                  terminated={transactionTerminatedCount}
                />
                <MetricRow
                  title="Listings"
                  icon={<Building2 className="h-4 w-4" />}
                  active={listingActiveCount}
                  closed={listingClosedCount}
                  terminated={listingTerminatedCount}
                />
              </div>
            </div>
          </Card>
        </div>
      </section>

      <Tabs defaultValue="overview" className="space-y-5 pt-2">
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 p-1 shadow-2xl shadow-black/20 backdrop-blur-md">
          <TabsList className="w-max min-w-full justify-start gap-1 bg-transparent p-0">
            <TabsTrigger className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none" value="overview">
              Overview
            </TabsTrigger>
            <TabsTrigger className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none" value="professional">
              Professional Profile
            </TabsTrigger>
            <TabsTrigger className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none" value="financial">
              Financial/Tax Settings
            </TabsTrigger>
            <TabsTrigger className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none" value="integrations">
              App Integrations
            </TabsTrigger>
          </TabsList>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Yearly Summary</p>
              <h2 className="mt-1 text-2xl font-bold text-white">{currentYear} YTD</h2>
            </div>
            <p className="max-w-xl text-sm text-slate-400">
              Pulled directly from the live workspace records for commissions, mileage, and transaction performance.
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Total YTD Commission"
              value={formatMoney(ytdCommission)}
              subtext={`${closedYtdDeals.length} closed deals this year`}
              accent="cyan"
            />
            <SummaryCard
              label="Total Miles Logged"
              value={`${ytdMiles.toFixed(1)} mi`}
              subtext={`${formatMoneyCents(mileageDeduction)} IRS deduction value`}
              accent="emerald"
            />
            <SummaryCard
              label="Lead Conversion Rate"
              value={`${leadConversionRate.toFixed(1)}%`}
              subtext={`${closedYtdDeals.length} closed / ${ytdDeals.length} opportunities`}
              accent="violet"
            />
          </div>
        </section>

        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel title="Workspace snapshot" icon={<Sparkles className="h-4 w-4" />}>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>Producing status is active and the profile is tuned for client-facing use.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>Massachusetts license, office location, and referral handoff details are visible at a glance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                  <span>Current workspace sync is tied to GoHighLevel and can be refreshed anytime.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                  <span>The referral link and V-Card are ready for quick handoffs to clients and partners.</span>
                </li>
              </ul>
            </GlassPanel>

            <GlassPanel title="Brand presence" icon={<Facebook className="h-4 w-4" />}>
              <div className="space-y-4 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Public name</div>
                    <div className="mt-1 font-medium text-white">{displayName}</div>
                  </div>
                  <ProfileIconBadge label="Facebook" icon={<Facebook className="h-4 w-4" />} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Social stack</div>
                    <div className="mt-1 font-medium text-white">Instagram-ready creative presence</div>
                  </div>
                  <ProfileIconBadge label="Instagram" icon={<Instagram className="h-4 w-4" />} />
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Referral access</div>
                  <div className="mt-1 font-mono text-xs text-slate-200">{REFERRAL_LINK}</div>
                </div>
              </div>
            </GlassPanel>
          </div>
        </TabsContent>

        <TabsContent value="professional" className="mt-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel title="Licensing" icon={<BadgeCheck className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock label="MA License Number" value={LICENSE_NUMBER} />
                <InfoBlock label="Expiration" value={LICENSE_EXPIRATION} />
                <InfoBlock label="Professional Email" value={PROFESSIONAL_EMAIL} icon={<Mail className="h-3.5 w-3.5" />} />
                <InfoBlock label="Office Market" value="Boston, North Shore, Metro West" />
              </div>
            </GlassPanel>

            <GlassPanel title="Professional footprint" icon={<MapPin className="h-4 w-4" />}>
              <div className="space-y-3 text-sm text-slate-300">
                <DetailLine label="Primary title" value={PROFILE_TITLE} />
                <DetailLine label="Status" value="Producing / Active" />
                <DetailLine label="Office" value={OFFICE_ADDRESS} />
                <DetailLine label="Profile image" value="Photo, camera edit overlay, and premium avatar treatment" />
              </div>
            </GlassPanel>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="mt-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel title="Commission profile" icon={<Activity className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock label="Average agent split" value={`${avgSplit.toFixed(0)}%`} />
                <InfoBlock label="Average referral fee" value={`${avgReferral.toFixed(0)}%`} />
                <InfoBlock label="Closed YTD commission" value={formatMoney(ytdCommission)} />
                <InfoBlock label="Average take per closed deal" value={formatMoney(closedYtdDeals.length ? ytdCommission / closedYtdDeals.length : 0)} />
              </div>
            </GlassPanel>

            <GlassPanel title="Tax-ready mileage" icon={<Building2 className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock label="IRS mileage rate" value={`$${IRS_RATE.toFixed(2)} / mi`} />
                <InfoBlock label="Miles logged this year" value={`${ytdMiles.toFixed(1)} mi`} />
                <InfoBlock label="Deduction value" value={formatMoneyCents(mileageDeduction)} />
                <InfoBlock label="Tax note" value="Keep trip logs synced for deduction support" />
              </div>
            </GlassPanel>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel title="GoHighLevel" icon={<Building2 className="h-4 w-4" />}>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBlock label="GHL Location ID" value={integration?.location_id || "Not configured yet"} mono />
                  <InfoBlock label="Realtime Sync" value={syncEnabled ? "Enabled" : "Paused"} />
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Last full sync</div>
                      <div className="mt-1 text-sm font-medium text-white">{lastSyncLabel}</div>
                    </div>
                    <ProfilePill tone={syncEnabled ? "success" : "warning"}>
                      <Activity className="h-3.5 w-3.5" />
                      {syncEnabled ? "Healthy" : "Needs setup"}
                    </ProfilePill>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel title="Export tools" icon={<Download className="h-4 w-4" />}>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Referral handoff</div>
                  <div className="mt-1 font-mono text-xs text-slate-200">{REFERRAL_LINK}</div>
                  <button
                    type="button"
                    onClick={() => void copyReferralLink()}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    {copiedReferral ? <BadgeCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedReferral ? "Copied" : "Copy Referral Link"}
                  </button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">V-Card</div>
                      <div className="mt-1 text-sm font-medium text-white">Download contact card for iPhone, Outlook, or Google Contacts</div>
                    </div>
                    <button
                      type="button"
                      onClick={downloadVCard}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>
        </TabsContent>
      </Tabs>
    </ProfileFrame>
  );
}

function calculateNetCommission(deal: DealRecord) {
  const afterReferral = Number(deal.gross_commission) * (1 - Number(deal.referral_pct ?? 0) / 100);
  return afterReferral * (Number(deal.agent_split_pct ?? 0) / 100);
}

function ProfileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute right-[-5rem] top-24 h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-3xl" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at top, rgba(34,211,238,0.12), transparent 30%), radial-gradient(circle at bottom right, rgba(56,189,248,0.09), transparent 32%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.92))",
          }}
        />
      </div>
      <div className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
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
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl shadow-black/20 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
          {children ?? <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />}
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
        {actions && <div className="mt-5 flex justify-center">{actions}</div>}
      </div>
    </div>
  );
}

function GlassPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className={`${glassCardClass} p-5 sm:p-6`}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  subtext,
  accent,
}: {
  label: string;
  value: string;
  subtext: string;
  accent: SummaryAccent;
}) {
  const styles: Record<SummaryAccent, string> = {
    cyan: "from-cyan-400/15 via-cyan-400/10 to-transparent text-cyan-200",
    emerald: "from-emerald-400/15 via-emerald-400/10 to-transparent text-emerald-200",
    violet: "from-violet-400/15 via-violet-400/10 to-transparent text-violet-200",
  };

  return (
    <Card className={`${glassCardClass} bg-gradient-to-br ${styles[accent]} p-5 sm:p-6`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-white tabular-nums sm:text-[2.15rem]">{value}</div>
      <p className="mt-2 text-sm text-slate-300">{subtext}</p>
    </Card>
  );
}

function MetricRow({
  title,
  icon,
  active,
  closed,
  terminated,
}: {
  title: string;
  icon: ReactNode;
  active: number;
  closed: number;
  terminated: number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200">
            {icon}
          </div>
          {title}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniMetric tone="teal" label="Active" value={active} />
        <MiniMetric tone="blue" label="Closed" value={closed} />
        <MiniMetric tone="rose" label="Terminated" value={terminated} />
      </div>
    </div>
  );
}

function MiniMetric({
  tone,
  label,
  value,
}: {
  tone: MetricTone;
  label: string;
  value: number;
}) {
  const tones: Record<MetricTone, string> = {
    teal: "border-teal-400/20 bg-teal-400/10 text-teal-100",
    blue: "border-sky-400/20 bg-sky-400/10 text-sky-100",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  };

  return (
    <div className={`rounded-2xl border px-3 py-3 ${tones[tone]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-current/80">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-white">{value}</div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-2 break-words text-sm font-medium text-white ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  multiline = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
        <div className={`mt-1 text-sm font-medium text-white ${multiline ? "whitespace-pre-line leading-6" : "break-words"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="max-w-[60%] break-words text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function ProfilePill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: PillTone;
}) {
  const tones: Record<PillTone, string> = {
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    info: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    muted: "border-white/10 bg-white/5 text-slate-200",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function ProfileIconBadge({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100" title={label} aria-label={label}>
      {icon}
    </div>
  );
}

const glassCardClass = "rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-md";
