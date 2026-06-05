// Configuración central y constantes de seguridad de la aplicación.

/** Duración máxima de una llamada de terapia, en segundos (demo = 5 min). */
export const SESSION_MAX_SECONDS = 5 * 60;

/** Segundos restantes a partir de los cuales avisamos del cierre inminente. */
export const SESSION_WIND_DOWN_SECONDS = 30;

/** Versión del consentimiento informado vigente. Subir si cambia el texto. */
export const CONSENT_VERSION = "1.0";

/** Recursos de crisis (España). Siempre visibles para el paciente. */
export const CRISIS_RESOURCES = [
  {
    name: "Emergencias",
    phone: "112",
    description: "Emergencias generales (sanitarias, policía, bomberos).",
  },
  {
    name: "Línea de atención a la conducta suicida",
    phone: "024",
    description: "Atención 24 h, gratuita y confidencial.",
  },
  {
    name: "Teléfono de la Esperanza",
    phone: "717 003 717",
    description: "Apoyo emocional y prevención del suicidio.",
  },
] as const;

/** Niveles de riesgo posibles para un resumen de sesión. */
export const RISK_LEVELS = ["low", "medium", "high", "crisis"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Etiquetas y colores por nivel de riesgo (para la UI del doctor). */
export const RISK_META: Record<
  RiskLevel,
  { label: string; tone: string }
> = {
  low: { label: "Bajo", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  medium: { label: "Medio", tone: "bg-amber-100 text-amber-800 border-amber-200" },
  high: { label: "Alto", tone: "bg-orange-100 text-orange-800 border-orange-200" },
  crisis: { label: "Crisis", tone: "bg-red-100 text-red-800 border-red-200" },
};

export const SESSION_STATUS_META: Record<
  string,
  { label: string; tone: string }
> = {
  in_progress: { label: "En curso", tone: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Completada", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  flagged: { label: "Marcada", tone: "bg-red-100 text-red-800 border-red-200" },
  expired: { label: "Expirada", tone: "bg-slate-100 text-slate-500 border-slate-200" },
};
