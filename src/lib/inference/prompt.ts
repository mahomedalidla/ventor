import { conversionBrief } from "@/lib/categories/conversion";
import { resolvePlaybook } from "@/lib/categories/playbooks";

export type InferLeadRow = {
  id: string;
  nombre: string;
  tipo_negocio: string | null;
  zona: string | null;
  telefono: string | null;
  origen: string;
  metadata: Record<string, unknown> | null;
};

export type InferSignalRow = {
  id: string;
  tipo_signal: string;
  detalle: string;
};

export type InferProductRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number | null;
  modelo_precio: string | null;
  estado: string;
  veces_cerrado: number;
  veces_rechazado: number;
};

export type InferPricingRow = {
  zona: string;
  tipo_negocio: string | null;
  producto_categoria: string;
  precio_min: number;
  precio_max: number;
  modelo_precio_default: string | null;
};

export type InferHistoryRow = {
  producto_sugerido_texto: string | null;
  precio_sugerido: number | null;
  status: string;
  escenario: string | null;
  motivo_rechazo?: string | null;
  leads: { tipo_negocio: string | null; zona: string | null } | null;
};

export type InferInsightRow = {
  leccion: string;
  tono_sugerido: string | null;
  motivo_rechazo: string | null;
  zona: string | null;
  tipo_negocio: string | null;
  origen_evento: string;
};

export type InferredOpportunity = {
  signal_id: string | null;
  product_id: string | null;
  producto_sugerido_texto: string | null;
  razon: string;
  canal_sugerido: "whatsapp" | "en_persona" | "email";
  guion: string;
  evitar: string | null;
  precio_sugerido: number;
  modelo_precio_sugerido: "pago_unico" | "suscripcion";
  escenario: "facil" | "esceptico" | "upsell_cliente_activo";
  /** Qué buscaría / cómo lo buscaría el cliente (para el pitch) */
  demo_cliente_busca: string | null;
  /** Cómo se vería / funcionaría la demo para ellos */
  demo_experiencia: string | null;
  /** Gustos o estilo deducidos de reseñas / sitio / rubro */
  demo_gustos_deducidos: string | null;
  /** Pitch de demostración listo para verbalizar */
  demo_pitch: string | null;
};

export function buildInferencePrompt(input: {
  lead: InferLeadRow;
  signals: InferSignalRow[];
  products: InferProductRow[];
  pricing: InferPricingRow[];
  history: InferHistoryRow[];
  insights: InferInsightRow[];
}): { system: string; user: string; playbook_id: string } {
  const playbook = resolvePlaybook(input.lead.tipo_negocio ?? "general");
  const friction = input.signals.filter(
    (s) => s.tipo_signal !== "playbook_categoria",
  );

  const meta = input.lead.metadata ?? {};
  const reviews = Array.isArray(meta.reviews) ? meta.reviews : [];
  const websiteScan = meta.website_scan ?? null;

  const system = `Eres un motor de decisión de ventas para negocios locales en México (Nayarit / Vallarta).
Responde ÚNICAMENTE con JSON válido (sin markdown) con esta forma:
{"oportunidades":[{
  "signal_id":null|"uuid",
  "product_id":null|"uuid",
  "producto_sugerido_texto":string|null,
  "razon":string,
  "canal_sugerido":"whatsapp"|"en_persona"|"email",
  "guion":string,
  "evitar":string,
  "precio_sugerido":number,
  "modelo_precio_sugerido":"pago_unico"|"suscripcion",
  "escenario":"facil"|"esceptico"|"upsell_cliente_activo",
  "demo_cliente_busca":string,
  "demo_experiencia":string,
  "demo_gustos_deducidos":string,
  "demo_pitch":string
}]}

Reglas de venta:
- Genera 1 o máximo 2 oportunidades.
- Si un producto del catálogo encaja, usa su product_id y deja producto_sugerido_texto null.
- Si no encaja ninguno, product_id null y propone producto_sugerido_texto en lenguaje simple.
- Precio dentro de pricing_baseline; ajusta con crecimiento / escepticismo / lecciones de rechazos.
- escenario facil: cierre corto. esceptico: prueba / suscripción. upsell solo con cierre previo.
- Guion tono local. Campo evitar: qué NO decir.
- Usa lecciones_aprendizaje: si hubo muchos rechazos por caro → bajar precio o más prueba; si por desconfianza → menos agresivo y más demo; si por "no lo necesito" → anclar al dolor concreto de las reseñas.

Catálogo de conversión del rubro (fuente de verdad; revísalo ANTES de decidir):
- "conversion_rubro" define el objetivo del cliente final, cómo busca, la anatomía de página, qué genera confianza/urgencia y sus dudas críticas.
- El producto sugerido debe habilitar ese objetivo y cubrir las secciones/dudas que hoy le faltan al negocio (crúzalo con signals y website_scan).
- razon: explica qué parte de la anatomía o qué duda crítica resuelve.
- guion: habla del resultado para SUS clientes (ej. "su huésped reserva directo en 3 pasos"), no de tecnología.

Reglas de DEMO / pitch (obligatorias en cada oportunidad):
- Basa demo_cliente_busca en "como_busca", demo_experiencia en la "anatomia" y demo_pitch en "objetivo" + "factores_confianza".
- demo_gustos_deducidos: estilo deducido (familiar, turístico, tradicional, moderno, rápido, económico…) a partir de reseñas, sitio y rubro. Si no hay datos, dilo y usa el playbook.
- demo_cliente_busca: cómo buscaría el cliente final ese negocio o ese servicio (Google, Instagram, WhatsApp, "cerca de mí", etc.) y qué esperaría ver.
- demo_experiencia: describe la página / flujo como si ya existiera para ESTE negocio (nombre real, zona, platos/servicios típicos). Concreto, visual, 4-8 oraciones.
- demo_pitch: lo que TÚ dices en la demo en 30-45 segundos: "mire, así lo buscaría su cliente… así se vería… así pide…".`;

  const user = JSON.stringify(
    {
      lead: {
        id: input.lead.id,
        nombre: input.lead.nombre,
        tipo_negocio: input.lead.tipo_negocio,
        zona: input.lead.zona,
        telefono: input.lead.telefono,
        origen: input.lead.origen,
        metadata_resumen: {
          rating: meta.rating ?? null,
          user_rating_count: meta.user_rating_count ?? null,
          website_uri: meta.website_uri ?? null,
          website_scan: websiteScan,
          reviews_sample: reviews.slice(0, 5),
          playbook_meta: meta.playbook ?? null,
        },
      },
      playbook: {
        id: playbook.id,
        label: playbook.label,
        pain_context: playbook.pain_context,
        producto_prioridad: playbook.producto_prioridad,
        pricing_categoria: playbook.pricing_categoria,
      },
      conversion_rubro: conversionBrief(playbook.id, input.lead.tipo_negocio),
      signals: friction,
      catalogo_productos: input.products,
      pricing_baseline: input.pricing,
      historial_segmento: input.history.slice(0, 12),
      lecciones_aprendizaje: input.insights.slice(0, 15),
    },
    null,
    2,
  );

  return { system, user, playbook_id: playbook.id };
}

export function parseClaudeOpportunities(raw: string): InferredOpportunity[] {
  return parseLlmOpportunities(raw);
}

export function parseLlmOpportunities(raw: string): InferredOpportunity[] {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as {
    oportunidades?: Array<Partial<InferredOpportunity>>;
  };
  const list = parsed.oportunidades ?? [];
  return list
    .map((o) => normalizeOpportunity(o))
    .filter((o): o is InferredOpportunity => o != null)
    .slice(0, 2);
}

function normalizeOpportunity(
  o: Partial<InferredOpportunity>,
): InferredOpportunity | null {
  if (!o.razon || o.precio_sugerido == null || !o.guion) return null;
  const canal =
    o.canal_sugerido === "en_persona" || o.canal_sugerido === "email"
      ? o.canal_sugerido
      : "whatsapp";
  const modelo =
    o.modelo_precio_sugerido === "pago_unico" ? "pago_unico" : "suscripcion";
  const escenario =
    o.escenario === "facil" ||
    o.escenario === "esceptico" ||
    o.escenario === "upsell_cliente_activo"
      ? o.escenario
      : "esceptico";

  return {
    signal_id: o.signal_id ?? null,
    product_id: o.product_id ?? null,
    producto_sugerido_texto: o.producto_sugerido_texto ?? null,
    razon: o.razon,
    canal_sugerido: canal,
    guion: o.guion,
    evitar: o.evitar ?? null,
    precio_sugerido: Number(o.precio_sugerido),
    modelo_precio_sugerido: modelo,
    escenario,
    demo_cliente_busca: o.demo_cliente_busca?.trim() || null,
    demo_experiencia: o.demo_experiencia?.trim() || null,
    demo_gustos_deducidos: o.demo_gustos_deducidos?.trim() || null,
    demo_pitch: o.demo_pitch?.trim() || null,
  };
}

/** Schema Gemini para JSON estructurado */
export const GEMINI_OPPORTUNITY_SCHEMA = {
  type: "OBJECT",
  properties: {
    oportunidades: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          signal_id: { type: "STRING", nullable: true },
          product_id: { type: "STRING", nullable: true },
          producto_sugerido_texto: { type: "STRING", nullable: true },
          razon: { type: "STRING" },
          canal_sugerido: {
            type: "STRING",
            enum: ["whatsapp", "en_persona", "email"],
          },
          guion: { type: "STRING" },
          evitar: { type: "STRING", nullable: true },
          precio_sugerido: { type: "NUMBER" },
          modelo_precio_sugerido: {
            type: "STRING",
            enum: ["pago_unico", "suscripcion"],
          },
          escenario: {
            type: "STRING",
            enum: ["facil", "esceptico", "upsell_cliente_activo"],
          },
          demo_cliente_busca: { type: "STRING" },
          demo_experiencia: { type: "STRING" },
          demo_gustos_deducidos: { type: "STRING" },
          demo_pitch: { type: "STRING" },
        },
        required: [
          "razon",
          "canal_sugerido",
          "guion",
          "precio_sugerido",
          "modelo_precio_sugerido",
          "escenario",
          "demo_cliente_busca",
          "demo_experiencia",
          "demo_gustos_deducidos",
          "demo_pitch",
        ],
      },
    },
  },
  required: ["oportunidades"],
};
