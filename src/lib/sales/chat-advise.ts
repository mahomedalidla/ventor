import { geminiGenerate, geminiKey } from "@/lib/gemini";
import { ETAPA_LABEL, type Etapa, type SalesPlan } from "@/lib/sales/types";

export type ChatAdvice = {
  etapa_sugerida: Etapa;
  avanzar: boolean;
  objecion: string | null;
  respuesta_sugerida: string | null;
  tip_vendedor: string;
  cambios_demo: string | null;
  resumen: string;
};

const ETAPAS: Etapa[] = [
  "apertura",
  "entrega_demo",
  "seguimiento",
  "oferta_prueba",
  "check_prueba",
  "cierre",
  "despedida",
];

const SYSTEM = `Eres coach de ventas por WhatsApp para negocios locales en México.
Te pasan el plan de venta (pasos + objeciones) y el chat pegado (mensajes del cliente / dueño).
Devuelve SOLO JSON con:
- etapa_sugerida: una de las etapas del plan (nunca inventes otras)
- avanzar: true si conviene pasar a esa etapa YA (el cliente ya respondió algo accionable)
- objecion: texto corto de la objeción detectada, o null
- respuesta_sugerida: copy corto para responder (usa la del plan si encaja; si no, inventa una breve de "usted")
- tip_vendedor: 1 frase táctica
- cambios_demo: instrucción concreta para editar la demo si el cliente pidió cambios (colores, foto, WhatsApp, quitar precios…); null si no pidió
- resumen: 1 línea de qué está pasando en el chat

Reglas:
- Si dice que no es el dueño / solo atiende → no avances a cierre/precio; tip: pedir reenvío.
- Si pide precio sin haber visto la demo → entrega_demo o seguimiento, no cierre.
- Si acepta prueba → oferta_prueba / iniciar prueba.
- Si pide cambios a la página → entrega_demo + cambios_demo lleno.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    etapa_sugerida: {
      type: "STRING",
      enum: ETAPAS,
    },
    avanzar: { type: "BOOLEAN" },
    objecion: { type: "STRING", nullable: true },
    respuesta_sugerida: { type: "STRING", nullable: true },
    tip_vendedor: { type: "STRING" },
    cambios_demo: { type: "STRING", nullable: true },
    resumen: { type: "STRING" },
  },
  required: ["etapa_sugerida", "avanzar", "tip_vendedor", "resumen"],
};

export async function adviseFromChat(input: {
  chat: string;
  plan: SalesPlan;
  pasoActual: number;
}): Promise<ChatAdvice> {
  const pasos = input.plan.pasos;
  const actual = Math.min(input.pasoActual, pasos.length - 1);
  if (geminiKey()) {
    try {
      return await viaGemini(input, actual);
    } catch {
      // heuristic
    }
  }
  return viaHeuristic(input.chat, input.plan, actual);
}

async function viaGemini(
  input: { chat: string; plan: SalesPlan },
  actual: number,
): Promise<ChatAdvice> {
  const text = await geminiGenerate({
    system: SYSTEM,
    user: JSON.stringify(
      {
        paso_actual: input.plan.pasos[actual]?.etapa,
        pasos: input.plan.pasos.map((p) => ({
          etapa: p.etapa,
          objetivo: p.objetivo,
          label: ETAPA_LABEL[p.etapa],
        })),
        objeciones: input.plan.objeciones,
        chat_pegado: input.chat.slice(0, 6000),
      },
      null,
      2,
    ),
    temperature: 0.3,
    maxOutputTokens: 2048,
    responseMimeType: "application/json",
    responseSchema: SCHEMA,
  });
  const parsed = JSON.parse(text) as Partial<ChatAdvice>;
  return normalize(parsed, input.plan, actual);
}

function viaHeuristic(chat: string, plan: SalesPlan, actual: number): ChatAdvice {
  const low = chat.toLowerCase();
  const objMatch = plan.objeciones.find((o) =>
    low.includes(o.objecion.toLowerCase().slice(0, 12)),
  );
  let etapa: Etapa = plan.pasos[actual]?.etapa ?? "seguimiento";
  let avanzar = false;
  let cambios: string | null = null;

  if (/no soy (el |la )?dueñ|solo atiendo|no decido|soy (el |la )?(recepcion|mesero|empleado)/i.test(chat)) {
    etapa = plan.pasos[actual]?.etapa ?? "apertura";
    avanzar = false;
    return {
      etapa_sugerida: etapa,
      avanzar,
      objecion: "No soy el dueño / yo solo atiendo",
      respuesta_sugerida:
        plan.objeciones.find((o) => /dueño|atiendo/i.test(o.objecion))?.respuesta ??
        "Perfecto, no lo entretengo. ¿Me puede pasar con quien decide lo de la página?",
      tip_vendedor: "No expliques precio. Pide reenvío o nombre del dueño.",
      cambios_demo: null,
      resumen: "Quien responde no decide.",
    };
  }
  if (/cambi|quita|agrega|pon(er|ga)|color|foto|whatsapp|logo|precio/i.test(low)) {
    etapa = "entrega_demo";
    avanzar = true;
    cambios = chat.slice(0, 400);
  } else if (/cu[aá]nto|precio|costo|caro/i.test(low)) {
    etapa = actual < 3 ? "entrega_demo" : "oferta_prueba";
    avanzar = true;
  } else if (/s[ií]|dale|arranc|prueba|vamos|ok|está bien|esta bien/i.test(low)) {
    etapa = "oferta_prueba";
    avanzar = true;
  } else if (/lo pienso|despu[eé]s|otro d[ií]a/i.test(low)) {
    etapa = "seguimiento";
    avanzar = true;
  } else if (objMatch) {
    avanzar = false;
  } else {
    avanzar = true;
    const next = Math.min(actual + 1, plan.pasos.length - 1);
    etapa = plan.pasos[next]?.etapa ?? etapa;
  }

  const idx = plan.pasos.findIndex((p) => p.etapa === etapa);
  if (idx < 0) etapa = plan.pasos[actual]?.etapa ?? "seguimiento";

  return {
    etapa_sugerida: etapa,
    avanzar,
    objecion: objMatch?.objecion ?? null,
    respuesta_sugerida: objMatch?.respuesta ?? null,
    tip_vendedor: plan.pasos.find((p) => p.etapa === etapa)?.tip ?? "Responde corto y con una pregunta.",
    cambios_demo: cambios,
    resumen: "Análisis local (sin Gemini).",
  };
}

function normalize(p: Partial<ChatAdvice>, plan: SalesPlan, actual: number): ChatAdvice {
  const etapa = ETAPAS.includes(p.etapa_sugerida as Etapa)
    ? (p.etapa_sugerida as Etapa)
    : plan.pasos[actual]?.etapa ?? "seguimiento";
  const obj =
    p.objecion?.trim() ||
    plan.objeciones.find((o) =>
      (p.respuesta_sugerida ?? "").includes(o.respuesta.slice(0, 20)),
    )?.objecion ||
    null;
  const fromPlan = obj
    ? plan.objeciones.find((o) => o.objecion === obj || o.objecion.includes(obj.slice(0, 10)))
    : null;
  return {
    etapa_sugerida: etapa,
    avanzar: Boolean(p.avanzar),
    objecion: obj,
    respuesta_sugerida: p.respuesta_sugerida?.trim() || fromPlan?.respuesta || null,
    tip_vendedor: p.tip_vendedor?.trim() || "Responde corto.",
    cambios_demo: p.cambios_demo?.trim() || null,
    resumen: p.resumen?.trim() || "Listo.",
  };
}
