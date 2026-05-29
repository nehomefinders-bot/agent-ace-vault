import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg, DatesSetArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar - Agent Business Tracker" },
      {
        name: "description",
        content: "Schedule tasks, track deal milestones, and connect Google Calendar in one executive workspace.",
      },
    ],
  }),
  component: CalendarPage,
});

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";
type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DealMilestone {
  id: string;
  address: string;
  client_name: string | null;
  close_date: string | null;
  status: string;
  side: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

type SelectedCalendarItem =
  | { source: "task"; task: Task }
  | { source: "deal"; deal: DealMilestone }
  | { source: "google"; google: GoogleCalendarEvent };

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "dayGridMonth", label: "Month" },
  { value: "timeGridWeek", label: "Week" },
  { value: "timeGridDay", label: "Day" },
];

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function formatMonthYear(date: Date) {
  return MONTH_YEAR_FORMATTER.format(date);
}

function dateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTaskDate(task: Pick<Task, "due_at" | "due_date">) {
  if (task.due_at) return new Date(task.due_at);
  if (!task.due_date) return null;
  return new Date(`${task.due_date}T12:00:00`);
}

function getTaskDateValue(task: Pick<Task, "due_at" | "due_date">) {
  if (task.due_at) return dateOnly(new Date(task.due_at));
  return task.due_date ?? "";
}

function getTaskTimeValue(task: Pick<Task, "due_at">) {
  if (!task.due_at) return "";
  const dueAt = new Date(task.due_at);
  const hours = String(dueAt.getHours()).padStart(2, "0");
  const minutes = String(dueAt.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildDuePayload(dueDate: string, dueTime: string) {
  if (!dueDate) {
    return { due_date: null, due_at: null };
  }

  if (!dueTime) {
    return { due_date: dueDate, due_at: null };
  }

  const dueAt = new Date(`${dueDate}T${dueTime}:00`);
  return {
    due_date: dueDate,
    due_at: dueAt.toISOString(),
  };
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function rangeForGoogle(range: { start: Date; end: Date } | null) {
  if (range) {
    return {
      timeMin: range.start.toISOString(),
      timeMax: range.end.toISOString(),
    };
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}

function taskColors(task: Task) {
  const paletteIndex = hashString(task.id) % 6;
  const paletteClass = `abt-event-palette-${paletteIndex}`;

  if (task.status === "done") {
    return {
      classNames: ["abt-task-event", "abt-task-complete", paletteClass],
    };
  }

  if (task.priority === "high") {
    return {
      classNames: ["abt-task-event", "abt-task-high", paletteClass],
    };
  }

  if (task.priority === "medium") {
    return {
      classNames: ["abt-task-event", "abt-task-medium", paletteClass],
    };
  }

  return {
    classNames: ["abt-task-event", "abt-task-low", paletteClass],
  };
}

function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const calendarRef = useRef<FullCalendar | null>(null);
  const [view, setView] = useState<CalendarView>("dayGridMonth");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dealMilestones, setDealMilestones] = useState<DealMilestone[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [calendarHeading, setCalendarHeading] = useState(formatMonthYear(new Date()));
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedCalendarItem | null>(null);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    description: "",
    status: "todo" as TaskStatus,
    priority: "medium" as TaskPriority,
    due_date: "",
    due_time: "",
  });
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskDraft, setNewTaskDraft] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    due_date: dateOnly(new Date()),
    due_time: "",
  });

  const loadInternalEvents = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setDealMilestones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [tasksResult, dealsResult] = await Promise.all([
      supabase.from("tasks").select("*").order("due_at", { ascending: true, nullsFirst: false }).order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("deals")
        .select("id,address,client_name,close_date,status,side")
        .not("close_date", "is", null)
        .order("close_date", { ascending: true }),
    ]);

    if (tasksResult.error) toast.error(tasksResult.error.message);
    else setTasks((tasksResult.data ?? []) as Task[]);

    if (dealsResult.error) toast.error(dealsResult.error.message);
    else setDealMilestones((dealsResult.data ?? []) as DealMilestone[]);

    setLoading(false);
  }, [user]);

  const loadGoogleEvents = useCallback(async () => {
    setGoogleLoading(true);
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      toast.error(sessionError.message);
      setGoogleLoading(false);
      return;
    }

    const providerToken = session?.provider_token;
    if (!providerToken) {
      setGoogleConnected(false);
      setGoogleLoading(false);
      return;
    }

    const { timeMin, timeMax } = rangeForGoogle(dateRange);
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
        headers: { Authorization: `Bearer ${providerToken}` },
      });

      if (!response.ok) {
        setGoogleConnected(false);
        throw new Error("Google Calendar needs to be reconnected.");
      }

      const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
      setGoogleEvents(payload.items ?? []);
      setGoogleConnected(true);
    } catch (error) {
      setGoogleEvents([]);
      toast.error(error instanceof Error ? error.message : "Could not load Google Calendar events.");
    } finally {
      setGoogleLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (!authLoading) void loadInternalEvents();
  }, [authLoading, loadInternalEvents]);

  useEffect(() => {
    if (!user || authLoading) return;

    const channel = supabase
      .channel(`calendar-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        () => void loadInternalEvents(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals", filter: `user_id=eq.${user.id}` },
        () => void loadInternalEvents(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authLoading, loadInternalEvents, user]);

  useEffect(() => {
    if (!authLoading) void loadGoogleEvents();
  }, [authLoading, loadGoogleEvents]);

  useEffect(() => {
    if (selectedItem?.source !== "task") return;
    setTaskDraft({
      title: selectedItem.task.title,
      description: selectedItem.task.description ?? "",
      status: selectedItem.task.status,
      priority: selectedItem.task.priority,
      due_date: getTaskDateValue(selectedItem.task),
      due_time: getTaskTimeValue(selectedItem.task),
    });
  }, [selectedItem]);

  const calendarEvents = useMemo(() => {
    const taskEvents = tasks
      .filter((task) => Boolean(task.due_at || task.due_date))
      .map((task) => ({
        id: `task:${task.id}`,
        title: task.title,
        start: task.due_at ?? task.due_date,
        allDay: !task.due_at,
        editable: true,
        extendedProps: { source: "task", task },
        ...taskColors(task),
      }));

    const dealEvents = dealMilestones.map((deal) => ({
      id: `deal:${deal.id}`,
      title: `Closing: ${deal.address}`,
      start: deal.close_date,
      allDay: true,
      editable: false,
      classNames: ["abt-deal-event"],
      extendedProps: { source: "deal", deal },
    }));

    const externalEvents = googleEvents
      .map((event) => {
        const start = event.start?.dateTime ?? event.start?.date;
        if (!start) return null;

        return {
          id: `google:${event.id}`,
          title: event.summary || "Google Calendar event",
          start,
          end: event.end?.dateTime ?? event.end?.date,
          allDay: Boolean(event.start?.date),
          editable: false,
          classNames: ["abt-google-event"],
          extendedProps: { source: "google", google: event },
        };
      })
      .filter(Boolean);

    return [...taskEvents, ...dealEvents, ...externalEvents];
  }, [dealMilestones, googleEvents, tasks]);

  const metrics = useMemo(() => {
    const scheduledTasks = tasks.filter((task) => task.due_at || task.due_date).length;
    const overdueTasks = tasks.filter((task) => {
      const dueAt = parseTaskDate(task);
      if (!dueAt || task.status === "done") return false;
      return dueAt.getTime() < Date.now();
    }).length;

    return {
      scheduledTasks,
      overdueTasks,
      dealMilestones: dealMilestones.length,
      googleEvents: googleEvents.length,
    };
  }, [dealMilestones.length, googleEvents.length, tasks]);

  function changeView(nextView: CalendarView) {
    setView(nextView);
    calendarRef.current?.getApi().changeView(nextView);
  }

  async function connectGoogleCalendar() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/calendar",
        scopes: "https://www.googleapis.com/auth/calendar.events",
      },
    });

    if (error) toast.error(error.message);
  }

  async function updateTask(taskId: string, updates: Partial<Task>) {
    const previous = tasks;
    const nextTasks = tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task));
    setTasks(nextTasks);

    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
    if (error) {
      setTasks(previous);
      toast.error(error.message);
      return false;
    }

    return true;
  }

  async function handleEventDrop(info: EventDropArg) {
    const source = info.event.extendedProps.source as string | undefined;
    if (source !== "task") {
      info.revert();
      return;
    }

    const task = info.event.extendedProps.task as Task;
    if (!info.event.start) {
      info.revert();
      return;
    }

    const success = await updateTask(task.id, {
      due_date: dateOnly(info.event.start),
      due_at: info.event.allDay ? null : info.event.start.toISOString(),
    });
    if (!success) info.revert();
    else toast.success("Task rescheduled");
  }

  function handleEventClick(info: EventClickArg) {
    const source = info.event.extendedProps.source as SelectedCalendarItem["source"];
    if (source === "task") {
      setSelectedItem({ source, task: info.event.extendedProps.task as Task });
      return;
    }

    if (source === "deal") {
      setSelectedItem({ source, deal: info.event.extendedProps.deal as DealMilestone });
      return;
    }

    if (source === "google") {
      setSelectedItem({ source, google: info.event.extendedProps.google as GoogleCalendarEvent });
    }
  }

  function handleDateClick(info: DateClickArg) {
    setNewTaskDraft({
      title: "",
      description: "",
      priority: "medium",
      due_date: dateOnly(info.date),
      due_time: info.allDay ? "" : `${String(info.date.getHours()).padStart(2, "0")}:${String(info.date.getMinutes()).padStart(2, "0")}`,
    });
    setNewTaskOpen(true);
  }

  function handleDatesSet(info: DatesSetArg) {
    setDateRange({ start: info.start, end: info.end });
    setCalendarHeading(formatMonthYear(info.view.calendar.getDate()));
  }

  async function saveSelectedTask() {
    if (selectedItem?.source !== "task" || !taskDraft.title.trim()) return;

    setSaving(true);
    const completed_at = taskDraft.status === "done"
      ? selectedItem.task.completed_at ?? new Date().toISOString()
      : null;
    const success = await updateTask(selectedItem.task.id, {
      title: taskDraft.title.trim(),
      description: taskDraft.description.trim() || null,
      status: taskDraft.status,
      priority: taskDraft.priority,
      ...buildDuePayload(taskDraft.due_date, taskDraft.due_time),
      completed_at,
    });

    setSaving(false);
    if (!success) return;
    toast.success("Task updated");
    setSelectedItem(null);
    void loadInternalEvents();
  }

  async function deleteSelectedTask() {
    if (selectedItem?.source !== "task") return;

    const taskId = selectedItem.task.id;
    const previous = tasks;
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setSelectedItem(null);

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      setTasks(previous);
      toast.error(error.message);
      return;
    }

    toast.success("Task deleted");
  }

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !newTaskDraft.title.trim()) return;

    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: newTaskDraft.title.trim(),
      description: newTaskDraft.description.trim() || null,
      priority: newTaskDraft.priority,
      ...buildDuePayload(newTaskDraft.due_date, newTaskDraft.due_time),
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Task scheduled");
    setNewTaskOpen(false);
    void loadInternalEvents();
  }

  const selectedTitle = selectedItem?.source === "task"
    ? "Task details"
    : selectedItem?.source === "deal"
      ? "Deal milestone"
      : "Google Calendar event";

  return (
    <PageShell
      title="Calendar"
      subtitle="Your tasks, deal milestones, and Google Calendar appointments in one command center."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadGoogleEvents()}
            disabled={googleLoading}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Google
          </Button>
          <Button
            type="button"
            onClick={googleConnected ? () => void loadGoogleEvents() : connectGoogleCalendar}
            className="bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            <Cloud className="mr-2 h-4 w-4" />
            {googleConnected ? "Google connected" : "Connect Google Calendar"}
          </Button>
        </>
      }
    >
      <div className="calendar-shell -mx-4 bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <style>{`
          .calendar-shell .fc {
            --fc-border-color: rgba(148, 163, 184, 0.2);
            --fc-page-bg-color: transparent;
            --fc-neutral-bg-color: rgba(255, 255, 255, 0.96);
            --fc-list-event-hover-bg-color: rgba(241, 245, 249, 0.9);
            color: rgb(15 23 42);
            font-family: inherit;
          }

          .calendar-shell .fc .fc-scrollgrid {
            overflow: hidden;
            border-radius: 1.25rem;
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
          }

          .dark .calendar-shell .fc {
            --fc-border-color: rgba(148, 163, 184, 0.18);
            --fc-neutral-bg-color: rgba(15, 23, 42, 0.82);
            --fc-list-event-hover-bg-color: rgba(30, 41, 59, 0.8);
            color: rgb(226 232 240);
          }

          .dark .calendar-shell .fc .fc-scrollgrid {
            background: rgba(15, 23, 42, 0.78);
            box-shadow: 0 30px 90px rgba(2, 6, 23, 0.36);
          }

          .calendar-shell .fc-theme-standard td,
          .calendar-shell .fc-theme-standard th {
            border-color: rgba(148, 163, 184, 0.18);
          }

          .dark .calendar-shell .fc-theme-standard td,
          .dark .calendar-shell .fc-theme-standard th {
            border-color: rgba(148, 163, 184, 0.16);
          }

          .calendar-shell .fc-col-header-cell,
          .calendar-shell .fc-timegrid-axis {
            background: rgba(248, 250, 252, 0.98);
          }

          .dark .calendar-shell .fc-col-header-cell,
          .dark .calendar-shell .fc-timegrid-axis {
            background: rgba(24, 24, 27, 0.88);
          }

          .calendar-shell .fc-col-header-cell-cushion {
            padding: 0.8rem 0.35rem;
            color: rgba(51, 65, 85, 0.82);
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .dark .calendar-shell .fc-col-header-cell-cushion {
            color: rgba(226, 232, 240, 0.78);
          }

          .calendar-shell .fc-daygrid-day,
          .calendar-shell .fc-timegrid-col {
            background: rgba(255, 255, 255, 0.88);
          }

          .dark .calendar-shell .fc-daygrid-day,
          .dark .calendar-shell .fc-timegrid-col {
            background: rgba(2, 6, 23, 0.42);
          }

          .calendar-shell .fc-daygrid-day.fc-day-today,
          .calendar-shell .fc-timegrid-col.fc-day-today {
            background: linear-gradient(145deg, rgba(245, 158, 11, 0.18), rgba(255, 251, 235, 0.92));
          }

          .dark .calendar-shell .fc-daygrid-day.fc-day-today,
          .dark .calendar-shell .fc-timegrid-col.fc-day-today {
            background: linear-gradient(145deg, rgba(245, 158, 11, 0.16), rgba(15, 23, 42, 0.52));
          }

          .calendar-shell .fc-daygrid-day-number {
            padding: 0.65rem;
            color: rgb(15, 23, 42);
            font-weight: 700;
          }

          .calendar-shell .fc-day-other .fc-daygrid-day-number {
            color: rgba(148, 163, 184, 0.78);
          }

          .dark .calendar-shell .fc-daygrid-day-number {
            color: rgb(226, 232, 240);
          }

          .dark .calendar-shell .fc-day-other .fc-daygrid-day-number {
            color: rgba(148, 163, 184, 0.46);
          }

          .calendar-shell .fc-event {
            border-radius: 0.65rem;
            border-width: 1px;
            padding: 0.12rem 0.32rem;
            font-size: 0.76rem;
            font-weight: 700;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
          }

          .calendar-shell .fc-event-main,
          .calendar-shell .fc-event-title,
          .calendar-shell .fc-event-time {
            color: inherit !important;
          }

          .dark .calendar-shell .fc-event {
            box-shadow: 0 12px 30px rgba(2, 6, 23, 0.24);
          }

          .calendar-shell .fc-event.abt-google-event {
            border-left-width: 4px;
          }

          .calendar-shell .fc-event.abt-deal-event {
            border-left-width: 4px;
          }

          .calendar-shell .fc-timegrid-slot-label,
          .calendar-shell .fc-timegrid-axis-cushion {
            color: rgba(71, 85, 105, 0.72);
            font-size: 0.75rem;
          }

          .dark .calendar-shell .fc-timegrid-slot-label,
          .dark .calendar-shell .fc-timegrid-axis-cushion {
            color: rgba(203, 213, 225, 0.58);
          }

          .calendar-shell .fc-daygrid-more-link {
            color: rgb(180, 83, 9);
            font-weight: 700;
          }

          .dark .calendar-shell .fc-daygrid-more-link {
            color: rgb(251, 191, 36);
          }

          .calendar-shell .fc-event.abt-deal-event {
            background: rgba(204, 251, 241, 0.95);
            border-color: rgba(13, 148, 136, 0.72);
            color: rgb(17, 94, 89) !important;
          }

          .dark .calendar-shell .fc-event.abt-deal-event {
            background: rgba(15, 118, 110, 0.16);
            border-color: rgba(45, 212, 191, 0.58);
            color: #ccfbf1;
          }

          .calendar-shell .fc-event.abt-google-event {
            background: rgba(224, 231, 255, 0.92);
            border-color: rgba(79, 70, 229, 0.56);
            color: rgb(49, 46, 129) !important;
          }

          .dark .calendar-shell .fc-event.abt-google-event {
            background: rgba(79, 70, 229, 0.18);
            border-color: rgba(129, 140, 248, 0.78);
            color: #e0e7ff;
          }

          .calendar-shell .fc-event.abt-task-event.abt-event-palette-0 {
            background: rgba(254, 243, 199, 0.98);
            border-color: rgba(217, 119, 6, 0.6);
            color: rgb(120, 53, 15) !important;
          }

          .calendar-shell .fc-event.abt-task-event.abt-event-palette-1 {
            background: rgba(219, 234, 254, 0.96);
            border-color: rgba(37, 99, 235, 0.55);
            color: rgb(30, 64, 175) !important;
          }

          .calendar-shell .fc-event.abt-task-event.abt-event-palette-2 {
            background: rgba(209, 250, 229, 0.96);
            border-color: rgba(5, 150, 105, 0.55);
            color: rgb(6, 95, 70) !important;
          }

          .calendar-shell .fc-event.abt-task-event.abt-event-palette-3 {
            background: rgba(252, 231, 243, 0.96);
            border-color: rgba(219, 39, 119, 0.5);
            color: rgb(157, 23, 77) !important;
          }

          .calendar-shell .fc-event.abt-task-event.abt-event-palette-4 {
            background: rgba(243, 232, 255, 0.96);
            border-color: rgba(147, 51, 234, 0.52);
            color: rgb(107, 33, 168) !important;
          }

          .calendar-shell .fc-event.abt-task-event.abt-event-palette-5 {
            background: rgba(255, 237, 213, 0.96);
            border-color: rgba(234, 88, 12, 0.52);
            color: rgb(154, 52, 18) !important;
          }

          .dark .calendar-shell .fc-event.abt-task-event.abt-event-palette-0 {
            background: rgba(251, 191, 36, 0.22);
            border-color: rgba(252, 211, 77, 0.65);
            color: rgb(255, 247, 237);
          }

          .dark .calendar-shell .fc-event.abt-task-event.abt-event-palette-1 {
            background: rgba(59, 130, 246, 0.2);
            border-color: rgba(96, 165, 250, 0.6);
            color: rgb(239, 246, 255);
          }

          .dark .calendar-shell .fc-event.abt-task-event.abt-event-palette-2 {
            background: rgba(16, 185, 129, 0.2);
            border-color: rgba(52, 211, 153, 0.58);
            color: rgb(236, 253, 245);
          }

          .dark .calendar-shell .fc-event.abt-task-event.abt-event-palette-3 {
            background: rgba(236, 72, 153, 0.18);
            border-color: rgba(244, 114, 182, 0.56);
            color: rgb(253, 242, 248);
          }

          .dark .calendar-shell .fc-event.abt-task-event.abt-event-palette-4 {
            background: rgba(168, 85, 247, 0.2);
            border-color: rgba(192, 132, 252, 0.56);
            color: rgb(250, 245, 255);
          }

          .dark .calendar-shell .fc-event.abt-task-event.abt-event-palette-5 {
            background: rgba(249, 115, 22, 0.2);
            border-color: rgba(251, 146, 60, 0.56);
            color: rgb(255, 247, 237);
          }

          .calendar-shell .fc-event.abt-task-complete {
            opacity: 0.78;
            text-decoration: line-through;
          }

          .calendar-shell .fc-event.abt-task-high {
            border-left: 4px solid rgba(220, 38, 38, 0.62);
          }

          .calendar-shell .fc-event.abt-task-medium {
            border-left: 4px solid rgba(245, 158, 11, 0.62);
          }

          .calendar-shell .fc-event.abt-task-low {
            border-left: 4px solid rgba(100, 116, 139, 0.48);
          }

          @media (max-width: 640px) {
            .calendar-shell .fc .fc-daygrid-day-number {
              padding: 0.45rem;
              font-size: 0.78rem;
            }

            .calendar-shell .fc-event {
              font-size: 0.68rem;
              padding: 0.08rem 0.24rem;
            }
          }
        `}</style>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Scheduled tasks", metrics.scheduledTasks],
            ["Overdue focus", metrics.overdueTasks],
            ["Deal milestones", metrics.dealMilestones],
            ["Google events", metrics.googleEvents],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900/72 dark:shadow-black/20 dark:shadow-2xl">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
              <div className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{value}</div>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900/78 dark:shadow-black/25 dark:shadow-2xl sm:p-5">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => calendarRef.current?.getApi().today()}
                className="border-amber-500/40 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20"
              >
                Today
              </Button>
              <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950/70">
                <button
                  type="button"
                  onClick={() => calendarRef.current?.getApi().prev()}
                  className="inline-flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Previous date range"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => calendarRef.current?.getApi().next()}
                  className="inline-flex h-10 w-10 items-center justify-center border-l border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Next date range"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h2 className="px-2 text-lg font-bold tracking-wide text-slate-900 dark:text-slate-100">{calendarHeading}</h2>
              <Button
                type="button"
                onClick={() => setNewTaskOpen(true)}
                className="bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                <Plus className="mr-2 h-4 w-4" />
                New task
              </Button>
            </div>

            <div className="flex rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950/70">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changeView(option.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    view === option.value
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/30"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading || authLoading ? (
            <div className="flex min-h-[560px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950/50">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500 dark:text-amber-300" />
                Loading calendar workspace...
              </div>
            </div>
          ) : !user ? (
            <div className="flex min-h-[560px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-950/50">
              <div>
                <CalendarDays className="mx-auto mb-3 h-10 w-10 text-amber-500 dark:text-amber-300" />
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">Sign in to use your calendar</h2>
                <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Your task due dates and Google appointments stay private to your account.
                </p>
              </div>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={view}
              headerToolbar={false}
              events={calendarEvents}
              height="auto"
              contentHeight="auto"
              dayMaxEvents={3}
              nowIndicator
              editable
              selectable
              selectMirror
              eventDrop={handleEventDrop}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              datesSet={handleDatesSet}
              eventDurationEditable={false}
              allDayMaintainDuration={false}
              eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
              slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
            />
          )}
        </section>
      </div>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTitle}</DialogTitle>
          </DialogHeader>

          {selectedItem?.source === "task" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="calendar-task-title">Title</Label>
                <Input
                  id="calendar-task-title"
                  value={taskDraft.title}
                  onChange={(event) => setTaskDraft((draft) => ({ ...draft, title: event.target.value }))}
                  className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="calendar-task-description">Description</Label>
                <Textarea
                  id="calendar-task-description"
                  value={taskDraft.description}
                  onChange={(event) => setTaskDraft((draft) => ({ ...draft, description: event.target.value }))}
                  rows={4}
                  className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={taskDraft.status}
                    onValueChange={(value) => setTaskDraft((draft) => ({ ...draft, status: value as TaskStatus }))}
                  >
                    <SelectTrigger className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={taskDraft.priority}
                    onValueChange={(value) => setTaskDraft((draft) => ({ ...draft, priority: value as TaskPriority }))}
                  >
                    <SelectTrigger className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="calendar-task-date">Due date</Label>
                  <Input
                    id="calendar-task-date"
                    type="date"
                    value={taskDraft.due_date}
                    onChange={(event) => setTaskDraft((draft) => ({ ...draft, due_date: event.target.value }))}
                    className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="calendar-task-time">Due time</Label>
                  <Input
                    id="calendar-task-time"
                    type="time"
                    value={taskDraft.due_time}
                    onChange={(event) => setTaskDraft((draft) => ({ ...draft, due_time: event.target.value }))}
                    className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTaskDraft((draft) => ({
                    ...draft,
                    status: draft.status === "done" ? "todo" : "done",
                  }));
                }}
                className="border-amber-500/40 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {taskDraft.status === "done" ? "Reopen task" : "Mark complete"}
              </Button>
            </div>
          )}

          {selectedItem?.source === "deal" && (
            <div className="rounded-2xl border border-teal-300/40 bg-teal-50 p-4 dark:border-teal-300/20 dark:bg-teal-500/10">
              <div className="text-xs uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200/80">Deal closing milestone</div>
              <h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{selectedItem.deal.address}</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                <div>
                  <span className="text-slate-500 dark:text-slate-500">Client:</span> {selectedItem.deal.client_name || "Not assigned"}
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-500">Side:</span> {selectedItem.deal.side}
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-500">Status:</span> {selectedItem.deal.status}
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-500">Close date:</span> {selectedItem.deal.close_date}
                </div>
              </div>
            </div>
          )}

          {selectedItem?.source === "google" && (
            <div className="rounded-2xl border border-indigo-300/40 bg-indigo-50 p-4 dark:border-indigo-300/20 dark:bg-indigo-500/10">
              <div className="text-xs uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-200/80">External Google event</div>
              <h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                {selectedItem.google.summary || "Google Calendar event"}
              </h3>
              {selectedItem.google.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{selectedItem.google.description}</p>
              )}
              {selectedItem.google.location && (
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-500">Location:</span> {selectedItem.google.location}
                </p>
              )}
              {selectedItem.google.htmlLink && (
                <a
                  href={selectedItem.google.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-200 dark:hover:text-white"
                >
                  Open in Google Calendar
                </a>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {selectedItem?.source === "task" ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void deleteSelectedTask()}
                  className="mr-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelectedItem(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void saveSelectedTask()}
                  disabled={saving || !taskDraft.title.trim()}
                  className="bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Save changes
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => setSelectedItem(null)} className="bg-amber-500 text-slate-950 hover:bg-amber-400">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Schedule a task</DialogTitle>
          </DialogHeader>
          <form onSubmit={createTask} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-calendar-task-title">Title</Label>
              <Input
                id="new-calendar-task-title"
                value={newTaskDraft.title}
                onChange={(event) => setNewTaskDraft((draft) => ({ ...draft, title: event.target.value }))}
                placeholder="Call buyer about inspection timeline"
                required
                className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-calendar-task-description">Description</Label>
              <Textarea
                id="new-calendar-task-description"
                value={newTaskDraft.description}
                onChange={(event) => setNewTaskDraft((draft) => ({ ...draft, description: event.target.value }))}
                rows={3}
                className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={newTaskDraft.priority}
                  onValueChange={(value) => setNewTaskDraft((draft) => ({ ...draft, priority: value as TaskPriority }))}
                >
                  <SelectTrigger className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-calendar-task-date">Due date</Label>
                <Input
                  id="new-calendar-task-date"
                  type="date"
                  value={newTaskDraft.due_date}
                  onChange={(event) => setNewTaskDraft((draft) => ({ ...draft, due_date: event.target.value }))}
                  className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-calendar-task-time">Due time</Label>
                <Input
                  id="new-calendar-task-time"
                  type="time"
                  value={newTaskDraft.due_time}
                  onChange={(event) => setNewTaskDraft((draft) => ({ ...draft, due_time: event.target.value }))}
                  className="border-slate-300 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewTaskOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !newTaskDraft.title.trim()}
                className="bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
