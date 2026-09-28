import type { CategoryId } from "@/lib/categories/playbooks";

/** Vocabulario por rubro para copys, plantillas y SEO. Al agregar un rubro, TypeScript exige llenarlo aquí. */
export type Vocab = {
  /** Cómo se le dice al cliente final */
  cliente: string;
  /** Qué genera el negocio por WhatsApp */
  accion: string;
  /** Título de la sección de oferta */
  oferta_label: string;
  /** H2 de la sección de oferta en la landing */
  oferta_titulo: string;
  /** schema.org */
  ld_type: string;
  /** Tipo de chat de la demo WhatsApp */
  chat: "pedido" | "reserva" | "cita" | "informes";
};

export const VOCAB: Record<CategoryId, Vocab> = {
  comida: { cliente: "cliente", accion: "pedido", oferta_label: "Menú", oferta_titulo: "Elige y pide por WhatsApp", ld_type: "Restaurant", chat: "pedido" },
  hoteleria: { cliente: "huésped", accion: "reserva", oferta_label: "Habitaciones", oferta_titulo: "Elige tu habitación", ld_type: "Hotel", chat: "reserva" },
  salud: { cliente: "paciente", accion: "cita", oferta_label: "Servicios", oferta_titulo: "Elige tu consulta", ld_type: "MedicalClinic", chat: "cita" },
  belleza: { cliente: "cliente", accion: "cita", oferta_label: "Servicios", oferta_titulo: "Elige tu servicio", ld_type: "BeautySalon", chat: "cita" },
  automotriz: { cliente: "cliente", accion: "cotización", oferta_label: "Servicios", oferta_titulo: "Elige lo que necesita tu auto", ld_type: "AutoRepair", chat: "informes" },
  fitness: { cliente: "cliente", accion: "inscripción", oferta_label: "Planes", oferta_titulo: "Elige tu plan", ld_type: "ExerciseGym", chat: "cita" },
  retail: { cliente: "cliente", accion: "pedido", oferta_label: "Catálogo", oferta_titulo: "Lo más pedido", ld_type: "Store", chat: "pedido" },
  servicios: { cliente: "cliente", accion: "cotización", oferta_label: "Servicios", oferta_titulo: "Elige lo que necesitas", ld_type: "LocalBusiness", chat: "informes" },
  veterinaria: { cliente: "dueño de mascota", accion: "cita", oferta_label: "Servicios", oferta_titulo: "Lo que tu mascota necesita", ld_type: "VeterinaryCare", chat: "cita" },
  inmobiliaria: { cliente: "interesado", accion: "visita", oferta_label: "Propiedades", oferta_titulo: "Propiedades disponibles", ld_type: "RealEstateAgent", chat: "informes" },
  tours: { cliente: "viajero", accion: "reserva", oferta_label: "Tours", oferta_titulo: "Elige tu experiencia", ld_type: "TravelAgency", chat: "reserva" },
  educacion: { cliente: "papá o mamá", accion: "visita", oferta_label: "Oferta educativa", oferta_titulo: "Niveles y cursos", ld_type: "EducationalOrganization", chat: "informes" },
  general: { cliente: "cliente", accion: "mensaje", oferta_label: "Lo que ofrecemos", oferta_titulo: "Elige lo que necesitas", ld_type: "LocalBusiness", chat: "informes" },
};

export function vocabFor(id: string): Vocab {
  return VOCAB[id as CategoryId] ?? VOCAB.general;
}
