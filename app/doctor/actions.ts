"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Verifica que el usuario actual es un doctor y devuelve su id. */
async function requireDoctor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "doctor") throw new Error("No autorizado");
  return { supabase, doctorId: user.id };
}

export type CreatePatientState = { error?: string; ok?: boolean } | null;

/** El doctor crea una cuenta de paciente asignada a sí mismo. */
export async function createPatient(
  _prev: CreatePatientState,
  formData: FormData
): Promise<CreatePatientState> {
  let doctorId: string;
  try {
    ({ doctorId } = await requireDoctor());
  } catch {
    return { error: "No autorizado." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const motivo = String(formData.get("motivo_derivacion") ?? "").trim().slice(0, 500);
  const notas = String(formData.get("notas_clinicas") ?? "").trim().slice(0, 4000);

  if (!fullName || !email || password.length < 6) {
    return {
      error: "Revisa los datos: la contraseña debe tener al menos 6 caracteres.",
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "patient", doctor_id: doctorId },
  });

  if (error || !data.user) {
    if (error?.message.toLowerCase().includes("already")) {
      return { error: "Ya existe una cuenta con ese correo." };
    }
    return { error: "No se pudo crear el paciente." };
  }

  // Guardamos el motivo de derivación y las notas iniciales (el trigger ya
  // creó la fila patient_records; aquí la completamos).
  await admin
    .from("patient_records")
    .update({
      motivo_derivacion: motivo || null,
      notas_clinicas: notas || null,
    })
    .eq("patient_id", data.user.id);

  revalidatePath("/doctor");
  return { ok: true };
}

/** Acepta a un paciente pendiente y lo asigna al doctor actual. */
export async function approvePatient(formData: FormData) {
  const { doctorId } = await requireDoctor();
  const patientId = String(formData.get("patient_id") ?? "");
  if (!patientId) return;

  const admin = createAdminClient();
  // Solo si sigue pendiente (sin doctor) y es paciente.
  await admin
    .from("profiles")
    .update({ doctor_id: doctorId, active: true })
    .eq("id", patientId)
    .eq("role", "patient")
    .is("doctor_id", null);

  revalidatePath("/doctor");
}

/** Guarda instrucciones breves para la próxima sesión del agente. */
export async function saveInstructions(formData: FormData) {
  const { supabase } = await requireDoctor();
  const patientId = String(formData.get("patient_id") ?? "");
  const instrucciones = String(
    formData.get("instrucciones") ?? ""
  ).slice(0, 600);
  if (!patientId) return;

  await supabase
    .from("patient_records")
    .update({ instrucciones_proxima_sesion: instrucciones })
    .eq("patient_id", patientId);

  revalidatePath(`/doctor/paciente/${patientId}`);
}

/** Guarda la historia clínica del paciente (motivo y notas). */
export async function saveClinicalRecord(formData: FormData) {
  const { supabase } = await requireDoctor();
  const patientId = String(formData.get("patient_id") ?? "");
  const motivo = String(formData.get("motivo_derivacion") ?? "").slice(0, 500);
  const notas = String(formData.get("notas_clinicas") ?? "").slice(0, 4000);
  if (!patientId) return;

  await supabase
    .from("patient_records")
    .update({
      motivo_derivacion: motivo || null,
      notas_clinicas: notas || null,
    })
    .eq("patient_id", patientId);

  revalidatePath(`/doctor/paciente/${patientId}`);
}

/** Activa o desactiva (da de baja temporal) a un paciente. */
export async function togglePatientActive(formData: FormData) {
  const { supabase } = await requireDoctor();
  const patientId = String(formData.get("patient_id") ?? "");
  const active = formData.get("active") === "true";
  if (!patientId) return;

  await supabase
    .from("profiles")
    .update({ active })
    .eq("id", patientId)
    .eq("role", "patient");

  revalidatePath(`/doctor/paciente/${patientId}`);
  revalidatePath("/doctor");
}

/** Marca un resumen como revisado (y opcionalmente aprobado) con notas. */
export async function reviewSummary(formData: FormData) {
  const { supabase, doctorId } = await requireDoctor();
  const sessionId = String(formData.get("session_id") ?? "");
  const approved = formData.get("approved") === "on";
  const notes = String(formData.get("doctor_notes") ?? "").slice(0, 1000);
  if (!sessionId) return;

  await supabase
    .from("session_summaries")
    .update({
      doctor_reviewed: true,
      doctor_approved: approved,
      doctor_notes: notes || null,
      reviewed_by: doctorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  revalidatePath(`/doctor/sesion/${sessionId}`);
  revalidatePath("/doctor");
}

/**
 * Evalúa una sesión: guarda la revisión y DECIDE el flujo del paciente:
 *  - "authorize": autoriza la próxima sesión (con directrices para el agente).
 *  - "discharge": da de alta al paciente (proceso terminado).
 * Hasta que el doctor no haga esto, el paciente no puede iniciar otra sesión.
 */
export type EvaluationState =
  | { ok: true; decision: "authorize" | "discharge" }
  | { error: string }
  | null;

export async function evaluateSession(
  _prev: EvaluationState,
  formData: FormData
): Promise<EvaluationState> {
  let supabase, doctorId: string;
  try {
    ({ supabase, doctorId } = await requireDoctor());
  } catch {
    return { error: "No autorizado." };
  }
  const sessionId = String(formData.get("session_id") ?? "");
  const patientId = String(formData.get("patient_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("doctor_notes") ?? "").slice(0, 1000);
  const mensajePaciente = String(
    formData.get("mensaje_paciente") ?? ""
  ).slice(0, 600);
  const instrucciones = String(formData.get("instrucciones") ?? "").slice(0, 600);
  if (!sessionId || !patientId) return { error: "Datos incompletos." };

  // 1) Guardar la revisión del resumen (notas clínicas internas).
  await supabase
    .from("session_summaries")
    .update({
      doctor_reviewed: true,
      doctor_approved: true,
      doctor_notes: notes || null,
      reviewed_by: doctorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  // Mensaje dirigido al paciente (lo único que el paciente verá del doctor).
  await supabase
    .from("therapy_sessions")
    .update({ mensaje_paciente: mensajePaciente || null })
    .eq("id", sessionId);

  // 2) Aplicar la decisión sobre el flujo del paciente.
  if (decision === "discharge") {
    await supabase
      .from("patient_records")
      .update({
        alta: true,
        puede_iniciar_sesion: false,
        alta_at: new Date().toISOString(),
        instrucciones_proxima_sesion: instrucciones || null,
      })
      .eq("patient_id", patientId);
  } else {
    // authorize (por defecto)
    await supabase
      .from("patient_records")
      .update({
        alta: false,
        alta_at: null,
        puede_iniciar_sesion: true,
        instrucciones_proxima_sesion: instrucciones || null,
      })
      .eq("patient_id", patientId);
  }

  revalidatePath(`/doctor/sesion/${sessionId}`);
  revalidatePath(`/doctor/paciente/${patientId}`);
  revalidatePath("/doctor");

  return { ok: true, decision: decision === "discharge" ? "discharge" : "authorize" };
}

/**
 * Borra COMPLETAMENTE a un paciente y todos sus datos (RGPD, derecho al
 * olvido): alertas, resúmenes, transcripciones, sesiones, consentimientos,
 * mensajes, ficha, perfil y cuenta de acceso. Irreversible.
 */
export async function deletePatient(formData: FormData) {
  const { doctorId } = await requireDoctor();
  const patientId = String(formData.get("patient_id") ?? "");
  if (!patientId) return;

  const admin = createAdminClient();

  // El paciente debe pertenecer a este doctor.
  const { data: patient } = await admin
    .from("profiles")
    .select("id, role, doctor_id, full_name")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient || patient.role !== "patient" || patient.doctor_id !== doctorId) {
    return;
  }
  const patientName = patient.full_name ?? "El paciente";

  // Borrado en orden (hijos -> padre).
  await admin.from("crisis_flags").delete().eq("patient_id", patientId);
  await admin.from("session_summaries").delete().eq("patient_id", patientId);
  await admin.from("session_transcripts").delete().eq("patient_id", patientId);
  await admin.from("therapy_sessions").delete().eq("patient_id", patientId);
  await admin.from("consents").delete().eq("patient_id", patientId);
  await admin.from("messages").delete().eq("patient_id", patientId);
  await admin.from("patient_records").delete().eq("patient_id", patientId);
  await admin.from("profiles").delete().eq("id", patientId);
  // Cuenta de acceso (auth).
  await admin.auth.admin.deleteUser(patientId);

  revalidatePath("/doctor");
  redirect(`/doctor?eliminado=${encodeURIComponent(patientName)}`);
}

/** Marca una alerta de crisis como resuelta. */
export async function resolveCrisis(formData: FormData) {
  const { supabase, doctorId } = await requireDoctor();
  const crisisId = String(formData.get("crisis_id") ?? "");
  if (!crisisId) return;

  await supabase
    .from("crisis_flags")
    .update({ resolved: true, resolved_by: doctorId })
    .eq("id", crisisId);

  revalidatePath("/doctor");
}
