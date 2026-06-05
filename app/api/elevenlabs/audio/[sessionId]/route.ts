import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sirve el audio de una sesión desde ElevenLabs, protegido por la sesión del
 * usuario (RLS decide si puede acceder a esa therapy_session). La API key
 * nunca llega al navegador.
 *
 * Soporta HTTP Range requests (206) para poder arrastrar la barra de
 * reproducción (seek) hacia delante/atrás.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // RLS: solo devuelve la sesión si el usuario tiene acceso (paciente o doctor).
  const { data: session } = await supabase
    .from("therapy_sessions")
    .select("elevenlabs_conversation_id")
    .eq("id", sessionId)
    .maybeSingle();

  const conversationId = session?.elevenlabs_conversation_id;
  if (!conversationId) {
    return NextResponse.json({ error: "Sin audio" }, { status: 404 });
  }

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
    { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! }, cache: "no-store" }
  );
  if (!upstream.ok) {
    return NextResponse.json({ error: "Audio no disponible" }, { status: 404 });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const total = buffer.length;
  const contentType =
    upstream.headers.get("content-type") ?? "audio/mpeg";
  const range = req.headers.get("range");

  // Petición de rango: respondemos 206 con el trozo pedido.
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : total - 1;
      if (start <= end && start < total) {
        const chunk = buffer.subarray(start, end + 1);
        return new Response(chunk, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunk.length),
            "Cache-Control": "private, no-store",
          },
        });
      }
    }
  }

  // Respuesta completa (200) anunciando soporte de rangos.
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Content-Length": String(total),
      "Cache-Control": "private, no-store",
    },
  });
}
