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

function dateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  if (task.status === "done") {
    return {
      backgroundColor: "rgba(34, 197, 94, 0.16)",
      borderColor: "rgba(74, 222, 128, 0.65)",
      textColor: "#dcfce7",
    };
  }

  if (task.priority === "high") {
    return {
      backgroundColor: "rgba(245, 158, 11, 0.24)",
      borderColor: "rgba(251, 191, 36, 0.78)",
      textColor: "#fef3c7",
    };
  }

  if (task.priority === "medium") {
    return {
      backgroundColor: "rgba(212, 175, 55, 0.2)",
      borderColor: "rgba(212, 175, 55, 0.72)",
      textColor: "#fff7d6",
    };
  }

  return {
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    borderColor: "rgba(203, 213, 225, 0.36)",
    textColor: "#e2e8f0",
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
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedCalendarItem | null>(null);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    description: "",
    status: "todo" as TaskStatus,
    priority: "medium" as TaskPriority,
    due_date: "",
  });
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskDraft, setNewTaskDraft] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    due_date: dateOnly(new Date()),
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
      supabase.from("tasks").select("*").order("due_date", { ascending: true }),
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
      due_date: selectedItem.task.due_date ?? "",
    });
  }, [selectedItem]);

  const calendarEvents = useMemo(() => {
    const taskEvents = tasks
      .filter((task) => Boolean(task.due_date))
      .map((task) => ({
        id: `task:${task.id}`,
        title: task.title,
        start: task.due_date,
        allDay: true,
        editable: true,
        classNames: ["abt-task-event"],
        extendedProps: { source: "task", task },
        ...taskColors(task),
      }));

    const dealEvents = dealMilestones.map((deal) => ({
      id: `deal:${deal.id}`,
      title: `Closing: ${deal.address}`,
      start: deal.close_date,
      allDay: true,
      editable: false,
      backgroundColor: "rgba(15, 118, 110, 0.16)",
      borderColor: "rgba(45, 212, 191, 0.58)",
      textColor: "#ccfbf1",
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
          backgroundColor: "rgba(79, 70, 229, 0.18)",
          borderColor: "rgba(129, 140, 248, 0.78)",
          textColor: "#e0e7ff",
          classNames: ["abt-google-event"],
          extendedProps: { source: "google", google: event },
        };
      })
      .filter(Boolean);

    return [...taskEvents, ...dealEvents, ...externalEvents];
  }, [dealMilestones, googleEvents, tasks]);

  const metrics = useMemo(() => {
    const scheduledTasks = tasks.filter((task) => task.due_date).length;
    const overdueTasks = tasks.filter((task) => {
      if (!task.due_date || task.status === "done") return false;
      return task.due_date < dateOnly(new Date());
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
    const redirectTo = `${window.location.origin}/calendar`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: "https://www.googleapis.com/auth/calendar.events",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
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

    const success = await updateTask(task.id, { due_date: dateOnly(info.event.start) });
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
      due_date: info.dateStr,
    });
    setNewTaskOpen(true);
  }

  function handleDatesSet(info: DatesSetArg) {
    setDateRange({ start: info.start, end: info.end });
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
      due_date: taskDraft.due_date || null,
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
      due_date: newTaskDraft.due_date || null,
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
            className="border-slate-700 bg-slate-950/60 text-slate-100 hover:bg-slate-800"
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
      <div className="calendar-shell -mx-4 bg-slate-950 px-4 py-6 text-slate-100 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <style>{`
          .calendar-shell .fc {
            --fc-border-color: rgba(148, 163, 184, 0.18);
            --fc-page-bg-color: transparent;
            --fc-neutral-bg-color: rgba(15, 23, 42, 0.82);
            --fc-list-event-hover-bg-color: rgba(30, 41, 59, 0.8);
            color: rgb(226 232 240);
            font-family: inherit;
          }

          .calendar-shell .fc .fc-scrollgrid {
            overflow: hidden;
            border-radius: 1.25rem;
            background: rgba(15, 23, 42, 0.78);
            box-shadow: 0 30px 90px rgba(2, 6, 23, 0.36);
          }

          .calendar-shell .fc-theme-standard td,
          .calendar-shell .fc-theme-standard th {
            border-color: rgba(148, 163, 184, 0.16);
          }

          .calendar-shell .fc-col-header-cell,
          .calendar-shell .fc-timegrid-axis {
            background: rgba(24, 24, 27, 0.88);
          }

          .calendar-shell .fc-col-header-cell-cushion {
            padding: 0.8rem 0.35rem;
            color: rgba(226, 232, 240, 0.78);
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .calendar-shell .fc-daygrid-day,
          .calendar-shell .fc-timegrid-col {
            background: rgba(2, 6, 23, 0.42);
          }

          .calendar-shell .fc-daygrid-day.fc-day-today,
          .calendar-shell .fc-timegrid-col.fc-day-today {
            background: linear-gradient(145deg, rgba(245, 158, 11, 0.16), rgba(15, 23, 42, 0.52));
          }

          .calendar-shell .fc-daygrid-day-number {
            padding: 0.65rem;
            color: rgb(226, 232, 240);
            font-weight: 700;
          }

          .calendar-shell .fc-day-other .fc-daygrid-day-number {
            color: rgba(148, 163, 184, 0.46);
          }

          .calendar-shell .fc-event {
            border-radius: 0.65rem;
            border-width: 1px;
            padding: 0.12rem 0.32rem;
            font-size: 0.76rem;
            font-weight: 700;
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
            color: rgba(203, 213, 225, 0.58);
            font-size: 0.75rem;
          }

          .calendar-shell .fc-daygrid-more-link {
            color: rgb(251, 191, 36);
            font-weight: 700;
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
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/72 p-4 shadow-2xl shadow-black/20">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
              <div className="mt-2 text-2xl font-bold text-white">{value}</div>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/78 p-3 shadow-2xl shadow-black/25 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => calendarRef.current?.getApi().today()}
                className="border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
              >
                Today
              </Button>
              <div className="flex overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
                <button
                  type="button"
                  onClick={() => calendarRef.current?.getApi().prev()}
                  className="inline-flex h-10 w-10 items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="Previous date range"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => calendarRef.current?.getApi().next()}
                  className="inline-flex h-10 w-10 items-center justify-center border-l border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="Next date range"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <Button
                type="button"
                onClick={() => setNewTaskOpen(true)}
                className="bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                <Plus className="mr-2 h-4 w-4" />
                New task
              </Button>
            </div>

            <div className="flex rounded-xl border border-slate-700 bg-slate-950/70 p-1">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changeView(option.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    view === option.value
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading || authLoading ? (
            <div className="flex min-h-[560px] items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50">
              <div className="flex items-center gap-3 text-slate-300">
                <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
                Loading calendar workspace...
              </div>
            </div>
          ) : !user ? (
            <div className="flex min-h-[560px] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 text-center">
              <div>
                <CalendarDays className="mx-auto mb-3 h-10 w-10 text-amber-300" />
                <h2 className="text-xl font-bold text-white">Sign in to use your calendar</h2>
                <p className="mt-2 max-w-md text-sm text-slate-400">
                  Your task due dates and Google appointments stay private to your account.
                </p>
              </div>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              events={calendarEvents}
              height="auto"
              contentHeight="auto"
              dayMaxEvents={3}
              nowIndicator
              editable
              selectable
              eventDrop={handleEventDrop}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              datesSet={handleDatesSet}
              eventDurationEditable={false}
            />
          )}
        </section>
      </div>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-700 bg-slate-950 text-slate-100 sm:max-w-2xl">
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
                  className="border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="calendar-task-description">Description</Label>
                <Textarea
                  id="calendar-task-description"
                  value={taskDraft.description}
                  onChange={(event) => setTaskDraft((draft) => ({ ...draft, description: event.target.value }))}
                  rows={4}
                  className="border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={taskDraft.status}
                    onValueChange={(value) => setTaskDraft((draft) => ({ ...draft, status: value as TaskStatus }))}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100">
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
                    <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100">
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
                    className="border-slate-700 bg-slate-900 text-slate-100"
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
                className="border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {taskDraft.status === "done" ? "Reopen task" : "Mark complete"}
              </Button>
            </div>
          )}

          {selectedItem?.source === "deal" && (
            <div className="rounded-2xl border border-teal-300/20 bg-teal-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-teal-200/80">Deal closing milestone</div>
              <h3 className="mt-2 text-xl font-bold text-white">{selectedItem.deal.address}</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Client:</span> {selectedItem.deal.client_name || "Not assigned"}
                </div>
                <div>
                  <span className="text-slate-500">Side:</span> {selectedItem.deal.side}
                </div>
                <div>
                  <span className="text-slate-500">Status:</span> {selectedItem.deal.status}
                </div>
                <div>
                  <span className="text-slate-500">Close date:</span> {selectedItem.deal.close_date}
                </div>
              </div>
            </div>
          )}

          {selectedItem?.source === "google" && (
            <div className="rounded-2xl border border-indigo-300/20 bg-indigo-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-indigo-200/80">External Google event</div>
              <h3 className="mt-2 text-xl font-bold text-white">
                {selectedItem.google.summary || "Google Calendar event"}
              </h3>
              {selectedItem.google.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{selectedItem.google.description}</p>
              )}
              {selectedItem.google.location && (
                <p className="mt-3 text-sm text-slate-300">
                  <span className="text-slate-500">Location:</span> {selectedItem.google.location}
                </p>
              )}
              {selectedItem.google.htmlLink && (
                <a
                  href={selectedItem.google.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-semibold text-indigo-200 hover:text-white"
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
        <DialogContent className="border-slate-700 bg-slate-950 text-slate-100 sm:max-w-xl">
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
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-calendar-task-description">Description</Label>
              <Textarea
                id="new-calendar-task-description"
                value={newTaskDraft.description}
                onChange={(event) => setNewTaskDraft((draft) => ({ ...draft, description: event.target.value }))}
                rows={3}
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={newTaskDraft.priority}
                  onValueChange={(value) => setNewTaskDraft((draft) => ({ ...draft, priority: value as TaskPriority }))}
                >
                  <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-100">
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
                  className="border-slate-700 bg-slate-900 text-slate-100"
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
