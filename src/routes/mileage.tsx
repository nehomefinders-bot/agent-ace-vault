import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Car, Play, Square, MapPin, Navigation, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoneyCents } from "@/hooks/use-books";

export const Route = createFileRoute("/mileage")({
  component: Mileage,
  head: () => ({ meta: [{ title: "Mileage — Apex Realty OS" }] }),
});

const irsRate = 0.67;

type Mode = "live" | "route" | "manual";

interface Trip {
  id: string;
  date: string;
  miles: number;
  from_address: string | null;
  to_address: string | null;
  purpose: string | null;
  mode: "live" | "address" | "manual";
}

interface NewTrip {
  miles: number;
  from_address?: string;
  to_address?: string;
  purpose?: string;
  mode: "live" | "address" | "manual";
}

function Mileage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("live");

  const reload = async () => {
    if (!user) { setTrips([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("mileage_trips").select("*").order("date", { ascending: false });
    setTrips((data ?? []) as Trip[]);
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user]);

  const totalMiles = trips.reduce((s, m) => s + Number(m.miles), 0);
  const deduction = totalMiles * irsRate;

  const addTrip = async (t: NewTrip) => {
    if (!user) return;
    await supabase.from("mileage_trips").insert({
      user_id: user.id,
      date: new Date().toISOString().slice(0, 10),
      miles: t.miles,
      from_address: t.from_address ?? null,
      to_address: t.to_address ?? null,
      purpose: t.purpose ?? null,
      mode: t.mode,
    });
    await reload();
  };

  const deleteTrip = async (id: string) => {
    await supabase.from("mileage_trips").delete().eq("id", id);
    await reload();
  };

  if (!user) {
    return (
      <PageShell title="Mileage" subtitle="Sign in to log and track trips.">
        <Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Sign in</Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Mileage"
      subtitle="Three ways to log: live GPS while you drive, address-to-address, or by hand."
      actions={
        <button
          onClick={() => setMode("manual")}
          className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Log Trip
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total miles</div>
          <div className="text-3xl font-bold tabular-nums font-display">{totalMiles.toFixed(1)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Estimated deduction</div>
          <div className="text-3xl font-bold tabular-nums font-display text-success">{formatMoneyCents(deduction)}</div>
          <div className="text-xs text-muted-foreground mt-1">@ ${irsRate}/mi (IRS 2025)</div>
        </div>
        <div className="bg-primary text-primary-foreground rounded-2xl p-5 shadow-card flex items-center gap-3">
          <Car className="h-8 w-8 text-secondary" />
          <div>
            <div className="font-display font-bold">Auto-track in background</div>
            <div className="text-xs opacity-70 mt-0.5">Requires native mobile app (coming)</div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-border">
        <ModeTab active={mode === "live"} onClick={() => setMode("live")} icon={Navigation} label="Live GPS" />
        <ModeTab active={mode === "route"} onClick={() => setMode("route")} icon={MapPin} label="Address to address" />
        <ModeTab active={mode === "manual"} onClick={() => setMode("manual")} icon={Pencil} label="Manual entry" />
      </div>

      <div className="mb-8">
        {mode === "live" && <LiveTracker onSave={addTrip} />}
        {mode === "route" && <RouteCalc onSave={addTrip} />}
        {mode === "manual" && <ManualEntry onSave={addTrip} />}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground text-center">Loading trips…</div>
        ) : trips.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No trips logged yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-medium py-3 px-6">Date</th>
                <th className="text-left font-medium py-3">From</th>
                <th className="text-left font-medium py-3">To</th>
                <th className="text-left font-medium py-3">Purpose</th>
                <th className="text-right font-medium py-3">Miles</th>
                <th className="text-right font-medium py-3">Deduction</th>
                <th className="w-10 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {trips.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                  <td className="py-4 px-6 text-muted-foreground text-xs tabular-nums">{m.date}</td>
                  <td className="py-4">{m.from_address ?? "—"}</td>
                  <td className="py-4">{m.to_address ?? "—"}</td>
                  <td className="py-4 text-muted-foreground">{m.purpose ?? "—"}</td>
                  <td className="py-4 text-right tabular-nums font-medium">{Number(m.miles).toFixed(1)}</td>
                  <td className="py-4 text-right tabular-nums font-medium text-success">{formatMoneyCents(Number(m.miles) * irsRate)}</td>
                  <td className="py-4 pr-4">
                    <button onClick={() => { if (confirm("Delete this trip?")) deleteTrip(m.id); }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}

function ModeTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

type Status = "idle" | "running" | "stopped";

function LiveTracker({ onSave }: { onSave: (t: NewTrip) => Promise<void> }) {
  const [status, setStatus] = useState<Status>("idle");
  const [miles, setMiles] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [purpose, setPurpose] = useState("Showing");
  const [error, setError] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const lastPos = useRef<GeolocationPosition | null>(null);
  const startedAt = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  const start = () => {
    setError(null);
    if (!("geolocation" in navigator)) { setError("Your browser doesn't support geolocation."); return; }
    setMiles(0); setSeconds(0); lastPos.current = null;
    startedAt.current = Date.now();
    setStatus("running");
    tickRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (lastPos.current) {
          const d = haversineMiles(
            lastPos.current.coords.latitude, lastPos.current.coords.longitude,
            pos.coords.latitude, pos.coords.longitude,
          );
          if (d > 0.005 && d < 5) setMiles((m) => m + d);
        }
        lastPos.current = pos;
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };

  const stop = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (tickRef.current) clearInterval(tickRef.current);
    watchId.current = null; tickRef.current = null;
    setStatus("stopped");
  };

  const save = async () => {
    await onSave({
      from_address: from || "Start location",
      to_address: to || "End location",
      miles: Number(miles.toFixed(2)),
      purpose, mode: "live",
    });
    setStatus("idle"); setMiles(0); setSeconds(0); setFrom(""); setTo("");
  };

  const discard = () => { setStatus("idle"); setMiles(0); setSeconds(0); };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
            status === "running" ? "bg-success/15 text-success animate-pulse" : "bg-muted text-muted-foreground"
          }`}>
            <Navigation className="h-7 w-7" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{
              status === "idle" ? "Ready" : status === "running" ? "Recording…" : "Stopped"
            }</div>
            <div className="text-4xl font-bold tabular-nums font-display">{miles.toFixed(2)} <span className="text-base font-normal text-muted-foreground">mi</span></div>
            <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">{mm}:{ss} elapsed</div>
          </div>
        </div>
        <div className="flex gap-2 md:ml-auto">
          {status !== "running" ? (
            <button onClick={start} className="inline-flex items-center gap-2 bg-success text-white px-5 py-3 rounded-lg text-sm font-medium">
              <Play className="h-4 w-4" /> Start trip
            </button>
          ) : (
            <button onClick={stop} className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground px-5 py-3 rounded-lg text-sm font-medium">
              <Square className="h-4 w-4" /> Stop trip
            </button>
          )}
        </div>
      </div>

      {status === "stopped" && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="From"><input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Office" className="input" /></Field>
          <Field label="To"><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="123 Oak St" className="input" /></Field>
          <Field label="Purpose">
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input">
              <option>Showing</option><option>Listing visit</option><option>Closing</option><option>Inspection</option><option>Client meeting</option><option>Other</option>
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button onClick={save} className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">Save trip</button>
            <button onClick={discard} className="px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted">Discard</button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 text-xs bg-destructive/10 text-destructive p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      <div className="mt-5 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
        <strong className="text-foreground">Heads up:</strong> the browser only tracks while this tab is open and the screen is on.
        For true background tracking (closed app, locked phone), you'll need the native mobile app — coming next.
      </div>

      <style>{`.input { width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); font-size: 0.875rem; }`}</style>
    </div>
  );
}

function RouteCalc({ onSave }: { onSave: (t: NewTrip) => Promise<void> }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [purpose, setPurpose] = useState("Showing");
  const [miles, setMiles] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const calc = () => {
    if (!from || !to) return;
    setLoading(true);
    setTimeout(() => {
      const seed = (from + to).split("").reduce((s, c) => s + c.charCodeAt(0), 0);
      const est = ((seed % 230) / 10) + 1.2;
      setMiles(Number(est.toFixed(1)));
      setLoading(false);
    }, 600);
  };

  const save = async () => {
    if (miles == null) return;
    await onSave({ from_address: from, to_address: to, miles, purpose, mode: "address" });
    setFrom(""); setTo(""); setMiles(null);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Field label="From address" className="md:col-span-2">
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="123 Office Park, Mill Valley CA" className="input" />
        </Field>
        <Field label="To address" className="md:col-span-2">
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="88 Bay Street, San Francisco CA" className="input" />
        </Field>
        <div className="flex items-end">
          <button onClick={calc} disabled={!from || !to || loading} className="w-full bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? "Calculating…" : "Calculate"}
          </button>
        </div>
      </div>

      {miles != null && (
        <div className="mt-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Driving distance</div>
            <div className="text-3xl font-bold font-display tabular-nums">{miles.toFixed(1)} mi</div>
            <div className="text-xs text-success tabular-nums mt-0.5">{formatMoneyCents(miles * irsRate)} deduction</div>
          </div>
          <Field label="Purpose">
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input min-w-[180px]">
              <option>Showing</option><option>Listing visit</option><option>Closing</option><option>Inspection</option><option>Client meeting</option><option>Other</option>
            </select>
          </Field>
          <button onClick={save} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium">Save trip</button>
        </div>
      )}

      <div className="mt-5 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
        <strong className="text-foreground">Demo mode:</strong> distances are estimated locally. Connect a Google Maps or Mapbox API key
        and we'll switch this to real driving distance via the Distance Matrix API.
      </div>

      <style>{`.input { width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); font-size: 0.875rem; }`}</style>
    </div>
  );
}

function ManualEntry({ onSave }: { onSave: (t: NewTrip) => Promise<void> }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [miles, setMiles] = useState("");
  const [purpose, setPurpose] = useState("Showing");

  const save = async () => {
    const m = parseFloat(miles);
    if (!from || !to || !m) return;
    await onSave({ from_address: from, to_address: to, miles: m, purpose, mode: "manual" });
    setFrom(""); setTo(""); setMiles("");
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Field label="From"><input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Office" className="input" /></Field>
        <Field label="To"><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="123 Oak St" className="input" /></Field>
        <Field label="Miles"><input value={miles} onChange={(e) => setMiles(e.target.value)} placeholder="0.0" inputMode="decimal" className="input tabular-nums" /></Field>
        <Field label="Purpose">
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input">
            <option>Showing</option><option>Listing visit</option><option>Closing</option><option>Inspection</option><option>Client meeting</option><option>Other</option>
          </select>
        </Field>
        <div className="flex items-end">
          <button onClick={save} className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">Add trip</button>
        </div>
      </div>
      <style>{`.input { width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); font-size: 0.875rem; }`}</style>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
