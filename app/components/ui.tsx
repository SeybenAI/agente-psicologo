import type { ReactNode } from "react";
import { RISK_META } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "amber" | "indigo" | "red" | "emerald";
}) {
  const tones: Record<string, string> = {
    default: "border-slate-200 bg-white",
    amber: "border-amber-200 bg-amber-50",
    indigo: "border-indigo-200 bg-indigo-50",
    red: "border-red-200 bg-red-50",
    emerald: "border-emerald-200 bg-emerald-50",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function RiskBadge({ level }: { level: Enums<"risk_level"> }) {
  const meta = RISK_META[level];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.tone}`}
    >
      {meta.label}
    </span>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

const RISK_DOT: Record<Enums<"risk_level">, string> = {
  low: "#34d399",
  medium: "#fbbf24",
  high: "#f97316",
  crisis: "#ef4444",
};
const RISK_ROWS: Enums<"risk_level">[] = ["crisis", "high", "medium", "low"];
const RISK_ROW_LABEL: Record<Enums<"risk_level">, string> = {
  crisis: "Crisis",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

/** Gráfica de evolución del riesgo a lo largo de las sesiones (SVG, sin deps). */
export function RiskEvolution({
  points,
}: {
  points: { label: string; level: Enums<"risk_level"> }[];
}) {
  if (points.length === 0) {
    return <p className="text-sm text-slate-500">Sin datos suficientes todavía.</p>;
  }

  const W = 680;
  const H = 200;
  const padL = 56;
  const padR = 20;
  const padT = 16;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const rowY = (lvl: Enums<"risk_level">) =>
    padT + RISK_ROWS.indexOf(lvl) * (plotH / (RISK_ROWS.length - 1));
  const pointX = (i: number) =>
    points.length === 1
      ? padL + plotW / 2
      : padL + (i * plotW) / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: pointX(i),
    y: rowY(p.level),
    ...p,
  }));
  const linePath = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Evolución del riesgo por sesión"
    >
      {/* Gridlines + etiquetas de nivel */}
      {RISK_ROWS.map((lvl) => {
        const y = rowY(lvl);
        return (
          <g key={lvl}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text
              x={padL - 10}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fill="#94a3b8"
            >
              {RISK_ROW_LABEL[lvl]}
            </text>
          </g>
        );
      })}

      {/* Línea de evolución */}
      {coords.length > 1 && (
        <polyline
          points={linePath}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Puntos + fechas */}
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={6} fill={RISK_DOT[c.level]} stroke="#fff" strokeWidth={2} />
          <text
            x={c.x}
            y={H - 12}
            textAnchor="middle"
            fontSize={11}
            fill="#94a3b8"
          >
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Mini gráfica de barras vertical sin dependencias. */
export function BarChart({
  data,
  height = 120,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] font-medium text-slate-400">
            {d.value > 0 ? d.value : ""}
          </span>
          <div
            className="w-full rounded-t bg-indigo-500/80"
            style={{
              height: `${(d.value / max) * (height - 28)}px`,
              minHeight: d.value > 0 ? 3 : 0,
            }}
          />
          <span className="text-[9px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
