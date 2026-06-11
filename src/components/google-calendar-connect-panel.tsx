import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ExternalLink, Loader2, Plug, PlugZap, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getGoogleCalendarAuthUrl,
  getGoogleCalendarConnection,
  disconnectGoogleCalendar,
  listGoogleCalendarEvents,
  type CalendarEventDto,
} from "@/lib/google-calendar.functions";

function formatEventTime(ev: CalendarEventDto) {
  if (!ev.start) return "";
  const d = new Date(ev.start);
  if (ev.allDay) return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GoogleCalendarConnectPanel() {
  const qc = useQueryClient();
  const getAuthUrl = useServerFn(getGoogleCalendarAuthUrl);
  const getConnection = useServerFn(getGoogleCalendarConnection);
  const disconnect = useServerFn(disconnectGoogleCalendar);
  const listEvents = useServerFn(listGoogleCalendarEvents);

  const [connecting, setConnecting] = useState(false);

  const connQ = useQuery({
    queryKey: ["google-calendar-conn"],
    queryFn: () => getConnection(),
  });

  const eventsQ = useQuery({
    queryKey: ["google-calendar-events"],
    queryFn: () => listEvents({ data: { maxResults: 25 } }),
    enabled: !!connQ.data?.connected,
    staleTime: 60_000,
  });

  const disconnectM = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () => {
      toast.success("Google Calendar disconnected");
      qc.invalidateQueries({ queryKey: ["google-calendar-conn"] });
      qc.invalidateQueries({ queryKey: ["google-calendar-events"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Disconnect failed"),
  });

  // Handle redirect-back state from the OAuth callback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const g = params.get("google");
    if (!g) return;
    if (g === "connected") {
      toast.success("Google Calendar connected");
      qc.invalidateQueries({ queryKey: ["google-calendar-conn"] });
    } else if (g === "error") {
      toast.error(`Google Calendar: ${params.get("reason") ?? "connection failed"}`);
    }
    params.delete("google");
    params.delete("reason");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }, [qc]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const { authUrl } = await getAuthUrl();
      window.location.href = authUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start Google OAuth");
      setConnecting(false);
    }
  }

  const connected = !!connQ.data?.connected;

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-500/10">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold">
              Google Calendar (read-only sync)
            </h3>
            <p className="text-sm text-muted-foreground">
              {connected
                ? `Connected as ${connQ.data?.info?.google_email ?? "your Google account"}. Events refresh automatically.`
                : "Connect with your own Google account using calendar.readonly scope. Tokens refresh in the background."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => eventsQ.refetch()}
                disabled={eventsQ.isFetching}
              >
                {eventsQ.isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectM.mutate()}
                disabled={disconnectM.isPending}
              >
                <Unplug className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect} disabled={connecting || connQ.isLoading} size="sm">
              {connecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlugZap className="mr-2 h-4 w-4" />
              )}
              Connect Google Calendar
            </Button>
          )}
        </div>
      </div>

      {connected && (
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          {eventsQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading upcoming events…
            </div>
          ) : eventsQ.data?.events?.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {eventsQ.data.events.slice(0, 8).map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ev.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEventTime(ev)}
                      {ev.location ? ` · ${ev.location}` : ""}
                    </p>
                  </div>
                  {ev.htmlLink && (
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Plug className="h-4 w-4" /> No upcoming events in primary calendar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
