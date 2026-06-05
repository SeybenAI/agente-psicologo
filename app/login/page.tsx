import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "" } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-indigo-700"
        >
          ← Terapia IA
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Inicia sesión
        </h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Accede a tu espacio de paciente o al panel profesional.
        </p>

        <LoginForm next={next} />

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Eres paciente? Tu psicólogo/a te facilitará tus credenciales.
        </p>
      </div>
    </div>
  );
}
