import type { Engagement } from "@/lib/sales/engagement";
import { ETAPA_LABEL, type Etapa, type SalesPlan } from "@/lib/sales/types";

export type Grupo = "ahora" | "hoy" | "prueba" | "nuevas" | "programadas";

export type NextAction = {
  clave: string;
  grupo: Grupo;
  prioridad: number;
  titulo: string;
  porque: string;
  /** Mensaje listo para WhatsApp; admite {link} {link_maps} {reporte} {visitas} {clics_whatsapp}. */
  mensaje: string | null;
  /** "paso": avanzar el flujo; "toque": mensaje fuera del guion; "demo": generar demo. */
  accion: "paso" | "toque" | "demo" | "esperar";
  etapa?: Etapa;
  tip?: string;
};

export type NextActionInput = {
  nombre: string;
  status: string;
  score: number;
  plan: SalesPlan | null;
  pasoActual: number;
  proximoContacto: string | null;
  ultimoContacto: string | null;
  pruebaInicio: string | null;
  pruebaFin: string | null;
  diasPrueba: number;
  hasDeliverable: boolean;
  eng: Engagement;
  now?: Date;
};

const DAY = 864e5;

function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (new Date(b.toDateString()).getTime() - new Date(a.toDateString()).getTime()) / DAY,
  );
}

/**
 * Siguiente mejor jugada: combina el flujo de venta con lo que pasó en la demo
 * (el dueño la abrió, le llegan clientes, la prueba se acaba…). Ordena el panel.
 */
export function nextAction(i: NextActionInput): NextAction {
  const now = i.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  const pasos = i.plan?.pasos ?? [];
  const actual = pasos[Math.min(i.pasoActual, Math.max(0, pasos.length - 1))];
  const paso = (e: Etapa) => pasos.find((p) => p.etapa === e);
  const idx = (e: Etapa) => pasos.findIndex((p) => p.etapa === e);
  const bonus = i.score / 10;
  const e = i.eng;

  const enPrueba = Boolean(i.pruebaInicio && i.pruebaFin && i.pruebaFin >= today);
  const pruebaTerminada = Boolean(i.pruebaFin && i.pruebaFin < today);
  const cierre = paso("cierre");

  if (pruebaTerminada) {
    return {
      clave: "prueba_terminada",
      grupo: "ahora",
      prioridad: 98,
      titulo: "La prueba terminó: cierra hoy",
      porque: `En la prueba: ${e.visitasPrueba} visitas y ${e.contactosPrueba} contactos. Cada día sin cerrar enfría la venta.`,
      mensaje: cierre?.mensaje ?? null,
      accion: "toque",
      etapa: "cierre",
      tip: "Si duda, ofrece dejarla activa en Esencial en vez de apagarla: perder lo que ya tiene duele más que pagar.",
    };
  }

  if (enPrueba) {
    const fin = new Date(i.pruebaFin + "T12:00:00");
    const restantes = daysBetween(now, fin);
    const transcurridos = i.pruebaInicio ? daysBetween(new Date(i.pruebaInicio + "T12:00:00"), now) : 0;
    const contacto = i.ultimoContacto ? Date.parse(i.ultimoContacto) : 0;

    if (restantes <= 1) {
      return {
        clave: "prueba_ultimo_dia",
        grupo: "ahora",
        prioridad: 94,
        titulo: restantes <= 0 ? "Hoy termina la prueba" : "Mañana termina la prueba",
        porque: `${e.visitasPrueba} visitas y ${e.contactosPrueba} contactos en la prueba: llega al cierre con números.`,
        mensaje: cierre?.mensaje ?? null,
        accion: "toque",
        etapa: "cierre",
      };
    }
    if (e.primerContactoPrueba && Date.parse(e.primerContactoPrueba) > contacto) {
      return {
        clave: "primer_cliente",
        grupo: "ahora",
        prioridad: 91,
        titulo: "¡Le llegó un cliente por la página!",
        porque: `${e.contactosPrueba} persona(s) ya tocaron WhatsApp/llamar/mapa desde su página. Es el mejor momento para que el dueño lo sepa.`,
        mensaje: `¡Buenas noticias! 🙌 Ya le llegaron ${e.contactosPrueba === 1 ? "el primer cliente" : `${e.contactosPrueba} clientes`} desde su página. ¿Le escribieron con “Vi su página”?\nAquí ve sus números en vivo: {reporte}`,
        accion: "toque",
        tip: "Pregúntale si le llegó el mensaje: que él mismo lo confirme vale más que tu reporte.",
      };
    }
    if (transcurridos >= 3 && e.visitasPrueba === 0) {
      return {
        clave: "prueba_sin_trafico",
        grupo: "ahora",
        prioridad: 87,
        titulo: "No le está llegando gente",
        porque: `${transcurridos} días de prueba y 0 visitas: casi seguro no puso el link en su ficha de Google Maps.`,
        mensaje: `Para que empiecen a llegarle clientes falta un paso de 1 minuto 🙏\nGoogle Maps → su negocio → Editar perfil → Sitio web, y pegue:\n{link_maps}\n¿Le marco y lo hacemos juntos?`,
        accion: "toque",
        tip: "Mejor llámale y hazlo con él en la llamada: sin esto la prueba no demuestra nada.",
      };
    }
    const due = i.proximoContacto && Date.parse(i.proximoContacto) <= endOfDay(now);
    return {
      clave: due ? "paso" : "prueba_en_curso",
      grupo: due ? "hoy" : "prueba",
      prioridad: due ? 80 + bonus : 50 + bonus,
      titulo: due && actual ? `Toca: ${ETAPA_LABEL[actual.etapa]}` : `En prueba · quedan ${restantes} días`,
      porque: `${e.visitasPrueba} visitas y ${e.contactosPrueba} contactos desde que empezó la prueba.`,
      mensaje: due ? actual?.mensaje ?? null : null,
      accion: due ? "paso" : "esperar",
      tip: actual?.tip,
    };
  }

  const entregaIdx = idx("entrega_demo");
  const demoEntregada = entregaIdx >= 0 && i.pasoActual > entregaIdx && Boolean(i.ultimoContacto);
  const ofertaIdx = idx("oferta_prueba");
  const antesDeOferta = ofertaIdx < 0 || i.pasoActual <= ofertaIdx;

  if (e.duenoDesdeContacto > 0 && antesDeOferta && i.status !== "cerrado") {
    const varias = e.duenoDesdeContacto >= 2;
    return {
      clave: "dueno_abrio",
      grupo: "ahora",
      prioridad: varias ? 96 : 92,
      titulo: varias
        ? `🔥 Vio su demo ${e.duenoDesdeContacto} veces`
        : "🔥 Abrió su demo",
      porque: `${varias ? "Volver a abrirla es señal clara de interés" : "La acaba de ver"} (${fmtAgo(e.duenoUltima, now)}). Escríbele mientras la tiene fresca.`,
      mensaje: `¿Qué le pareció la página de ${i.nombre}? 😊\nSi gusta se la dejo publicada ${i.diasPrueba || 7} días gratis, con su WhatsApp, para que vea cuántos clientes le llegan. ¿Le cambio algo antes?`,
      accion: "toque",
      etapa: ofertaIdx >= 0 ? "oferta_prueba" : undefined,
      tip: "Nunca le digas que viste que la abrió. Pregunta qué le cambiarías: si pide cambios, ya está comprando.",
    };
  }

  if (demoEntregada && e.duenoVistas === 0 && i.ultimoContacto) {
    const dias = daysBetween(new Date(i.ultimoContacto), now);
    if (dias >= 2) {
      return {
        clave: "no_abrio",
        grupo: "hoy",
        prioridad: 66 + bonus,
        titulo: "No ha abierto la demo",
        porque: `Se la mandaste hace ${dias} días y no la ha visto. Probablemente el mensaje se perdió.`,
        mensaje: `¿Alcanzó a ver la página que le hice a ${i.nombre}? Tarda 1 minuto y ya tiene sus fotos y su WhatsApp 👉 {link}`,
        accion: "toque",
        tip: "Si tampoco la abre, llámale 30 segundos: la voz desbloquea más que otro mensaje.",
      };
    }
  }

  if (!i.hasDeliverable && i.status === "pendiente") {
    return {
      clave: "sin_demo",
      grupo: "nuevas",
      prioridad: 30 + i.score * 0.5,
      titulo: "Genera su demo antes de escribir",
      porque: "Llegar con su página ya hecha (con sus fotos y su logo) multiplica la respuesta.",
      mensaje: null,
      accion: "demo",
    };
  }

  if (i.proximoContacto && Date.parse(i.proximoContacto) <= endOfDay(now)) {
    return {
      clave: "paso",
      grupo: "hoy",
      prioridad: 70 + bonus,
      titulo: actual ? `Toca: ${ETAPA_LABEL[actual.etapa]}` : "Toca seguimiento",
      porque: actual ? `${actual.cuando} Objetivo: ${actual.objetivo}.` : "Seguimiento programado para hoy.",
      mensaje: actual?.mensaje ?? null,
      accion: "paso",
      tip: actual?.tip,
    };
  }

  if (!i.proximoContacto) {
    return {
      clave: "abrir",
      grupo: "nuevas",
      prioridad: 35 + i.score * 0.5,
      titulo: "Listo para abrir conversación",
      porque: "La demo ya está hecha. Empieza por las más calientes.",
      mensaje: actual?.mensaje ?? null,
      accion: "paso",
      tip: actual?.tip,
    };
  }

  return {
    clave: "esperar",
    grupo: "programadas",
    prioridad: 10 + bonus,
    titulo: actual ? `Próximo: ${ETAPA_LABEL[actual.etapa]}` : "Seguimiento programado",
    porque: "Dale su espacio; te avisamos aquí si abre la demo antes.",
    mensaje: null,
    accion: "esperar",
  };
}

function endOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

function fmtAgo(iso: string | null, now: Date): string {
  if (!iso) return "hace poco";
  const min = Math.round((now.getTime() - Date.parse(iso)) / 60000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}
