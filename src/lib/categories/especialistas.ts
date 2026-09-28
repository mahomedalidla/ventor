import type { ConversionProfile, FrictionPoint } from "@/lib/categories/conversion";

/**
 * Overlay de conversión por especialidad médica.
 * Un oftalmólogo no convierte igual que un gastroenterólogo: distinta búsqueda,
 * distinta duda y distinta anatomía. Se aplica encima del perfil "salud".
 */
export type Especialidad = {
  id: string;
  label: string;
  aliases: string[];
  /** Lo que escribe el paciente en Google */
  como_busca: string[];
  quien_busca: string;
  objetivo: string;
  cta_primario: string;
  anatomia_extra: Array<{ id: string; titulo: string; proposito: string; elementos: string[] }>;
  friccion: FrictionPoint[];
  confianza: string[];
  evitar: string[];
  servicios: string[];
};

export const ESPECIALIDADES: Especialidad[] = [
  {
    id: "oftalmologo",
    label: "Oftalmólogo",
    aliases: ["oftalmólogo", "oftalmologo", "oculista", "clínica de ojos", "clinica de ojos"],
    como_busca: ["“oftalmólogo {zona}”", "“oculista cerca de mí”", "“cirugía de cataratas {zona}”", "“lentes de contacto {zona}”"],
    quien_busca: "Adulto con visión borrosa, cataratas o hijo con revisión escolar; quiere saber si operan, cuánto cuesta la consulta y si hay lentes el mismo día",
    objetivo: "Agendar valoración de la vista",
    cta_primario: "Agendar revisión de la vista",
    anatomia_extra: [
      { id: "sintomas", titulo: "¿Te pasa esto?", proposito: "Que se identifique (visión borrosa, halo, ojo seco)", elementos: ["Síntomas cotidianos, no tecnicismos"] },
      { id: "estudios", titulo: "Estudios en el consultorio", proposito: "Saber que no lo mandan a otro lado", elementos: ["Fondo de ojo, presión, graduación (solo si aplica)"] },
    ],
    friccion: [
      { duda: "¿Me van a dilatar la pupila?", respuesta: "En la valoración te explicamos si hace falta. Puedes venir con alguien si no quieres manejar después." },
      { duda: "¿Operan cataratas / lentes?", respuesta: "Pregúntanos por WhatsApp qué procedimientos hacemos aquí y te damos el siguiente paso." },
      { duda: "¿Cuánto cuesta la consulta?", respuesta: "Escríbenos y te damos el costo de la valoración." },
    ],
    confianza: ["Aparatos en consultorio", "Foto real del doctor", "Reseñas sobre explicación clara"],
    evitar: ["Fotos de stock de ojos azules", "Prometer que deja de usar lentes"],
    servicios: ["Valoración visual", "Fondo de ojo", "Adaptación de lentes", "Seguimiento post-cirugía"],
  },
  {
    id: "gastro",
    label: "Gastroenterólogo",
    aliases: ["gastroenterólogo", "gastroenterologo", "gastro", "endoscopía", "endoscopia"],
    como_busca: ["“gastroenterólogo {zona}”", "“endoscopía {zona}”", "“colonoscopía precio”", "“dolor de estómago doctor {zona}”"],
    quien_busca: "Persona con reflujo, colitis o estudio pendiente; le da pena y miedo el procedimiento; quiere preparación clara y sedación",
    objetivo: "Agendar valoración o estudio",
    cta_primario: "Agendar valoración",
    anatomia_extra: [
      { id: "estudios", titulo: "Estudios (endoscopía / colonoscopía)", proposito: "Quitar miedo al procedimiento", elementos: ["Cómo es, sedación, tiempo, preparación"] },
      { id: "privacidad", titulo: "Discreción", proposito: "Temas íntimos", elementos: ["Consultorio privado", "Explicación paso a paso"] },
    ],
    friccion: [
      { duda: "¿Duele la endoscopía?", respuesta: "Te explicamos la sedación y cómo te vas a sentir. Agenda por WhatsApp y resolvemos dudas antes." },
      { duda: "¿Cómo me preparo?", respuesta: "Al agendar te mandamos la preparación por escrito, clara y a tiempo." },
      { duda: "¿Cuánto cuesta el estudio?", respuesta: "Depende del estudio. Escríbenos y te cotizamos sin compromiso." },
    ],
    confianza: ["Explica el procedimiento sin prisa", "Sedación clara", "Reseñas sobre trato respetuoso"],
    evitar: ["Fotos explícitas de procedimientos", "Minimizar el miedo del paciente"],
    servicios: ["Consulta de gastroenterología", "Endoscopía", "Colonoscopía", "Seguimiento de colitis / reflujo"],
  },
  {
    id: "ginecologo",
    label: "Ginecólogo",
    aliases: ["ginecólogo", "ginecologo", "ginecóloga", "ginecologa", "ginecología", "ginecologia"],
    como_busca: ["“ginecólogo {zona}”", "“ginecóloga mujer {zona}”", "“papanicolaou {zona}”", "“control prenatal {zona}”"],
    quien_busca: "Mujer que busca trato respetuoso (a veces prefiere doctora), control anual o embarazo; la confianza y la privacidad mandan",
    objetivo: "Agendar consulta o control",
    cta_primario: "Agendar consulta",
    anatomia_extra: [
      { id: "trato", titulo: "Cómo te atendemos", proposito: "Seguridad y respeto", elementos: ["Explicamos cada paso", "Puedes ir acompañada"] },
      { id: "servicios_gine", titulo: "Consulta, Papanicolaou, prenatal", proposito: "Identificar su motivo", elementos: ["Lista clara, sin eufemismos raros"] },
    ],
    friccion: [
      { duda: "¿Atiende una doctora o un doctor?", respuesta: "Escríbenos por WhatsApp y te confirmamos quién te atiende." },
      { duda: "¿Duele el Papanicolaou?", respuesta: "Te explicamos el procedimiento con calma. La mayoría lo describe como molestia breve." },
      { duda: "¿Puedo ir acompañada?", respuesta: "Sí. Dínoslo al agendar." },
    ],
    confianza: ["Quién atiende (nombre y foto)", "Privacidad", "Reseñas de mujeres reales"],
    evitar: ["Fotos de stock de embarazadas", "Lenguaje infantilizante"],
    servicios: ["Consulta ginecológica", "Papanicolaou", "Control prenatal", "Ultrasonido (si aplica)"],
  },
  {
    id: "pediatra",
    label: "Pediatra",
    aliases: ["pediatra", "pediatría", "pediatria", "niños doctor"],
    como_busca: ["“pediatra {zona}”", "“pediatra de urgencia {zona}”", "“vacunas niños {zona}”"],
    quien_busca: "Mamá o papá, a veces de madrugada, con niño enfermo; quiere saber si atienden hoy y si hay consultorio infantil",
    objetivo: "Agendar consulta pediátrica (a veces hoy)",
    cta_primario: "Agendar para mi hijo",
    anatomia_extra: [
      { id: "hoy", titulo: "¿Lo ven hoy?", proposito: "Urgencia de papás", elementos: ["Horario", "WhatsApp de triaje"] },
      { id: "vacunas", titulo: "Vacunas y control del niño sano", proposito: "Motivo frecuente no urgente", elementos: ["Cartilla", "calendario"] },
    ],
    friccion: [
      { duda: "¿Atienden si tiene fiebre hoy?", respuesta: "Escríbenos por WhatsApp con la edad y cómo está y te decimos si hay lugar hoy." },
      { duda: "¿Cuánto dura la consulta?", respuesta: "Te confirmamos al agendar. Venimos a escucharte, no a despachar." },
    ],
    confianza: ["Trato con niños (reseñas)", "Horario amplio", "Foto real del pediatra"],
    evitar: ["Fotos de stock de bebés", "Prometer urgencias 24 h si no es verdad"],
    servicios: ["Consulta del niño enfermo", "Niño sano / control", "Vacunas", "Certificados escolares"],
  },
  {
    id: "dermatologo",
    label: "Dermatólogo",
    aliases: ["dermatólogo", "dermatologo", "dermatología", "dermatologia", "acné", "acne"],
    como_busca: ["“dermatólogo {zona}”", "“acné tratamiento {zona}”", "“manchas en la piel doctor”"],
    quien_busca: "Adolescente o adulto con acné, manchas o lunar; decide por fotos de resultados reales y si hay consulta de primera vez accesible",
    objetivo: "Agendar valoración de piel",
    cta_primario: "Agendar valoración de piel",
    anatomia_extra: [
      { id: "casos", titulo: "Casos reales (con permiso)", proposito: "Prueba visual", elementos: ["Antes/después solo si el dueño los confirma"] },
    ],
    friccion: [
      { duda: "¿Ven acné / manchas / lunares?", respuesta: "Sí, escríbenos el motivo y te agendamos la valoración." },
      { duda: "¿Cuántas sesiones voy a necesitar?", respuesta: "Eso se ve en consulta. No te vendemos un paquete a ciegas." },
    ],
    confianza: ["Foto del doctor", "No vender paquetes en el hero"],
    evitar: ["Antes/después de stock", "Prometer piel perfecta"],
    servicios: ["Acné", "Manchas", "Revisión de lunares", "Estética médica (solo si aplica)"],
  },
  {
    id: "ortopedista",
    label: "Ortopedista",
    aliases: ["ortopedista", "traumatólogo", "traumatologo", "ortopedia"],
    como_busca: ["“ortopedista {zona}”", "“dolor de rodilla doctor”", "“fractura {zona}”"],
    quien_busca: "Persona con dolor articular, lesión deportiva o fractura; quiere saber si hay rayos X y si opera",
    objetivo: "Agendar valoración de hueso / articulación",
    cta_primario: "Agendar valoración",
    anatomia_extra: [
      { id: "lesion", titulo: "Rodilla, espalda, hombro, fractura", proposito: "Identificar su dolor", elementos: ["Zonas frecuentes"] },
    ],
    friccion: [
      { duda: "¿Hay rayos X aquí?", respuesta: "Pregúntanos por WhatsApp si el estudio se hace en consultorio o te indicamos dónde." },
      { duda: "¿Operan o solo consulta?", respuesta: "Escríbenos tu caso y te decimos el camino (consulta, rehabilitación o cirugía)." },
    ],
    confianza: ["Experiencia en la lesión", "Explicar si hay cirugía o no"],
    evitar: ["Prometer que no va a operar"],
    servicios: ["Dolor articular", "Lesión deportiva", "Fracturas", "Seguimiento post-quirúrgico"],
  },
  {
    id: "cardiologo",
    label: "Cardiólogo",
    aliases: ["cardiólogo", "cardiologo", "cardiología", "cardiologia", "electrocardiograma"],
    como_busca: ["“cardiólogo {zona}”", "“electrocardiograma {zona}”", "“presión alta doctor”"],
    quien_busca: "Adulto mayor o referido por otro médico; miedo real; quiere estudios en el mismo lugar y explicación clara",
    objetivo: "Agendar chequeo cardiológico",
    cta_primario: "Agendar chequeo",
    anatomia_extra: [
      { id: "estudios_cardio", titulo: "ECG, Holter, eco (si aplica)", proposito: "No mandarlo a otra ciudad si se puede", elementos: ["Qué se hace en consultorio"] },
    ],
    friccion: [
      { duda: "¿Necesito llegar en ayuno?", respuesta: "Al agendar te decimos si tu estudio pide ayuno." },
      { duda: "¿Atienden si me duele el pecho hoy?", respuesta: "Si es intenso o con falta de aire, ve a urgencias. Si es revisión, escríbenos y te agendamos." },
    ],
    confianza: ["Estudios en sitio", "No minimizar síntomas de pecho"],
    evitar: ["Decir que reemplaza urgencias"],
    servicios: ["Consulta cardiológica", "Electrocardiograma", "Chequeo de hipertensión", "Seguimiento"],
  },
  {
    id: "nutriologo",
    label: "Nutriólogo",
    aliases: ["nutriólogo", "nutriologo", "nutrición", "nutricion", "dieta"],
    como_busca: ["“nutriólogo {zona}”", "“dieta {zona}”", "“bajar de peso nutriólogo”"],
    quien_busca: "Persona que ya probió dietas; desconfía de milagros; quiere plan realista y seguimiento",
    objetivo: "Agendar primera consulta de nutrición",
    cta_primario: "Agendar mi primera consulta",
    anatomia_extra: [
      { id: "metodo", titulo: "Cómo trabajamos", proposito: "No es dieta milagro", elementos: ["Evaluación → plan → seguimiento"] },
    ],
    friccion: [
      { duda: "¿Me van a pasar hambre?", respuesta: "El plan se arma contigo, con lo que sí puedes sostener." },
      { duda: "¿Cuánto dura el acompañamiento?", respuesta: "Te lo explicamos en la primera consulta, sin atarte a un paquete a ciegas." },
    ],
    confianza: ["Sin milagros", "Seguimiento"],
    evitar: ["Antes/después extremos", "Prometer X kilos"],
    servicios: ["Primera evaluación", "Plan de alimentación", "Seguimiento", "Nutrición clínica (si aplica)"],
  },
  {
    id: "psicologo",
    label: "Psicólogo",
    aliases: ["psicólogo", "psicologo", "psicóloga", "psicologa", "terapia", "psicología"],
    como_busca: ["“psicólogo {zona}”", "“terapia {zona}”", "“psicóloga para ansiedad”"],
    quien_busca: "Persona con ansiedad, duelo o pareja; necesita confidencialidad, modalidad (presencial/en línea) y precio por sesión",
    objetivo: "Agendar primera sesión",
    cta_primario: "Agendar primera sesión",
    anatomia_extra: [
      { id: "modalidad", titulo: "Presencial o en línea", proposito: "Bajar fricción de dar el primer paso", elementos: ["Cómo es la primera sesión"] },
    ],
    friccion: [
      { duda: "¿Es confidencial?", respuesta: "Sí. Lo que platicamos se queda entre nosotros, salvo riesgo de daño (te lo explicamos)." },
      { duda: "¿Cuánto dura y cuánto cuesta la sesión?", respuesta: "Escríbenos y te damos duración y honorarios de la primera sesión." },
    ],
    confianza: ["Confidencialidad visible", "Foto real", "Sin promesas de “curar”"],
    evitar: ["Stock de personas meditando", "Diagnósticos en la web"],
    servicios: ["Ansiedad y estrés", "Duelo", "Terapia individual", "En línea (si aplica)"],
  },
  {
    id: "dentista",
    label: "Dentista",
    aliases: ["dentista", "dental", "odontólogo", "odontologo", "clínica dental", "clinica dental"],
    como_busca: ["“dentista {zona}”", "“brackets {zona}”", "“limpieza dental precio”", "“urgencia dental {zona}”"],
    quien_busca: "Paciente con dolor o vergüenza por la sonrisa; pregunta precio, si duele y si hay urgencias",
    objetivo: "Agendar valoración o urgencia",
    cta_primario: "Agendar valoración dental",
    anatomia_extra: [
      { id: "urgencia_dental", titulo: "¿Te duele hoy?", proposito: "Captar urgencia", elementos: ["WhatsApp de dolor de muela"] },
    ],
    friccion: [
      { duda: "¿Duele?", respuesta: "Te explicamos cada paso y las opciones de anestesia. La idea es que salgas tranquilo." },
      { duda: "¿Cuánto cuesta una limpieza / muela?", respuesta: "En la valoración te damos precio claro, antes de empezar." },
    ],
    confianza: ["Antes/después solo reales", "Precio de valoración visible si existe"],
    evitar: ["Sonrisas de stock", "Precio oculto hasta el final"],
    servicios: ["Limpieza", "Urgencia / dolor", "Endodoncia", "Estética / brackets (si aplica)"],
  },
];

export function resolveEspecialidad(tipo: string | null | undefined): Especialidad | null {
  const q = (tipo ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!q) return null;
  let best: { e: Especialidad; n: number } | null = null;
  for (const e of ESPECIALIDADES) {
    for (const a of e.aliases) {
      const n = a
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
      if (q === n || q.includes(n) || n.includes(q)) {
        if (!best || n.length > best.n) best = { e, n: n.length };
      }
    }
  }
  return best?.e ?? null;
}

/** Mezcla el perfil de salud con la especialidad detectada. */
export function applyEspecialidad(base: ConversionProfile, tipo: string | null | undefined): ConversionProfile {
  const e = resolveEspecialidad(tipo);
  if (!e) return base;
  const insertAt = Math.max(1, base.anatomia.findIndex((s) => s.id === "servicios"));
  const anatomia = [...base.anatomia];
  anatomia.splice(insertAt + 1, 0, ...e.anatomia_extra);
  return {
    ...base,
    objetivo: e.objetivo,
    cta_primario: e.cta_primario,
    quien_busca: e.quien_busca,
    como_busca: e.como_busca,
    anatomia,
    confianza: [...e.confianza, ...base.confianza].slice(0, 6),
    friccion: [...e.friccion, ...base.friccion.filter((f) => !e.friccion.some((x) => x.duda === f.duda))],
    evitar: [...e.evitar, ...base.evitar],
  };
}
