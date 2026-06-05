"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPatient, type CreatePatientState } from "./actions";

export function NewPatientForm() {
  const [state, formAction, pending] = useActionState<
    CreatePatientState,
    FormData
  >(createPatient, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between p-5">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          ➕ Nuevo paciente
        </span>
        <span className="text-slate-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="px-5 pb-5">
        <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-3">
          <input
            name="full_name"
            placeholder="Nombre completo"
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <input
            name="email"
            type="email"
            placeholder="Correo del paciente"
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <input
            name="password"
            type="text"
            placeholder="Contraseña inicial"
            minLength={6}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <div className="sm:col-span-3 flex items-center justify-between gap-3">
            <p className="text-xs">
              {state?.error && (
                <span className="text-red-600">{state.error}</span>
              )}
              {state?.ok && (
                <span className="text-emerald-600">
                  Paciente creado. Compárte­le el correo y la contraseña.
                </span>
              )}
              {!state && (
                <span className="text-slate-400">
                  Crea la cuenta y entrega las credenciales al paciente.
                </span>
              )}
            </p>
            <button
              disabled={pending}
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? "Creando…" : "Crear paciente"}
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
