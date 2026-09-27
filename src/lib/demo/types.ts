export type DemoMenuItem = {
  name: string;
  price_hint: string;
  note?: string;
};

export type DemoMockup = {
  /** Query exacta que escribiría el cliente en Google */
  search_query: string;
  /** Título del resultado en Google (con el nombre real) */
  search_title: string;
  /** Descripción del snippet de Google */
  search_snippet: string;
  /** Headline de la landing */
  headline: string;
  /** Subtítulo */
  tagline: string;
  /** Estilo visual deducido */
  vibe: string;
  /** Paleta simple (hex) — no violeta genérico */
  palette: {
    bg: string;
    surface: string;
    text: string;
    accent: string;
    muted: string;
  };
  /** Ítems concretos (platillos / habitaciones / servicios) inventados con lógica del rubro + reseñas */
  items: DemoMenuItem[];
  /** Pasos del flujo del cliente */
  flow_steps: string[];
  /** Texto del botón CTA */
  cta_label: string;
  /** Mensaje WhatsApp prearmado */
  cta_prefill: string;
  /** Por qué esta propuesta encaja con ESTE negocio (1-2 frases) */
  why_this: string;
};

export function isDemoMockup(value: unknown): value is DemoMockup {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.search_query === "string" &&
    typeof v.headline === "string" &&
    Array.isArray(v.items) &&
    typeof v.cta_label === "string"
  );
}
