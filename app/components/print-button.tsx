"use client";

export function PrintButton({ label = "⬇ Descargar / Imprimir PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
    >
      {label}
    </button>
  );
}
