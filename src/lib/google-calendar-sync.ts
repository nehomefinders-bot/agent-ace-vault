import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_CALENDAR_ID = "primary";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_PROVIDER_TOKEN_KEY = "abt.googleCalendar.providerToken";
const GOOGLE_PROVIDER_REFRESH_TOKEN_KEY = "abt.googleCalendar.providerRefreshToken";
const GOOGLE_SYNC_SOURCE = "agent-business-tracker";
const GOOGLE_SYNC_TASK_ID_KEY = "agentAceTaskId";
const GOOGLE_SYNC_SOURCE_KEY = "agentAceSource";
const DEFAULT_EVENT_DURATION_MINUTES = 30;
const SYNC_CLOCK_SKEW_MS = 2_000;

export const GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events";

export class GoogleCalendarAuthError extends Error {
  constructor(message = "Connect Google Calendar to sync events.") {
    super(message);
    this.name = "GoogleCalendarAuthError";
  }
}

class GoogleCalendarNotFoundError extends Error {
  constructor(message = "Google Calendar event was not found.") {
    super(message);
    this.name = "GoogleCalendarNotFoundError";
  }
}

export interface GoogleSyncedTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_at: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  google_calendar_id: string | null;
  google_event_id: string | null;
  google_event_etag: string | null;
  google_event_updated_at: string | null;
  google_event_synced_at: string | null;
}

export interface GoogleCalendarEvent {
  id: string;
  etag?: string;
  status?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

export interface GoogleCalendarEventPatch {
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

type TaskDatePatch = Pick<GoogleCalendarEventPatch, "start" | "end">;

interface GoogleEventsListResponse {
  items?: GoogleCalendarEvent[];
}

interface SyncRange {
  start: Date;
  end: Date;
}

interface SyncResult {
  tasks: GoogleSyncedTask[];
  externalEvents: GoogleCalendarEvent[];
}

type TaskUpdate = Partial<
  Pick<
    GoogleSyncedTask,
    | "title"
    | "description"
    | "due_date"
    | "due_at"
    | "google_calendar_id"
    | "google_event_id"
    | "google_event_etag"
    | "google_event_updated_at"
    | "google_event_synced_at"
  >
>;

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function storeGoogleProviderTokens(session: Session | null) {
  const storage = getStorage();
  if (!storage || !session) return;

  if (session.provider_token) {
    storage.setItem(GOOGLE_PROVIDER_TOKEN_KEY, session.provider_token);
  }

  if (session.provider_refresh_token) {
    storage.setItem(GOOGLE_PROVIDER_REFRESH_TOKEN_KEY, session.provider_refresh_token);
  }
}

export function clearGoogleProviderTokens() {
  const storage = getStorage();
  storage?.removeItem(GOOGLE_PROVIDER_TOKEN_KEY);
  storage?.removeItem(GOOGLE_PROVIDER_REFRESH_TOKEN_KEY);
}

export async function getGoogleProviderToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  storeGoogleProviderTokens(session);

  const token = session?.provider_token ?? getStorage()?.getItem(GOOGLE_PROVIDER_TOKEN_KEY);
  if (!token) throw new GoogleCalendarAuthError();
  return token;
}

export function hasStoredGoogleProviderToken() {
  return Boolean(getStorage()?.getItem(GOOGLE_PROVIDER_TOKEN_KEY));
}

async function readGoogleError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

async function googleRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    clearGoogleProviderTokens();
    throw new GoogleCalendarAuthError("Google Calendar needs to be reconnected.");
  }

  if (response.status === 404 || response.status === 410) {
    throw new GoogleCalendarNotFoundError();
  }

  if (!response.ok) {
    throw new Error(await readGoogleError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + days);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventDatePatch(start: Date, end: Date | null, allDay: boolean): TaskDatePatch {
  if (allDay) {
    const startDate = dateOnly(start);
    const endDate = end ? dateOnly(end) : addDays(startDate, 1);
    return {
      start: { date: startDate },
      end: { date: endDate === startDate ? addDays(startDate, 1) : endDate },
    };
  }

  const endDate = end ?? new Date(start.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60_000);
  return {
    start: { dateTime: start.toISOString() },
    end: { dateTime: endDate.toISOString() },
  };
}

export function buildGoogleEventDatePatch(start: Date, end: Date | null, allDay: boolean) {
  return eventDatePatch(start, end, allDay);
}

function taskHasSchedule(task: Pick<GoogleSyncedTask, "due_at" | "due_date">) {
  return Boolean(task.due_at || task.due_date);
}

function taskStart(task: Pick<GoogleSyncedTask, "due_at" | "due_date">) {
  if (task.due_at) return new Date(task.due_at);
  if (task.due_date) return new Date(`${task.due_date}T12:00:00`);
  return null;
}

function isTaskInsideRange(task: Pick<GoogleSyncedTask, "due_at" | "due_date">, range: SyncRange | null) {
  if (!range) return true;
  const start = taskStart(task);
  if (!start) return false;
  return start.getTime() >= range.start.getTime() && start.getTime() < range.end.getTime();
}

function hasChangedAfter(value: string | null, baseline: string | null) {
  if (!value) return false;
  if (!baseline) return true;
  return new Date(value).getTime() > new Date(baseline).getTime() + SYNC_CLOCK_SKEW_MS;
}

function googleEventBodyFromTask(task: GoogleSyncedTask): GoogleCalendarEventPatch {
  const body: GoogleCalendarEventPatch = {
    summary: task.title,
    description: task.description ?? "",
    extendedProperties: {
      private: {
        [GOOGLE_SYNC_SOURCE_KEY]: GOOGLE_SYNC_SOURCE,
        [GOOGLE_SYNC_TASK_ID_KEY]: task.id,
      },
    },
  };

  if (task.due_at) {
    return {
      ...body,
      ...eventDatePatch(new Date(task.due_at), null, false),
    };
  }

  if (task.due_date) {
    return {
      ...body,
      start: { date: task.due_date },
      end: { date: addDays(task.due_date, 1) },
    };
  }

  return body;
}

function taskPatchFromGoogleEvent(event: GoogleCalendarEvent): TaskUpdate {
  const dueAt = event.start?.dateTime ?? null;
  const dueDate = event.start?.date ?? (dueAt ? dateOnly(new Date(dueAt)) : null);
  return {
    title: event.summary?.trim() || "Google Calendar event",
    description: event.description?.trim() || null,
    due_date: dueDate,
    due_at: dueAt,
    google_calendar_id: GOOGLE_CALENDAR_ID,
    google_event_id: event.id,
    google_event_etag: event.etag ?? null,
    google_event_updated_at: event.updated ?? new Date().toISOString(),
    google_event_synced_at: new Date().toISOString(),
  };
}

function googleTaskId(event: GoogleCalendarEvent) {
  return event.extendedProperties?.private?.[GOOGLE_SYNC_TASK_ID_KEY] ?? null;
}

async function fetchGoogleEvents(token: string, range: SyncRange | null) {
  const timeMin = range?.start.toISOString() ?? new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString();
  const timeMax = range?.end.toISOString() ?? new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
  });

  const payload = await googleRequest<GoogleEventsListResponse>(
    `/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?${params}`,
    token,
  );
  return (payload.items ?? []).filter((event) => event.status !== "cancelled");
}

async function fetchGoogleEvent(eventId: string, token: string) {
  try {
    const event = await googleRequest<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      token,
    );
    return event.status === "cancelled" ? null : event;
  } catch (error) {
    if (error instanceof GoogleCalendarNotFoundError) return null;
    throw error;
  }
}

async function insertGoogleEvent(task: GoogleSyncedTask, token: string) {
  return googleRequest<GoogleCalendarEvent>(
    `/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`,
    token,
    {
      method: "POST",
      body: JSON.stringify(googleEventBodyFromTask(task)),
    },
  );
}

async function patchTaskGoogleEvent(task: GoogleSyncedTask, token: string) {
  if (!task.google_event_id) return insertGoogleEvent(task, token);

  return googleRequest<GoogleCalendarEvent>(
    `/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(task.google_event_id)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(googleEventBodyFromTask(task)),
    },
  );
}

export async function patchGoogleCalendarEvent(
  eventId: string,
  patch: GoogleCalendarEventPatch,
) {
  const token = await getGoogleProviderToken();
  return googleRequest<GoogleCalendarEvent>(
    `/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
}

export async function deleteGoogleCalendarEvent(eventId: string) {
  const token = await getGoogleProviderToken();
  try {
    await googleRequest<void>(
      `/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      token,
      { method: "DELETE" },
    );
  } catch (error) {
    if (error instanceof GoogleCalendarNotFoundError) return;
    throw error;
  }
}

async function updateTaskRow(taskId: string, userId: string, updates: TaskUpdate) {
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as GoogleSyncedTask;
}

async function deleteTaskRow(taskId: string, userId: string) {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) throw error;
}

async function saveGoogleMetadata(task: GoogleSyncedTask, event: GoogleCalendarEvent) {
  return updateTaskRow(task.id, task.user_id, {
    google_calendar_id: GOOGLE_CALENDAR_ID,
    google_event_id: event.id,
    google_event_etag: event.etag ?? null,
    google_event_updated_at: event.updated ?? new Date().toISOString(),
    google_event_synced_at: new Date().toISOString(),
  });
}

function replaceTask(tasks: GoogleSyncedTask[], nextTask: GoogleSyncedTask) {
  return tasks.map((task) => (task.id === nextTask.id ? nextTask : task));
}

function removeTask(tasks: GoogleSyncedTask[], taskId: string) {
  return tasks.filter((task) => task.id !== taskId);
}

async function pushTaskToGoogle(task: GoogleSyncedTask, token: string) {
  try {
    const event = await patchTaskGoogleEvent(task, token);
    return saveGoogleMetadata(task, event);
  } catch (error) {
    if (error instanceof GoogleCalendarNotFoundError) {
      const event = await insertGoogleEvent({ ...task, google_event_id: null }, token);
      return saveGoogleMetadata(task, event);
    }
    throw error;
  }
}

async function clearTaskGoogleEvent(task: GoogleSyncedTask, token: string) {
  if (task.google_event_id) {
    try {
      await googleRequest<void>(
        `/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(task.google_event_id)}`,
        token,
        { method: "DELETE" },
      );
    } catch (error) {
      if (!(error instanceof GoogleCalendarNotFoundError)) throw error;
    }
  }

  return updateTaskRow(task.id, task.user_id, {
    google_calendar_id: null,
    google_event_id: null,
    google_event_etag: null,
    google_event_updated_at: null,
    google_event_synced_at: new Date().toISOString(),
  });
}

export async function syncTasksWithGoogleCalendar(
  userId: string,
  range: SyncRange | null,
): Promise<SyncResult> {
  const token = await getGoogleProviderToken();
  const [{ data, error }, googleEvents] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("due_date", { ascending: true, nullsFirst: false }),
    fetchGoogleEvents(token, range),
  ]);

  if (error) throw error;

  let tasks = (data ?? []) as GoogleSyncedTask[];
  const eventsById = new Map(googleEvents.map((event) => [event.id, event]));

  for (const task of [...tasks]) {
    if (!taskHasSchedule(task)) {
      if (task.google_event_id) {
        const updated = await clearTaskGoogleEvent(task, token);
        tasks = replaceTask(tasks, updated);
      }
      continue;
    }

    if (!task.google_event_id) {
      const updated = await pushTaskToGoogle(task, token);
      tasks = replaceTask(tasks, updated);
      continue;
    }

    let googleEvent = eventsById.get(task.google_event_id) ?? null;
    if (!googleEvent && isTaskInsideRange(task, range)) {
      googleEvent = await fetchGoogleEvent(task.google_event_id, token);
    }

    const localChanged = hasChangedAfter(task.updated_at, task.google_event_synced_at);
    if (!googleEvent) {
      if (localChanged) {
        const updated = await pushTaskToGoogle(task, token);
        tasks = replaceTask(tasks, updated);
      } else {
        await deleteTaskRow(task.id, task.user_id);
        tasks = removeTask(tasks, task.id);
      }
      continue;
    }

    const googleChanged = hasChangedAfter(googleEvent.updated ?? null, task.google_event_updated_at);
    const googleUpdatedAt = googleEvent.updated ? new Date(googleEvent.updated).getTime() : 0;
    const localUpdatedAt = new Date(task.updated_at).getTime();

    if (googleChanged && (!localChanged || googleUpdatedAt >= localUpdatedAt)) {
      const updated = await updateTaskRow(task.id, task.user_id, taskPatchFromGoogleEvent(googleEvent));
      tasks = replaceTask(tasks, updated);
      continue;
    }

    if (localChanged) {
      const updated = await pushTaskToGoogle(task, token);
      tasks = replaceTask(tasks, updated);
    }
  }

  const syncedGoogleEventIds = new Set(
    tasks
      .map((task) => task.google_event_id)
      .filter((eventId): eventId is string => Boolean(eventId)),
  );
  const taskIds = new Set(tasks.map((task) => task.id));
  const externalEvents = googleEvents.filter((event) => {
    const taskId = googleTaskId(event);
    return !syncedGoogleEventIds.has(event.id) && !(taskId && taskIds.has(taskId));
  });

  return { tasks, externalEvents };
}

