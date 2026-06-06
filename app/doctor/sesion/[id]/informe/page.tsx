import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RISK_META } from "@/lib/constants";
import { fmtLong, fmtDuration } from "@/lib/format";
import { PrintButton } from "./print-button";

export default async function InformeSesion({
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
    .select("id, patient_id, started_at, ended_at, duration_seconds, status")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const [{ data: patient }, { data: summary }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", session.patient_id)
      .maybeSingle(),
    supabase
      .from("session_summaries")
      .select(
        "summary, risk_level, topics, doctor_notes, doctor_approved, doctor_reviewed"
      )
      .eq("session_id", id)
      .maybeSingle(),
  ]);

  const topics = Array.isArray(summary?.topics)
    ? (summary.topics as string[])
    : [];

  return (
    <div className="min-h-full bg-slate-100 print:bg-white">
      {/* Barra de acciones (no se imprime) */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-slate-500">
            Informe de sesión — vista previa
          </span>
          <PrintButton />
        </div>
      </div>

      {/* Hoja del informe */}
      <article className="mx-auto my-4 max-w-3xl bg-white p-6 text-slate-800 shadow-sm sm:my-6 sm:p-10 print:my-0 print:max-w-none print:p-0 print:shadow-none">
        {/* Cabecera */}
        <header className="flex items-start justify-between border-b-2 border-indigo-600 pb-4">
          <div>
            <h1 className="text-xl font-bold text-indigo-900">
              Informe clínico de sesión
            </h1>
            <p className="text-sm text-slate-500">
              Terapia IA · Plataforma supervisada por profesionales
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Ref. sesión</p>
            <p className="font-mono">{session.id.slice(0, 8)}</p>
          </div>
        </header>

        {/* Datos */}
        <section className="mt-6 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Field label="Paciente" value={patient?.full_name ?? "—"} />
          <Field
            label="Profesional responsable"
            value={auth.profile.full_name ?? "—"}
          />
          <Field label="Fecha" value={fmtLong(session.started_at)} />
          <Field
            label="Duración"
            value={fmtDuration(session.duration_seconds)}
          />
          <Field
            label="Nivel de riesgo"
            value={summary ? RISK_META[summary.risk_level].label : "—"}
          />
          <Field
            label="Estado de revisión"
            value={
              summary?.doctor_reviewed
                ? summary.doctor_approved
                  ? "Revisado y aprobado"
                  : "Revisado"
                : "Pendiente de revisión"
            }
          />
        </section>

        {/* Resumen */}
        <Block title="Resumen clínico (generado por IA)">
          <p className="whitespace-pre-line text-sm leading-6">
            {summary?.summary ?? "Resumen no disponible."}
          </p>
          {topics.length > 0 && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">Temas: </span>
              {topics.join(", ")}
            </p>
          )}
        </Block>

        {/* Notas del profesional */}
        {summary?.doctor_notes && (
          <Block title="Valoración clínica del profesional">
            <p className="whitespace-pre-line text-sm leading-6">
              {summary.doctor_notes}
            </p>
          </Block>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-400">
          Documento confidencial de carácter clínico. El resumen y la
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
