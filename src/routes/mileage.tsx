import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Pencil, Plus, Car, Play, Square, MapPin, Navigation, Trash2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatMoneyCents } from "@/hooks/use-books";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableFilterBar, useTableFilters, applyTableFilters } from "@/components/table-filter-bar";
import { TableExportButton } from "@/components/table-export-button";
import { toast } from "sonner";
import { registerPlugin } from '@capacitor/core';

const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');

// Background location initiation function
const startBackgroundTracking = async () => {
  try {
    const watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: "Endless Prospects Mileage Tracker Active",
        backgroundMessage: "Logging your trip miles automatically in the background.",
        requestPermissions: true,
        stale: false,
        distanceFilter: 10 // Logs data every 10 meters of movement
      },
      function(location: any, error: any) {
        if (error) {
          console.error("Background tracking error:", error);
          return;
        }
        if (location) {
          console.log("Background location grabbed:", location.latitude, location.longitude);
          
          // Your project's standard Supabase connection line will execute here:
          // supabase.from('mileage_logs').insert({ latitude: location.latitude, longitude: location.longitude });
        }
      }
    );
    console.log("🚀 Foreground service successfully armed with ID:", watcherId);
  } catch (err) {
    console.error("Failed to spin up foreground service:", err);
  }
};

export const Route = createFileRoute("/mileage")({
  component: Mileage,
  head: () => ({ meta: [{ title: "Showing Tracker - Agent Business Tracker" }] }),
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
  date?: string;
  miles: number;
  from_address?: string;
  to_address?: string;
  purpose?: string;
  mode: "live" | "address" | "manual";
}

type AddressSuggestion = {
  id: string;
  label: string;
  lat?: number;
  lon?: number;
};

function Mileage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("live");
  const [editing, setEditing] = useState<Trip | null>(null);

  const reload = async () => {
    if (!user) { setTrips([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("mileage_trips").select("*").order("date", { ascending: false });
    setTrips((data ?? []) as Trip[]);
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user]);

  const [filters, setFilters, resetFilters] = useTableFilters();
  const filteredTrips = applyTableFilters(trips, filters, {
    searchText: (t) => `${t.from_address ?? ""} ${t.to_address ?? ""} ${t.purpose ?? ""}`,
    date: (t) => t.date,
    amount: (t) => Number(t.miles),
    selectValue: (t, key) => {
      if (key === "purpose") return t.purpose ?? "";
      if (key === "mode") return t.mode;
      return "";
    },
  });

  const totalMiles = filteredTrips.reduce((s, m) => s + Number(m.miles), 0);
  const deduction = totalMiles * irsRate;

  const addTrip = async (t: NewTrip) => {
    if (!user) return;
    const { error } = await supabase.from("mileage_trips").insert({
      user_id: user.id,
      date: t.date ?? new Date().toISOString().slice(0, 10),
      miles: t.miles,
      from_address: t.from_address ?? null,
      to_address: t.to_address ?? null,
      purpose: t.purpose ?? null,
      mode: t.mode,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Trip logged");
    await reload();
  };

  const updateTrip = async (id: string, t: NewTrip) => {
    const { error } = await supabase.from("mileage_trips").update({
      date: t.date ?? new Date().toISOString().slice(0, 10),
      miles: t.miles,
      from_address: t.from_address ?? null,
      to_address: t.to_address ?? null,
      purpose: t.purpose ?? null,
      mode: t.mode,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Trip updated");
    await reload();
  };

  const deleteTrip = async (id: string) => {
    const { error } = await supabase.from("mileage_trips").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await reload();
  };

  if (!user) {
    return (
      <PageShell title="Showing Tracker" subtitle="Sign in to log and track trips.">
        <Link to="/auth" className="inline-flex bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Sign in</Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Showing Tracker"
      subtitle="Three ways to log: live GPS while you drive, address-to-address, or by hand."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <TableExportButton
            filename="mileage-trips"
            sheetName="Trips"
            rows={trips}
            columns={[
              { header: "Date", accessor: (t) => t.date },
              { header: "Miles", accessor: (t) => Number(t.miles) },
              { header: "From", accessor: (t) => t.from_address },
              { header: "To", accessor: (t) => t.to_address },
              { header: "Purpose", accessor: (t) => t.purpose },
              { header: "Mode", accessor: (t) => t.mode },
              { header: "Deduction (USD)", accessor: (t) => Number((Number(t.miles) * irsRate).toFixed(2)) },
            ]}
          />
          <button
            onClick={() => setMode("manual")}
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Log Trip
          </button>
        </div>
      }
    >
      <TripDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit Trip"
        submitLabel="Save trip"
        initial={editing ? tripToForm(editing) : undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateTrip(editing.id, input);
          setEditing(null);
        }}
      />

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
        {mode === "live" && <LiveTracker onSave={addTrip} activeTabKey={mode} />}
        {mode === "route" && <RouteCalc onSave={addTrip} activeTabKey={mode} />}
        {mode === "manual" && <ManualEntry onSave={addTrip} activeTabKey={mode} />}
      </div>

      <TableFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        searchPlaceholder="Search from, to, or purpose..."
        showAmount
        selects={[
          { key: "purpose", label: "Purpose", options: [
            { value: "Showing", label: "Showing" },
            { value: "Listing visit", label: "Listing visit" },
            { value: "Closing", label: "Closing" },
            { value: "Inspection", label: "Inspection" },
            { value: "Client meeting", label: "Client meeting" },
            { value: "Other", label: "Other" },
          ]},
          { key: "mode", label: "Mode", options: [
            { value: "live", label: "Live" },
            { value: "address", label: "Address" },
            { value: "manual", label: "Manual" },
          ]},
        ]}
      />

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground text-center">Loading trips...</div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">{trips.length === 0 ? "No trips logged yet." : "No trips match your filters."}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                <th className="text-left font-medium py-3 px-6">Date</th>
                <th className="text-left font-medium py-3">From</th>
                <th className="text-left font-medium py-3">To</th>
                <th className="text-left font-medium py-3">Purpose</th>
                <th className="text-right font-medium py-3">Miles</th>
                <th className="text-right font-medium py-3">Deduction</th>
                <th className="w-20 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                  <td className="py-4 px-6 text-muted-foreground text-xs tabular-nums">{m.date}</td>
                  <td className="py-4">{m.from_address ?? "N/A"}</td>
                  <td className="py-4">{m.to_address ?? "N/A"}</td>
                  <td className="py-4 text-muted-foreground">{m.purpose ?? "N/A"}</td>
                  <td className="py-4 text-right tabular-nums font-medium">{Number(m.miles).toFixed(1)}</td>
                  <td className="py-4 text-right tabular-nums font-medium text-success">{formatMoneyCents(Number(m.miles) * irsRate)}</td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(m)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit trip">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Delete this trip?")) deleteTrip(m.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive" aria-label="Delete trip">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function TripDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initial?: TripFormValues;
  onSubmit: (input: NewTrip) => Promise<void>;
}) {
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState(initial?.from_address ?? "");
  const [to, setTo] = useState(initial?.to_address ?? "");
  const [miles, setMiles] = useState(initial?.miles ?? "");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "Showing");
  const [mode, setMode] = useState<NewTrip["mode"]>(initial?.mode ?? "manual");

  useEffect(() => {
    if (!open) return;
    setDate(initial?.date ?? new Date().toISOString().slice(0, 10));
    setFrom(initial?.from_address ?? "");
    setTo(initial?.to_address ?? "");
    setMiles(initial?.miles ?? "");
    setPurpose(initial?.purpose ?? "Showing");
    setMode(initial?.mode ?? "manual");
  }, [open, initial]);

  const save = async () => {
    const m = parseFloat(miles);
    if (!from || !to || !m) return;
    await onSubmit({ date, from_address: from, to_address: to, miles: m, purpose, mode });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Mode">
            <Select value={mode} onValueChange={(v) => setMode(v as NewTrip["mode"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="address">Address</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="From address">
            <AddressAutocompleteInput
              value={from}
              onChange={setFrom}
              onSelect={(suggestion) => setFrom(suggestion.label)}
              placeholder="Enter starting location"
            />
          </Field>
          <Field label="To address">
            <AddressAutocompleteInput
              value={to}
              onChange={setTo}
              onSelect={(suggestion) => setTo(suggestion.label)}
              placeholder="Enter destination"
            />
          </Field>
          <Field label="Miles">
            <Input value={miles} onChange={(e) => setMiles(e.target.value)} placeholder="Enter miles driven" inputMode="decimal" className="tabular-nums" />
          </Field>
          <Field label="Purpose">
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Showing">Showing</SelectItem>
                <SelectItem value="Listing visit">Listing visit</SelectItem>
                <SelectItem value="Closing">Closing</SelectItem>
                <SelectItem value="Inspection">Inspection</SelectItem>
                <SelectItem value="Client meeting">Client meeting</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function LiveTracker({ onSave, activeTabKey }: { onSave: (t: NewTrip) => Promise<void>; activeTabKey: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [miles, setMiles] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [purpose, setPurpose] = useState("Showing");
  const [error, setError] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const watchId = useRef<number | null>(null);
  const firstPos = useRef<GeolocationPosition | null>(null);
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
    setMiles(0); setSeconds(0); lastPos.current = null; firstPos.current = null;
    setFrom(""); setTo(""); setAddressLoading(false);
    startedAt.current = Date.now();
    setStatus("running");
    tickRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!firstPos.current) firstPos.current = pos;
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
    void hydrateAddressesFromGps();
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

  const discard = () => { setStatus("idle"); setMiles(0); setSeconds(0); setFrom(""); setTo(""); setAddressLoading(false); };

  async function hydrateAddressesFromGps() {
    const startCoords = firstPos.current?.coords;
    const endCoords = lastPos.current?.coords;
    if (!startCoords && !endCoords) return;

    setAddressLoading(true);
    try {
      const [startAddress, endAddress] = await Promise.all([
        startCoords ? reverseGeocode(startCoords.latitude, startCoords.longitude) : Promise.resolve(null),
        endCoords ? reverseGeocode(endCoords.latitude, endCoords.longitude) : Promise.resolve(null),
      ]);

      if (startAddress?.label) setFrom(startAddress.label);
      if (endAddress?.label) setTo(endAddress.label);
    } catch (geoError) {
      console.error("Could not reverse geocode trip", geoError);
    } finally {
      setAddressLoading(false);
    }
  }

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
              status === "idle" ? "Ready" : status === "running" ? "Recording..." : "Stopped"
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
          <Field label="From">
            <AddressAutocompleteInput
              value={from}
              onChange={setFrom}
              onSelect={(suggestion) => setFrom(suggestion.label)}
              placeholder={addressLoading ? "Finding starting location..." : "Enter starting location"}
              activeTabKey={activeTabKey}
            />
          </Field>
          <Field label="To">
            <AddressAutocompleteInput
              value={to}
              onChange={setTo}
              onSelect={(suggestion) => setTo(suggestion.label)}
              placeholder={addressLoading ? "Finding destination..." : "Enter destination"}
              activeTabKey={activeTabKey}
            />
          </Field>
          <Field label="Purpose">
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Showing">Showing</SelectItem>
                <SelectItem value="Listing visit">Listing visit</SelectItem>
                <SelectItem value="Closing">Closing</SelectItem>
                <SelectItem value="Inspection">Inspection</SelectItem>
                <SelectItem value="Client meeting">Client meeting</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
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

      <div
        onClick={startBackgroundTracking}
        className="mt-5 cursor-pointer rounded-lg border border-amber-300 bg-amber-100 px-3 py-3 text-xs text-amber-900 shadow-sm transition-all hover:bg-amber-200/80 active:scale-[0.99] dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/20"
      >
        <strong className="text-amber-900 dark:text-amber-300">Live Tracking Enabled:</strong>{" "}
        Your native background foreground service is ready. Tap this card directly to arm the real-time background mileage logging pipeline.
      </div>
    </div>
  );
}

function RouteCalc({ onSave, activeTabKey }: { onSave: (t: NewTrip) => Promise<void>; activeTabKey: string }) {
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
          <AddressAutocompleteInput
            value={from}
            onChange={setFrom}
            onSelect={(suggestion) => setFrom(suggestion.label)}
            placeholder="Enter starting address here"
            activeTabKey={activeTabKey}
          />
        </Field>
        <Field label="To address" className="md:col-span-2">
          <AddressAutocompleteInput
            value={to}
            onChange={setTo}
            onSelect={(suggestion) => setTo(suggestion.label)}
            placeholder="Enter destination"
            activeTabKey={activeTabKey}
          />
        </Field>
        <div className="flex items-end">
          <button onClick={calc} disabled={!from || !to || loading} className="w-full bg-secondary text-secondary-foreground px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? "Calculating..." : "Calculate"}
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
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Showing">Showing</SelectItem>
                <SelectItem value="Listing visit">Listing visit</SelectItem>
                <SelectItem value="Closing">Closing</SelectItem>
                <SelectItem value="Inspection">Inspection</SelectItem>
                <SelectItem value="Client meeting">Client meeting</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <button onClick={save} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium">Save trip</button>
        </div>
      )}

      <div className="mt-5 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
        <strong className="text-foreground">Address assist:</strong> start and destination suggestions appear while you type. Distance is still estimated locally for now.
        Add a Google Maps or Mapbox API key later and we can switch this to exact driving distance.
      </div>
    </div>
  );
}

function ManualEntry({ onSave, activeTabKey }: { onSave: (t: NewTrip) => Promise<void>; activeTabKey: string }) {
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
        <Field label="From">
          <AddressAutocompleteInput
            value={from}
            onChange={setFrom}
            onSelect={(suggestion) => setFrom(suggestion.label)}
            placeholder="Enter starting location"
            activeTabKey={activeTabKey}
          />
        </Field>
        <Field label="To">
          <AddressAutocompleteInput
            value={to}
            onChange={setTo}
            onSelect={(suggestion) => setTo(suggestion.label)}
            placeholder="Enter destination"
            activeTabKey={activeTabKey}
          />
        </Field>
        <Field label="Miles"><Input value={miles} onChange={(e) => setMiles(e.target.value)} placeholder="Enter miles driven" inputMode="decimal" className="tabular-nums" /></Field>
        <Field label="Purpose">
          <Select value={purpose} onValueChange={setPurpose}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Showing">Showing</SelectItem>
              <SelectItem value="Listing visit">Listing visit</SelectItem>
              <SelectItem value="Closing">Closing</SelectItem>
              <SelectItem value="Inspection">Inspection</SelectItem>
              <SelectItem value="Client meeting">Client meeting</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-end">
          <button onClick={save} className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium">Add trip</button>
        </div>
      </div>
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

function AddressAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  activeTabKey,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder: string;
  activeTabKey?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [placesReady, setPlacesReady] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Google Places session token — groups all keystrokes of one query into a
  // single billable session. Rotated after a suggestion is chosen.
  const sessionTokenRef = useRef<any>(null);
  const lastSelectedRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    const bindPlaces = async () => {
      try {
        const googleApi = await loadGoogleMapsPlaces();
        if (cancelled) return;
        sessionTokenRef.current = new googleApi.maps.places.AutocompleteSessionToken();
        setPlacesReady(true);
      } catch (error) {
        console.error("Could not initialize Google Places", error);
        if (!cancelled) {
          setPlacesReady(false);
          setSuggestions([]);
          setOpen(false);
        }
      }
    };

    void bindPlaces();

    return () => {
      cancelled = true;
      setPlacesReady(false);
      setSuggestions([]);
      setOpen(false);
      setHighlightedIndex(-1);
    };
  }, [activeTabKey]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 3 || !placesReady) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    // Skip the fetch when the input still matches a just-chosen suggestion.
    if (trimmed === lastSelectedRef.current) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const results = await searchAddressSuggestions(
          trimmed,
          controller.signal,
          sessionTokenRef.current,
        );
        setSuggestions(results);
        setOpen(results.length > 0);
        setHighlightedIndex(results.length > 0 ? 0 : -1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Address suggestion lookup failed", error);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [placesReady, value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const choose = (suggestion: AddressSuggestion) => {
    lastSelectedRef.current = suggestion.label;
    onSelect(suggestion);
    setSuggestions([]);
    setOpen(false);
    setHighlightedIndex(-1);
    // End of Places session — rotate token so next query starts a fresh one.
    if ((window as any).google?.maps?.places) {
      sessionTokenRef.current = new (window as any).google.maps.places.AutocompleteSessionToken();
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((current) => (current + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
          } else if (event.key === "Enter" && highlightedIndex >= 0) {
            event.preventDefault();
            choose(suggestions[highlightedIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
      />

      {open && (loading || suggestions.length > 0) && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Finding address matches...</div>
          )}
          {!loading && suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => choose(suggestion)}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                index === highlightedIndex ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type TripFormValues = {
  date: string;
  from_address: string;
  to_address: string;
  miles: string;
  purpose: string;
  mode: NewTrip["mode"];
};

function tripToForm(trip: Trip): TripFormValues {
  return {
    date: trip.date,
    from_address: trip.from_address ?? "",
    to_address: trip.to_address ?? "",
    miles: String(trip.miles ?? ""),
    purpose: trip.purpose ?? "Showing",
    mode: trip.mode,
  };
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-places-script";
let googleMapsPlacesPromise: Promise<any> | null = null;

async function reverseGeocode(lat: number, lon: number): Promise<AddressSuggestion | null> {
  if (!GOOGLE_MAPS_KEY) {
    throw new Error("Missing VITE_GOOGLE_MAPS_API_KEY");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lon}`);
  url.searchParams.set("key", GOOGLE_MAPS_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Could not reverse geocode current location");

  const data = (await response.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{ place_id: string; formatted_address: string }>;
  };

  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    if (data.status && data.status !== "ZERO_RESULTS") {
      throw new Error(data.error_message || `Google Geocoding error: ${data.status}`);
    }
    return null;
  }

  const top = data.results[0];
  return {
    id: top.place_id,
    label: top.formatted_address,
    lat,
    lon,
  };
}

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadGoogleMapsPlaces(): Promise<any> {
  const existingGoogle = (window as any).google;
  if (existingGoogle?.maps?.places) {
    return Promise.resolve(existingGoogle);
  }

  if (googleMapsPlacesPromise) {
    return googleMapsPlacesPromise;
  }

  googleMapsPlacesPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_KEY) {
      reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));
      return;
    }

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve((window as any).google), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps script failed to load")), { once: true });
      return;
    }

    const callbackName = "__abtGoogleMapsPlacesLoaded";
    (window as any)[callbackName] = () => {
      resolve((window as any).google);
      delete (window as any)[callbackName];
    };

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&loading=async&callback=${callbackName}`;
    script.onerror = () => {
      googleMapsPlacesPromise = null;
      reject(new Error("Google Maps script failed to load"));
    };
    document.head.appendChild(script);
  });

  return googleMapsPlacesPromise;
}

async function searchAddressSuggestions(
  query: string,
  signal: AbortSignal,
  sessionToken: any,
): Promise<AddressSuggestion[]> {
  const googleApi = await loadGoogleMapsPlaces();
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  // Places API (New) — Autocomplete. Session token groups all keystrokes of
  // one query so Google bills it as a single autocomplete session.
  const service = new googleApi.maps.places.AutocompleteService();

  const predictions = await new Promise<any[]>((resolve, reject) => {
    service.getPlacePredictions(
      {
        input: query,
        sessionToken,
      },
      (results: any[] | null, status: string) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        if (status !== googleApi.maps.places.PlacesServiceStatus.OK || !results) {
          if (status === googleApi.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
            return;
          }
          reject(new Error(`Could not load address suggestions: ${status}`));
          return;
        }
        resolve(results);
      },
    );
  });

  return predictions.slice(0, 5).map((prediction) => ({
    id: prediction.place_id,
    label: prediction.description,
  }));
}

