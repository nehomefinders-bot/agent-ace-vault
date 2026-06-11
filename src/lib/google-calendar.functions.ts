import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";

function buildRedirectUri(): string {
  // Prefer explicit configured URL; otherwise derive from request host.
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (explicit) return explicit;
  const host = getRequestHeader("x-forwarded-host") || getRequestHeader("host");
  const proto = getRequestHeader("x-forwarded-proto") || "https";
  return `${proto}://${host}/api/public/google/calendar-callback`;
}

export const getGoogleCalendarAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID not configured");
    const { signState, GOOGLE_CALENDAR_OAUTH_SCOPES } = await import(
      "@/lib/google-oauth.server"
    );
    const state = signState(context.userId);
    const redirectUri = buildRedirectUri();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_CALENDAR_OAUTH_SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);
    return { authUrl: url.toString(), redirectUri };
  });

export const getGoogleCalendarConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("google_calendar_tokens")
      .select("google_email, scope, expires_at, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { connected: !!data, info: data };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export interface CalendarEventDto {
  id: string;
  summary: string;
  description?: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
}

export const listGoogleCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { timeMin?: string; timeMax?: string; maxResults?: number }) => input)
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refreshAccessToken } = await import("@/lib/google-oauth.server");

    const { data: row, error } = await supabaseAdmin
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { connected: false, events: [] as CalendarEventDto[] };

    let accessToken = row.access_token;
    const expiresAt = new Date(row.expires_at).getTime();
    if (Date.now() > expiresAt - 60_000) {
      const refreshed = await refreshAccessToken(row.refresh_token);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supabaseAdmin
        .from("google_calendar_tokens")
        .update({
          access_token: accessToken,
          expires_at: newExpiry,
          scope: refreshed.scope ?? row.scope,
        })
        .eq("user_id", context.userId);
    }

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", String(data.maxResults ?? 50));
    url.searchParams.set("timeMin", data.timeMin ?? new Date().toISOString());
    if (data.timeMax) url.searchParams.set("timeMax", data.timeMax);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Calendar API error: ${res.status} ${text}`);
    }
    const payload = (await res.json()) as {
      items?: Array<{
        id: string;
        summary?: string;
        description?: string;
        location?: string;
        htmlLink?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
    };
    const events: CalendarEventDto[] = (payload.items ?? []).map((e) => {
      const allDay = !e.start?.dateTime;
      return {
        id: e.id,
        summary: e.summary ?? "(no title)",
        description: e.description,
        start: e.start?.dateTime ?? e.start?.date ?? null,
        end: e.end?.dateTime ?? e.end?.date ?? null,
        allDay,
        location: e.location,
        htmlLink: e.htmlLink,
      };
    });
    return { connected: true, events };
  });
