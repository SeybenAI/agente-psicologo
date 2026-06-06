"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createPatient, type CreatePatientState } from "./actions";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function NewPatientForm() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [state, formAction, pending] = useActionState<
    CreatePatientState,
    FormData
  >(createPatient, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        ➕ Nuevo paciente
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
          <div
            className="animate-pop-in w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera con degradado */}
            <div className="relative bg-linear-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 rounded-full px-2 text-lg text-indigo-100 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                ✕
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-xl">
                  🧑‍⚕️
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Nuevo paciente</h2>
                  <p className="text-xs text-indigo-100">
                    Crea la cuenta y entrégale las credenciales
                  </p>
                </div>
              </div>
            </div>

            <form ref={formRef} action={formAction} className="space-y-4 p-6">
              <Field label="Nombre completo">
                <input
                  name="full_name"
                  placeholder="Ej.: Marta López"
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Correo">
                  <input
                    name="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    required
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </Field>
                <Field label="Contraseña inicial">
                  <input
                    name="password"
                    type="text"
                    placeholder="mín. 6 caracteres"
                    minLength={6}
                    required
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </Field>
              </div>

              <Field label="Motivo de derivación">
                <input
                  name="motivo_derivacion"
                  placeholder="Ej.: soledad y aislamiento social"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </Field>

              <Field label="Notas de derivación">
                <textarea
                  name="notas_clinicas"
                  rows={3}
                  placeholder="Por qué llega el paciente, contexto, antecedentes…"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </Field>

              {state?.error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.error}
                </p>
              )}
              {state?.ok && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  ✓ Paciente creado. Compártele el correo y la contraseña.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button
                  disabled={pending}
                  className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {pending ? "Creando…" : "Crear paciente"}
                </button>
              </div>
            </form>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
