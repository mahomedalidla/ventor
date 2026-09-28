import { conversionProfile } from "@/lib/categories/conversion";
import type { CategoryId } from "@/lib/categories/playbooks";
import { vocabFor } from "@/lib/categories/vocab";
import { geminiGenerate, geminiKey } from "@/lib/gemini";
import { complejidadPorReglas, type AMedida, type Complejidad } from "@/lib/sales/offer";

type Input = {
  producto: string;
  playbookId: CategoryId;
  rubro: string;
  zona: string | null;
  dolencias: string[];
};

const SYSTEM = `Eres el socio técnico de un vendedor de soluciones digitales para negocios locales en Nayarit.
La IA de ventas propuso un producto que NO existe en nuestro catálogo, basado en los problemas detectados del negocio.
Tu trabajo: definirlo para venderlo sin inventar promesas.
- complejidad: "simple" (se arma en días con página/WhatsApp/formularios), "media" (lógica propia: puntos, reservas con reglas, catálogo administrable), "alta" (app, inventario, punto de venta, integraciones).
- que_es: una línea que entienda el dueño, sin jerga.
- demo_enfoque: cómo lo usa SU CLIENTE FINAL en 1–2 frases (esto muestra la demo).
- incluye: 3 planes escalonados (esencial < recomendado < completo), 2–4 puntos concretos y entregables cada uno; el esencial debe resolver el problema principal por sí solo.
- Español de México, sin tecnicismos.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    complejidad: { type: "STRING", enum: ["simple", "media", "alta"] },
    que_es: { type: "STRING" },
    demo_enfoque: { type: "STRING" },
    esencial: { type: "ARRAY", items: { type: "STRING" } },
    recomendado: { type: "ARRAY", items: { type: "STRING" } },
    completo: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["complejidad", "que_es", "demo_enfoque", "esencial", "recomendado", "completo"],
};

/** Define alcance y complejidad de un producto fuera de catálogo (el precio sale de la tabla por complejidad). */
export async function estimateAMedida(input: Input): Promise<Omit<AMedida, "confirmado">> {
  if (geminiKey()) {
    try {
      return await viaGemini(input);
    } catch {
      // reglas
    }
  }
  return viaReglas(input);
}

async function viaGemini(input: Input): Promise<Omit<AMedida, "confirmado">> {
  const conv = conversionProfile(input.playbookId, input.rubro);
  const user = JSON.stringify({
    producto_propuesto: input.producto,
    rubro: input.rubro,
    zona: input.zona,
    problemas_detectados: input.dolencias,
    objetivo_del_rubro: conv.objetivo,
    cliente_final: vocabFor(input.playbookId).cliente,
  });
  const text = await geminiGenerate({
    system: SYSTEM,
    user,
    temperature: 0.4,
    maxOutputTokens: 2000,
    responseMimeType: "application/json",
    responseSchema: SCHEMA,
  });
  const p = JSON.parse(text) as {
    complejidad: Complejidad;
    que_es: string;
    demo_enfoque: string;
    esencial: string[];
    recomendado: string[];
    completo: string[];
  };
  const fb = viaReglas(input);
  const clean = (a: string[] | undefined, f: string[]) =>
    a?.filter((s) => s?.trim()).slice(0, 4).length ? a.filter((s) => s?.trim()).slice(0, 4) : f;
  return {
    producto: input.producto,
    complejidad: ["simple", "media", "alta"].includes(p.complejidad) ? p.complejidad : fb.complejidad,
    que_es: p.que_es?.trim() || fb.que_es,
    demo_enfoque: p.demo_enfoque?.trim() || fb.demo_enfoque,
    incluye: {
      esencial: clean(p.esencial, fb.incluye.esencial),
      recomendado: clean(p.recomendado, fb.incluye.recomendado),
      completo: clean(p.completo, fb.incluye.completo),
    },
    estimado_por: "gemini",
  };
}

function viaReglas(input: Input): Omit<AMedida, "confirmado"> {
  const v = vocabFor(input.playbookId);
  return {
    producto: input.producto,
    complejidad: complejidadPorReglas(input.producto),
    que_es: input.producto,
    demo_enfoque: `Su ${v.cliente} lo encuentra en la página del negocio y lo pide por WhatsApp en un toque.`,
    incluye: {
      esencial: [input.producto, "Página del negocio que lo presenta", "Solicitudes por WhatsApp"],
      recomendado: ["Todo lo del Esencial", "Configuración a la medida del negocio", "Ajustes mensuales incluidos"],
      completo: ["Todo lo del Recomendado", "Reporte mensual de uso", "Soporte prioritario"],
    },
    estimado_por: "reglas",
  };
}
