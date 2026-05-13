import { Area, AreaChart, ResponsiveContainer, RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";
import { TrendingUp, DollarSign, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/mock-data";

function CardShell({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      {children}
    </div>
  );
}

export function YtdCommissionCard({ value, trend }: { value: number; trend: { m: string; v: number }[] }) {
  return (
    <CardShell label="YTD Commission" icon={TrendingUp}>
      <div className="text-3xl font-bold tabular-nums font-display">{formatMoney(value)}</div>
      <div className="text-xs mt-1 font-medium text-success">+12.5% vs last year</div>
      <div className="h-16 mt-3 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="ytdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#ytdGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1 -mt-1">
        {trend.map((t) => (
          <span key={t.m}>{t.m}</span>
        ))}
      </div>
    </CardShell>
  );
}

export function PipelineGaugeCard({ value, goal }: { value: number; goal: number }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  const data = [{ name: "pipeline", value: pct, fill: "var(--primary)" }];
  return (
    <CardShell label="Pipeline Value" icon={DollarSign}>
      <div className="relative h-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="80%"
            outerRadius="100%"
            data={data}
            startAngle={210}
            endAngle={-30}
            barSize={10}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: "var(--muted)" }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-bold tabular-nums font-display leading-none">{formatMoney(value)}</div>
          <div className="text-[10px] text-muted-foreground mt-1.5">of {formatMoney(goal)} goal</div>
        </div>
      </div>
      <div className="text-xs font-medium text-center text-muted-foreground mt-2">{pct}% to monthly target</div>
    </CardShell>
  );
}

export function DealsClosedRingCard({ closed, goal }: { closed: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((closed / goal) * 100)) : 0;
  const data = [{ name: "closed", value: pct, fill: "var(--success)" }];
  return (
    <CardShell label="Deals Closed (MTD)" icon={CheckCircle2}>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="75%"
              outerRadius="100%"
              data={data}
              startAngle={90}
              endAngle={-270}
              barSize={10}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: "var(--muted)" }} dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold tabular-nums font-display">{closed}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Goal {goal}</div>
          <div className="text-xs font-medium text-success mt-1">{pct}% achieved</div>
          <div className="text-[11px] text-muted-foreground mt-2">Avg deal $185k</div>
        </div>
      </div>
    </CardShell>
  );
}
