import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock, Plus, Trash2, ListTodo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell, StatusPill } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Agent Business Tracker" },
      { name: "description", content: "Log and track your tasks. Update status, priority and due dates in one place." },
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

function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | Status>("all");

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTasks((data ?? []) as Task[]);
    setLoading(false);
  }

  useEffect(() => { if (!authLoading) load(); /* eslint-disable-next-line */ }, [user, authLoading]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Task added");
    setTitle(""); setDescription(""); setPriority("medium"); setDueDate("");
    setOpen(false);
    load();
  }

  async function setStatus(t: Task, status: Status) {
    const completed_at = status === "done" ? new Date().toISOString() : null;
    const prev = tasks;
    setTasks((cur) => cur.map((x) => x.id === t.id ? { ...x, status, completed_at } : x));
    const { error } = await supabase
      .from("tasks")
      .update({ status, completed_at })
      .eq("id", t.id);
    if (error) { setTasks(prev); toast.error(error.message); }
  }

  async function remove(t: Task) {
    const prev = tasks;
    setTasks((cur) => cur.filter((x) => x.id !== t.id));
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) { setTasks(prev); toast.error(error.message); return; }
    toast.success("Task deleted");
  }

  const counts = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  }), [tasks]);

  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <PageShell
      title="Tasks"
      subtitle="Plan, track and complete your work."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> New task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
            <form onSubmit={createTask} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder="Follow up with Smith offer" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional notes" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due">Due date</Label>
                  <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !title.trim()}>{saving ? "Saving…" : "Add task"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {([
          ["all", "All"],
          ["todo", "To do"],
          ["in_progress", "In progress"],
          ["done", "Done"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {label} <span className="opacity-70 ml-1">{counts[key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : !user ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Sign in to manage tasks.</div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed rounded-xl py-16 text-center">
          <ListTodo className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <div className="font-medium">No tasks here</div>
          <div className="text-sm text-muted-foreground mt-1">
            {filter === "all" ? "Add your first task to get started." : "Try another filter or add a new task."}
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => {
            const overdue = t.due_date && t.status !== "done" && new Date(t.due_date) < new Date(new Date().toDateString());
            return (
              <li
                key={t.id}
                className="group flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow"
              >
                <button
                  onClick={() => setStatus(t, t.status === "done" ? "todo" : "done")}
                  className="mt-0.5 text-muted-foreground hover:text-primary"
                  aria-label="Toggle complete"
                >
                  {t.status === "done"
                    ? <CheckCircle2 className="h-5 w-5 text-success" />
                    : t.status === "in_progress"
                    ? <Clock className="h-5 w-5 text-primary" />
                    : <Circle className="h-5 w-5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </span>
                    <StatusPill tone={PRIORITY_TONE[t.priority]}>{t.priority}</StatusPill>
                    {t.due_date && (
                      <span className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        Due {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select value={t.status} onValueChange={(v) => setStatus(t, v as Status)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue>{STATUS_LABEL[t.status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To do</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => remove(t)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
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
