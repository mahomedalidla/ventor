import type { CategoryId } from "@/lib/categories/playbooks";
import { pricingTierForZona, type ZonaPricingTier } from "@/lib/zones";

/**
 * Oferta determinista (no la inventa el LLM):
 * instalación única + mensualidad, 3 planes con ancla (el del medio es el recomendado),
 * prueba gratis y garantía. Editar precios aquí.
 */

export type OfferLine = "landing" | "whatsapp" | "sitio_completo" | "a_medida";

export type Complejidad = "simple" | "media" | "alta";

/** Producto que no está en el catálogo: precio de referencia que el vendedor confirma. */
export type AMedida = {
  producto: string;
  complejidad: Complejidad;
  /** Qué es, en una línea que entienda el dueño */
  que_es: string;
  /** Cómo lo usa el cliente final (lo que muestra la demo) */
  demo_enfoque: string;
  incluye: Record<"esencial" | "recomendado" | "completo", string[]>;
  estimado_por: "gemini" | "reglas";
  confirmado: boolean;
};

export type Plan = {
  id: "esencial" | "recomendado" | "completo";
  nombre: string;
  instalacion: number;
  mensual: number;
  incluye: string[];
  recomendado: boolean;
};

export type Offer = {
  linea: OfferLine;
  planes: Plan[];
  plan_recomendado: Plan["id"];
  prueba: { dias: number; que_incluye: string; condicion: string };
  garantia: string;
  instalacion_diferida: boolean;
  ancla_diaria: string;
  resumen: string;
  a_medida?: AMedida;
};

type Base = { instalacion: number; mensual: number };

const BASE: Record<OfferLine, Record<Plan["id"], Base>> = {
  landing: {
    esencial: { instalacion: 1900, mensual: 249 },
    recomendado: { instalacion: 2900, mensual: 390 },
    completo: { instalacion: 4900, mensual: 790 },
  },
  whatsapp: {
    esencial: { instalacion: 1500, mensual: 490 },
    recomendado: { instalacion: 2500, mensual: 790 },
    completo: { instalacion: 4500, mensual: 1190 },
  },
  sitio_completo: {
    esencial: { instalacion: 5900, mensual: 590 },
    recomendado: { instalacion: 8900, mensual: 890 },
    completo: { instalacion: 12900, mensual: 1290 },
  },
  // a_medida se sobreescribe por complejidad (ver A_MEDIDA_BASE)
  a_medida: {
    esencial: { instalacion: 2900, mensual: 390 },
    recomendado: { instalacion: 4900, mensual: 590 },
    completo: { instalacion: 7900, mensual: 990 },
  },
};

const A_MEDIDA_BASE: Record<Complejidad, Record<Plan["id"], Base>> = {
  simple: BASE.a_medida,
  media: {
    esencial: { instalacion: 5900, mensual: 690 },
    recomendado: { instalacion: 8900, mensual: 990 },
    completo: { instalacion: 14900, mensual: 1490 },
  },
  alta: {
    esencial: { instalacion: 12900, mensual: 1290 },
    recomendado: { instalacion: 19900, mensual: 1790 },
    completo: { instalacion: 29900, mensual: 2490 },
  },
};

const TIER_MULT: Record<ZonaPricingTier, number> = {
  pueblo_interior: 0.85,
  tepica: 1,
  pueblo_costa: 1.2,
  riviera: 1.5,
};

const FEATURE: Record<CategoryId, { web: string; bot: string }> = {
  comida: { web: "Menú en línea con pedido por WhatsApp", bot: "Toma de pedidos automática (menú, total, domicilio)" },
  hoteleria: { web: "Habitaciones, fotos y reserva directa", bot: "Disponibilidad y reservas automáticas" },
  salud: { web: "Servicios, doctor y agenda de citas", bot: "Agenda automática + recordatorios de cita" },
  belleza: { web: "Servicios, precios y galería de trabajos", bot: "Reservas de cita automáticas" },
  automotriz: { web: "Servicios y cotización con foto", bot: "Cotizaciones automáticas por WhatsApp" },
  fitness: { web: "Clases, horarios y planes", bot: "Clase muestra e inscripciones automáticas" },
  retail: { web: "Catálogo con precios", bot: "Pedidos y apartados automáticos" },
  servicios: { web: "Servicios, trabajos y cotización", bot: "Cotizaciones automáticas" },
  veterinaria: { web: "Servicios, urgencias y agenda de citas", bot: "Citas, estética y recordatorios de vacunas" },
  inmobiliaria: { web: "Catálogo de propiedades con WhatsApp por propiedad", bot: "Calificación automática de interesados" },
  tours: { web: "Tours, precios y reserva directa", bot: "Reservas automáticas con anticipo (ES/EN)" },
  educacion: { web: "Oferta educativa, horarios y visita guiada", bot: "Informes e inscripciones automáticas" },
  general: { web: "Página con WhatsApp directo", bot: "Respuestas automáticas 24/7" },
};

/**
 * Línea de oferta del producto. Lo que claramente es sistema/app es a la medida aunque
 * ya esté en catálogo; un propuesto por la IA que no sea página/WhatsApp/sitio también.
 */
export function offerLineFor(
  producto: string | null | undefined,
  enCatalogo = true,
  lineaCatalogo?: string | null,
): OfferLine {
  if (lineaCatalogo === "landing" || lineaCatalogo === "whatsapp" || lineaCatalogo === "sitio_completo" || lineaCatalogo === "a_medida") {
    return lineaCatalogo;
  }
  const p = (producto ?? "").toLowerCase();
  if (/\bapp\b|aplicaci[oó]n|plataforma|lealtad|puntos|inventario|punto de venta|\bpos\b|\bqr\b|tarjeta|membres|facturaci|\bcrm\b|portal|kiosco|tablero/.test(p)) {
    return "a_medida";
  }
  if (/corporativ|motor de reserv|multi|tienda en l[ií]nea|e-?commerce/.test(p)) {
    return "sitio_completo";
  }
  if (/whats|pedido|automat|bot|agenda|cita|recordatorio|reserva|inscrip|informes/.test(p) && !/sitio|web|p[aá]gina|landing/.test(p)) {
    return "whatsapp";
  }
  if (!enCatalogo && !/sitio|web|p[aá]gina|landing|men[uú]|vitrina/.test(p)) {
    return "a_medida";
  }
  return "landing";
}

/** Complejidad por reglas cuando no hay Gemini. */
export function complejidadPorReglas(producto: string): Complejidad {
  const p = producto.toLowerCase();
  if (/\bapp\b|aplicaci[oó]n|plataforma|inventario|punto de venta|\bpos\b|facturaci|\bcrm\b|portal|multi/.test(p)) return "alta";
  if (/sistema|lealtad|puntos|membres|reserva|cat[aá]logo|tablero|kiosco/.test(p)) return "media";
  return "simple";
}

export function resumenDe(offer: Pick<Offer, "planes" | "prueba" | "instalacion_diferida">): string {
  const rec = offer.planes.find((p) => p.recomendado) ?? offer.planes[0];
  const dias = offer.prueba.dias;
  return `${dias ? `${dias} días gratis · ` : ""}luego $${rec.instalacion.toLocaleString("es-MX")} instalación${offer.instalacion_diferida ? " (en 2 pagos)" : ""} + $${rec.mensual.toLocaleString("es-MX")}/mes`;
}

function price(v: number): number {
  // Terminación psicológica: 2,890 / 390
  if (v < 1000) return Math.round(v / 10) * 10;
  return Math.round(v / 100) * 100 - 10;
}

export function buildOffer(input: {
  producto: string | null | undefined;
  playbookId: CategoryId;
  zona: string | null;
  escenario: string | null;
  score: number;
  rechazosPorCaro: number;
  enCatalogo?: boolean;
  lineaCatalogo?: string | null;
  aMedida?: Omit<AMedida, "confirmado">;
}): Offer {
  const linea = offerLineFor(input.producto, input.enCatalogo ?? true, input.lineaCatalogo);
  if (linea === "a_medida" && !input.aMedida) {
    throw new Error("Producto a la medida sin estimación");
  }
  const base = linea === "a_medida" ? A_MEDIDA_BASE[input.aMedida!.complejidad] : BASE[linea];
  const tier = pricingTierForZona(input.zona ?? "Tepic");
  let mult = TIER_MULT[tier];
  if (input.rechazosPorCaro >= 2) mult *= 0.85;
  if (input.score >= 75 && input.escenario === "facil") mult *= 1.1;

  const f = FEATURE[input.playbookId] ?? FEATURE.general;
  const esceptico = input.escenario === "esceptico";

  const incluye: Record<OfferLine, Record<Plan["id"], string[]>> = {
    landing: {
      esencial: [f.web, "Horario, ubicación y Cómo llegar", "Botón de WhatsApp", "Dominio .com + hosting"],
      recomendado: [
        "Todo lo del Esencial",
        "Galería de fotos y reseñas reales",
        "Preguntas frecuentes resueltas",
        "Perfil de Google optimizado",
        "Cambios mensuales incluidos",
      ],
      completo: ["Todo lo del Recomendado", f.bot, "Reporte mensual de clientes"],
    },
    whatsapp: {
      esencial: ["Respuestas automáticas 24/7", "Menú de opciones, horario y ubicación"],
      recomendado: [f.bot, "Resumen de cada cliente para usted", "Ajustes mensuales incluidos"],
      completo: [f.bot, "Página web con su marca", "Recordatorios y seguimiento automático", "Reporte mensual"],
    },
    sitio_completo: {
      esencial: [f.web, "Hasta 5 secciones", "Dominio + hosting"],
      recomendado: [f.web, "Reserva/pedido en línea", "Perfil de Google optimizado", "Cambios mensuales"],
      completo: ["Todo lo del Recomendado", f.bot, "Reporte mensual", "Soporte prioritario"],
    },
    a_medida: input.aMedida?.incluye ?? { esencial: [], recomendado: [], completo: [] },
  };

  const planes: Plan[] = (["esencial", "recomendado", "completo"] as const).map((id) => ({
    id,
    nombre: id === "esencial" ? "Esencial" : id === "recomendado" ? "Recomendado" : "Completo",
    instalacion: price(base[id].instalacion * mult),
    mensual: price(base[id].mensual * mult),
    incluye: incluye[linea][id],
    recomendado: id === "recomendado",
  }));

  const rec = planes[1];
  const dias = linea === "whatsapp" ? 7 : linea === "landing" || linea === "a_medida" ? 14 : 0;
  const prueba =
    linea === "a_medida"
      ? {
          dias,
          que_incluye: `Su página publicada presentando ${input.aMedida!.producto.toLowerCase()}: medimos cuántos clientes lo piden antes de construirlo completo`,
          condicion: "Si en 14 días sus clientes no lo piden, no paga nada.",
        }
      : linea === "landing"
      ? {
          dias,
          que_incluye: "La página publicada con su link, sus fotos y su WhatsApp",
          condicion: "Si en 14 días no le sirve, la quitamos y no paga nada.",
        }
      : linea === "whatsapp"
        ? {
            dias,
            que_incluye: "El asistente atendiendo a sus clientes reales",
            condicion: "Si en 7 días no le ahorra tiempo, lo apagamos y no paga nada.",
          }
        : {
            dias: 0,
            que_incluye: "La demo ya hecha con sus datos",
            condicion: "Paga la instalación hasta que apruebe el diseño final.",
          };

  const porDia = Math.ceil(rec.mensual / 30);
  return {
    linea,
    planes,
    plan_recomendado: "recomendado",
    prueba,
    garantia:
      linea === "sitio_completo"
        ? "Si no le gusta el diseño final, no paga la instalación."
        : linea === "a_medida"
          ? "Paga la instalación hasta que sus clientes lo pidan en el piloto; 50% al arrancar y 50% al entregarlo funcionando."
          : prueba.condicion,
    instalacion_diferida: esceptico || linea === "a_medida",
    ancla_diaria: `menos de $${porDia} al día`,
    resumen: resumenDe({ planes, prueba, instalacion_diferida: esceptico || linea === "a_medida" }),
    ...(input.aMedida ? { a_medida: { ...input.aMedida, confirmado: false } } : {}),
  };
}
