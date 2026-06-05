import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, StatCard, RiskBadge, RiskEvolution } from "@/app/components/ui";
import { SESSION_STATUS_META, RISK_META } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";
import { fmtDateTime, fmtDuration, fmtRelative, fmtDay } from "@/lib/format";
import {
  saveInstructions,
  saveClinicalRecord,
  togglePatientActive,
  resolveCrisis,
} from "../../actions";

export default async function PacienteDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "doctor") redirect("/terapia");

  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("profiles")
    .select("id, full_name, email, active, doctor_id, created_at")
    .eq("id", id)
    .eq("role", "patient")
    .maybeSingle();

  if (!patient || patient.doctor_id !== session.user.id) notFound();

  const [{ data: record }, { data: sessions }, { data: summaries }, { data: crisis }] =
    await Promise.all([
      supabase
        .from("patient_records")
        .select("motivo_derivacion, notas_clinicas, instrucciones_proxima_sesion")
        .eq("patient_id", id)
        .maybeSingle(),
      supabase
        .from("therapy_sessions")
        .select("id, started_at, status, duration_seconds")
        .eq("patient_id", id)
        .order("started_at", { ascending: false }),
      supabase
        .from("session_summaries")
        .select("session_id, risk_level, doctor_reviewed")
        .eq("patient_id", id),
      supabase
        .from("crisis_flags")
        .select("id, level, source, trigger, detected_at, resolved")
        .eq("patient_id", id)
        .order("detected_at", { ascending: false }),
    ]);

  const sumBySession = new Map((summaries ?? []).map((s) => [s.session_id, s]));
  const sess = sessions ?? [];
  const flags = crisis ?? [];
  const totalSeconds = sess.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
  const avgSeconds = sess.length ? Math.round(totalSeconds / sess.length) : 0;
  const lastRisk = sess
    .map((s) => sumBySession.get(s.id)?.risk_level)
    .find(Boolean) as Enums<"risk_level"> | undefined;
  const pendingReview = (summaries ?? []).filter(
    (s) => !s.doctor_reviewed
  ).length;
  const activeAlerts = flags.filter((f) => !f.resolved).length;
  const daysInProgram = Math.max(
    1,
    Math.round((Date.now() - new Date(patient.created_at).getTime()) / 86400000)
  );

  // Evolución de riesgo (cronológica, antigua → reciente)
  const shortDate = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });
  const trendPoints = [...sess]
    .reverse()
    .map((s) => {
      const level = sumBySession.get(s.id)?.risk_level;
      return level
        ? { label: shortDate.format(new Date(s.started_at)), level }
        : null;
    })
    .filter(Boolean) as { label: string; level: Enums<"risk_level"> }[];

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
          <Link
            href="/doctor"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Panel
          </Link>
          <span className="text-sm font-semibold text-indigo-700">
            Ficha del paciente
          </span>
        </div>
      </header>

      <main className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-12">
        {/* Identidad + acciones */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {patient.full_name ?? "Paciente"}
              </h1>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  patient.active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                {patient.active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="text-sm text-slate-500">{patient.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/doctor/paciente/${patient.id}/informe`}
              target="_blank"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              ⬇ Informe del paciente
            </Link>
            <form action={togglePatientActive}>
              <input type="hidden" name="patient_id" value={patient.id} />
              <input
                type="hidden"
                name="active"
                value={(!patient.active).toString()}
              />
              <button
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  patient.active
                    ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {patient.active ? "Dar de baja" : "Reactivar"}
              </button>
            </form>
          </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Sesiones" value={sess.length} />
          <StatCard label="Tiempo total" value={fmtDuration(totalSeconds)} />
          <StatCard label="Duración media" value={fmtDuration(avgSeconds)} />
          <StatCard
            label="Riesgo actual"
            value={lastRisk ? RISK_META[lastRisk].label : "—"}
            tone={
              lastRisk === "crisis" || lastRisk === "high"
                ? "red"
                : lastRisk === "medium"
                  ? "amber"
                  : "default"
            }
          />
          <StatCard
            label="Por revisar"
            value={pendingReview}
            tone={pendingReview ? "indigo" : "default"}
          />
          <StatCard
            label="En programa"
            value={`${daysInProgram} d`}
            hint={`alta ${fmtDay(patient.created_at)}`}
          />
        </section>

        {activeAlerts > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            ⚠ Este paciente tiene {activeAlerts}{" "}
            {activeAlerts === 1 ? "alerta de riesgo activa" : "alertas de riesgo activas"}.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="space-y-6 lg:col-span-2">
            {/* Evolución de riesgo */}
            <Card title="Evolución del riesgo">
              <RiskEvolution points={trendPoints} />
            </Card>

            {/* Sesiones */}
            <Card title={`Sesiones (${sess.length})`}>
              {sess.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  El paciente aún no ha realizado ninguna sesión.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="pb-2 font-medium">Fecha</th>
                        <th className="pb-2 font-medium">Duración</th>
                        <th className="pb-2 font-medium">Riesgo</th>
                        <th className="pb-2 font-medium">Estado</th>
                        <th className="pb-2 text-right font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sess.map((s) => {
                        const sum = sumBySession.get(s.id);
                        const meta = SESSION_STATUS_META[s.status];
                        return (
                          <tr
                            key={s.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-2.5">
                              <p className="font-medium text-slate-800">
                                {fmtDateTime(s.started_at)}
                              </p>
                              {sum && !sum.doctor_reviewed && (
                                <span className="text-[11px] text-indigo-600">
                                  sin revisar
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-slate-600">
                              {fmtDuration(s.duration_seconds)}
                            </td>
                            <td className="py-2.5">
                              {sum ? (
                                <RiskBadge level={sum.risk_level} />
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${meta?.tone ?? ""}`}
                              >
                                {meta?.label ?? s.status}
                              </span>
                            </td>
                            <td className="py-2.5">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/doctor/sesion/${s.id}`}
                                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Ver
                                </Link>
                                <Link
                                  href={`/doctor/sesion/${s.id}/informe`}
                                  target="_blank"
                                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                                >
                                  Informe
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Historial de alertas */}
            {flags.length > 0 && (
              <Card title="Historial de alertas">
                <ul className="space-y-2">
                  {flags.map((f) => (
                    <li
                      key={f.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                        f.resolved
                          ? "border-slate-200 bg-slate-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <RiskBadge level={f.level} />
                        <div>
                          <p className="text-xs text-slate-600">
                            {fmtDateTime(f.detected_at)} ·{" "}
                            {f.source === "realtime"
                              ? "en sesión"
                              : "tras la sesión"}
                          </p>
                          {f.trigger && (
                            <p className="text-xs text-slate-500">«{f.trigger}»</p>
                          )}
                        </div>
                      </div>
                      {f.resolved ? (
                        <span className="text-xs font-medium text-slate-400">
                          Resuelta
                        </span>
                      ) : (
                        <form action={resolveCrisis}>
                          <input type="hidden" name="crisis_id" value={f.id} />
                          <button className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                            Resolver
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            {/* Instrucciones próxima sesión */}
            <Card
              title="Instrucciones próxima sesión"
              className="border-indigo-200 bg-indigo-50/40"
            >
              <p className="-mt-2 mb-3 text-xs text-indigo-700/80">
                El agente las seguirá en la siguiente terapia.
              </p>
              <form action={saveInstructions}>
                <input type="hidden" name="patient_id" value={patient.id} />
                <textarea
                  name="instrucciones"
                  rows={3}
                  maxLength={600}
                  defaultValue={record?.instrucciones_proxima_sesion ?? ""}
                  placeholder="Ej.: hoy anímala a quedar con una amiga…"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                <div className="mt-2 flex justify-end">
                  <button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    Guardar
                  </button>
                </div>
              </form>
            </Card>

            {/* Historia clínica */}
            <Card title="Historia clínica">
              <form action={saveClinicalRecord} className="space-y-3">
                <input type="hidden" name="patient_id" value={patient.id} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Motivo de derivación
                  </label>
                  <input
                    name="motivo_derivacion"
                    maxLength={500}
                    defaultValue={record?.motivo_derivacion ?? ""}
                    placeholder="Ej.: soledad y aislamiento social"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Notas clínicas
                  </label>
                  <textarea
                    name="notas_clinicas"
                    rows={6}
                    maxLength={4000}
                    defaultValue={record?.notas_clinicas ?? ""}
                    placeholder="Observaciones, plan terapéutico, antecedentes…"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div className="flex justify-end">
                  <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    Guardar historia
                  </button>
                </div>
              </form>
            </Card>

            {/* Datos */}
            <Card title="Datos">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Última sesión</dt>
                  <dd className="font-medium text-slate-800">
                    {sess[0] ? fmtRelative(sess[0].started_at) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Alta en programa</dt>
                  <dd className="font-medium text-slate-800">
                    {fmtDay(patient.created_at)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Sesiones analizadas</dt>
                  <dd className="font-medium text-slate-800">
                    {trendPoints.length}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
