import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  combineRisk,
  fallbackSummary,
  fetchConversation,
} from "@/lib/elevenlabs";
import type { Json } from "@/lib/database.types";

/**
 * Cierra la sesión del paciente: marca la therapy_session, descarga la
 * conversación de ElevenLabs, genera resumen + nivel de riesgo y los guarda
 * (con service role, ya que RLS no deja al paciente escribir resúmenes).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    conversationId?: string;
    durationSeconds?: number;
  } | null;

  if (!body?.sessionId) {
    return NextResponse.json({ error: "Falta sessionId" }, { status: 400 });
  }

  // La sesión debe ser del paciente autenticado (RLS lo garantiza).
  const { data: session } = await supabase
    .from("therapy_sessions")
    .select("id, patient_id, status")
    .eq("id", body.sessionId)
    .single();

  if (!session || session.patient_id !== user.id) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 403 });
  }

  const admin = createAdminClient();
  const duration =
    typeof body.durationSeconds === "number" && body.durationSeconds >= 0
      ? Math.round(body.durationSeconds)
      : null;

  // 1) Cerramos la sesión.
  await admin
    .from("therapy_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: duration,
      status: "completed",
      elevenlabs_conversation_id: body.conversationId ?? null,
    })
    .eq("id", session.id);

  // El paciente queda bloqueado hasta que el doctor revise y autorice la
  // siguiente sesión (o le dé el alta).
  await admin
    .from("patient_records")
    .update({ puede_iniciar_sesion: false })
    .eq("patient_id", session.patient_id);

  // 2) Sin conversation_id no podemos analizar; dejamos la sesión cerrada.
  if (!body.conversationId) {
    return NextResponse.json({ ok: true, analyzed: false });
  }

  // 3) Descargamos la conversación (con reintentos por el procesamiento).
  const convo = await fetchConversation(body.conversationId);
  const turns = convo?.transcript ?? [];
  const risk = combineRisk(convo?.analysis, turns);
  const summaryText =
    convo?.analysis?.transcript_summary?.trim() || fallbackSummary(turns);

  // 4) Guardamos transcripción y resumen (upsert por session_id).
  await admin.from("session_transcripts").upsert(
    {
      session_id: session.id,
      patient_id: session.patient_id,
      transcript: turns as unknown as Json,
      raw: (convo as unknown as Json) ?? null,
    },
    { onConflict: "session_id" }
  );

  await admin.from("session_summaries").upsert(
    {
      session_id: session.id,
      patient_id: session.patient_id,
      summary: summaryText,
      risk_level: risk.level,
      topics: risk.topics as unknown as Json,
      ai_generated: true,
    },
    { onConflict: "session_id" }
  );

  // 5) Riesgo alto/crisis -> marcamos la sesión y levantamos una alerta.
  if (risk.level === "high" || risk.level === "crisis") {
    await admin
      .from("therapy_sessions")
      .update({ status: "flagged" })
      .eq("id", session.id);

    await admin.from("crisis_flags").insert({
      session_id: session.id,
      patient_id: session.patient_id,
      level: risk.level,
      source: "post_call",
      trigger: risk.trigger,
    });
  }

  return NextResponse.json({
    ok: true,
    analyzed: true,
    riskLevel: risk.level,
  });
}
