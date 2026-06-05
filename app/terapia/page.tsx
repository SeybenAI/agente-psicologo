import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LogoutButton } from "@/app/components/logout-button";
import { Card, StatCard } from "@/app/components/ui";
import { CRISIS_RESOURCES } from "@/lib/constants";
import { fmtDateTime, fmtDuration, fmtRelative, fmtDay } from "@/lib/format";

export default async function PacientePanel() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role === "doctor") redirect("/doctor");

  const { profile } = session;

  if (!profile.doctor_id) {
    return <PendingScreen name={profile.full_name} />;
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: doctor }, { data: sessions }, { data: record }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("full_name")
        .eq("id", profile.doctor_id)
        .maybeSingle(),
      supabase
        .from("therapy_sessions")
        .select("id, started_at, ended_at, duration_seconds, status, mensaje_paciente")
        .order("started_at", { ascending: false }),
      supabase
        .from("patient_records")
        .select("puede_iniciar_sesion, alta")
        .eq("patient_id", session.user.id)
        .maybeSingle(),
    ]);

  const canStart = Boolean(record?.puede_iniciar_sesion) && !record?.alta;
  const discharged = Boolean(record?.alta);

  const completed = (sessions ?? []).filter(
    (s) => s.status === "completed" || s.status === "flagged"
  );
  const totalSeconds = completed.reduce(
    (a, s) => a + (s.duration_seconds ?? 0),
    0
  );
  const last = completed[0];
  // Mensaje que el psicólogo dejó en la ÚLTIMA sesión del paciente.
  const lastMessage = last?.mensaje_paciente ?? null;

  return (
    <div className="flex flex-1 flex-col bg-linear-to-b from-indigo-50/60 via-slate-50 to-slate-50">
      <header className="border-b border-indigo-100 bg-white/80 backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              Mi espacio
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              {profile.full_name ?? "Paciente"}
            </h1>
            {doctor?.full_name && (
              <p className="mt-0.5 text-xs text-slate-500">
                Tu psicólogo/a asignado/a:{" "}
                <span className="font-medium text-slate-700">
                  {doctor.full_name}
                </span>
              </p>
            )}
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-12">
        {/* CTA según el estado autorizado por el psicólogo */}
        {discharged ? (
          <section className="overflow-hidden rounded-2xl bg-linear-to-br from-emerald-600 to-teal-600 p-6 text-white sm:p-8">
            <h2 className="text-xl font-semibold sm:text-2xl">
              Has completado tu proceso 💚
            </h2>
            <p className="mt-2 max-w-md text-sm text-emerald-50 sm:text-base">
              Tu psicólogo/a considera que estás bien. ¡Enhorabuena por el
              camino recorrido! Si en el futuro lo necesitas, aquí estaremos.
            </p>
          </section>
        ) : canStart && completed.length === 0 ? (
          /* Primera sesión: bienvenida completa */
          <section className="overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 p-6 text-white sm:p-8">
            <h2 className="text-xl font-semibold sm:text-2xl">
              ¿Hablamos un rato?
            </h2>
            <p className="mt-2 max-w-md text-sm text-indigo-100 sm:text-base">
              Un espacio seguro para ti, sin límite de tiempo. Estoy aquí para
              escucharte siempre que lo necesites.
            </p>
            <Link
              href="/terapia/sesion"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-medium text-indigo-700 transition-transform hover:scale-[1.02]"
            >
              🎙️ Empezar terapia
            </Link>
          </section>
        ) : canStart ? (
          /* Paciente recurrente: recuadro blanco, botón lila resaltado a la izquierda */
          <section className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:gap-6">
            <Link
              href="/terapia/sesion"
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-violet-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/40 transition-all hover:scale-[1.03] hover:bg-violet-600"
            >
              <span className="text-xl">🎙️</span>
              Empezar sesión
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Hola de nuevo
                {profile.full_name
                  ? `, ${profile.full_name.split(" ")[0]}`
                  : ""}{" "}
                👋
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Cuando quieras, aquí estoy. Tu psicólogo ha autorizado tu
                siguiente sesión.
              </p>
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-amber-900 sm:text-2xl">
              {doctor?.full_name ?? "Tu psicólogo/a"} está revisando tu última
              sesión
            </h2>
            <p className="mt-2 max-w-md text-sm text-amber-800 sm:text-base">
              Podrás empezar una nueva sesión cuando{" "}
              {doctor?.full_name ?? "tu psicólogo/a"} te dé el visto bueno y
              prepare las pautas para vuestro siguiente encuentro. Gracias por tu
              paciencia.
            </p>
            <span className="mt-6 inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-amber-200 px-6 py-3 text-base font-medium text-amber-700 opacity-80">
              ⏳ En revisión
            </span>
          </section>
        )}

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Sesiones realizadas" value={completed.length} />
          <StatCard
            label="Tiempo acompañado"
            value={fmtDuration(totalSeconds)}
          />
          <StatCard
            label="Última sesión"
            value={last ? fmtRelative(last.started_at) : "—"}
            hint={last ? fmtDay(last.started_at) : undefined}
          />
          <StatCard
            label="Tu psicólogo/a"
            value={
              <span className="text-base">
                {doctor?.full_name ?? "Asignado"}
              </span>
            }
          />
        </section>

        {/* Mensaje del psicólogo/a (lo único que el paciente ve del doctor) */}
        {lastMessage && (
          <Card title="Mensaje de tu psicólogo/a" className="border-indigo-200 bg-indigo-50/40">
            <p className="whitespace-pre-line text-sm leading-6 text-indigo-900">
              {lastMessage}
            </p>
          </Card>
        )}

        {/* Historial (neutro: solo fechas y duración, sin contenido clínico) */}
        <Card title="Tus sesiones">
          {completed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Todavía no has hecho ninguna sesión. Cuando quieras, estoy aquí.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {completed.map((s) => (
                <li key={s.id} className="relative">
                  <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-400" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {fmtDateTime(s.started_at)}
                    </p>
                    <span className="text-xs text-slate-400">
                      {fmtDuration(s.duration_seconds)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Sesión completada · gracias por tu tiempo 💛
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Crisis */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Si necesitas ayuda urgente
          </p>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-amber-900">
            {CRISIS_RESOURCES.map((r) => (
              <span key={r.phone}>
                <span className="font-semibold">{r.phone}</span> · {r.name}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function PendingScreen({ name }: { name: string | null }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ⏳
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          {name ? `${name}, tu` : "Tu"} cuenta está pendiente
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Un psicólogo debe revisar y aceptar tu alta antes de tu primera
          sesión. Te avisaremos en cuanto esté lista.
        </p>
        <div className="mt-6">
          <LogoutButton className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
