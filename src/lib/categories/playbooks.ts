/**
 * Playbooks por categoría: qué fricción importa, qué buscar en el sitio,
 * qué leer en reseñas y qué producto priorizar después (motor LLM).
 *
 * La categoría NO es un label decorativo — cambia señales y narrativa de venta.
 */

export type Capability =
  | "menu"
  | "orders"
  | "booking"
  | "whatsapp"
  | "delivery"
  | "catalog"
  | "quotes"
  | "appointments";

export type CategoryId =
  | "comida"
  | "hoteleria"
  | "salud"
  | "belleza"
  | "automotriz"
  | "fitness"
  | "retail"
  | "servicios"
  | "veterinaria"
  | "inmobiliaria"
  | "tours"
  | "educacion"
  | "general";

export type ReviewPattern = {
  re: RegExp;
  label: string;
};

export type CategoryPlaybook = {
  id: CategoryId;
  label: string;
  /** Textos que el usuario puede escribir en el formulario */
  aliases: string[];
  /** Ancla en pricing_baseline.producto_categoria */
  pricing_categoria: string;
  /** Contexto corto para el motor de inferencia (fase 3) */
  pain_context: string;
  /** Productos / ángulos que suelen cerrar en este rubro */
  producto_prioridad: string[];
  /** Capacidades críticas en el sitio web para este rubro */
  critical_capabilities: Capability[];
  /** Umbrales de "movimiento" (reseñas) — hotelería y comida mueven distinto */
  growth: {
    alto: { min_reviews: number; min_rating: number };
    estable: { min_reviews: number; min_rating: number };
    bajo_max_reviews: number;
  };
  /** Quejas típicas del rubro (además de las genéricas) */
  review_patterns: ReviewPattern[];
  /** Detalle humano cuando falta una capacidad crítica */
  missing_capability_copy: Partial<Record<Capability, string>>;
};

const GENERIC_REVIEW: ReviewPattern[] = [
  { re: /no\s+contest/i, label: "no contestan" },
  { re: /no\s+atiend/i, label: "no atienden" },
  { re: /tard(an|ó|aron)|demor/i, label: "tardan / demoran" },
  { re: /nunca\s+responden|no\s+responden/i, label: "no responden" },
  { re: /malo\s+el\s+servicio|pésimo\s+servicio|pesimo\s+servicio/i, label: "mal servicio" },
];

export const CATEGORY_PLAYBOOKS: CategoryPlaybook[] = [
  // Primero los rubros cuyos alias contienen palabras de otros ("clínica veterinaria", "renta de barcos")
  {
    id: "veterinaria",
    label: "Veterinaria / mascotas",
    aliases: [
      "veterinaria",
      "veterinario",
      "clínica veterinaria",
      "clinica veterinaria",
      "estética canina",
      "estetica canina",
      "pet shop",
      "mascotas",
      "hotel para perros",
      "guardería canina",
      "guarderia canina",
    ],
    pricing_categoria: "automatizacion_whatsapp",
    pain_context:
      "Dueños de mascotas buscan con urgencia (emergencias) y necesitan saber si atienden hoy; citas, vacunas y estética se agendan por mensaje suelto y se olvidan.",
    producto_prioridad: [
      "Agenda de citas y estética por WhatsApp",
      "Recordatorios de vacunas y desparasitación",
      "Sitio con servicios, urgencias y ubicación",
    ],
    critical_capabilities: ["appointments", "whatsapp"],
    growth: {
      alto: { min_reviews: 50, min_rating: 4.5 },
      estable: { min_reviews: 15, min_rating: 4.2 },
      bajo_max_reviews: 6,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /urgencia|emergencia|madrugada|noche/i, label: "urgencias" },
      { re: /cita|esper(a|ar)|turno/i, label: "citas / espera" },
      { re: /caro|precio|cobr/i, label: "precio" },
    ],
    missing_capability_copy: {
      appointments: "Sin agenda online — citas y estética dependen de llamadas.",
      whatsapp: "Sin WhatsApp visible para urgencias o citas.",
    },
  },
  {
    id: "tours",
    label: "Tours / turismo",
    aliases: [
      "tours",
      "tour",
      "agencia de viajes",
      "renta de lanchas",
      "lanchas",
      "renta de barcos",
      "barcos",
      "yates",
      "paseos en lancha",
      "pesca deportiva",
      "avistamiento de ballenas",
      "surf",
      "escuela de surf",
      "buceo",
      "snorkel",
      "renta de cuatrimotos",
      "cuatrimotos",
      "tirolesa",
      "ecoturismo",
      "excursiones",
    ],
    pricing_categoria: "sitio_web_corporativo",
    pain_context:
      "Turistas deciden en el celular horas antes; si no ven precio, horarios y cómo reservar, se van con el que sí contesta o con la agencia del hotel.",
    producto_prioridad: [
      "Reservas de tours por WhatsApp con anticipo",
      "Página con tours, precios y galería",
      "Respuestas automáticas en inglés y español",
    ],
    critical_capabilities: ["booking", "whatsapp"],
    growth: {
      alto: { min_reviews: 40, min_rating: 4.6 },
      estable: { min_reviews: 12, min_rating: 4.3 },
      bajo_max_reviews: 5,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /reserv|lugar|cupo|lleno/i, label: "reservas / cupo" },
      { re: /cancel|clima|reembolso/i, label: "cancelaciones" },
      { re: /english|ingl[eé]s/i, label: "turista extranjero" },
    ],
    missing_capability_copy: {
      booking: "Sin reserva online — el turista no sabe si hay lugar ni cómo apartar.",
      whatsapp: "Sin WhatsApp visible para reservar el mismo día.",
    },
  },
  {
    id: "educacion",
    label: "Escuelas / academias",
    aliases: [
      "escuela",
      "colegio",
      "preescolar",
      "kinder",
      "kínder",
      "guardería",
      "guarderia",
      "primaria",
      "secundaria",
      "preparatoria",
      "academia",
      "clases de inglés",
      "clases de ingles",
      "idiomas",
      "regularización",
      "regularizacion",
      "escuela de música",
      "escuela de musica",
      "academia de baile",
      "escuela de manejo",
    ],
    pricing_categoria: "sitio_web_corporativo",
    pain_context:
      "Los papás comparan escuelas en temporada de inscripciones; preguntan colegiaturas, horarios y requisitos por mensaje y la respuesta tarda.",
    producto_prioridad: [
      "Página con oferta educativa y visita guiada por WhatsApp",
      "Informes e inscripciones automáticas por WhatsApp",
      "Avisos a papás por WhatsApp",
    ],
    critical_capabilities: ["appointments", "whatsapp"],
    growth: {
      alto: { min_reviews: 40, min_rating: 4.4 },
      estable: { min_reviews: 12, min_rating: 4.1 },
      bajo_max_reviews: 5,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /inscrip|colegiatura|cuota|mensualidad/i, label: "inscripciones / cuotas" },
      { re: /maestr|profes/i, label: "maestros" },
      { re: /comunicaci[oó]n|avis/i, label: "comunicación con papás" },
    ],
    missing_capability_copy: {
      appointments: "Sin forma de agendar visita o pedir informes en línea.",
      whatsapp: "Sin WhatsApp visible para informes e inscripciones.",
    },
  },
  {
    id: "inmobiliaria",
    label: "Inmobiliaria / bienes raíces",
    aliases: [
      "inmobiliaria",
      "bienes raíces",
      "bienes raices",
      "asesor inmobiliario",
      "venta de casas",
      "renta de casas",
      "renta de departamentos",
      "desarrollo inmobiliario",
      "fraccionamiento",
      "terrenos",
      "lotes",
      "renta vacacional",
    ],
    pricing_categoria: "sitio_web_corporativo",
    pain_context:
      "Publican en portales y Marketplace donde compiten con todos; los interesados preguntan lo mismo (precio, ubicación, crédito) y se enfrían si no responden rápido.",
    producto_prioridad: [
      "Catálogo de propiedades con WhatsApp por propiedad",
      "Calificación automática de interesados por WhatsApp",
      "Landing por desarrollo",
    ],
    critical_capabilities: ["catalog", "whatsapp"],
    growth: {
      alto: { min_reviews: 25, min_rating: 4.5 },
      estable: { min_reviews: 8, min_rating: 4.2 },
      bajo_max_reviews: 4,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /tr[aá]mite|escritura|papeles/i, label: "trámites" },
      { re: /cr[eé]dito|infonavit|fovissste/i, label: "crédito" },
    ],
    missing_capability_copy: {
      catalog: "Sin catálogo propio de propiedades — dependen de portales.",
      whatsapp: "Sin WhatsApp directo por propiedad.",
    },
  },
  {
    id: "comida",
    label: "Comida / restaurante",
    aliases: [
      "mariscos",
      "cenaduría",
      "cenaduria",
      "taquería",
      "taqueria",
      "café",
      "cafe",
      "restaurante",
      "comida",
      "pizzería",
      "pizzeria",
      "antojitos",
      "hamburguesas",
      "sushi",
      "bar",
      "fondita",
    ],
    pricing_categoria: "automatizacion_whatsapp",
    pain_context:
      "Operación en hora pico: pedidos por teléfono se pierden; apps de delivery comen margen.",
    producto_prioridad: [
      "Sistema de pedidos por WhatsApp",
      "Menú digital + toma de pedidos",
    ],
    critical_capabilities: ["menu", "orders", "whatsapp"],
    growth: {
      alto: { min_reviews: 80, min_rating: 4.3 },
      estable: { min_reviews: 25, min_rating: 4.0 },
      bajo_max_reviews: 10,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /sucio|mugre|higiene/i, label: "higiene" },
      { re: /fria|fría|enfriad/i, label: "comida fría" },
      { re: /no\s+tienen\s+(whats?app|wsp)|sin\s+whats?app/i, label: "sin WhatsApp" },
    ],
    missing_capability_copy: {
      menu: "Sin menú/carta visible online — el cliente no sabe qué pedir antes de llamar.",
      orders: "Sin flujo de pedidos online; depende de llamadas en hora pico.",
      whatsapp: "Sin WhatsApp en el sitio — canal natural de pedidos en MX.",
    },
  },
  {
    id: "hoteleria",
    label: "Hotelería / hospedaje",
    aliases: [
      "hotel",
      "hotelería",
      "hoteleria",
      "hostal",
      "hostel",
      "posada",
      "motel",
      "airbnb",
      "hospedaje",
      "boutique hotel",
      "hotel boutique",
      "casa de huéspedes",
      "glamping",
    ],
    pricing_categoria: "sitio_web_corporativo",
    pain_context:
      "Dependen de OTAs (Booking/Expedia) con comisión alta; necesitan reservas directas, disponibilidad y respuesta rápida a huéspedes.",
    producto_prioridad: [
      "Motor de reservas / disponibilidad en WhatsApp o web",
      "Sitio con reservas directas (evitar comisión OTA)",
      "Inbox de huéspedes unificado",
    ],
    critical_capabilities: ["booking", "whatsapp"],
    growth: {
      // Hotelería con pocas reseñas pero rating alto igual mueve (turismo)
      alto: { min_reviews: 40, min_rating: 4.4 },
      estable: { min_reviews: 15, min_rating: 4.1 },
      bajo_max_reviews: 8,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /reserva|reservar|booking/i, label: "fricción en reservas" },
      { re: /check.?in|llegada|recepci[oó]n/i, label: "check-in / recepción" },
      { re: /limpieza|habitaci[oó]n|s[aá]banas|toallas/i, label: "limpieza habitación" },
      { re: /cancelaci[oó]n|reembolso/i, label: "cancelaciones" },
      { re: /booking\.com|expedia|despegar|airbnb/i, label: "menciona OTA" },
    ],
    missing_capability_copy: {
      booking:
        "Sin reservas/disponibilidad online — el huésped termina en Booking u otra OTA.",
      whatsapp:
        "Sin WhatsApp para reservas o pre-llegada — pierden directo frente a OTAs.",
    },
  },
  {
    id: "salud",
    label: "Salud / clínica",
    aliases: [
      "clínica",
      "clinica",
      "clínica dental",
      "clinica dental",
      "dental",
      "dentista",
      "médico",
      "medico",
      "consultorio",
      "laboratorio",
      "óptica",
      "optica",
      "fisioterapia",
    ],
    pricing_categoria: "automatizacion_whatsapp",
    pain_context:
      "Agenda llena de no-shows; pacientes preguntan por WhatsApp sin flujo; necesitan confianza digital (sitio + citas).",
    producto_prioridad: [
      "Agenda de citas por WhatsApp",
      "Recordatorios automáticos anti no-show",
      "Sitio simple con servicios y ubicación",
    ],
    critical_capabilities: ["appointments", "whatsapp"],
    growth: {
      alto: { min_reviews: 60, min_rating: 4.5 },
      estable: { min_reviews: 20, min_rating: 4.2 },
      bajo_max_reviews: 8,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /cita|agendar|esper(a|ar)|fila/i, label: "citas / espera" },
      { re: /caro|precio|cobr/i, label: "precio" },
      { re: /dolor|maltrato|groser/i, label: "experiencia paciente" },
    ],
    missing_capability_copy: {
      appointments:
        "Sin agenda/citas online — todo es llamada o mensaje suelto.",
      whatsapp: "Sin WhatsApp visible para agendar o resolver dudas.",
    },
  },
  {
    id: "belleza",
    label: "Belleza / spa",
    aliases: [
      "spa",
      "estética",
      "estetica",
      "belleza",
      "barbería",
      "barberia",
      "salón",
      "salon",
      "uñas",
      "unas",
      "peluquería",
      "peluqueria",
    ],
    pricing_categoria: "automatizacion_whatsapp",
    pain_context:
      "Citas por DM caóticos; sin catálogo de servicios/precios; huecos en agenda.",
    producto_prioridad: [
      "Agenda de citas por WhatsApp",
      "Catálogo de servicios + precios",
    ],
    critical_capabilities: ["appointments", "catalog", "whatsapp"],
    growth: {
      alto: { min_reviews: 50, min_rating: 4.4 },
      estable: { min_reviews: 18, min_rating: 4.1 },
      bajo_max_reviews: 8,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /cita|agendar|horario/i, label: "citas" },
      { re: /precio|caro|paquete/i, label: "precios" },
    ],
    missing_capability_copy: {
      appointments: "Sin reservas de cita online.",
      catalog: "Sin catálogo claro de servicios/precios en el sitio.",
      whatsapp: "Sin WhatsApp para agendar.",
    },
  },
  {
    id: "automotriz",
    label: "Automotriz / taller",
    aliases: [
      "taller",
      "taller mecánico",
      "taller mecanico",
      "refaccionaria",
      "refacciones",
      "vulcanizadora",
      "hojalatería",
      "hojalateria",
      "automotriz",
      "lavado de autos",
    ],
    pricing_categoria: "automatizacion_whatsapp",
    pain_context:
      "Cotizaciones por llamada se pierden; clientes quieren foto + precio por WhatsApp; poca presencia digital.",
    producto_prioridad: [
      "Cotizaciones y seguimiento por WhatsApp",
      "Agenda de servicio",
    ],
    critical_capabilities: ["quotes", "whatsapp", "appointments"],
    growth: {
      alto: { min_reviews: 40, min_rating: 4.3 },
      estable: { min_reviews: 15, min_rating: 4.0 },
      bajo_max_reviews: 6,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /cotizaci[oó]n|presupuesto|precio/i, label: "cotización" },
      { re: /enga[ñn]o|estafa|cargaron/i, label: "confianza / cobro" },
      { re: /tiempo|entreg(a|aron)|demor/i, label: "tiempos de entrega" },
    ],
    missing_capability_copy: {
      quotes: "Sin canal claro de cotización digital (foto + precio).",
      whatsapp: "Sin WhatsApp visible — canal #1 en talleres MX.",
      appointments: "Sin agenda de servicio online.",
    },
  },
  {
    id: "fitness",
    label: "Gimnasio / fitness",
    aliases: [
      "gimnasio",
      "gym",
      "crossfit",
      "fitness",
      "yoga",
      "box",
      "entrenamiento",
    ],
    pricing_categoria: "automatizacion_whatsapp",
    pain_context:
      "Inscripciones y pruebas gratis por DM; sin funnels; churn alto sin seguimiento.",
    producto_prioridad: [
      "Captación de pruebas gratis por WhatsApp",
      "Seguimiento de membresías",
    ],
    critical_capabilities: ["appointments", "whatsapp", "catalog"],
    growth: {
      alto: { min_reviews: 50, min_rating: 4.3 },
      estable: { min_reviews: 20, min_rating: 4.0 },
      bajo_max_reviews: 8,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /membres[ií]a|inscripci[oó]n|mensualidad/i, label: "membresía" },
      { re: /equipo|m[aá]quinas|limpieza/i, label: "equipo / limpieza" },
    ],
    missing_capability_copy: {
      appointments: "Sin forma clara de agendar clase muestra o inscripción.",
      whatsapp: "Sin WhatsApp para captar interesados.",
      catalog: "Sin planes/precios visibles.",
    },
  },
  {
    id: "retail",
    label: "Retail / tienda",
    aliases: [
      "tienda",
      "boutique",
      "ropa",
      "zapatería",
      "zapateria",
      "ferretería",
      "ferreteria",
      "papelería",
      "papeleria",
      "retail",
    ],
    pricing_categoria: "automatizacion_whatsapp",
    pain_context:
      "Inventario se consulta a mano; clientes piden por WhatsApp sin catálogo; pierden venta si no responden.",
    producto_prioridad: [
      "Catálogo + pedidos por WhatsApp",
      "Sitio vitrina simple",
    ],
    critical_capabilities: ["catalog", "orders", "whatsapp"],
    growth: {
      alto: { min_reviews: 40, min_rating: 4.2 },
      estable: { min_reviews: 15, min_rating: 4.0 },
      bajo_max_reviews: 6,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /precio|caro|oferta/i, label: "precio" },
      { re: /variedad|existencias|stock/i, label: "inventario" },
    ],
    missing_capability_copy: {
      catalog: "Sin catálogo online de productos.",
      orders: "Sin pedidos digitales.",
      whatsapp: "Sin WhatsApp para cerrar venta.",
    },
  },
  {
    id: "servicios",
    label: "Servicios locales",
    aliases: [
      "plomería",
      "plomeria",
      "electricista",
      "limpieza",
      "jardinería",
      "jardineria",
      "fumigación",
      "fumigacion",
      "servicios",
    ],
    pricing_categoria: "automatizacion_whatsapp",
    pain_context:
      "Leads llegan por recomendación y se pierden sin respuesta rápida; necesitan cotización ágil.",
    producto_prioridad: [
      "Captación y cotización por WhatsApp",
      "Sitio mínimo de confianza",
    ],
    critical_capabilities: ["quotes", "whatsapp"],
    growth: {
      alto: { min_reviews: 30, min_rating: 4.4 },
      estable: { min_reviews: 10, min_rating: 4.1 },
      bajo_max_reviews: 5,
    },
    review_patterns: [
      ...GENERIC_REVIEW,
      { re: /puntual|horario|lleg(aron|ó)/i, label: "puntualidad" },
      { re: /cotizaci[oó]n|presupuesto/i, label: "cotización" },
    ],
    missing_capability_copy: {
      quotes: "Sin canal de cotización digital.",
      whatsapp: "Sin WhatsApp visible para contratar.",
    },
  },
  {
    id: "general",
    label: "General",
    aliases: [],
    pricing_categoria: "automatizacion_whatsapp",
    pain_context:
      "Negocio local con fricción digital genérica: presencia débil, respuesta lenta, sin canal claro.",
    producto_prioridad: [
      "Automatización por WhatsApp",
      "Sitio web simple",
    ],
    critical_capabilities: ["whatsapp"],
    growth: {
      alto: { min_reviews: 50, min_rating: 4.3 },
      estable: { min_reviews: 20, min_rating: 4.0 },
      bajo_max_reviews: 8,
    },
    review_patterns: GENERIC_REVIEW,
    missing_capability_copy: {
      whatsapp: "Sin WhatsApp visible en el sitio.",
    },
  },
];

/** Opciones del formulario (label visible + valor de búsqueda) */
export const CATEGORY_FORM_OPTIONS: Array<{ value: string; group: string }> = [
  { value: "mariscos", group: "Comida" },
  { value: "cenaduría", group: "Comida" },
  { value: "taquería", group: "Comida" },
  { value: "café", group: "Comida" },
  { value: "restaurante", group: "Comida" },
  { value: "hotel", group: "Hotelería" },
  { value: "hostal", group: "Hotelería" },
  { value: "posada", group: "Hotelería" },
  { value: "clínica dental", group: "Salud" },
  { value: "consultorio", group: "Salud" },
  { value: "spa", group: "Belleza" },
  { value: "barbería", group: "Belleza" },
  { value: "taller mecánico", group: "Automotriz" },
  { value: "refaccionaria", group: "Automotriz" },
  { value: "gimnasio", group: "Fitness" },
  { value: "boutique", group: "Retail" },
  { value: "ferretería", group: "Retail" },
  { value: "plomería", group: "Servicios" },
  { value: "veterinaria", group: "Veterinaria" },
  { value: "estética canina", group: "Veterinaria" },
  { value: "tours", group: "Tours" },
  { value: "renta de lanchas", group: "Tours" },
  { value: "pesca deportiva", group: "Tours" },
  { value: "escuela", group: "Educación" },
  { value: "academia", group: "Educación" },
  { value: "clases de inglés", group: "Educación" },
  { value: "inmobiliaria", group: "Inmobiliaria" },
  { value: "bienes raíces", group: "Inmobiliaria" },
];

export function resolvePlaybook(categoria: string): CategoryPlaybook {
  const q = normalize(categoria);
  if (!q) return playbookById("general");

  const all = CATEGORY_PLAYBOOKS.filter((pb) => pb.id !== "general").flatMap((pb) =>
    pb.aliases.map((alias) => ({ pb, a: normalize(alias) })),
  );
  const exact = all.find(({ a }) => a === q);
  if (exact) return exact.pb;
  // El alias más largo contenido en la búsqueda gana ("clinica veterinaria" > "clinica")
  const padded = ` ${q.replace(/[^a-z0-9ñ]+/g, " ")} `;
  const contained = all
    .filter(({ a }) => padded.includes(` ${a} `))
    .sort((x, y) => y.a.length - x.a.length)[0];
  if (contained) return contained.pb;
  // Búsqueda parcial ("veterinar"): solo si no es ambigua entre rubros
  const partial = [...new Set(all.filter(({ a }) => q.length >= 4 && a.includes(q)).map(({ pb }) => pb))];
  if (partial.length === 1) return partial[0];
  return playbookById("general");
}

export function playbookById(id: CategoryId): CategoryPlaybook {
  return (
    CATEGORY_PLAYBOOKS.find((p) => p.id === id) ??
    CATEGORY_PLAYBOOKS[CATEGORY_PLAYBOOKS.length - 1]
  );
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}
