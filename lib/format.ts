const dtf = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dtfLong = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeStyle: "short",
});

const dtfDay = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function fmtDateTime(value: string | null | undefined) {
  return value ? dtf.format(new Date(value)) : "—";
}

export function fmtLong(value: string | null | undefined) {
  return value ? dtfLong.format(new Date(value)) : "—";
}

export function fmtDay(value: string | null | undefined) {
  return value ? dtfDay.format(new Date(value)) : "—";
}

export function fmtDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m} min ${s}s` : `${m} min`;
}

export function fmtRelative(value: string | null | undefined) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem.`;
  return `hace ${Math.floor(days / 30)} meses`;
}
