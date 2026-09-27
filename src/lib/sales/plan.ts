import { conversionBrief } from "@/lib/categories/conversion";
import { resolvePlaybook } from "@/lib/categories/playbooks";
import type { Offer } from "@/lib/sales/offer";
import type { CadenceStep, Etapa, Objecion, SalesPlan } from "@/lib/sales/types";

export type { CadenceStep, Etapa, Objecion, SalesPlan };

type PlanInput = {
  lead: {
    nombre: string;
    tipo_negocio: string | null;
    zona: string | null;
    metadata: Record<string, unknown> | null;
  };
  signals: Array<{ tipo_signal: string; detalle: string | null }>;
  producto: string;
  offer: Offer;
  escenario: string | null;
  demoTipo: "landing" | "whatsapp";
  lecciones: string[];
};

/** Esqueleto de la cadencia: días y condiciones son ingeniería fija; el copy lo escribe el LLM. */
function skeleton(offer: Offer, demoTipo: "landing" | "whatsapp") {
  const d = Math.max(offer.prueba.dias, 7);
  const base: Array<Omit<CadenceStep, "mensaje" | "tip">> = [
    { etapa: "apertura", dia: 0, cuando: "Primer contacto. Sin link ni precio.", objetivo: "Que diga “sí, mándelo”", adjunto: null },
    { etapa: "entrega_demo", dia: 0, cuando: "En cuanto responda (aunque sea “¿qué es?”).", objetivo: "Que abra la demo y opine", adjunto: demoTipo },
    { etapa: "seguimiento", dia: 1, cuando: "Si la vio y no contestó (o no respondió la apertura).", objetivo: "Reabrir con una pregunta fácil", adjunto: null },
    { etapa: "oferta_prueba", dia: 3, cuando: "Cuando muestre interés o pregunte precio.", objetivo: "Arrancar la prueba sin pago", adjunto: null },
    { etapa: "check_prueba", dia: 3 + Math.ceil(d / 2), cuando: "A mitad de la prueba.", objetivo: "Mostrar resultados y resolver dudas", adjunto: null },
    { etapa: "cierre", dia: 3 + d, cuando: "Último día de prueba.", objetivo: "Elegir plan y fecha de pago", adjunto: null },
    { etapa: "despedida", dia: 3 + d + 4, cuando: "Si dejó de responder en cualquier punto.", objetivo: "Respuesta por aversión a perder", adjunto: null },
  ];
  return base;
}

export async function generateSalesPlan(input: PlanInput): Promise<SalesPlan> {
  const key = process.env.GEMINI_API_KEY;
  if (key && !key.includes("your_gemini")) {
    try {
      return await geminiPlan(input);
    } catch {
      // plantilla
    }
  }
  return templatePlan(input);
}

const COPY_RULES = `Eres el mejor vendedor por WhatsApp de negocios locales en Nayarit/Vallarta. Escribes copys que SÍ se contestan.

REGLAS DE COPY (obligatorias):
- Mensajes cortos: máximo 3 líneas / ~280 caracteres (el cierre puede ser más largo por los planes). Se leen en la notificación.
- De "usted", cálido y natural, como alguien de la región. Cero lenguaje de agencia ("transformación digital", "soluciones", "potenciar", "presencia online").
- UNA sola pregunta por mensaje, fácil de contestar (sí/no o elegir entre dos).
- Especificidad real > adjetivos: usa el nombre, la zona, su rating, número de reseñas, un platillo/servicio que elogian en reseñas.
- Reciprocidad: ya le hicimos algo (la demo) sin costo; se ofrece como regalo, no como venta.
- APERTURA: sin link, sin precio, sin presentarse como "desarrollador". Observación específica y halagadora + "le armé X" + pregunta de permiso.
- ENTREGA: link como {link} + una línea de lo que va a ver + pregunta de involucramiento ("¿qué le cambiaría?").
- SEGUIMIENTO: no "¿lo vio?"; curiosidad o dato nuevo, una pregunta.
- OFERTA DE PRUEBA: riesgo cero explícito (usa la condición de prueba dada). Lo único que le pedimos: poner el link como "Sitio web" en su perfil de Google Maps y en su WhatsApp (nosotros lo guiamos, 2 minutos). Explica en una frase por qué: quien lo busca en Google ya ve su ficha; ahora verá su página. Pregunta de fecha ("¿arrancamos hoy o mañana?"). Aún sin precio salvo que lo pida.
- CHECK DE PRUEBA: usa los tokens literales {visitas} y {clics_whatsapp} (se reemplazan con los números reales) y {reporte} (link a su reporte) + pregunta.
- CIERRE: abre con el resultado ({visitas} visitas, {clics_whatsapp} quisieron escribirle) y luego presenta los 3 planes con el Recomendado primero y marcado; precio como instalación + mensualidad y el ancla diaria; opción de instalación en 2 pagos si aplica; pregunta de elección ("¿Recomendado o Esencial?").
- No prometas que saldrá en Google orgánico durante la prueba; el tráfico viene de su ficha de Maps, WhatsApp y redes.
- DESPEDIDA (break-up): corto, sin culpa, deja la puerta abierta ("¿lo dejo aquí o lo retomamos en otro momento?").
- NUNCA exhibir sus problemas de forma humillante ("su página no sirve", "sus clientes se quejan"). Plantéalo como oportunidad o como lo que ganan sus clientes.
- No inventes datos (resultados, clientes, cifras) que no estén en los datos.
- Usa emojis con moderación (0–1 por mensaje).
- tip: consejo táctico breve para el vendedor en ese paso (qué hacer si responde X).

OBJECIONES: escribe 5–6 respuestas cortas a objeciones típicas del rubro ("está caro", "lo pienso", "ya tengo Facebook", "mi sobrino me lo hace", "no tengo tiempo", "¿y si no funciona?"). Técnica: validar → reencuadrar con dato/beneficio → pregunta.`;

async function geminiPlan(input: PlanInput): Promise<SalesPlan> {
  const playbook = resolvePlaybook(input.lead.tipo_negocio ?? "general");
  const meta = input.lead.metadata ?? {};
  const reviews = Array.isArray(meta.reviews)
    ? (meta.reviews as Array<{ text?: string; rating?: number }>)
        .filter((r) => (r.rating ?? 5) >= 4 && r.text)
        .slice(0, 5)
    : [];
  const pasos = skeleton(input.offer, input.demoTipo);

  const user = JSON.stringify(
    {
      negocio: {
        nombre: input.lead.nombre,
        rubro: playbook.label,
        zona: input.lead.zona,
        rating: meta.rating ?? null,
        total_reseñas: meta.user_rating_count ?? null,
        reseñas_positivas: reviews,
      },
      hallazgos_internos: input.signals
        .filter((s) => s.tipo_signal !== "playbook_categoria")
        .map((s) => s.detalle),
      producto: input.producto,
      demo_que_ya_hicimos: input.demoTipo === "landing" ? "Una página web con su marca, fotos y reseñas" : "Una demo de su WhatsApp atendiendo solo, en un celular",
      oferta: input.offer,
      escenario: input.escenario,
      conversion_rubro: conversionBrief(playbook.id),
      lecciones_de_rechazos: input.lecciones.slice(0, 8),
      pasos_a_escribir: pasos.map((p) => ({ etapa: p.etapa, dia: p.dia, cuando: p.cuando, objetivo: p.objetivo })),
    },
    null,
    2,
  );

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: COPY_RULES }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 6000,
          responseMimeType: "application/json",
          responseSchema: PLAN_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini sin plan");
  const parsed = JSON.parse(text) as {
    pasos: Array<{ etapa: Etapa; mensaje: string; tip: string }>;
    objeciones: Objecion[];
    evitar: string;
  };

  const fallback = templatePlan(input);
  return {
    pasos: pasos.map((p, i) => {
      const w = parsed.pasos.find((x) => x.etapa === p.etapa);
      return {
        ...p,
        mensaje: w?.mensaje?.trim() || fallback.pasos[i].mensaje,
        tip: w?.tip?.trim() || fallback.pasos[i].tip,
      };
    }),
    objeciones: parsed.objeciones?.length ? parsed.objeciones : fallback.objeciones,
    evitar: parsed.evitar || fallback.evitar,
    generado_por: "gemini",
  };
}

function templatePlan(input: PlanInput): SalesPlan {
  const playbook = resolvePlaybook(input.lead.tipo_negocio ?? "general");
  const n = input.lead.nombre;
  const zona = input.lead.zona ?? "la zona";
  const meta = input.lead.metadata ?? {};
  const rating = meta.rating ? `★${meta.rating}` : null;
  const count = meta.user_rating_count ? `${meta.user_rating_count} reseñas` : null;
  const prueba = input.offer.prueba;
  const rec = input.offer.planes.find((p) => p.recomendado)!;
  const es = input.offer.planes.find((p) => p.id === "esencial")!;
  const cliente =
    playbook.id === "hoteleria" ? "huésped" : playbook.id === "salud" ? "paciente" : "cliente";
  const accion =
    playbook.id === "hoteleria" ? "reserva" : playbook.id === "comida" ? "pedido" : playbook.id === "salud" || playbook.id === "belleza" ? "cita" : "mensaje";
  const demo = input.demoTipo === "landing" ? "una página" : "una demo de su WhatsApp atendiendo solo";
  const halago = rating && count ? `Vi que ${n} tiene ${rating} con ${count} en Google, ¡se nota que la gente los quiere!` : `Vi ${n} en Google aquí en ${zona}.`;
  const fmt = (v: number) => `$${v.toLocaleString("es-MX")}`;

  const msgs: Record<Etapa, { mensaje: string; tip: string }> = {
    apertura: {
      mensaje: `Hola, buen día 👋 ${halago}\nLe armé ${demo} para ${n}, sin costo. ¿Se la mando por aquí?`,
      tip: "Si pregunta “¿cuánto cuesta?” antes de ver: “Primero véala; si no le gusta, no pasa nada.”",
    },
    entrega_demo: {
      mensaje: `Aquí está 👉 {link}\nEs como la vería su ${cliente} desde el celular, con sus fotos y reseñas. ¿Qué le cambiaría?`,
      tip: "Si responde con cambios, ya está comprando: anótalos y pasa a la oferta de prueba.",
    },
    seguimiento: {
      mensaje: `Una pregunta rápida: ¿hoy cómo le llegan más ${accion === "mensaje" ? "clientes" : `${accion}s`}, por teléfono o por WhatsApp?`,
      tip: "Cualquier respuesta sirve para conectar con la demo: “justo eso lo resuelve lo que le mandé”.",
    },
    oferta_prueba: {
      mensaje: `Le propongo algo: se la dejo funcionando ${prueba.dias} días gratis. Solo la ponemos como “sitio web” en su Google Maps y su WhatsApp (yo le guío, 2 min), así quien ya lo busca la ve. ${prueba.condicion} ¿Arrancamos hoy o mañana?`,
      tip: "Al aceptar: “Aceptó: iniciar prueba” y luego “Mandar instrucciones al dueño” en Activación. Si no sabe, hazlo con él por llamada.",
    },
    check_prueba: {
      mensaje: `¿Cómo va? En estos días su página lleva {visitas} visitas y {clics_whatsapp} personas tocaron WhatsApp 🙌 Aquí lo puede ver: {reporte}\n¿Le han llegado mensajes con “Vi su página”?`,
      tip: "Si hay pocas visitas, revisa que el link sí esté en su Google Maps y súbelo a Facebook/estados juntos.",
    },
    cierre: {
      mensaje: `Terminó la prueba 🙌 Resultado: {visitas} visitas y {clics_whatsapp} personas quisieron escribirle.\nPara dejarla fija:\n⭐ Recomendado: ${fmt(rec.instalacion)} instalación + ${fmt(rec.mensual)}/mes (${input.offer.ancla_diaria})\n• Esencial: ${fmt(es.instalacion)} + ${fmt(es.mensual)}/mes\n${input.offer.instalacion_diferida ? "La instalación se puede en 2 pagos. " : ""}¿Cuál le acomoda mejor?`,
      tip: "Si duda por precio, baja a Esencial antes que descontar el Recomendado.",
    },
    despedida: {
      mensaje: `Hola, no quiero ser insistente 🙂 ¿Lo dejo aquí o prefiere que lo retomemos en otro momento?`,
      tip: "Este mensaje suele tener la tasa de respuesta más alta. Si dice “otro momento”, agenda fecha.",
    },
  };

  return {
    pasos: skeleton(input.offer, input.demoTipo).map((p) => ({ ...p, ...msgs[p.etapa] })),
    objeciones: [
      { objecion: "Está caro", respuesta: `Lo entiendo. Son ${input.offer.ancla_diaria}; con un solo ${accion} extra al mes ya se pagó. ¿Le late empezar con el Esencial?` },
      { objecion: "Lo pienso", respuesta: `Claro. Mientras, ¿se la dejo funcionando los ${prueba.dias || 7} días gratis? Así decide viéndola trabajar.` },
      { objecion: "Ya tengo Facebook", respuesta: `¡Qué bueno! Esto no lo reemplaza: cuando lo buscan en Google llegan aquí y de aquí directo a su WhatsApp. ¿Se lo conecto a su Facebook también?` },
      { objecion: "Mi sobrino me lo hace", respuesta: `Perfecto, que lo haga. Solo le pido que compare con esta que ya está lista y con su marca. ¿Se la dejo de referencia?` },
      { objecion: "No tengo tiempo", respuesta: `Por eso ya está hecha. De usted solo necesito confirmar su WhatsApp. ¿Se la activo hoy?` },
      { objecion: "¿Y si no funciona?", respuesta: `${prueba.condicion} El riesgo es mío. ¿Arrancamos?` },
    ],
    evitar: "No mandar precio antes de que vea la demo. No mandar más de un mensaje seguido sin respuesta. No criticar lo que tiene hoy.",
    generado_por: "plantilla",
  };
}

const PLAN_SCHEMA = {
  type: "OBJECT",
  properties: {
    pasos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          etapa: {
            type: "STRING",
            enum: ["apertura", "entrega_demo", "seguimiento", "oferta_prueba", "check_prueba", "cierre", "despedida"],
          },
          mensaje: { type: "STRING" },
          tip: { type: "STRING" },
        },
        required: ["etapa", "mensaje", "tip"],
      },
    },
    objeciones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          objecion: { type: "STRING" },
          respuesta: { type: "STRING" },
        },
        required: ["objecion", "respuesta"],
      },
    },
    evitar: { type: "STRING" },
  },
  required: ["pasos", "objeciones", "evitar"],
};
