import { resolvePlaybook } from "@/lib/categories/playbooks";
import type { DemoAssets } from "@/lib/demo/assets";
import { itemsFor } from "@/lib/demo/generate";
import {
  conversionProfile,
  fillTokens,
  type ConversionProfile,
} from "@/lib/categories/conversion";
import {
  landingTemplate,
  whatsappTemplate,
  type Benefit,
  type ChatStep,
  type DeliverableData,
  type FaqItem,
} from "@/lib/demo/templates";
import type { DemoMockup } from "@/lib/demo/types";
import { waLink } from "@/lib/phone";

export type DeliverableTipo = "landing" | "whatsapp";

export type DeliverableInput = {
  lead: {
    id: string;
    nombre: string;
    tipo_negocio: string | null;
    zona: string | null;
    telefono: string | null;
    metadata: Record<string, unknown> | null;
  };
  signals: Array<{ tipo_signal: string; detalle: string | null }>;
  producto: string;
  mockup: DemoMockup | null;
  assets: DemoAssets;
  tipo: DeliverableTipo;
};

export type DeliverableResult = {
  html: string;
  engine: "gemini" | "plantilla";
};

/** Todo mensaje que sale de la página empieza igual: el dueño reconoce los clientes que trajo. */
function webPrefill(mockup: DemoMockup | null): string {
  const rest = (mockup?.cta_prefill ?? "").replace(/^\s*hola[^,.!]*[,.!]\s*/i, "");
  return `Hola, vi su página 👋 ${rest}`.trim() + " ";
}

/** Qué entregable corresponde al producto sugerido. */
export function pickDeliverableType(producto: string | null | undefined): DeliverableTipo {
  const p = (producto ?? "").toLowerCase();
  if (/whats|pedido|automat|bot|agenda|cita|recordatorio|reservaci[oó]n por/.test(p)) {
    if (!/sitio|web|p[aá]gina|landing/.test(p)) return "whatsapp";
  }
  return "landing";
}

export async function buildDeliverable(
  input: DeliverableInput,
): Promise<DeliverableResult> {
  const key = process.env.GEMINI_API_KEY;
  if (key && !key.includes("your_gemini")) {
    try {
      const html = await geminiHtml(input);
      return { html, engine: "gemini" };
    } catch {
      // fallback a plantilla
    }
  }
  return { html: templateHtml(input), engine: "plantilla" };
}

const LANDING_RULES = `REGLA DE NEGOCIO (no negociable): la landing debe ser IMPACTANTE, con muchos efectos "WOW", nivel agencia premium.
Efectos obligatorios (CSS + JS vanilla, sin librerías externas):
- Hero a pantalla completa con la foto real principal, Ken Burns / parallax al hacer scroll y overlay degradado
- Título con animación de entrada por palabra o letra (split text)
- Scroll reveals escalonados con IntersectionObserver en todas las secciones
- Contadores animados (rating, reseñas, años, etc. SOLO si hay dato real)
- Marquee infinito de reseñas REALES (citas textuales, autor si existe)
- Tarjetas con tilt 3D al mover el mouse y glassmorphism
- Botón CTA con brillo animado (shine) y efecto magnético
- Botón flotante de WhatsApp con pulso
- Galería con zoom suave usando las fotos reales
- Cursor glow / spotlight que sigue el puntero en desktop
- Nav que se vuelve sólida con blur al hacer scroll
- Respetar prefers-reduced-motion

AUDIENCIA: la landing es la página REAL del negocio y le habla a SU cliente final (comensal, huésped, paciente…), en segunda persona. NO le habla al dueño.
ESTRUCTURA: sigue EXACTAMENTE la "anatomia_conversion" del rubro, en ese orden, con sus elementos.
CRO: aplica los "factores_confianza" y "factores_urgencia" del rubro (urgencia solo si es verdadera o genérica, nunca inventes ofertas).
FRICCIÓN: responde cada "duda_critica" dentro de la página (FAQ, microcopy junto al CTA o en la sección que toque) usando la respuesta sugerida o datos reales.
Respeta "evitar".`;

const INTERNAL_RULE = `CONFIDENCIAL — "dolencias_internas" son hallazgos de NUESTRO equipo de ventas (no tiene sitio, depende de apps, reseñas que se quejan, etc.).
- NUNCA las menciones, cites ni insinúes en la página: nada de "antes / ahora", "ya no pierdas pedidos", "sin comisiones de Booking", "ahora sí contestamos", ni reseñas negativas.
- Resuélvelas en SILENCIO con funcionalidad y diseño (ej. si no hay menú online → menú completo; si las quejas son por no contestar → CTA de WhatsApp prominente y "respuesta inmediata").
- No afirmes datos no verificados (formas de pago, estacionamiento, tarifas, descuentos, garantías): si no están en los datos, invita a confirmar por WhatsApp.`;

const WHATSAPP_RULES = `REGLA DE NEGOCIO (no negociable): la demo debe ser IMPACTANTE, con efectos "WOW".
Construye una página con un CELULAR realista (marco, notch, barra de WhatsApp verde #075e54, fondo de chat beige con patrón) donde una conversación se reproduce SOLA en loop:
- Indicador "escribiendo…" antes de cada respuesta del bot, burbujas que aparecen con animación pop, palomitas azules ✓✓, hora real
- Botones de respuesta rápida / lista interactiva (estilo WhatsApp Business) que se "presionan"
- El chat es entre un CLIENTE FINAL real y el bot del negocio; resuelve el "objetivo" del rubro y sus "dudas_criticas" (ej. menú → pedido → total → confirmación → tiempo estimado; o disponibilidad → reserva → anticipo → confirmación; o cita → recordatorio)
- El panel lateral sí le habla al DUEÑO, en positivo (lo que gana), sin exhibir sus problemas ni citar quejas
- Al terminar: notificación tipo toast "nuevo pedido/reserva/cita" para el dueño, pausa y se reinicia; botón "Ver de nuevo"
- Al lado del celular (abajo en móvil): panel "lo que usted recibe" con checks que se van encendiendo sincronizados con el chat
- Fondo con blobs de color animados, teléfono flotando suavemente
- Usa el logo real como avatar del chat si existe
- Todo en español de México, precios en MXN creíbles para la zona`;

async function geminiHtml(input: DeliverableInput): Promise<string> {
  const playbook = resolvePlaybook(input.lead.tipo_negocio ?? "general");
  const { lead, assets } = input;
  const conv = conversionProfile(playbook.id);
  const friction = input.signals.filter((s) => s.tipo_signal !== "playbook_categoria");
  const wa = waLink(lead.telefono, webPrefill(input.mockup));

  const system = `Eres un director creativo + frontend senior. Generas UN SOLO documento HTML completo, autocontenido (CSS en <style>, JS en <script>), listo para enviarse al dueño del negocio como propuesta real.

${input.tipo === "landing" ? LANDING_RULES : WHATSAPP_RULES}

${INTERNAL_RULE}

Reglas de contenido:
- Usa el NOMBRE REAL del negocio, su zona y su teléfono real en los enlaces de WhatsApp (usa exactamente la URL wa_url dada).
- Imágenes: usa ÚNICAMENTE las URLs dadas en "imagenes" y "logo". Nunca inventes URLs de imágenes ni uses placeholders/unsplash. Si no hay logo, crea un logotipo tipográfico elegante con las iniciales.
- Reseñas: solo citas reales de la lista dada; puedes recortarlas, nunca inventarlas.
- Nada de lorem ipsum, "Negocio demo", "Cliente ejemplo". Nada de paleta púrpura genérica.
- Paleta: deriva del theme_color/logo si existe, si no de la ambientación del rubro y la zona (costa nayarita, sierra, pueblo mágico, ciudad).
- Tipografía: puedes usar Google Fonts vía <link>. No uses otros recursos externos.
- Mobile-first, se ve perfecto en 390px y en desktop.
${input.tipo === "landing" ? `- SEO LOCAL listo para cuando viva en su dominio: <title> "{Nombre} | {rubro} en {zona}, Nayarit" (≤60 caracteres), meta description con zona + beneficio (≤155), Open Graph (og:title, og:description, og:image con la foto principal), un solo <h1> con el nombre, y JSON-LD schema.org del tipo correcto (Restaurant, Hotel, Dentist/MedicalClinic, BeautySalon, AutoRepair, ExerciseGym, Store o LocalBusiness) con name, address, telephone, url, image, openingHours y aggregateRating SOLO si hay datos. No pongas meta robots.
` : ""}${input.tipo === "whatsapp" ? '- Pie discreto: "Demo preparada para {nombre}".\n' : "- Sin pies tipo \"propuesta\" o \"demo\": debe verse como el sitio oficial del negocio.\n"}- Devuelve SOLO el HTML, empezando con <!doctype html>. Sin markdown, sin explicación.`;

  const user = JSON.stringify(
    {
      tipo_entregable: input.tipo,
      producto_que_vendemos: input.producto,
      negocio: {
        nombre: lead.nombre,
        rubro: lead.tipo_negocio,
        zona: lead.zona,
        telefono: lead.telefono,
        wa_url: wa,
        direccion: assets.address,
        google_maps: assets.maps_uri,
        horarios: assets.hours,
        rating: assets.rating,
        total_reseñas: assets.reviews_count,
        resumen_google: assets.editorial_summary,
        sitio_titulo: assets.website_title,
        sitio_descripcion: assets.website_description,
        theme_color: assets.theme_color,
      },
      logo: assets.logo_url,
      imagenes: assets.photos.map((p) => p.url),
      reseñas_reales: assets.reviews
        .filter((r) => r.text.trim() && (r.rating ?? 5) >= 4)
        .slice(0, 8),
      dolencias_internas: friction.map((s) => ({
        tipo: s.tipo_signal,
        detalle: s.detalle,
      })),
      rubro: playbook.label,
      objetivo: conv.objetivo,
      cta_primario: conv.cta_primario,
      cta_secundario: conv.cta_secundario,
      quien_busca: conv.quien_busca,
      como_busca: conv.como_busca,
      anatomia_conversion: conv.anatomia,
      factores_confianza: conv.confianza,
      factores_urgencia: conv.urgencia,
      dudas_criticas: conv.friccion,
      evitar: conv.evitar,
      propuesta_previa: input.mockup
        ? {
            lo_que_busca_su_cliente: input.mockup.search_query,
            tagline: input.mockup.tagline,
            vibe: input.mockup.vibe,
            items: input.mockup.items,
            flujo: input.mockup.flow_steps,
            cta: input.mockup.cta_label,
            paleta: input.mockup.palette,
          }
        : null,
    },
    null,
    2,
  );

  const model =
    process.env.GEMINI_DEMO_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 32000,
          responseMimeType: "text/plain",
        },
      }),
      signal: AbortSignal.timeout(240_000),
    },
  );
  if (!res.ok) throw new Error(await res.text());

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    }>;
  };
  const raw = data.candidates?.[0]?.content?.parts
    ?.filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
  if (!raw) throw new Error("Gemini sin HTML");

  const html = extractHtml(raw);
  if (!html) throw new Error("HTML inválido o truncado");
  return html;
}

function extractHtml(raw: string): string | null {
  let s = raw.trim().replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "");
  const start = s.search(/<!doctype html|<html/i);
  if (start < 0) return null;
  s = s.slice(start);
  const end = s.toLowerCase().lastIndexOf("</html>");
  if (end < 0) return null;
  s = s.slice(0, end + "</html>".length);
  if (s.length < 2000) return null;
  return s;
}

/** Señal interna → beneficio que ve el cliente final (sin exponer la señal). */
const SIGNAL_BENEFITS: Record<string, Benefit> = {
  falta_menu: { titulo: "Menú a la vista", texto: "Platillos y precios antes de pedir." },
  falta_orders: { titulo: "Pide en un toque", texto: "Tu pedido llega armado por WhatsApp." },
  menu_sin_canal_pedido: { titulo: "Del menú al pedido", texto: "Elige y envía tu pedido sin llamar." },
  usa_apps_delivery: { titulo: "Pide directo", texto: "Directo con el negocio, sin apps de por medio." },
  falta_booking: { titulo: "Reserva directo", texto: "Consulta disponibilidad y aparta por WhatsApp." },
  depende_otas: { titulo: "Trato directo", texto: "Reserva con el hotel, sin intermediarios." },
  falta_appointments: { titulo: "Agenda en línea", texto: "Elige día y hora desde tu celular." },
  falta_quotes: { titulo: "Cotiza con una foto", texto: "Mándanos foto y te damos precio." },
  falta_catalog: { titulo: "Catálogo con precios", texto: "Mira lo disponible antes de ir." },
  falta_whatsapp: { titulo: "WhatsApp directo", texto: "Escríbenos en un toque." },
  sin_telefono: { titulo: "WhatsApp directo", texto: "Escríbenos en un toque." },
  quejas_resenas: { titulo: "Respuesta inmediata", texto: "Te contestamos por WhatsApp al momento." },
};

function benefitsFrom(input: DeliverableInput, conv: ConversionProfile): Benefit[] {
  const out: Benefit[] = [];
  const seen = new Set<string>();
  for (const s of input.signals) {
    const b = SIGNAL_BENEFITS[s.tipo_signal];
    if (b && !seen.has(b.titulo)) {
      seen.add(b.titulo);
      out.push(b);
    }
  }
  for (const p of conv.promesas) {
    if (out.length >= 4) break;
    if (!seen.has(p.titulo)) {
      seen.add(p.titulo);
      out.push(p);
    }
  }
  return out.slice(0, 4);
}

function faqFrom(input: DeliverableInput, conv: ConversionProfile): FaqItem[] {
  const hoy = input.assets.hours.length ? input.assets.hours.join(" · ") : null;
  return conv.friccion
    .map((f) => {
      const respuesta = fillTokens(f.respuesta, {
        horario: hoy,
        direccion: input.assets.address,
        nombre: input.lead.nombre,
      });
      return respuesta ? { duda: f.duda, respuesta } : null;
    })
    .filter((f): f is FaqItem => f !== null);
}

const OFFER_LABEL: Record<string, string> = {
  comida: "Menú",
  hoteleria: "Habitaciones",
  salud: "Servicios",
  belleza: "Servicios",
  automotriz: "Servicios",
  fitness: "Planes",
  retail: "Catálogo",
  servicios: "Servicios",
  general: "Lo que ofrecemos",
};

function baseData(input: DeliverableInput): DeliverableData {
  const playbook = resolvePlaybook(input.lead.tipo_negocio ?? "general");
  const conv = conversionProfile(playbook.id);
  const m = input.mockup;
  const accent =
    input.assets.theme_color && /^#[0-9a-f]{6}$/i.test(input.assets.theme_color)
      ? input.assets.theme_color
      : m?.palette?.accent ?? "#0b6e4f";
  const cta = m?.cta_label ?? conv.cta_primario;
  return {
    nombre: input.lead.nombre,
    zona: input.lead.zona ?? "Nayarit",
    rubro: input.lead.tipo_negocio ?? playbook.label,
    playbook_id: playbook.id,
    producto: input.producto,
    tagline:
      m?.tagline ??
      input.assets.editorial_summary ??
      input.assets.website_description ??
      `${playbook.label} en ${input.lead.zona ?? "Nayarit"}`,
    beneficios: benefitsFrom(input, conv),
    faq: faqFrom(input, conv),
    offer_label: OFFER_LABEL[playbook.id] ?? "Lo que ofrecemos",
    items: m?.items?.length
      ? m.items
      : itemsFor(
          playbook.id,
          input.lead.nombre,
          input.assets.reviews.map((r) => r.text).join(" "),
        ),
    accent,
    wa_url: waLink(input.lead.telefono, webPrefill(m)),
    cta_label: cta,
    assets: input.assets,
  };
}

function templateHtml(input: DeliverableInput): string {
  const d = baseData(input);
  if (input.tipo === "landing") return landingTemplate(d);
  const { script, owner, toast } = chatScript(d);
  return whatsappTemplate(d, script, owner, toast);
}

function chatScript(d: DeliverableData): {
  script: ChatStep[];
  owner: string[];
  toast: string;
} {
  const items = d.items.length
    ? d.items
    : [
        { name: "Opción 1", price_hint: "$250" },
        { name: "Opción 2", price_hint: "$350" },
      ];
  const lista = items
    .slice(0, 4)
    .map((i) => `• ${i.name} — ${i.price_hint}`)
    .join("\n");

  if (d.playbook_id === "hoteleria") {
    return {
      script: [
        { from: "cliente", text: "Hola, ¿tienen habitación para este fin de semana? Somos 2" },
        { from: "bot", text: `¡Hola! Bienvenido a ${d.nombre} 🌴\nEstas son las opciones disponibles:`, buttons: items.slice(0, 3).map((i) => i.name) },
        { from: "cliente", text: items[0].name },
        { from: "bot", text: `Excelente elección.\n${items[0].name}: ${items[0].price_hint} por noche.\n¿Llegada viernes y salida domingo?`, buttons: ["Sí, confirmar", "Cambiar fechas"] },
        { from: "cliente", text: "Sí, confirmar" },
        { from: "bot", text: "Listo ✅ Su reserva quedó apartada.\nLe envío los datos para el anticipo y la ubicación 📍" },
      ],
      owner: [
        "Responde disponibilidad al instante, aunque sea de madrugada",
        "Reserva directa: sin comisión de Booking",
        "Anticipo y datos del huésped ordenados",
        "Aviso inmediato de cada reserva nueva",
      ],
      toast: `Nueva reserva directa en ${d.nombre}`,
    };
  }

  if (d.playbook_id === "salud" || d.playbook_id === "belleza" || d.playbook_id === "fitness") {
    return {
      script: [
        { from: "cliente", text: "Hola, ¿me pueden dar una cita?" },
        { from: "bot", text: `¡Hola! Soy el asistente de ${d.nombre} 😊\n¿Qué servicio necesita?`, buttons: items.slice(0, 3).map((i) => i.name) },
        { from: "cliente", text: items[0].name },
        { from: "bot", text: "Tengo estos horarios disponibles mañana:", buttons: ["10:00", "12:30", "17:00"] },
        { from: "cliente", text: "12:30" },
        { from: "bot", text: `Confirmado ✅ ${items[0].name} mañana 12:30.\nLe recordaré un día antes para que no se le pase.` },
      ],
      owner: [
        "Agenda llena sin contestar mensajes a mano",
        "Recordatorios automáticos: menos citas perdidas",
        "Cada cliente queda registrado con su servicio",
        "Aviso de cada cita nueva",
      ],
      toast: `Nueva cita agendada en ${d.nombre}`,
    };
  }

  return {
    script: [
      { from: "cliente", text: "Hola, ¿qué tienen hoy?" },
      { from: "bot", text: `¡Hola! Bienvenido a ${d.nombre} 👋\nEsto es lo de hoy:\n${lista}`, buttons: ["Hacer pedido", "Ver ubicación"] },
      { from: "cliente", text: `Quiero ${items[0].name} y ${items[1]?.name ?? items[0].name}` },
      { from: "bot", text: `Perfecto 🙌\n1× ${items[0].name}\n1× ${items[1]?.name ?? items[0].name}\n¿Para recoger o a domicilio?`, buttons: ["Recoger", "A domicilio"] },
      { from: "cliente", text: "A domicilio" },
      { from: "bot", text: "Pedido confirmado ✅\nLlega en aprox. 35 min. Le aviso cuando salga 🛵" },
    ],
    owner: [
      "Atiende pedidos solo, incluso en hora pico",
      "Pedido completo y claro, sin errores de llamada",
      "Sin pagar comisión a apps de delivery",
      "Aviso inmediato de cada pedido",
    ],
    toast: `Nuevo pedido para ${d.nombre}`,
  };
}
