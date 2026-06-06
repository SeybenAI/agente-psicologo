import type { ReactNode } from "react";
import { RISK_META } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";

export type Tone =
  | "default"
  | "amber"
  | "indigo"
  | "violet"
  | "sky"
  | "red"
  | "emerald"
  | "rose";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  const box: Record<Tone, string> = {
    default: "border-slate-200 bg-white",
    amber: "border-amber-200 bg-amber-50",
    indigo: "border-indigo-200 bg-indigo-50",
    violet: "border-violet-200 bg-violet-50",
    sky: "border-sky-200 bg-sky-50",
    red: "border-red-200 bg-red-50",
    emerald: "border-emerald-200 bg-emerald-50",
    rose: "border-rose-200 bg-rose-50",
  };
  const valueColor: Record<Tone, string> = {
    default: "text-slate-900",
    amber: "text-amber-700",
    indigo: "text-indigo-700",
    violet: "text-violet-700",
    sky: "text-sky-700",
    red: "text-red-700",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${box[tone]}`}>
      <p className={`text-2xl font-semibold tracking-tight ${valueColor[tone]}`}>
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
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <span className="h-4 w-1 rounded-full bg-linear-to-b from-indigo-500 to-violet-500" />
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

  const W = 720;
  const H = 240;
  const padL = 60;
  const padR = 24;
  const padT = 24;
  const padB = 42;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;

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

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x},${c.y}`)
    .join(" ");
  const area =
    coords.length > 1
      ? `${line} L ${coords[coords.length - 1].x},${baseY} L ${coords[0].x},${baseY} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Evolución del riesgo por sesión"
    >
      <defs>
        <linearGradient id="riskLineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <filter id="riskGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="3"
            floodColor="#6366f1"
            floodOpacity="0.25"
          />
        </filter>
      </defs>

      {/* Rejilla + etiquetas de nivel */}
      {RISK_ROWS.map((lvl) => {
        const y = rowY(lvl);
        return (
          <g key={lvl}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="#eef2f7"
              strokeWidth={1}
              strokeDasharray="2 5"
            />
            <circle cx={padL - 16} cy={y} r={3.5} fill={RISK_DOT[lvl]} />
            <text
              x={padL - 24}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fontWeight={500}
              fill="#64748b"
            >
              {RISK_ROW_LABEL[lvl]}
            </text>
          </g>
        );
      })}

      {/* Área + línea */}
      {coords.length > 1 && (
        <>
          <path d={area} fill="url(#riskAreaGrad)" />
          <path
            d={line}
            fill="none"
            stroke="url(#riskLineGrad)"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#riskGlow)"
          />
        </>
      )}

      {/* Puntos con halo + fechas */}
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={9} fill={RISK_DOT[c.level]} opacity={0.18} />
          <circle
            cx={c.x}
            cy={c.y}
            r={5}
            fill={RISK_DOT[c.level]}
            stroke="#fff"
            strokeWidth={2.5}
          >
            <title>{`${c.label} · ${RISK_ROW_LABEL[c.level]}`}</title>
          </circle>
          <text
            x={c.x}
            y={H - 14}
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
