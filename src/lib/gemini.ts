/**
 * Cliente Gemini compartido.
 * Los modelos 2.5 ya no están abiertos a proyectos nuevos; 3.8/3.5 son los actuales.
 * Si el primero falla (404/429), prueba el siguiente.
 */

export const DEFAULT_MODEL = "gemini-3.8-flash";
export const FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

export function geminiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.includes("your_gemini")) return null;
  return key;
}

export function humanizeGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const low = raw.toLowerCase();
  if (low.includes("prepayment") || low.includes("credits") || low.includes("402") || low.includes("resource_exhausted")) {
    return "Gemini se quedó sin crédito. Recárgalo en AI Studio (ai.studio/projects → Billing) y vuelve a generar la página.";
  }
  if (low.includes("429") || low.includes("quota") || low.includes("rate")) {
    return "Gemini está saturado o sin cuota. Espera un minuto o revisa el plan en AI Studio.";
  }
  if (low.includes("api key") || low.includes("403") || low.includes("401") || low.includes("unauthor")) {
    return "La clave de Gemini no es válida o no tiene permiso. Revisa GEMINI_API_KEY en Vercel.";
  }
  if (low.includes("timeout") || low.includes("abort")) {
    return "Gemini tardó demasiado y se cortó. Intenta de nuevo; si se repite, usa gemini-3.8-flash.";
  }
  if (low.includes("not_found") || low.includes("no longer available") || low.includes("404")) {
    return "El modelo de Gemini que teníamos ya no está disponible. Ya actualicé al 3.8; vuelve a generar.";
  }
  return raw.replace(/key=[^&\s"]+/gi, "key=***").slice(0, 220);
}

type CallOpts = {
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: "text/plain" | "application/json";
  responseSchema?: unknown;
  /** Modelos extra al inicio (GEMINI_DEMO_MODEL, etc.) */
  prefer?: string[];
};

export async function geminiGenerate(opts: CallOpts): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("Falta GEMINI_API_KEY");

  const preferred = [
    ...(opts.prefer ?? []),
    process.env.GEMINI_DEMO_MODEL,
    process.env.GEMINI_MODEL,
    DEFAULT_MODEL,
    ...FALLBACK_MODELS,
  ]
    .filter((m): m is string => Boolean(m && !m.includes("your_")))
    .filter((m, i, a) => a.indexOf(m) === i);

  let last = "Gemini sin respuesta";
  for (const model of preferred) {
    try {
      return await once(key, model, opts);
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
      const retryable = /404|not_found|no longer available|429|UNAVAILABLE|503/i.test(last);
      if (!retryable) throw e;
    }
  }
  throw new Error(last);
}

async function once(key: string, model: string, opts: CallOpts): Promise<string> {
  const gen: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.7,
    maxOutputTokens: opts.maxOutputTokens ?? 8192,
    responseMimeType: opts.responseMimeType ?? "text/plain",
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (opts.responseSchema) gen.responseSchema = opts.responseSchema;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.user }] }],
        generationConfig: gen,
      }),
      signal: AbortSignal.timeout(240_000),
    },
  );
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    }>;
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini bloqueó el contenido (${data.promptFeedback.blockReason})`);
  }
  const cand = data.candidates?.[0];
  const raw = cand?.content?.parts
    ?.filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
  if (!raw) {
    throw new Error(cand?.finishReason ? `Gemini vacío (${cand.finishReason})` : "Gemini sin respuesta");
  }
  return raw;
}
