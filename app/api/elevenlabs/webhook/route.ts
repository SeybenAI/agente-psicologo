import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  combineRisk,
  fallbackSummary,
  type ConversationAnalysis,
  type TranscriptTurn,
} from "@/lib/elevenlabs";
import type { Json } from "@/lib/database.types";

/**
 * Webhook post-call de ElevenLabs. Valida la firma HMAC y guarda
 * transcripción + resumen + riesgo. Es el respaldo de producción del flujo
 * de /finalize (que cubre la demo local sin URL pública).
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  if (secret && secret !== "PEGA_AQUI_EL_WEBHOOK_SECRET") {
    const sig = request.headers.get("elevenlabs-signature") ?? "";
    if (!verifySignature(raw, sig, secret)) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  }

  let payload: {
    type?: string;
    data?: {
      conversation_id?: string;
      transcript?: TranscriptTurn[];
      metadata?: { call_duration_secs?: number };
      analysis?: ConversationAnalysis;
    };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (payload.type !== "post_call_transcription" || !payload.data) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const conversationId = payload.data.conversation_id;
  if (!conversationId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("therapy_sessions")
    .select("id, patient_id")
    .eq("elevenlabs_conversation_id", conversationId)
    .maybeSingle();

  if (!session) {
    // Aún no enlazada (p. ej. el cliente no llegó a guardar el id). 200 igual.
    return NextResponse.json({ ok: true, linked: false });
  }

  const turns = payload.data.transcript ?? [];
  const risk = combineRisk(payload.data.analysis, turns);
  const summaryText =
    payload.data.analysis?.transcript_summary?.trim() ||
    fallbackSummary(turns);
  const duration = payload.data.metadata?.call_duration_secs ?? null;

  await admin.from("session_transcripts").upsert(
    {
      session_id: session.id,
      patient_id: session.patient_id,
      transcript: turns as unknown as Json,
      raw: payload as unknown as Json,
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

  await admin
    .from("therapy_sessions")
    .update({
      status: risk.level === "high" || risk.level === "crisis"
        ? "flagged"
        : "completed",
      duration_seconds: duration,
      ended_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  if (risk.level === "high" || risk.level === "crisis") {
    await admin.from("crisis_flags").insert({
      session_id: session.id,
      patient_id: session.patient_id,
      level: risk.level,
      source: "post_call",
      trigger: risk.trigger,
    });
  }

  return NextResponse.json({ ok: true });
}

function verifySignature(body: string, header: string, secret: string) {
  // Formato: "t=<timestamp>,v0=<hmac_hex>"
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("="))
  ) as { t?: string; v0?: string };
  if (!parts.t || !parts.v0) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${body}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(parts.v0),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
