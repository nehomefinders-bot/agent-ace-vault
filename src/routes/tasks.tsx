import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock, ListTodo, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell, StatusPill } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks - Agent Business Tracker" },
      { name: "description", content: "Log and track your tasks. Update status, priority, dates, and times in one place." },
    ],
  }),
  component: TasksPage,
});

type Status = "todo" | "in_progress" | "done";
type Priority = "low" | "medium" | "high";

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const PRIORITY_TONE: Record<Priority, "muted" | "primary" | "danger"> = {
  low: "muted",
  medium: "primary",
  high: "danger",
};

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

function formatTaskDue(task: Pick<Task, "due_at" | "due_date">) {
  const dueAt = parseTaskDate(task);
  if (!dueAt) return null;

  if (task.due_at) {
    return dueAt.toLocaleString([], {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return dueAt.toLocaleDateString();
}

function compareTasks(a: Task, b: Task) {
  const aDate = parseTaskDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bDate = parseTaskDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (aDate !== bDate) return aDate - bDate;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | Status>("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setTasks(((data ?? []) as Task[]).sort(compareTasks));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, user]);

  useEffect(() => {
    if (!user || authLoading) return;

    const channel = supabase
      .channel(`tasks-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authLoading, user]);

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !title.trim()) return;

    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      ...buildDuePayload(dueDate, dueTime),
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Task added");
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setDueTime("");
    setOpen(false);
    void load();
  }

  async function setStatus(task: Task, status: Status) {
    const completed_at = status === "done" ? new Date().toISOString() : null;
    const previous = tasks;
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status, completed_at } : item)));

    const { error } = await supabase.from("tasks").update({ status, completed_at }).eq("id", task.id);
    if (error) {
      setTasks(previous);
      toast.error(error.message);
    }
  }

  async function remove(task: Task) {
    const previous = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      setTasks(previous);
      toast.error(error.message);
      return;
    }

    toast.success("Task deleted");
  }

  const counts = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter((task) => task.status === "todo").length,
    in_progress: tasks.filter((task) => task.status === "in_progress").length,
    done: tasks.filter((task) => task.status === "done").length,
  }), [tasks]);

  const visible = useMemo(() => {
    const filtered = filter === "all" ? tasks : tasks.filter((task) => task.status === filter);
    return [...filtered].sort(compareTasks);
  }, [filter, tasks]);

  return (
    <PageShell
      title="Tasks"
      subtitle="Plan, track and complete your work."
      actions={(
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              New task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New task</DialogTitle>
            </DialogHeader>
            <form onSubmit={createTask} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  autoFocus
                  placeholder="Follow up with Smith offer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Optional notes"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due">Due date</Label>
                  <Input id="due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due-time">Due time</Label>
                  <Input id="due-time" type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !title.trim()}>
                  {saving ? "Saving..." : "Add task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {([
          ["all", "All"],
          ["todo", "To do"],
          ["in_progress", "In progress"],
          ["done", "Done"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
            <span className="ml-1 opacity-70">{counts[key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
      ) : !user ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Sign in to manage tasks.</div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <ListTodo className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <div className="font-medium">No tasks here</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {filter === "all" ? "Add your first task to get started." : "Try another filter or add a new task."}
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => {
            const dueAt = parseTaskDate(task);
            const overdue = Boolean(dueAt && task.status !== "done" && dueAt.getTime() < Date.now());
            const dueLabel = formatTaskDue(task);

            return (
              <li
                key={task.id}
                className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => setStatus(task, task.status === "done" ? "todo" : "done")}
                  className="mt-0.5 text-muted-foreground hover:text-primary"
                  aria-label="Toggle complete"
                >
                  {task.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : task.status === "in_progress" ? (
                    <Clock className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </span>
                    <StatusPill tone={PRIORITY_TONE[task.priority]}>{task.priority}</StatusPill>
                    {dueLabel && (
                      <span className={`text-xs ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                        Due {dueLabel}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
                  )}
                  {task.due_date && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <span>Date: {getTaskDateValue(task)}</span>
                      {getTaskTimeValue(task) && <span>Time: {getTaskTimeValue(task)}</span>}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Select value={task.status} onValueChange={(value) => setStatus(task, value as Status)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue>{STATUS_LABEL[task.status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To do</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => remove(task)}
                    className="p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
