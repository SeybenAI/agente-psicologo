import Link from "next/link";
import { CRISIS_RESOURCES } from "@/lib/constants";

const FEATURES = [
  {
    icon: "🎙️",
    title: "Habla cuando lo necesites",
    text: "Sesiones de voz con un acompañante de IA, sin límite de tiempo y a cualquier hora.",
  },
  {
    icon: "🩺",
    title: "Seguimiento profesional",
    text: "Tu psicólogo recibe un resumen de cada sesión y guía tu proceso paso a paso.",
  },
  {
    icon: "🔒",
    title: "Privado y seguro",
    text: "Tus conversaciones se tratan con confidencialidad y supervisión clínica.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-linear-to-b from-indigo-50 via-white to-indigo-50/40">
      <header className="flex w-full items-center justify-between px-4 py-6 sm:px-8 lg:px-12">
        <span className="text-lg font-semibold tracking-tight text-indigo-900">
          Terapia IA
        </span>
        <Link
          href="/login"
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Acceder
        </Link>
      </header>

      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-8">
        <span className="mb-5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
          Acompañamiento emocional supervisado por profesionales
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
          Un espacio seguro para hablar, cuando lo necesitas
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-600">
          Conversa por voz con un acompañante terapéutico de IA pensado para
          acompañarte frente a la soledad. Tu psicólogo te da seguimiento en cada
          paso. No sustituye a un profesional sanitario.
        </p>
        <Link
          href="/login"
          className="mt-9 rounded-full bg-indigo-600 px-8 py-3.5 text-base font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Acceder a la plataforma
        </Link>
        <p className="mt-4 text-sm text-slate-400">
          ¿Eres paciente? Tu psicólogo/a te facilitará tus credenciales.
        </p>

        {/* Features */}
        <div className="mt-16 grid w-full max-w-5xl gap-5 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-left backdrop-blur"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-xl">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white/60">
        <div className="w-full px-4 py-5 sm:px-8 lg:px-12">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            ¿Es una emergencia? Pide ayuda ahora
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            {CRISIS_RESOURCES.map((r) => (
              <span key={r.phone}>
                <span className="font-semibold text-slate-900">{r.phone}</span>{" "}
                {r.name}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
