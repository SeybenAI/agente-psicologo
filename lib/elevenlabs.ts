import type { Enums } from "@/lib/database.types";

export type TranscriptTurn = {
  role: "user" | "agent";
  message: string | null;
  time_in_call_secs?: number;
};

export type DataCollectionResult = {
  value?: string | number | boolean | null;
  rationale?: string;
};

export type ConversationAnalysis = {
  transcript_summary?: string;
  call_successful?: string;
  data_collection_results?: Record<string, DataCollectionResult>;
};

export type ElevenLabsConversation = {
  conversation_id: string;
  status: string;
  transcript: TranscriptTurn[];
  metadata?: { call_duration_secs?: number };
  analysis?: ConversationAnalysis;
};

const BASE = "https://api.elevenlabs.io/v1/convai";

/**
 * Descarga la conversación de ElevenLabs. Tras colgar, el procesamiento del
 * resumen tarda unos segundos, así que reintentamos hasta que `status` sea
 * "done" (o se agoten los intentos).
 */
export async function fetchConversation(
  conversationId: string,
  { retries = 6, delayMs = 2500 }: { retries?: number; delayMs?: number } = {}
): Promise<ElevenLabsConversation | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE}/conversations/${conversationId}`, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as ElevenLabsConversation;
      const ready = data.status === "done" && data.analysis?.transcript_summary;
      if (ready || attempt === retries) return data;
    } else if (attempt === retries) {
      return null;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

const CRISIS_PATTERNS =
  /\b(suicid|matarme|me quiero morir|no quiero vivir|quitarme la vida|acabar con todo|hacerme da[ñn]o|autolesi|cortarme|no merece la pena vivir)\w*/i;

const HIGH_PATTERNS =
  /\b(desesperad|no puedo m[aá]s|sin salida|no le importo a nadie|odio mi vida|todo est[aá] mal|insoportable)\w*/i;

const MEDIUM_PATTERNS =
  /\b(muy solo|muy sola|soledad|vac[ií]o|triste|llor|ansiedad|angustia|deprimid|aislad)\w*/i;

export type RiskAssessment = {
  level: Enums<"risk_level">;
  trigger: string | null;
};

/** Heurística de riesgo a partir del texto del paciente. */
export function assessRisk(turns: TranscriptTurn[]): RiskAssessment {
  const userText = turns
    .filter((t) => t.role === "user" && t.message)
    .map((t) => t.message)
    .join(" \n ");

  const crisis = userText.match(CRISIS_PATTERNS);
  if (crisis) return { level: "crisis", trigger: crisis[0] };

  const high = userText.match(HIGH_PATTERNS);
  if (high) return { level: "high", trigger: high[0] };

  const medium = userText.match(MEDIUM_PATTERNS);
  if (medium) return { level: "medium", trigger: medium[0] };

  return { level: "low", trigger: null };
}

const RISK_ORDER: Record<Enums<"risk_level">, number> = {
  low: 0,
  medium: 1,
  high: 2,
  crisis: 3,
};

/** Devuelve el nivel de riesgo más severo de los dos. */
export function maxRisk(
  a: Enums<"risk_level">,
  b: Enums<"risk_level">
): Enums<"risk_level"> {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

/**
 * Lee el riesgo que clasificó el LLM de análisis de ElevenLabs (data
 * collection). Devuelve null si no está disponible o no es válido.
 */
export function parseLlmRisk(analysis?: ConversationAnalysis): {
  level: Enums<"risk_level"> | null;
  rationale: string | null;
  topics: string[];
} {
  const results = analysis?.data_collection_results ?? {};
  const rawLevel = String(results.risk_level?.value ?? "")
    .toLowerCase()
    .trim();
  const level = (["low", "medium", "high", "crisis"] as const).includes(
    rawLevel as Enums<"risk_level">
  )
    ? (rawLevel as Enums<"risk_level">)
    : null;

  const rationale =
    (results.risk_rationale?.value as string | undefined)?.trim() ||
    results.risk_level?.rationale?.trim() ||
    null;

  const topics = String(results.topics?.value ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return { level, rationale, topics };
}

/**
 * Combina la clasificación del LLM con la heurística de keywords, quedándose
 * con el riesgo más alto (defensa en profundidad).
 */
export function combineRisk(
  analysis: ConversationAnalysis | undefined,
  turns: TranscriptTurn[]
): { level: Enums<"risk_level">; trigger: string | null; topics: string[] } {
  const llm = parseLlmRisk(analysis);
  const heuristic = assessRisk(turns);
  const level = llm.level
    ? maxRisk(llm.level, heuristic.level)
    : heuristic.level;
  return {
    level,
    trigger: llm.rationale ?? heuristic.trigger,
    topics: llm.topics,
  };
}

/** Resumen legible si ElevenLabs aún no generó el suyo. */
export function fallbackSummary(turns: TranscriptTurn[]): string {
  const userTurns = turns.filter((t) => t.role === "user" && t.message).length;
  if (userTurns === 0) {
    return "La sesión se inició pero apenas hubo intervención del paciente.";
  }
  return `Sesión de acompañamiento completada con ${userTurns} intervenciones del paciente. Resumen automático no disponible; revisar la transcripción.`;
}
