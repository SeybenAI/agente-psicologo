import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/constants";
import { SessionExperience } from "./session-experience";

export default async function SesionPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role === "doctor") redirect("/doctor");
  if (!session.profile.doctor_id) redirect("/terapia");

  const supabase = await createClient();

  // El paciente solo puede iniciar sesión si el doctor lo ha autorizado.
  const { data: record } = await supabase
    .from("patient_records")
    .select("puede_iniciar_sesion, alta")
    .eq("patient_id", session.user.id)
    .maybeSingle();
  if (!record?.puede_iniciar_sesion || record.alta) redirect("/terapia");

  const { data: consent } = await supabase
    .from("consents")
    .select("id")
    .eq("patient_id", session.user.id)
    .eq("version", CONSENT_VERSION)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/terapia"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Mi espacio
          </Link>
          <span className="text-sm font-semibold text-indigo-700">
            Sesión de terapia
          </span>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <SessionExperience hasConsent={Boolean(consent)} />
      </main>
    </div>
  );
}
