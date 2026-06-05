"use client";

import { useState, type ReactNode } from "react";

/**
 * Flujo de dos pasos en la misma pantalla:
 *  Paso 1: revisión (resumen + audio + transcripción) con botón "Evaluar".
 *  Paso 2: evaluación y siguiente paso, con opción de volver.
 */
export function SessionFlow({
  review,
  evaluation,
  evaluateLabel,
}: {
  review: ReactNode;
  evaluation: ReactNode;
  evaluateLabel: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);

  if (step === 1) {
    return (
      <div className="space-y-6">
        {review}
        <div className="flex justify-end">
          <button
            onClick={() => setStep(2)}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.03] hover:bg-indigo-700"
          >
            {evaluateLabel}
            <span>→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setStep(1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        ← Volver al resumen
      </button>
      {evaluation}
    </div>
  );
}
