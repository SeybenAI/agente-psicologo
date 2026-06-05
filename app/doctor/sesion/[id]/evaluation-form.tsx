"use client";

import { useActionState } from "react";
import { evaluateSession, type EvaluationState } from "../../actions";

export function EvaluationForm({
  sessionId,
  patientId,
  patientName,
  defaultNotes,
  defaultMensaje,
  defaultInstrucciones,
}: {
  sessionId: string;
  patientId: string;
  patientName: string;
  defaultNotes: string;
  defaultMensaje: string;
  defaultInstrucciones: string;
}) {
  const [state, formAction, pending] = useActionState<EvaluationState, FormData>(
    evaluateSession,
    null
  );

  // Pantalla de éxito tras autorizar / dar de alta.
  if (state && "ok" in state && state.ok) {
    const authorized = state.decision === "authorize";
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✅
        </div>
        <h3 className="text-base font-semibold text-emerald-900">
          {authorized
            ? "Próxima sesión autorizada"
            : "Paciente dado de alta"}
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          {authorized
            ? `${patientName} ya puede empezar una nueva sesión cuando quiera.`
            : `Has cerrado el proceso de ${patientName}. Ya no podrá iniciar nuevas sesiones.`}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="patient_id" value={patientId} />

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Notas clínicas de esta sesión
          <span className="ml-1 font-normal text-slate-400">
            (internas, el paciente NO las ve)
          </span>
        </label>
        <textarea
          name="doctor_notes"
          rows={3}
          maxLength={1000}
          defaultValue={defaultNotes}
          placeholder="Tu valoración clínica de la sesión…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-emerald-700">
          Mensaje para el paciente
          <span className="ml-1 font-normal text-slate-400">
            (opcional, esto SÍ lo verá)
          </span>
        </label>
        <textarea
          name="mensaje_paciente"
          rows={2}
          maxLength={600}
          defaultValue={defaultMensaje}
          placeholder="Ej.: ¡Buen trabajo hoy! Esta semana intenta dar ese paseo del que hablamos."
          className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Directrices para el agente en la próxima sesión
        </label>
        <textarea
          name="instrucciones"
          rows={3}
          maxLength={600}
          defaultValue={defaultInstrucciones}
          placeholder="Ej.: trabaja la rutina de salir a caminar y reforzar el contacto con su hermana…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-indigo-100 pt-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="submit"
          name="decision"
          value="discharge"
          disabled={pending}
          className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        >
          Dar de alta (ya está bien)
        </button>
        <button
          type="submit"
          name="decision"
          value="authorize"
          disabled={pending}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar y autorizar próxima sesión"}
        </button>
      </div>
    </form>
  );
}
