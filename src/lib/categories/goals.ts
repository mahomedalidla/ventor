import type { CategoryId } from "@/lib/categories/playbooks";

/**
 * "Páginas goal": cómo se ven las mejores landings del rubro (competencia / referencia),
 * para que Gemini no clone siempre el mismo hero + 3 tarjetas + marquee.
 */
export const LAYOUTS = ["cinematic", "split", "editorial", "bento", "warm-local"] as const;
export type LayoutId = (typeof LAYOUTS)[number];

export function layoutFor(seed: string): LayoutId {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  return LAYOUTS[h % LAYOUTS.length];
}

export const LAYOUT_BRIEF: Record<LayoutId, string> = {
  cinematic:
    "Hero full-bleed cinematográfico, tipografía enorme, CTA al final del hero, secciones a todo el ancho, galería masonry irregular.",
  split:
    "Above the fold partido 50/50 (foto | texto). Menú/habitaciones en lista editorial a dos columnas. Poco glassmorphism, mucho espacio.",
  editorial:
    "Revista: gran titular, pull-quotes de reseñas, fotos a sangrado alternando izquierda/derecha, tipografía serif dominante.",
  bento:
    "Grid tipo bento/apple: bloques de distinto tamaño, un bloque enorme para el ítem estrella, el resto compactos. Nav minimal.",
  "warm-local":
    "Pueblo/costa: paleta tierra o mar, foto de lugar como textura, horarios y mapa muy arriba, sensación de negocio de barrio premium (no plantilla corporativa).",
};

export const PAGINAS_GOAL: Record<CategoryId, string> = {
  comida:
    "Como las mejores páginas de restaurante: menú con foto por platillo, precios visibles, “pide este” en cada uno, horario de hoy arriba. Inspírate en sitios de marisquerías de costa (foto de platillo hero, no stock).",
  hoteleria:
    "Como un boutique hotel: cada tipo de habitación es una ficha con foto grande, pax, amenidades y “reservar esta”. Nunca un listado de texto. Inspírate en hoteles independientes, no en Booking.",
  salud:
    "Como las clínicas que sí convierten: el doctor es el héroe (foto real), servicios como tarjetas de problema→solución, teléfono siempre a un toque. Cero stock de bata blanca.",
  belleza:
    "Como un Instagram hecho página: trabajos reales a sangre, precios y duración, reserva del hueco. Visual primero.",
  automotriz:
    "Como un taller serio: cotiza con foto, servicios con precio desde, mapa y WhatsApp. Estética industrial limpia, no “agencia púrpura”.",
  fitness:
    "Energía de gym: planes grandes, prueba gratis, horarios de clase. Oscuro o neón del logo, no beige genérico.",
  retail:
    "Catálogo tipo boutique: producto + precio + pedir. Foto de producto manda.",
  servicios:
    "Landing de oficio de confianza: trabajos hechos, cotización en 3 pasos, zona de cobertura.",
  veterinaria:
    "Cálida y clara: urgencias visibles, servicios por mascota, foto real de la clínica. Nada de stock de golden retriever.",
  inmobiliaria:
    "Portal chico pero premium: ficha por propiedad (foto, precio, WhatsApp de ESA ficha).",
  tours:
    "Como una tour operator buena: card por experiencia con precio p/p, duración, incluye, “reservar este”. Hero de la experiencia, no del logo.",
  educacion:
    "Confianza de papás: instalaciones reales, niveles, visita guiada. Serio y cálido, no kawaii de stock.",
  general:
    "Una página de negocio local que parece de verdad de ellos: foto, qué hacen, WhatsApp. Cero plantilla de agencia.",
};
