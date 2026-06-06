import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Crea una therapy_session para el paciente autenticado y devuelve un token
 * de conversación WebRTC de ElevenLabs (el agente permanece privado: la API
 * key nunca llega al navegador).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, doctor_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "patient") {
    return NextResponse.json(
      { error: "Solo los pacientes pueden iniciar una sesión." },
      { status: 403 }
    );
  }

  if (!profile.doctor_id) {
    return NextResponse.json(
      { error: "Tu cuenta aún no ha sido aprobada por un psicólogo." },
      { status: 403 }
    );
  }

  // Instrucciones del psicólogo + control de flujo.
  const { data: record } = await supabase
    .from("patient_records")
    .select("instrucciones_proxima_sesion, puede_iniciar_sesion, alta")
    .eq("patient_id", user.id)
    .maybeSingle();

  if (!record?.puede_iniciar_sesion || record.alta) {
    return NextResponse.json(
      {
        error:
          "Tu psicólogo debe revisar tu última sesión y autorizar la siguiente.",
      },
      { status: 403 }
    );
  }

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!agentId || !apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs no está configurado." },
      { status: 500 }
    );
  }

  // 1) Registramos la sesión (RLS: el paciente solo puede crear las suyas).
  const { data: session, error: sessionError } = await supabase
    .from("therapy_sessions")
    .insert({ patient_id: user.id, status: "in_progress" })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "No se pudo crear la sesión." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  // Desde que ARRANCA la sesión, el paciente queda bloqueado para iniciar otra
  // (aunque abandone la llamada a medias) hasta que el doctor le autorice.
  await admin
    .from("patient_records")
    .update({ puede_iniciar_sesion: false })
    .eq("patient_id", user.id);

  // Memoria: resumen de las últimas sesiones para dar continuidad.
  const { data: pastSummaries } = await admin
    .from("session_summaries")
    .select("summary, created_at")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const history = (pastSummaries ?? [])
    .filter((s) => s.summary)
    .map((s) => {
      const d = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
      }).format(new Date(s.created_at));
      return `- ${d}: ${s.summary}`;
    })
    .join("\n");

  const sessionHistory =
    history ||
    "Es la primera sesión con esta persona; aún no hay sesiones anteriores.";

  // 2) Pedimos el token de conversación (WebRTC) a ElevenLabs.
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(
      agentId
    )}`,
    { headers: { "xi-api-key": apiKey }, cache: "no-store" }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "No se pudo obtener el token de voz." },
      { status: 502 }
    );
  }

  const { token } = (await res.json()) as { token: string };

  return NextResponse.json({
    conversationToken: token,
    sessionId: session.id,
    dynamicVariables: {
      patient_name: profile.full_name ?? "",
      doctor_instructions:
        record?.instrucciones_proxima_sesion?.trim() ||
        "Sin instrucciones específicas del psicólogo para esta sesión.",
      session_history: sessionHistory,
    },
  });
}
