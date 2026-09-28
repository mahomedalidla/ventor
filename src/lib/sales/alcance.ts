import type { Plan } from "@/lib/sales/offer";

export type PlanId = Plan["id"];

export const PLAN_NOMBRE: Record<PlanId, string> = {
  esencial: "Esencial",
  recomendado: "Recomendado",
  completo: "Completo",
};

export type Secciones = {
  beneficios: boolean;
  stats: boolean;
  items: boolean;
  galeria: boolean;
  resenas: boolean;
  faq: boolean;
};

export type Alcance = {
  plan: PlanId;
  incluye: string[];
  no_incluye: string[];
  secciones: Secciones;
  chat: "basico" | "completo";
};

/**
 * Lo que se ve en el entregable según el plan: lo que se muestra es exactamente lo que se entrega.
 * Mantener alineado con `incluye` de offer.ts.
 */
export function alcanceDe(tipo: "landing" | "whatsapp", plan: PlanId | null | undefined): Alcance {
  const p: PlanId = plan ?? "recomendado";
  if (tipo === "landing") {
    if (p === "esencial") {
      return {
        plan: p,
        incluye: [
          "Hero con foto real, nombre y CTA de WhatsApp",
          "Oferta principal (menú / servicios / habitaciones) con precios si existen",
          "Horario, ubicación y botón Cómo llegar",
          "Cierre con CTA de WhatsApp",
        ],
        no_incluye: [
          "Galería de fotos",
          "Carrusel de reseñas y contadores",
          "Preguntas frecuentes",
          "Tarjetas de beneficios",
        ],
        secciones: { beneficios: false, stats: false, items: true, galeria: false, resenas: false, faq: false },
        chat: "basico",
      };
    }
    return {
      plan: p,
      incluye: [
        "Toda la anatomía de conversión del rubro",
        "Galería de fotos reales",
        "Reseñas reales y contadores",
        "Preguntas frecuentes que resuelven las dudas críticas",
        ...(p === "completo" ? ["Sección que presenta el asistente de WhatsApp 24/7"] : []),
      ],
      no_incluye: [],
      secciones: { beneficios: true, stats: true, items: true, galeria: true, resenas: true, faq: true },
      chat: "completo",
    };
  }
  if (p === "esencial") {
    return {
      plan: p,
      incluye: ["Bienvenida automática", "Menú de opciones", "Horario y ubicación en un toque"],
      no_incluye: [
        "Tomar pedidos / reservas / citas completas",
        "Resumen del cliente para el dueño",
        "Recordatorios",
      ],
      secciones: { beneficios: false, stats: false, items: true, galeria: false, resenas: false, faq: false },
      chat: "basico",
    };
  }
  return {
    plan: p,
    incluye: [
      "Flujo completo: pedido / reserva / cita hasta la confirmación",
      "Resumen de cada cliente para el dueño",
      ...(p === "completo" ? ["Recordatorios y seguimiento automático", "Enlace a su página web"] : []),
    ],
    no_incluye: [],
    secciones: { beneficios: true, stats: true, items: true, galeria: true, resenas: true, faq: true },
    chat: "completo",
  };
}

export function isPlanId(v: unknown): v is PlanId {
  return v === "esencial" || v === "recomendado" || v === "completo";
}
