import type { CategoryId } from "@/lib/categories/playbooks";

/**
 * Catálogo de conversión por rubro:
 * - Anatomía de conversión (Landing Page Anatomy): secciones indispensables, en orden.
 * - Factores clave de conversión (CRO por nicho): qué genera confianza y urgencia.
 * - Puntos de fricción / intención del usuario: dudas críticas del comprador final
 *   que la página debe resolver antes de que abandone.
 *
 * Todo está escrito desde el punto de vista del CLIENTE FINAL del negocio
 * (comensal, huésped, paciente…), nunca del dueño.
 */

export type AnatomySection = {
  id: string;
  titulo: string;
  proposito: string;
  elementos: string[];
};

export type FrictionPoint = {
  duda: string;
  /** Respuesta honesta para la página. Tokens: {horario} {direccion} {nombre} */
  respuesta: string;
};

export type ConversionProfile = {
  categoria: CategoryId;
  objetivo: string;
  cta_primario: string;
  cta_secundario: string;
  quien_busca: string;
  como_busca: string[];
  anatomia: AnatomySection[];
  confianza: string[];
  urgencia: string[];
  friccion: FrictionPoint[];
  /** Promesas seguras de valor para el visitante (no afirman datos no verificados) */
  promesas: Array<{ titulo: string; texto: string }>;
  evitar: string[];
};

const HERO_BASE = [
  "Nombre real + qué es + dónde (message match con lo que buscó)",
  "Rating de Google con número de reseñas",
  "CTA primario visible sin hacer scroll",
  "Foto real del lugar (nunca stock)",
];

const CIERRE_BASE: AnatomySection = {
  id: "ubicacion",
  titulo: "Ubicación, horario y contacto",
  proposito: "Quitar la última duda logística antes de actuar",
  elementos: [
    "Horario real por día",
    "Dirección + botón Cómo llegar (Google Maps)",
    "Botón WhatsApp y llamada en un toque",
  ],
};

export const CONVERSION_PROFILES: Record<CategoryId, ConversionProfile> = {
  comida: {
    categoria: "comida",
    objetivo: "Que pida (para llevar / domicilio) o que llegue hoy",
    cta_primario: "Pedir por WhatsApp",
    cta_secundario: "Ver menú",
    quien_busca:
      "Alguien con hambre, en el celular, decidiendo en minutos dónde comer; turista buscando comida local recomendada",
    como_busca: [
      "“mariscos cerca de mí”",
      "“dónde comer en {zona}”",
      "“{platillo} {zona}”",
      "“{nombre} menú / precios”",
    ],
    anatomia: [
      { id: "hero", titulo: "Hero apetitoso", proposito: "Confirmar en 3 s qué comida, dónde y cómo pedir", elementos: [...HERO_BASE, "Estado Abierto ahora / horario de hoy"] },
      { id: "favoritos", titulo: "Los favoritos", proposito: "Mostrar 3–6 platillos estrella con foto y precio para abrir el antojo", elementos: ["Platillos que las reseñas mencionan", "Precio visible", "Botón pedir en cada platillo"] },
      { id: "menu", titulo: "Menú completo en HTML (no PDF)", proposito: "Que decida antes de escribir", elementos: ["Categorías (entradas, platos fuertes, bebidas)", "Precio y porción", "Etiquetas: picante, para compartir, sin gluten si aplica"] },
      { id: "como_pedir", titulo: "Cómo pedir en 3 pasos", proposito: "Eliminar la incertidumbre del proceso", elementos: ["Elige → mensaje armado por WhatsApp → confirma", "Recoger o domicilio", "Tiempo estimado"] },
      { id: "resenas", titulo: "Lo que dicen los comensales", proposito: "Prueba social real", elementos: ["Citas textuales de Google", "Mencionar platillos elogiados"] },
      { id: "galeria", titulo: "Ambiente", proposito: "Vender la experiencia de ir (vista, palapa, familia)", elementos: ["Fotos reales del lugar y la comida"] },
      CIERRE_BASE,
    ],
    confianza: [
      "Rating y número de reseñas visibles arriba",
      "Fotos reales de platillos (no stock)",
      "Precios visibles: evita el miedo a la cuenta sorpresa",
      "Reseñas que nombran platillos específicos",
    ],
    urgencia: [
      "Abierto ahora / cierra a las X",
      "Especial del día / pesca del día",
      "Fin de semana se llena: pide antes",
    ],
    friccion: [
      { duda: "¿Cuánto cuesta más o menos?", respuesta: "Los precios están en el menú. Si tienes dudas de porciones, pregúntanos por WhatsApp." },
      { duda: "¿Hacen servicio a domicilio?", respuesta: "Escríbenos por WhatsApp con tu ubicación y te confirmamos al momento." },
      { duda: "¿Están abiertos hoy?", respuesta: "Nuestro horario: {horario}." },
      { duda: "¿Dónde están / hay dónde estacionarse?", respuesta: "Estamos en {direccion}. Toca “Cómo llegar” para abrir el mapa." },
      { duda: "¿Aceptan tarjeta o transferencia?", respuesta: "Pregúntanos por WhatsApp y te decimos las formas de pago disponibles." },
    ],
    promesas: [
      { titulo: "Menú a la vista", texto: "Revisa platillos y precios antes de pedir." },
      { titulo: "Pide en un toque", texto: "Tu pedido llega armado por WhatsApp, sin llamadas." },
      { titulo: "Cómo llegar", texto: "Abre el mapa directo desde aquí." },
    ],
    evitar: [
      "Menú en PDF o imagen",
      "Muros de texto sobre la historia antes de mostrar comida",
      "Más de un CTA compitiendo arriba",
    ],
  },

  hoteleria: {
    categoria: "hoteleria",
    objetivo: "Reserva directa (sin OTA)",
    cta_primario: "Reservar directo",
    cta_secundario: "Ver habitaciones",
    quien_busca:
      "Viajero comparando en otra pestaña contra Booking/Airbnb; quiere certeza de precio, fotos reales y cómo es la zona",
    como_busca: [
      "“hotel en {zona}”",
      "“{nombre} {zona} precios”",
      "“hotel frente al mar {zona}”",
      "“hospedaje {zona} con alberca / pet friendly”",
    ],
    anatomia: [
      { id: "hero", titulo: "Hero inmersivo + reserva", proposito: "Vender el lugar y abrir la reserva en el primer pantallazo", elementos: [...HERO_BASE, "Barra: fechas + huéspedes → WhatsApp"] },
      { id: "reserva_directa", titulo: "Por qué reservar directo", proposito: "Ganarle a la OTA en la comparación", elementos: ["Trato directo con el hotel", "Mejor tarifa al reservar directo (solo si el dueño la confirma)", "Beneficio exclusivo (late check-out, bebida, upgrade — a confirmar)"] },
      { id: "habitaciones", titulo: "Habitaciones", proposito: "Elegir sin dudas", elementos: ["Foto por tipo", "Capacidad (pax) y camas", "Precio desde / por noche", "Amenidades clave"] },
      { id: "amenidades", titulo: "Amenidades y experiencia", proposito: "Justificar el precio", elementos: ["Alberca, vista, desayuno, estacionamiento, wifi", "Qué hacer cerca (playa, pueblo mágico, tours)"] },
      { id: "resenas", titulo: "Huéspedes reales", proposito: "Confianza en una compra que no se ve hasta llegar", elementos: ["Citas de Google", "Rating y volumen"] },
      { id: "politicas", titulo: "Políticas claras", proposito: "Evitar abandono por miedo a letras chiquitas", elementos: ["Check-in / check-out", "Cancelación", "Mascotas / niños"] },
      { id: "zona", titulo: "La zona", proposito: "Vender el destino y la ubicación", elementos: ["Distancia a playa/centro", "Mapa"] },
      CIERRE_BASE,
    ],
    confianza: [
      "Fotos reales de habitaciones (es la compra más visual)",
      "Rating y volumen de reseñas",
      "Políticas visibles antes de reservar",
      "Contacto humano directo (WhatsApp)",
    ],
    urgencia: [
      "Temporada alta / puentes se llenan",
      "Pocas habitaciones",
      "Beneficio por reservar directo esta semana",
    ],
    friccion: [
      { duda: "¿Me conviene reservar directo?", respuesta: "Reservando directo tratas con nosotros sin intermediarios. Pregúntanos la tarifa para tus fechas." },
      { duda: "¿Hay disponibilidad para mis fechas?", respuesta: "Mándanos tus fechas y número de huéspedes por WhatsApp y te confirmamos al momento." },
      { duda: "¿Cómo aparto? ¿Piden anticipo?", respuesta: "Te explicamos el proceso de reserva por WhatsApp, paso a paso." },
      { duda: "¿Qué tan lejos está de la playa / el centro?", respuesta: "Estamos en {direccion}. Toca “Cómo llegar” para verlo en el mapa." },
      { duda: "¿Aceptan mascotas / niños?", respuesta: "Pregúntanos por WhatsApp y te confirmamos." },
    ],
    promesas: [
      { titulo: "Reserva directo", texto: "Trato directo con el hotel, sin intermediarios." },
      { titulo: "Respuesta rápida", texto: "Consulta disponibilidad por WhatsApp." },
      { titulo: "Fotos reales", texto: "Así se ve el lugar, sin sorpresas." },
    ],
    evitar: [
      "Precios ocultos hasta el final",
      "Fotos de stock",
      "Formularios largos para cotizar",
      "Mandar al huésped a Booking",
    ],
  },

  salud: {
    categoria: "salud",
    objetivo: "Agendar cita / primera consulta",
    cta_primario: "Agendar cita",
    cta_secundario: "Llamar ahora",
    quien_busca:
      "Paciente con una molestia o necesidad, a veces con urgencia y miedo; elige a una PERSONA de confianza, no un local",
    como_busca: [
      "“dentista en {zona}”",
      "“{especialidad} cerca de mí”",
      "“{nombre} opiniones”",
      "“consulta {especialidad} precio {zona}”",
    ],
    anatomia: [
      { id: "hero", titulo: "Hero de confianza", proposito: "Relevancia + credibilidad + acción en 3 s", elementos: [...HERO_BASE, "Especialidad y beneficio claro", "Botón llamar siempre visible en móvil"] },
      { id: "barra_confianza", titulo: "Barra de confianza", proposito: "Reducir el miedo a elegir mal", elementos: ["Rating Google", "Años de experiencia (si se sabe)", "Cédula / certificaciones (si se sabe)"] },
      { id: "servicios", titulo: "Servicios / tratamientos", proposito: "Que se identifique con su problema", elementos: ["Lista de servicios con beneficio", "Precio desde o “consulta de valoración”"] },
      { id: "profesional", titulo: "Quién te atiende", proposito: "El paciente elige a una persona", elementos: ["Foto real del doctor/equipo", "Formación y enfoque"] },
      { id: "proceso", titulo: "Cómo es tu primera visita", proposito: "Quitar ansiedad", elementos: ["1. Agenda 2. Valoración 3. Plan / seguimiento"] },
      { id: "resenas", titulo: "Pacientes reales", proposito: "Prueba social de trato y resultados", elementos: ["Citas de Google sobre trato, dolor, puntualidad"] },
      { id: "faq", titulo: "Preguntas frecuentes", proposito: "Resolver costo, dolor, urgencias", elementos: ["Precio", "¿Duele?", "¿Atienden urgencias?"] },
      CIERRE_BASE,
    ],
    confianza: [
      "Foto real del profesional (uno de los elementos que más convierte)",
      "Rating y reseñas sobre el trato",
      "Credenciales visibles",
      "Teléfono clicable en todo momento",
    ],
    urgencia: [
      "Citas disponibles esta semana",
      "Atención de urgencias (solo si aplica)",
    ],
    friccion: [
      { duda: "¿Cuánto cuesta la consulta?", respuesta: "Escríbenos por WhatsApp y te damos el costo de tu consulta o valoración." },
      { duda: "¿Duele? / ¿Qué tan invasivo es?", respuesta: "En tu valoración te explicamos todo el procedimiento con calma, sin compromiso." },
      { duda: "¿Tienen horario para mañana?", respuesta: "Nuestro horario: {horario}. Agenda por WhatsApp y te confirmamos." },
      { duda: "¿Atienden urgencias?", respuesta: "Escríbenos o llámanos y te decimos si podemos atenderte hoy." },
      { duda: "¿Dónde están?", respuesta: "Estamos en {direccion}." },
    ],
    promesas: [
      { titulo: "Agenda fácil", texto: "Elige día y hora desde tu celular." },
      { titulo: "Trato cercano", texto: "Resuelve tus dudas antes de tu cita." },
      { titulo: "Recordatorio", texto: "Te avisamos antes de tu cita." },
    ],
    evitar: [
      "Fotos de stock de doctores sonriendo",
      "Formularios con datos médicos para agendar",
      "Lenguaje técnico sin beneficio",
      "Promesas médicas absolutas",
    ],
  },

  belleza: {
    categoria: "belleza",
    objetivo: "Reservar cita en un horario concreto",
    cta_primario: "Reservar cita",
    cta_secundario: "Ver servicios",
    quien_busca:
      "Clienta/e que decide por lo visual: quiere ver trabajos reales, precio y un hueco disponible pronto",
    como_busca: [
      "“uñas / barbería / estética en {zona}”",
      "“{servicio} precio {zona}”",
      "“{nombre} instagram”",
    ],
    anatomia: [
      { id: "hero", titulo: "Hero visual", proposito: "Estilo del lugar + reservar", elementos: HERO_BASE },
      { id: "trabajos", titulo: "Trabajos reales", proposito: "Es la prueba principal en este rubro", elementos: ["Galería de resultados", "Antes / después si hay"] },
      { id: "servicios", titulo: "Servicios y precios", proposito: "Eliminar la duda de costo", elementos: ["Servicio, duración, precio desde"] },
      { id: "reserva", titulo: "Reserva en 3 pasos", proposito: "Del antojo a la cita", elementos: ["Servicio → horario → confirmación WhatsApp"] },
      { id: "resenas", titulo: "Clientas felices", proposito: "Confianza", elementos: ["Citas de Google"] },
      CIERRE_BASE,
    ],
    confianza: ["Galería de trabajos reales", "Precios visibles", "Reseñas", "Higiene/ambiente en fotos"],
    urgencia: ["Horarios disponibles esta semana", "Promo del mes (si el dueño la confirma)"],
    friccion: [
      { duda: "¿Cuánto cuesta?", respuesta: "Revisa los precios de referencia o pregúntanos por WhatsApp." },
      { duda: "¿Tienen lugar hoy o mañana?", respuesta: "Escríbenos y te decimos los horarios disponibles." },
      { duda: "¿Cuánto tarda el servicio?", respuesta: "Te decimos el tiempo estimado al reservar." },
    ],
    promesas: [
      { titulo: "Reserva sin esperar", texto: "Aparta tu horario por WhatsApp." },
      { titulo: "Precios claros", texto: "Sabes cuánto pagas antes de ir." },
    ],
    evitar: ["Galería de stock", "Precios escondidos", "Reservar solo por DM sin flujo"],
  },

  automotriz: {
    categoria: "automotriz",
    objetivo: "Solicitar cotización / llevar el auto",
    cta_primario: "Cotizar por WhatsApp",
    cta_secundario: "Llamar",
    quien_busca:
      "Conductor con un problema (a veces urgente) que desconfía del taller: quiere precio aproximado y honestidad",
    como_busca: ["“taller mecánico {zona}”", "“{servicio} precio {zona}”", "“llantera / afinación cerca de mí”"],
    anatomia: [
      { id: "hero", titulo: "Hero directo", proposito: "Qué arreglan, dónde y cómo cotizar", elementos: HERO_BASE },
      { id: "servicios", titulo: "Servicios", proposito: "Identificar su problema", elementos: ["Afinación, frenos, suspensión, eléctrico…", "Precio desde si se conoce"] },
      { id: "cotiza", titulo: "Cotiza con una foto", proposito: "Resolver la desconfianza en precio", elementos: ["Foto/descripción → cotización por WhatsApp"] },
      { id: "confianza", titulo: "Por qué confiar", proposito: "Honestidad y garantía", elementos: ["Explicamos antes de cobrar", "Garantía (si el dueño la ofrece)"] },
      { id: "resenas", titulo: "Clientes", proposito: "Prueba social de honestidad", elementos: ["Reseñas reales"] },
      CIERRE_BASE,
    ],
    confianza: ["Reseñas que hablan de honestidad/precio justo", "Explicación antes de cobrar", "Fotos del taller real"],
    urgencia: ["Diagnóstico hoy", "Atención el mismo día (si aplica)"],
    friccion: [
      { duda: "¿Cuánto me va a costar?", respuesta: "Mándanos foto o descripción por WhatsApp y te damos una cotización aproximada." },
      { duda: "¿Cuánto tiempo tardan?", respuesta: "Te damos tiempo estimado junto con la cotización." },
      { duda: "¿Están abiertos?", respuesta: "Horario: {horario}." },
    ],
    promesas: [
      { titulo: "Cotiza con una foto", texto: "Sin ir al taller para saber cuánto cuesta." },
      { titulo: "Sin sorpresas", texto: "Te explicamos antes de cobrar." },
    ],
    evitar: ["Tecnicismos sin precio", "Esconder el teléfono"],
  },

  fitness: {
    categoria: "fitness",
    objetivo: "Clase muestra / inscripción",
    cta_primario: "Agendar clase muestra",
    cta_secundario: "Ver horarios",
    quien_busca: "Persona motivada pero indecisa; teme no encajar o pagar y no ir",
    como_busca: ["“gimnasio en {zona}”", "“crossfit / yoga {zona}”", "“{nombre} precios mensualidad”"],
    anatomia: [
      { id: "hero", titulo: "Hero energético", proposito: "Motivación + clase muestra", elementos: HERO_BASE },
      { id: "clases", titulo: "Clases y horarios", proposito: "Encajar con su rutina", elementos: ["Horario semanal", "Nivel principiante bienvenido"] },
      { id: "planes", titulo: "Planes", proposito: "Quitar duda de precio", elementos: ["Mensualidad / visita / paquete"] },
      { id: "comunidad", titulo: "Comunidad", proposito: "Pertenencia", elementos: ["Fotos reales", "Reseñas"] },
      CIERRE_BASE,
    ],
    confianza: ["Fotos reales del lugar y la gente", "Coaches visibles", "Reseñas"],
    urgencia: ["Cupo limitado por clase", "Promo de inscripción (si aplica)"],
    friccion: [
      { duda: "Nunca he entrenado, ¿puedo ir?", respuesta: "Claro. Agenda una clase muestra y te acompañamos desde cero." },
      { duda: "¿Cuánto cuesta la mensualidad?", respuesta: "Pregúntanos por WhatsApp los planes disponibles." },
      { duda: "¿Qué horarios tienen?", respuesta: "Horario: {horario}." },
    ],
    promesas: [
      { titulo: "Clase muestra", texto: "Pruébalo antes de inscribirte." },
      { titulo: "A tu ritmo", texto: "Principiantes bienvenidos." },
    ],
    evitar: ["Cuerpos de stock irreales", "Precios ocultos"],
  },

  retail: {
    categoria: "retail",
    objetivo: "Consultar producto / pedir por WhatsApp",
    cta_primario: "Pedir por WhatsApp",
    cta_secundario: "Ver catálogo",
    quien_busca: "Comprador que quiere saber si lo tienen, cuánto cuesta y si se lo pueden apartar o enviar",
    como_busca: ["“{producto} en {zona}”", "“tienda de {giro} {zona}”", "“{nombre} catálogo”"],
    anatomia: [
      { id: "hero", titulo: "Hero de tienda", proposito: "Qué venden y cómo pedir", elementos: HERO_BASE },
      { id: "catalogo", titulo: "Catálogo destacado", proposito: "Ver producto y precio", elementos: ["Foto, nombre, precio", "Botón pedir por producto"] },
      { id: "como_comprar", titulo: "Cómo comprar", proposito: "Apartar / recoger / envío", elementos: ["3 pasos por WhatsApp"] },
      { id: "resenas", titulo: "Clientes", proposito: "Confianza", elementos: ["Reseñas reales"] },
      CIERRE_BASE,
    ],
    confianza: ["Fotos reales de producto", "Precios", "Reseñas"],
    urgencia: ["Existencias limitadas", "Novedades de la semana"],
    friccion: [
      { duda: "¿Lo tienen en existencia?", respuesta: "Pregúntanos por WhatsApp y te confirmamos al momento." },
      { duda: "¿Hacen envíos?", respuesta: "Escríbenos con tu ubicación y te decimos opciones." },
      { duda: "¿Me lo pueden apartar?", respuesta: "Sí, pregúntanos por WhatsApp cómo apartarlo." },
    ],
    promesas: [
      { titulo: "Pregunta sin ir", texto: "Confirma existencia y precio por WhatsApp." },
      { titulo: "Aparta fácil", texto: "Te lo guardamos para que pases por él." },
    ],
    evitar: ["Catálogo sin precios", "Fotos pixeladas"],
  },

  servicios: {
    categoria: "servicios",
    objetivo: "Solicitar cotización",
    cta_primario: "Pedir cotización",
    cta_secundario: "Llamar",
    quien_busca: "Cliente con un proyecto o necesidad; compara 2–3 proveedores y elige al que responde rápido y da confianza",
    como_busca: ["“{servicio} en {zona}”", "“{servicio} precio”", "“{nombre} opiniones”"],
    anatomia: [
      { id: "hero", titulo: "Hero de propuesta de valor", proposito: "Qué resuelven y cotizar", elementos: HERO_BASE },
      { id: "servicios", titulo: "Servicios", proposito: "Identificar su necesidad", elementos: ["Lista con beneficio"] },
      { id: "proceso", titulo: "Cómo trabajamos", proposito: "Quitar incertidumbre", elementos: ["Cotización → acuerdo → entrega"] },
      { id: "trabajos", titulo: "Trabajos / casos", proposito: "Prueba", elementos: ["Fotos reales de trabajos"] },
      { id: "resenas", titulo: "Clientes", proposito: "Confianza", elementos: ["Reseñas reales"] },
      CIERRE_BASE,
    ],
    confianza: ["Casos/trabajos reales", "Respuesta rápida", "Reseñas"],
    urgencia: ["Agenda de la semana", "Cotización hoy"],
    friccion: [
      { duda: "¿Cuánto cuesta?", respuesta: "Cuéntanos qué necesitas por WhatsApp y te cotizamos sin compromiso." },
      { duda: "¿En cuánto tiempo?", respuesta: "Te damos tiempos junto con la cotización." },
    ],
    promesas: [
      { titulo: "Cotización rápida", texto: "Por WhatsApp, sin compromiso." },
      { titulo: "Trabajo comprobable", texto: "Mira lo que ya hemos hecho." },
    ],
    evitar: ["Formularios largos", "Textos genéricos sin casos"],
  },

  general: {
    categoria: "general",
    objetivo: "Contacto por WhatsApp",
    cta_primario: "Escribir por WhatsApp",
    cta_secundario: "Cómo llegar",
    quien_busca: "Cliente local que quiere saber qué ofrecen, cuándo abren y cómo contactarlos",
    como_busca: ["“{giro} en {zona}”", "“{nombre}”"],
    anatomia: [
      { id: "hero", titulo: "Hero", proposito: "Qué es, dónde, cómo contactar", elementos: HERO_BASE },
      { id: "oferta", titulo: "Qué ofrecemos", proposito: "Identificación", elementos: ["Productos/servicios principales"] },
      { id: "resenas", titulo: "Clientes", proposito: "Confianza", elementos: ["Reseñas reales"] },
      CIERRE_BASE,
    ],
    confianza: ["Rating y reseñas", "Fotos reales", "Contacto visible"],
    urgencia: ["Abierto ahora"],
    friccion: [
      { duda: "¿Están abiertos?", respuesta: "Horario: {horario}." },
      { duda: "¿Dónde están?", respuesta: "Estamos en {direccion}." },
    ],
    promesas: [
      { titulo: "Contacto directo", texto: "Te respondemos por WhatsApp." },
      { titulo: "Fácil de encontrar", texto: "Abre el mapa desde aquí." },
    ],
    evitar: ["Texto genérico", "Contacto escondido"],
  },
};

export function conversionProfile(id: CategoryId): ConversionProfile {
  return CONVERSION_PROFILES[id] ?? CONVERSION_PROFILES.general;
}

/** Versión compacta del perfil para prompts (inferencia, mockup, entregables). */
export function conversionBrief(id: CategoryId) {
  const p = conversionProfile(id);
  return {
    objetivo: p.objetivo,
    cta_primario: p.cta_primario,
    cta_secundario: p.cta_secundario,
    quien_busca: p.quien_busca,
    como_busca: p.como_busca,
    anatomia: p.anatomia.map((s) => `${s.titulo}: ${s.proposito}`),
    factores_confianza: p.confianza,
    factores_urgencia: p.urgencia,
    dudas_criticas: p.friccion.map((f) => f.duda),
    evitar: p.evitar,
  };
}

export function fillTokens(
  text: string,
  data: { horario?: string | null; direccion?: string | null; nombre?: string | null },
): string | null {
  if (text.includes("{horario}") && !data.horario) return null;
  if (text.includes("{direccion}") && !data.direccion) return null;
  return text
    .replace(/\{horario\}/g, data.horario ?? "")
    .replace(/\{direccion\}/g, data.direccion ?? "")
    .replace(/\{nombre\}/g, data.nombre ?? "")
    .replace(/\.\./g, ".");
}
