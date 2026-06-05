import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";

/** Punto de entrada tras autenticarse: redirige según el rol. */
export default async function Inicio() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  redirect(session.profile.role === "doctor" ? "/doctor" : "/terapia");
}
