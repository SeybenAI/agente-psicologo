import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/app/components/logout-button";
import { Card, StatCard, RiskBadge, BarChart } from "@/app/components/ui";
import type { Enums } from "@/lib/database.types";
import { fmtDateTime, fmtRelative, fmtDuration } from "@/lib/format";
import { resolveCrisis } from "./actions";
import { NewPatientForm } from "./new-patient-form";

const DAY = 86400000;

export default async function DoctorPanel() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "doctor") redirect("/terapia");

  const supabase = await createClient();

  const [
    { data: patientsRaw },
    { data: sessionsRaw },
    { data: summariesRaw },
    { data: crisisRaw },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, active, created_at")
      .eq("role", "patient")
      .eq("doctor_id", session.user.id)
      .order("full_name"),
    supabase
      .from("therapy_sessions")
      .select("id, patient_id, started_at, status, duration_seconds")
      .order("started_at", { ascending: false })
      .limit(200),
    supabase
      .from("session_summaries")
      .select("session_id, patient_id, summary, risk_level, doctor_reviewed"),
    supabase
      .from("crisis_flags")
      .select("id, patient_id, session_id, level, trigger, detected_at")
      .eq("resolved", false)
      .order("detected_at", { ascending: false }),
  ]);

  const patients = patientsRaw ?? [];
  const sessions = sessionsRaw ?? [];
  const summaries = summariesRaw ?? [];
  const crisis = crisisRaw ?? [];

  const nameById = new Map(patients.map((p) => [p.id, p.full_name ?? "Paciente"]));
  const summaryBySession = new Map(summaries.map((s) => [s.session_id, s]));

  // --- KPIs ---
  const now = Date.now();
  const sessions7d = sessions.filter(
    (s) => now - new Date(s.started_at).getTime() < 7 * DAY
  ).length;
  const toReview = summaries.filter((s) => !s.doctor_reviewed).length;
  const highRisk = summaries.filter(
    (s) => s.risk_level === "high" || s.risk_level === "crisis"
  ).length;

  // --- Gráfica: sesiones últimos 14 días ---
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * DAY);
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      label: d.toLocaleDateString("es-ES", { day: "numeric" }),
      value: 0,
    };
  });
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  for (const s of sessions) {
    const k = s.started_at.slice(0, 10);
    const idx = dayIndex.get(k);
    if (idx !== undefined) days[idx].value++;
  }

  // --- Distribución de riesgo ---
  const riskCounts: Record<Enums<"risk_level">, number> = {
    low: 0,
    medium: 0,
    high: 0,
    crisis: 0,
  };
  for (const s of summaries) riskCounts[s.risk_level]++;
  const riskTotal = summaries.length || 1;

  // --- Por paciente: nº sesiones, última, último riesgo ---
  const statsByPatient = new Map(
    patients.map((p) => {
      const ps = sessions.filter((s) => s.patient_id === p.id);
      const lastSession = ps[0];
      const lastRisk = ps
        .map((s) => summaryBySession.get(s.id)?.risk_level)
        .find(Boolean) as Enums<"risk_level"> | undefined;
      return [p.id, { count: ps.length, lastSession, lastRisk }];
    })
  );

  const reviewQueue = sessions
    .filter((s) => {
      const sum = summaryBySession.get(s.id);
      return sum && !sum.doctor_reviewed;
    })
    .slice(0, 6);

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              Panel clínico · Terapia IA
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              {session.profile.full_name ?? "Doctor/a"}
            </h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-12">
        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Pacientes activos" value={patients.length} />
          <StatCard
            label="Tiempo acompañado"
            value={fmtDuration(
              sessions.reduce((a, s) => a + (s.duration_seconds ?? 0), 0)
            )}
          />
          <StatCard label="Sesiones totales" value={sessions.length} />
          <StatCard label="Sesiones (7 días)" value={sessions7d} />
          <StatCard
            label="Por revisar"
            value={toReview}
            tone={toReview ? "indigo" : "default"}
          />
          <StatCard
            label="Alertas activas"
            value={crisis.length}
            tone={crisis.length ? "red" : "default"}
            hint={highRisk ? `${highRisk} resúmenes de riesgo alto` : undefined}
          />
        </section>

        {/* Gráficas */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card title="Actividad (últimos 14 días)">
            <BarChart data={days} />
          </Card>
          <Card title="Distribución de riesgo">
            <div className="space-y-2.5 pt-1">
              {(Object.keys(riskCounts) as Enums<"risk_level">[]).map((lvl) => {
                const pct = Math.round((riskCounts[lvl] / riskTotal) * 100);
                return (
                  <div key={lvl} className="flex items-center gap-3">
                    <span className="w-16 shrink-0">
                      <RiskBadge level={lvl} />
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          lvl === "crisis"
                            ? "bg-red-500"
                            : lvl === "high"
                              ? "bg-orange-500"
                              : lvl === "medium"
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-500">
                      {riskCounts[lvl]}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Alertas */}
        {crisis.length > 0 && (
          <Card title="⚠ Alertas de riesgo" className="border-red-200">
            <ul className="space-y-2">
              {crisis.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={c.level} />
                      <Link
                        href={`/doctor/paciente/${c.patient_id}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        {nameById.get(c.patient_id) ?? "Paciente"}
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {fmtDateTime(c.detected_at)}
                      {c.trigger ? ` · «${c.trigger}»` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.session_id && (
                      <Link
                        href={`/doctor/sesion/${c.session_id}`}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Ver sesión
                      </Link>
                    )}
                    <form action={resolveCrisis}>
                      <input type="hidden" name="crisis_id" value={c.id} />
                      <button className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                        Resolver
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Crear paciente */}
        <NewPatientForm />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cola de revisión */}
          <Card title="Sesiones por revisar">
            {reviewQueue.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No hay sesiones pendientes de revisar. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {reviewQueue.map((s) => {
                  const sum = summaryBySession.get(s.id)!;
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/doctor/sesion/${s.id}`}
                        className="block rounded-xl border border-slate-200 p-3 transition-colors hover:border-indigo-300"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900">
                            {nameById.get(s.patient_id) ?? "Paciente"}
                          </span>
                          <RiskBadge level={sum.risk_level} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {sum.summary ?? "Sin resumen"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {fmtDateTime(s.started_at)}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Tabla de pacientes */}
          <Card title={`Mis pacientes (${patients.length})`}>
            {patients.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Aún no tienes pacientes asignados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-2 font-medium">Paciente</th>
                      <th className="pb-2 text-center font-medium">Ses.</th>
                      <th className="pb-2 font-medium">Última</th>
                      <th className="pb-2 font-medium">Riesgo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => {
                      const st = statsByPatient.get(p.id)!;
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-2.5">
                            <Link
                              href={`/doctor/paciente/${p.id}`}
                              className="font-medium text-slate-900 hover:text-indigo-600"
                            >
                              {p.full_name ?? "Sin nombre"}
                            </Link>
                            <p className="text-[11px] text-slate-400">
                              {p.email}
                            </p>
                          </td>
                          <td className="py-2.5 text-center text-slate-600">
                            {st.count}
                          </td>
                          <td className="py-2.5 text-xs text-slate-500">
                            {st.lastSession
                              ? fmtRelative(st.lastSession.started_at)
                              : "—"}
                          </td>
                          <td className="py-2.5">
                            {st.lastRisk ? (
                              <RiskBadge level={st.lastRisk} />
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
