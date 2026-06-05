"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import { CRISIS_RESOURCES } from "@/lib/constants";
import { recordConsent } from "./consent-action";

type Phase = "consent" | "ready" | "active" | "ending" | "ended";

export function SessionExperience({ hasConsent }: { hasConsent: boolean }) {
  return (
    <ConversationProvider>
      <SessionRunner hasConsent={hasConsent} />
    </ConversationProvider>
  );
}

function SessionRunner({ hasConsent }: { hasConsent: boolean }) {
  const router = useRouter();
  const conversation = useConversation();
  const { status, isSpeaking, startSession, endSession, isMuted, setMuted } =
    conversation;

  const [phase, setPhase] = useState<Phase>(hasConsent ? "ready" : "consent");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [savingConsent, setSavingConsent] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const finalizedRef = useRef(false);

  // Captura el conversation_id en cuanto hay conexión.
  useEffect(() => {
    if (status === "connected" && !conversationIdRef.current) {
      try {
        conversationIdRef.current = conversation.getId();
      } catch {
        /* aún no disponible */
      }
      if (!startedAtRef.current) startedAtRef.current = Date.now();
    }
  }, [status, conversation]);

  const finalize = useCallback(async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    const durationSeconds = startedAtRef.current
      ? (Date.now() - startedAtRef.current) / 1000
      : 0;

    try {
      endSession();
    } catch {
      /* ya cerrada */
    }

    try {
      if (!conversationIdRef.current) {
        try {
          conversationIdRef.current = conversation.getId();
        } catch {
          /* sin id */
        }
      }
      await fetch("/api/elevenlabs/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          conversationId: conversationIdRef.current,
          durationSeconds,
        }),
      });
    } catch {
      /* el webhook es el respaldo */
    }
    setPhase("ended");
  }, [conversation, endSession]);

  // Contador de tiempo transcurrido (la sesión es indefinida).
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => {
      const start = startedAtRef.current ?? Date.now();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function handleAcceptConsent() {
    setSavingConsent(true);
    const { ok } = await recordConsent();
    setSavingConsent(false);
    if (ok) setPhase("ready");
    else setError("No se pudo registrar el consentimiento.");
  }

  async function handleStart() {
    setError(null);
    try {
      const res = await fetch("/api/elevenlabs/token", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo iniciar la sesión.");
      }
      const { conversationToken, sessionId, dynamicVariables } =
        await res.json();
      sessionIdRef.current = sessionId;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setPhase("active");
      startSession({
        conversationToken,
        connectionType: "webrtc",
        dynamicVariables,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar.");
      setPhase("ready");
    }
  }

  async function handleEnd() {
    setPhase("ending");
    await finalize();
  }

  // ----- Render por fase -----

  if (phase === "consent") {
    return (
      <ConsentCard
        onAccept={handleAcceptConsent}
        saving={savingConsent}
        error={error}
      />
    );
  }

  if (phase === "ended") {
    return <EndedCard onBack={() => router.push("/terapia")} />;
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      {phase === "ready" && (
        <>
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-4xl">
            🎙️
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Tu sesión está lista
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Busca un lugar tranquilo. Cuando pulses empezar, te pediremos acceso
            al micrófono. Tómate el tiempo que necesites: la sesión no tiene
            límite.
          </p>
          <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900">
            🔒 Esta sesión se graba solo para que tu psicólogo/a pueda
            entenderte y acompañarte mejor. Habla con tranquilidad: estás en un
            espacio seguro.
          </p>
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            onClick={handleStart}
            className="mt-8 rounded-full bg-indigo-600 px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Empezar a hablar
          </button>
        </>
      )}

      {(phase === "active" || phase === "ending") && (
        <>
          <div
            className={`mb-6 flex h-28 w-28 items-center justify-center rounded-full text-4xl transition-colors ${
              isSpeaking
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300"
                : "bg-indigo-100 text-indigo-700"
            } ${status === "connected" ? "animate-pulse" : ""}`}
          >
            {status === "connecting" ? "…" : isSpeaking ? "🔊" : "👂"}
          </div>

          <p className="text-sm font-medium text-slate-500">
            {status === "connecting"
              ? "Conectando…"
              : isSpeaking
                ? "Tu acompañante está hablando"
                : "Te escucho"}
          </p>

          <div className="mt-4 text-3xl font-semibold tabular-nums text-slate-400">
            {mins}:{secs.toString().padStart(2, "0")}
          </div>
          <p className="mt-1 text-xs text-slate-400">tiempo en sesión</p>

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => setMuted(!isMuted)}
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {isMuted ? "🔇 Activar micro" : "🎤 Silenciar"}
            </button>
            <button
              onClick={handleEnd}
              disabled={phase === "ending"}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {phase === "ending" ? "Cerrando…" : "Terminar"}
            </button>
          </div>

          <CrisisBar />
        </>
      )}
    </div>
  );
}

function ConsentCard({
  onAccept,
  saving,
  error,
}: {
  onAccept: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Antes de empezar</h1>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        <li>
          • Hablarás con un <strong>acompañante de IA</strong>. No es un
          profesional sanitario ni sustituye a tu psicólogo.
        </li>
        <li>
          • Esta sesión se <strong>graba únicamente</strong> para que tu
          psicólogo/a pueda conocerte y ayudarte mejor.
        </li>
        <li>
          • Solo <strong>tu psicólogo asignado</strong> tendrá acceso. Es
          confidencial.
        </li>
        <li>
          • Si detectamos una situación de riesgo, te mostraremos recursos de
          ayuda y se avisará a tu profesional.
        </li>
      </ul>
      <p className="mt-4 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900">
        Puedes hablar con total tranquilidad y libertad: este es un espacio
        seguro y solo para ti. 💜
      </p>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        onClick={onAccept}
        disabled={saving}
        className="mt-6 w-full rounded-full bg-indigo-600 px-5 py-3 text-base font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Acepto y continúo"}
      </button>
    </div>
  );
}

function EndedCard({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-3xl">
        💜
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Gracias por compartir
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Has dado un paso importante. No estás solo/a. Tu psicólogo revisará la
        sesión y te dará seguimiento.
      </p>
      <button
        onClick={onBack}
        className="mt-8 rounded-full bg-slate-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-slate-800"
      >
        Volver a mi espacio
      </button>
    </div>
  );
}

function CrisisBar() {
  return (
    <div className="mt-10 w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
        Ayuda urgente
      </p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-900">
        {CRISIS_RESOURCES.map((r) => (
          <span key={r.phone}>
            <span className="font-semibold">{r.phone}</span> {r.name}
          </span>
        ))}
      </div>
    </div>
  );
}
