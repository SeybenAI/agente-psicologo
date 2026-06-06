"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { deletePatient } from "../../actions";

export function DeletePatientButton({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <button
        onClick={() => {
          setConfirmed(false);
          setOpen(true);
        }}
        className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        🗑 Eliminar paciente
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
              <div className="bg-linear-to-r from-red-600 to-rose-600 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-xl">
                    ⚠️
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Eliminar paciente</h2>
                    <p className="text-xs text-red-100">Acción irreversible</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <p className="text-sm text-slate-600">
                  Vas a eliminar permanentemente a{" "}
                  <strong className="text-slate-900">{patientName}</strong> y{" "}
                  <strong>todos sus datos</strong>: sesiones, transcripciones,
                  resúmenes, alertas, consentimientos, mensajes y su cuenta de
                  acceso. Esto <strong>no se puede deshacer</strong>.
                </p>

                <label className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-red-300"
                  />
                  Entiendo que esta acción es irreversible y eliminará todos los
                  datos del paciente.
                </label>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <form action={deletePatient}>
                    <input type="hidden" name="patient_id" value={patientId} />
                    <button
                      type="submit"
                      disabled={!confirmed}
                      className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/30 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Eliminar definitivamente
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
