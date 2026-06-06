import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, RiskBadge, Pill } from "@/app/components/ui";
import { SESSION_STATUS_META } from "@/lib/constants";
import type { TranscriptTurn } from "@/lib/elevenlabs";
import { fmtLong, fmtDuration } from "@/lib/format";
import { EvaluationForm } from "./evaluation-form";
import { SessionFlow } from "./session-flow";

export default async function SesionDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getSessionProfile();
  if (!auth) redirect("/login");
  if (auth.profile.role !== "doctor") redirect("/terapia");

  const supabase = await createClient();

  const { data: session } = await supabase
    .from("therapy_sessions")
    .select(
      "id, patient_id, started_at, duration_seconds, status, elevenlabs_conversation_id, mensaje_paciente"
    )
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const [
    { data: patient },
    { data: summary },
    { data: transcriptRow },
    { data: record },
    { data: latestSession },
  ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.patient_id)
        .maybeSingle(),
      supabase
        .from("session_summaries")
        .select(
          "summary, risk_level, topics, doctor_reviewed, doctor_approved, doctor_notes"
        )
        .eq("session_id", id)
        .maybeSingle(),
      supabase
        .from("session_transcripts")
        .select("transcript")
        .eq("session_id", id)
        .maybeSingle(),
      supabase
        .from("patient_records")
        .select("instrucciones_proxima_sesion, alta, puede_iniciar_sesion")
        .eq("patient_id", session.patient_id)
        .maybeSingle(),
      supabase
        .from("therapy_sessions")
        .select("id")
        .eq("patient_id", session.patient_id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // La evaluación (decisión + directrices) solo en la ÚLTIMA sesión.
  const isLatest = latestSession?.id === session.id;

  const turns = (transcriptRow?.transcript ?? []) as unknown as TranscriptTurn[];
  const topics = Array.isArray(summary?.topics)
    ? (summary.topics as string[])
    : [];
  const statusMeta = SESSION_STATUS_META[session.status];
  const hasAudio = Boolean(session.elevenlabs_conversation_id);

  return (
    <div className="flex flex-1 flex-col bg-linear-to-b from-indigo-50/60 via-slate-50 to-slate-50">
      <header className="border-b border-indigo-100 bg-white/80 backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
          <Link
            href={`/doctor/paciente/${session.patient_id}`}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Ficha del paciente
          </Link>
          <Link
            href={`/doctor/sesion/${id}/informe`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            ⬇ Descargar informe
          </Link>
        </div>
      </header>

      <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-12">
        {/* Cabecera de la sesión */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {patient?.full_name ?? "Paciente"}
            </h1>
            <p className="text-sm text-slate-500">
              {fmtLong(session.started_at)} · {fmtDuration(session.duration_seconds)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {summary && <RiskBadge level={summary.risk_level} />}
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusMeta?.tone ?? ""}`}
            >
              {statusMeta?.label ?? session.status}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2">
            <SessionFlow
              evaluateLabel={
                summary?.doctor_reviewed ? "Ver evaluación" : "Evaluar sesión"
              }
              review={
                <>
                  {/* Resumen */}
                  <Card title="Resumen de la sesión">
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                      {summary?.summary ??
                        "El resumen se está generando o aún no está disponible."}
                    </p>
                    {topics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {topics.map((t) => (
                          <Pill key={t}>{t}</Pill>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Audio, justo debajo del resumen */}
                  {hasAudio && (
                    <details className="group rounded-2xl border border-slate-200 bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between p-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        <span>🔊 Escuchar audio</span>
                        <span className="text-slate-400 transition-transform group-open:rotate-180">
                          ▾
                        </span>
                      </summary>
                      <div className="px-5 pb-5">
                        <audio
                          controls
                          preload="none"
                          src={`/api/elevenlabs/audio/${id}`}
                          className="w-full"
                        />
                      </div>
                    </details>
                  )}

                  {/* Transcripción */}
                  <details className="group rounded-2xl border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between p-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      <span>📝 Ver transcripción</span>
                      <span className="text-slate-400 transition-transform group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <div className="px-5 pb-5">
                      {turns.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No hay transcripción disponible.
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {turns.map((t, i) => (
                            <li
                              key={i}
                              className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                  t.role === "user"
                                    ? "bg-indigo-600 text-white"
                                    : "border border-slate-200 bg-slate-50 text-slate-700"
                                }`}
                              >
                                <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide opacity-70">
                                  {t.role === "user" ? "Paciente" : "Acompañante"}
                                </span>
                                {t.message}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>
                </>
              }
              evaluation={
                isLatest && !summary?.doctor_reviewed ? (
                  <Card
                    title="Evaluación y siguiente paso"
                    className="border-indigo-200 bg-indigo-50/40"
                  >
                    <div className="-mt-2 mb-4">
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        ⏳ Pendiente de tu autorización
                      </span>
                    </div>
                    <EvaluationForm
                      sessionId={id}
                      patientId={session.patient_id}
                      patientName={patient?.full_name ?? "El paciente"}
                      defaultNotes={summary?.doctor_notes ?? ""}
                      defaultMensaje={session.mensaje_paciente ?? ""}
                      defaultInstrucciones={
                        record?.instrucciones_proxima_sesion ?? ""
                      }
                    />
                  </Card>
                ) : (
                  <Card title="Evaluación de la sesión">
                    {isLatest && (
                      <div className="-mt-2 mb-4">
                        {record?.alta ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            ✓ Paciente dado de alta
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            ✓ Próxima sesión autorizada
                          </span>
                        )}
                      </div>
                    )}
                    {summary?.doctor_notes ? (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-slate-500">
                          Valoración clínica (interna)
                        </p>
                        <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">
                          {summary.doctor_notes}
                        </p>
                      </div>
                    ) : null}
                    {session.mensaje_paciente ? (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-emerald-700">
                          Mensaje enviado al paciente
                        </p>
                        <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">
                          {session.mensaje_paciente}
                        </p>
                      </div>
                    ) : null}
                    {isLatest && record?.instrucciones_proxima_sesion ? (
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Directrices para la próxima sesión
                        </p>
                        <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">
                          {record.instrucciones_proxima_sesion}
                        </p>
                      </div>
                    ) : null}
                    {!summary?.doctor_reviewed &&
                      !summary?.doctor_notes &&
                      !session.mensaje_paciente && (
                        <p className="text-sm text-slate-500">
                          Esta sesión todavía no tiene evaluación registrada.
                        </p>
                      )}
                  </Card>
                )
              }
            />
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            <Card title="Detalles">
              <dl className="space-y-3 text-sm">
                <Row label="Paciente">
                  <Link
                    href={`/doctor/paciente/${session.patient_id}`}
                    className="font-medium text-indigo-700 hover:underline"
                  >
                    {patient?.full_name ?? "—"}
                  </Link>
                </Row>
                <Row label="Fecha">{fmtLong(session.started_at)}</Row>
                <Row label="Duración">
                  {fmtDuration(session.duration_seconds)}
                </Row>
                <Row label="Riesgo">
                  {summary ? <RiskBadge level={summary.risk_level} /> : "—"}
                </Row>
                <Row label="Estado">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusMeta?.tone ?? ""}`}
                  >
                    {statusMeta?.label ?? session.status}
                  </span>
                </Row>
                <Row label="Revisión">
                  {summary?.doctor_reviewed
                    ? summary.doctor_approved
                      ? "Aprobada"
                      : "Revisada"
                    : "Pendiente"}
                </Row>
              </dl>
            </Card>

            {topics.length > 0 && (
              <Card title="Temas">
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}
