import { conversionBrief, conversionProfile } from "@/lib/categories/conversion";
import { resolvePlaybook } from "@/lib/categories/playbooks";
import type { DemoMockup } from "@/lib/demo/types";
import type { InferLeadRow, InferSignalRow } from "@/lib/inference/prompt";

type DemoInput = {
  lead: InferLeadRow;
  signals: InferSignalRow[];
  producto: string;
};

/**
 * Genera una propuesta de demo GENUINA (específica a este negocio).
 * Prioridad: Gemini → fallback heurístico con datos reales del lead.
 */
export async function generateGenuineDemo(
  input: DemoInput,
): Promise<DemoMockup> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.includes("your_gemini")) {
    try {
      return await callGeminiDemo(input);
    } catch {
      // fallback
    }
  }
  return heuristicDemo(input);
}

async function callGeminiDemo(input: DemoInput): Promise<DemoMockup> {
  const playbook = resolvePlaybook(input.lead.tipo_negocio ?? "general");
  const meta = input.lead.metadata ?? {};
  const reviews = Array.isArray(meta.reviews) ? meta.reviews : [];
  const friction = input.signals.filter(
    (s) => s.tipo_signal !== "playbook_categoria",
  );

  const system = `Eres un diseñador de demos de venta para negocios locales en México.
Debes crear una propuesta GENUINA y ESPECÍFICA para ESTE negocio — nunca plantillas genéricas.

PROHIBIDO:
- Textos como "Negocio local", "Producto demo", "Cliente ejemplo"
- Paleta púrpura/violeta
- Ítems inventados que no tengan sentido con el rubro o las reseñas
- Copiar el mismo ejemplo para todos

OBLIGATORIO:
- Partir de "conversion_rubro": search_query sale de "como_busca"; flow_steps siguen el "objetivo" y la "anatomia"; cta_label usa "cta_primario"; why_this ancla a una duda crítica o factor de confianza que hoy no cubre.
- Usar el NOMBRE REAL del negocio en search_title, headline, cta_prefill
- Usar la ZONA real
- Inferir vibe y gustos de reseñas + tipo de negocio + señales
- Si hay reseñas que mencionan platillos/servicios/problemas, úsalos
- Inventar 4-6 ítems creíbles (precios en MXN, estilo local) coherentes con el rubro
- search_query: lo que escribiría un cliente real en Google
- flow_steps: 3-5 pasos concretos del cliente
- why_this: por qué esta demo cierra con ESTE dueño (anclar a una señal real)
- palette: hex legibles, alto contraste, ambientación del rubro (mariscos=azul/arena, hotel=terracota/crema cálida distinta, clínica=verde limpio, etc.)

Responde SOLO JSON con el schema pedido.`;

  const user = JSON.stringify(
    {
      negocio: {
        nombre: input.lead.nombre,
        tipo_negocio: input.lead.tipo_negocio,
        zona: input.lead.zona,
        telefono: input.lead.telefono,
        rating: meta.rating ?? null,
        reseñas: reviews.slice(0, 6),
        sitio: meta.website_uri ?? null,
        website_scan: meta.website_scan ?? null,
      },
      producto_a_demostrar: input.producto,
      playbook: {
        id: playbook.id,
        label: playbook.label,
        pain: playbook.pain_context,
      },
      conversion_rubro: conversionBrief(playbook.id),
      señales: friction.map((s) => ({
        tipo: s.tipo_signal,
        detalle: s.detalle,
      })),
    },
    null,
    2,
  );

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: DEMO_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("");
  if (!text) throw new Error("Gemini sin demo");

  const parsed = JSON.parse(text) as DemoMockup;
  return sanitizeDemo(parsed, input);
}

function heuristicDemo(input: DemoInput): DemoMockup {
  const playbook = resolvePlaybook(input.lead.tipo_negocio ?? "general");
  const nombre = input.lead.nombre;
  const zona = input.lead.zona ?? "Nayarit";
  const meta = input.lead.metadata ?? {};
  const reviews = Array.isArray(meta.reviews)
    ? (meta.reviews as Array<{ text?: string }>)
    : [];
  const reviewBlob = reviews.map((r) => r.text ?? "").join(" ");

  const palette = paletteFor(playbook.id);
  const items = itemsFor(playbook.id, nombre, reviewBlob);
  const conv = conversionProfile(playbook.id);
  const search_query =
    conv.como_busca
      .map((q) =>
        q
          .replace(/[“”]/g, "")
          .replace(/\{zona\}/g, zona)
          .replace(/\{nombre\}/g, nombre),
      )
      .find((q) => !/\{/.test(q)) ?? `${nombre} ${zona}`;

  const primarySignal = input.signals.find(
    (s) => s.tipo_signal !== "playbook_categoria",
  );

  return sanitizeDemo(
    {
      search_query,
      search_title: `${nombre} · ${zona}`,
      search_snippet:
        playbook.id === "comida"
          ? `Menú y pedidos por WhatsApp. Abierto en ${zona}. Sin comisión de apps.`
          : playbook.id === "hoteleria"
            ? `Reservas directas en ${zona}. Disponibilidad y WhatsApp al instante.`
            : `Agenda y atención por WhatsApp en ${zona}.`,
      headline: nombre,
      tagline:
        playbook.id === "comida"
          ? `Pedidos claros desde ${zona} — listo en WhatsApp`
          : playbook.id === "hoteleria"
            ? `Reserva directa, sin intermediarios`
            : `Te atendemos rápido por WhatsApp`,
      vibe: playbook.label,
      palette,
      items,
      flow_steps: [
        `Busca “${search_query}” y encuentra ${nombre}`,
        ...conv.anatomia.slice(1, 3).map((s) => `Ve ${s.titulo.toLowerCase()}`),
        `Toca “${conv.cta_primario}” — ${conv.objetivo.toLowerCase()}`,
      ],
      cta_label: conv.cta_primario,
      cta_prefill:
        playbook.id === "comida"
          ? `Hola ${nombre}, quiero pedir: `
          : playbook.id === "hoteleria"
            ? `Hola ${nombre}, quiero reservar para `
            : `Hola ${nombre}, me interesa: `,
      why_this: primarySignal
        ? `Anclado a: ${primarySignal.detalle} Resuelve la duda “${conv.friccion[0]?.duda ?? ""}” antes de que su cliente se vaya.`
        : `Cubre el objetivo del rubro (${conv.objetivo}) para ${nombre} en ${zona}.`,
    },
    input,
  );
}

function sanitizeDemo(demo: DemoMockup, input: DemoInput): DemoMockup {
  const nombre = input.lead.nombre;
  // Forzar nombre real si el modelo lo omitió
  if (!demo.headline?.includes(nombre.split(" ")[0] ?? nombre)) {
    demo.headline = nombre;
  }
  if (!demo.search_title?.toLowerCase().includes(nombre.slice(0, 8).toLowerCase())) {
    demo.search_title = `${nombre} · ${input.lead.zona ?? ""}`.trim();
  }
  if (!demo.items?.length) {
    demo.items = itemsFor(
      resolvePlaybook(input.lead.tipo_negocio ?? "general").id,
      nombre,
      "",
    );
  }
  if (!demo.palette?.accent) {
    demo.palette = paletteFor(
      resolvePlaybook(input.lead.tipo_negocio ?? "general").id,
    );
  }
  return demo;
}

function paletteFor(playbookId: string): DemoMockup["palette"] {
  switch (playbookId) {
    case "comida":
      return {
        bg: "#f3efe6",
        surface: "#fffdf8",
        text: "#1c1914",
        accent: "#0b6e4f",
        muted: "#6b6458",
      };
    case "hoteleria":
      return {
        bg: "#f0ebe3",
        surface: "#fffcf7",
        text: "#1a1510",
        accent: "#8b4513",
        muted: "#6e6256",
      };
    case "tours":
      return { bg: "#eaf4f6", surface: "#ffffff", text: "#0c1f24", accent: "#0e7490", muted: "#4f6970" };
    case "veterinaria":
      return { bg: "#f2f6ee", surface: "#ffffff", text: "#172012", accent: "#3f7d20", muted: "#5d6b55" };
    case "educacion":
      return { bg: "#eef1f8", surface: "#ffffff", text: "#121829", accent: "#1d4ed8", muted: "#586079" };
    case "inmobiliaria":
      return { bg: "#f3f1ec", surface: "#ffffff", text: "#191712", accent: "#1f3a5f", muted: "#66625a" };
    case "salud":
      return {
        bg: "#eef5f2",
        surface: "#ffffff",
        text: "#12201a",
        accent: "#0f766e",
        muted: "#5b6b64",
      };
    default:
      return {
        bg: "#f4f2ee",
        surface: "#ffffff",
        text: "#171717",
        accent: "#0b6e4f",
        muted: "#5c5c57",
      };
  }
}

export function itemsFor(
  playbookId: string,
  _nombre: string,
  reviewBlob: string,
): DemoMockup["items"] {
  const lower = reviewBlob.toLowerCase();
  if (playbookId === "comida") {
    const base = [
      { name: "Ceviche de camarón", price_hint: "$180", note: "Porción generosa" },
      { name: "Pescado zarandeado", price_hint: "$320", note: "Para 2" },
      { name: "Ostiones", price_hint: "$150", note: "Orden" },
      { name: "Agua de jamaica", price_hint: "$35" },
    ];
    if (/taco|tacos/.test(lower)) {
      base.unshift({ name: "Tacos de pescado", price_hint: "$25 c/u" });
    }
    if (/pulpo/.test(lower)) {
      base.splice(1, 0, { name: "Pulpo a la parrilla", price_hint: "$280" });
    }
    return base.slice(0, 5);
  }
  if (playbookId === "hoteleria") {
    return [
      { name: "Habitación estándar", price_hint: "desde $890", note: "2 pax" },
      { name: "Habitación vista", price_hint: "desde $1,250" },
      { name: "Suite", price_hint: "desde $1,800", note: "Fin de semana" },
      { name: "Desayuno incluido", price_hint: "+$120" },
    ];
  }
  if (playbookId === "salud" || playbookId === "belleza") {
    return [
      { name: "Consulta / cita", price_hint: "desde $400" },
      { name: "Seguimiento", price_hint: "$250" },
      { name: "Paquete 3 sesiones", price_hint: "$1,100" },
    ];
  }
  if (playbookId === "veterinaria") {
    return [
      { name: "Consulta general", price_hint: "desde $350" },
      { name: "Vacunas", price_hint: "desde $250" },
      { name: "Baño y corte", price_hint: "desde $300", note: "Según tamaño" },
      { name: "Desparasitación", price_hint: "desde $150" },
    ];
  }
  if (playbookId === "tours") {
    const base = [
      { name: "Paseo en lancha", price_hint: "$450 p/p", note: "2 horas" },
      { name: "Tour de snorkel", price_hint: "$650 p/p", note: "Incluye equipo" },
      { name: "Atardecer en el mar", price_hint: "$550 p/p" },
    ];
    if (/ballena/.test(lower)) base.unshift({ name: "Avistamiento de ballenas", price_hint: "$900 p/p", note: "Temporada dic–mar" });
    if (/pesca/.test(lower)) base.unshift({ name: "Pesca deportiva", price_hint: "desde $3,500", note: "Hasta 4 personas" });
    return base.slice(0, 4);
  }
  if (playbookId === "educacion") {
    return [
      { name: "Preescolar", price_hint: "Pedir informes" },
      { name: "Primaria", price_hint: "Pedir informes" },
      { name: "Clases extra (inglés, música)", price_hint: "Pedir informes" },
    ];
  }
  if (playbookId === "inmobiliaria") {
    return [
      { name: "Casa 3 recámaras", price_hint: "Preguntar precio", note: "Con jardín" },
      { name: "Departamento en renta", price_hint: "Preguntar precio" },
      { name: "Terreno", price_hint: "Preguntar precio", note: "Listo para construir" },
    ];
  }
  return [
    { name: "Servicio principal", price_hint: "Cotizar" },
    { name: "Servicio express", price_hint: "Cotizar" },
    { name: "Paquete", price_hint: "Cotizar" },
  ];
}

const DEMO_SCHEMA = {
  type: "OBJECT",
  properties: {
    search_query: { type: "STRING" },
    search_title: { type: "STRING" },
    search_snippet: { type: "STRING" },
    headline: { type: "STRING" },
    tagline: { type: "STRING" },
    vibe: { type: "STRING" },
    palette: {
      type: "OBJECT",
      properties: {
        bg: { type: "STRING" },
        surface: { type: "STRING" },
        text: { type: "STRING" },
        accent: { type: "STRING" },
        muted: { type: "STRING" },
      },
      required: ["bg", "surface", "text", "accent", "muted"],
    },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          price_hint: { type: "STRING" },
          note: { type: "STRING", nullable: true },
        },
        required: ["name", "price_hint"],
      },
    },
    flow_steps: { type: "ARRAY", items: { type: "STRING" } },
    cta_label: { type: "STRING" },
    cta_prefill: { type: "STRING" },
    why_this: { type: "STRING" },
  },
  required: [
    "search_query",
    "search_title",
    "search_snippet",
    "headline",
    "tagline",
    "vibe",
    "palette",
    "items",
    "flow_steps",
    "cta_label",
    "cta_prefill",
    "why_this",
  ],
};
