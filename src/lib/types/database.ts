export type LeadOrigen = "places_api" | "app_interna" | "redes_sociales" | "manual";
export type RedSocial = "instagram" | "facebook" | "tiktok";
export type ProductEstado = "propuesto" | "validado" | "descartado";
export type ModeloPrecio = "pago_unico" | "suscripcion" | "freemium";
export type CanalSugerido = "whatsapp" | "en_persona" | "email";
export type Escenario = "facil" | "esceptico" | "upsell_cliente_activo";
export type OpportunityStatus =
  | "pendiente"
  | "contactado"
  | "cerrado"
  | "rechazado"
  | "sin_respuesta";

export type Lead = {
  id: string;
  origen: LeadOrigen;
  nombre: string;
  tipo_negocio: string | null;
  zona: string | null;
  perfil_url: string | null;
  red_social: RedSocial | null;
  usuario_red_social: string | null;
  telefono: string | null;
  tiene_sitio_web: boolean | null;
  google_place_id: string | null;
  app_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Signal = {
  id: string;
  lead_id: string;
  tipo_signal: string;
  detalle: string;
  detectado_por: "sistema" | "manual";
  created_at: string;
};

export type Product = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number | null;
  modelo_precio: ModeloPrecio | null;
  estado: ProductEstado;
  veces_cerrado: number;
  veces_rechazado: number;
  created_at: string;
};

export type Opportunity = {
  id: string;
  lead_id: string;
  signal_id: string | null;
  product_id: string | null;
  producto_sugerido_texto: string | null;
  razon: string;
  canal_sugerido: CanalSugerido | null;
  guion: string | null;
  evitar: string | null;
  precio_sugerido: number | null;
  modelo_precio_sugerido: "pago_unico" | "suscripcion" | null;
  escenario: Escenario | null;
  demo_cliente_busca: string | null;
  demo_experiencia: string | null;
  demo_gustos_deducidos: string | null;
  demo_pitch: string | null;
  demo_mockup: unknown | null;
  demo_html: string | null;
  demo_tipo: "landing" | "whatsapp" | null;
  demo_public_slug: string | null;
  demo_assets: unknown | null;
  demo_generated_at: string | null;
  motivo_rechazo: string | null;
  oferta: unknown | null;
  plan_venta: unknown | null;
  paso_actual: number;
  proximo_contacto_at: string | null;
  ultimo_contacto_at: string | null;
  prueba_inicio: string | null;
  prueba_fin: string | null;
  ajustes: Record<string, unknown> | null;
  plan_elegido: "esencial" | "recomendado" | "completo" | null;
  status: OpportunityStatus;
  resultado_notas: string | null;
  created_at: string;
  updated_at: string;
};

export type OpportunityWithLead = Opportunity & {
  leads: Pick<Lead, "id" | "nombre" | "zona" | "tipo_negocio" | "telefono" | "origen"> | null;
};

export const ORIGEN_LABELS: Record<LeadOrigen, string> = {
  places_api: "Google Places",
  redes_sociales: "Redes sociales",
  manual: "Manual",
  app_interna: "App interna",
};

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  pendiente: "Pendiente",
  contactado: "Contactado",
  cerrado: "Cerrado",
  rechazado: "Rechazado",
  sin_respuesta: "Sin respuesta",
};
