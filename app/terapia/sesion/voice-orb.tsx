"use client";

import { useEffect, useRef } from "react";

/**
 * Orbe de voz animado que reacciona al volumen real de la conversación.
 * Se expande y brilla cuando habla el agente o el paciente.
 */
export function VoiceOrb({
  getOutput,
  getInput,
  speaking,
  connecting,
}: {
  getOutput: () => number;
  getInput: () => number;
  speaking: boolean;
  connecting: boolean;
}) {
  const coreRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      let lvl = 0;
      try {
        lvl = (speakingRef.current ? getOutput() : getInput()) || 0;
      } catch {
        lvl = 0;
      }
      // suavizado para que no tiemble
      smooth = smooth * 0.82 + Math.min(lvl, 1) * 0.18;
      const scale = 1 + smooth * 0.45;
      if (coreRef.current) {
        coreRef.current.style.transform = `scale(${scale})`;
      }
      if (haloRef.current) {
        haloRef.current.style.opacity = String(0.25 + smooth * 0.6);
        haloRef.current.style.transform = `scale(${1 + smooth * 0.8})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getOutput, getInput]);

  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      {/* Anillos ambientales */}
      <span
        className={`absolute inset-6 rounded-full ${
          speaking
            ? "bg-indigo-400/30"
            : "bg-indigo-300/20"
        } ${connecting ? "" : "animate-ping"}`}
        style={{ animationDuration: "2.4s" }}
      />
      <span className="absolute inset-10 rounded-full bg-violet-300/20" />

      {/* Halo reactivo */}
      <div
        ref={haloRef}
        className="absolute h-40 w-40 rounded-full bg-linear-to-br from-indigo-400/40 to-violet-400/40 blur-2xl"
      />

      {/* Núcleo reactivo */}
      <div
        ref={coreRef}
        className="relative flex h-32 w-32 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/40 transition-[box-shadow]"
        style={{ willChange: "transform" }}
      >
        <span className="text-4xl">
          {connecting ? "…" : speaking ? "🔊" : "🎧"}
        </span>
      </div>
    </div>
  );
}
