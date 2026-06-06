import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RISK_META } from "@/lib/constants";
import { fmtLong, fmtDateTime, fmtDuration, fmtDay } from "@/lib/format";
import { PrintButton } from "@/app/components/print-button";

export default async function InformePaciente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getSessionProfile();
  if (!auth) redirect("/login");
  if (auth.profile.role !== "doctor") redirect("/terapia");

  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("profiles")
    .select("id, full_name, email, doctor_id, created_at, active")
    .eq("id", id)
    .eq("role", "patient")
    .maybeSingle();
  if (!patient || patient.doctor_id !== auth.user.id) notFound();

  const [{ data: record }, { data: sessions }, { data: summaries }, { data: crisis }] =
    await Promise.all([
      supabase
        .from("patient_records")
        .select("motivo_derivacion, notas_clinicas")
        .eq("patient_id", id)
        .maybeSingle(),
      supabase
        .from("therapy_sessions")
        .select("id, started_at, duration_seconds")
        .eq("patient_id", id)
        .order("started_at", { ascending: false }),
      supabase
        .from("session_summaries")
        .select("session_id, summary, topics, risk_level")
        .eq("patient_id", id),
      supabase
        .from("crisis_flags")
        .select("level, source, trigger, detected_at, resolved")
        .eq("patient_id", id)
        .order("detected_at", { ascending: false }),
    ]);

  const sumBySession = new Map((summaries ?? []).map((s) => [s.session_id, s]));
  const sess = sessions ?? [];
  const totalSeconds = sess.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);

  return (
    <div className="min-h-full bg-slate-100 print:bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-slate-500">
            Informe del paciente — vista previa
          </span>
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto my-4 max-w-3xl bg-white p-6 text-slate-800 shadow-sm sm:my-6 sm:p-10 print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-indigo-600 pb-4">
          <div>
            <h1 className="text-xl font-bold text-indigo-900">
              Informe clínico del paciente
            </h1>
            <p className="text-sm text-slate-500">
              Terapia IA · Plataforma supervisada por profesionales
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Emitido</p>
            <p>{fmtDay(new Date().toISOString())}</p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Field label="Paciente" value={patient.full_name ?? "—"} />
          <Field
            label="Profesional responsable"
            value={auth.profile.full_name ?? "—"}
          />
          <Field label="Correo" value={patient.email ?? "—"} />
          <Field label="Alta en programa" value={fmtLong(patient.created_at)} />
          <Field label="Sesiones realizadas" value={String(sess.length)} />
          <Field label="Tiempo total" value={fmtDuration(totalSeconds)} />
        </section>

        <Block title="Historia clínica">
          <p className="text-sm">
            <span className="font-semibold">Motivo de derivación: </span>
            {record?.motivo_derivacion || "No especificado."}
          </p>
          {record?.notas_clinicas && (
            <p className="mt-2 whitespace-pre-line text-sm leading-6">
              <span className="font-semibold">Notas clínicas: </span>
              {record.notas_clinicas}
            </p>
          )}
        </Block>

        <Block title="Evolución por sesiones">
          {sess.length === 0 ? (
            <p className="text-sm text-slate-500">Sin sesiones registradas.</p>
          ) : (
            <div className="space-y-4">
              {sess.map((s) => {
                const sum = sumBySession.get(s.id);
                const topics = Array.isArray(sum?.topics)
                  ? (sum.topics as string[])
                  : [];
                return (
                  <div
                    key={s.id}
                    className="break-inside-avoid border-l-2 border-slate-200 pl-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {fmtDateTime(s.started_at)}
                      </p>
                      <span className="text-xs text-slate-500">
                        {fmtDuration(s.duration_seconds)}
                        {sum ? ` · Riesgo ${RISK_META[sum.risk_level].label}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6">
                      {sum?.summary ?? "Resumen no disponible."}
                    </p>
                    {topics.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Temas: {topics.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Block>

        {(crisis ?? []).length > 0 && (
          <Block title="Alertas de riesgo registradas">
            <ul className="space-y-1 text-sm">
              {(crisis ?? []).map((f, i) => (
                <li key={i}>
                  <span className="font-semibold">
                    {RISK_META[f.level].label}
                  </span>{" "}
                  — {fmtDateTime(f.detected_at)} (
                  {f.source === "realtime" ? "en sesión" : "tras la sesión"})
                  {f.resolved ? " · resuelta" : " · activa"}
                  {f.trigger ? ` — «${f.trigger}»` : ""}
                </li>
              ))}
            </ul>
          </Block>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-400">
          Documento confidencial de carácter clínico. Los resúmenes y la
          clasificación de riesgo han sido generados por un sistema de IA y
          requieren validación profesional. No sustituye el juicio clínico ni un
          diagnóstico médico. Generado por la plataforma Terapia IA.
        </footer>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-indigo-800">
        {title}
      </h2>
      {children}
    </section>
  );
}
