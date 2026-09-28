import { toWaNumber } from "@/lib/phone";

/** Datos que el dueño corrige o confirma. Tienen prioridad sobre lo detectado en Google. */
export type Ajustes = {
  nombre?: string;
  whatsapp?: string;
  horario?: string;
  direccion?: string;
  color?: string;
  notas?: string;
};

export const AJUSTE_LABEL: Record<keyof Ajustes, string> = {
  nombre: "Nombre visible",
  whatsapp: "WhatsApp que recibe los mensajes",
  horario: "Horario",
  direccion: "Dirección",
  color: "Color de marca",
  notas: "Datos confirmados por el dueño",
};

export function cleanAjustes(raw: unknown): Ajustes {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Ajustes = {};
  for (const k of Object.keys(AJUSTE_LABEL) as Array<keyof Ajustes>) {
    const v = typeof src[k] === "string" ? (src[k] as string).trim() : "";
    if (v) out[k] = v.slice(0, k === "notas" ? 1200 : 200);
  }
  if (out.color && !/^#[0-9a-f]{6}$/i.test(out.color)) delete out.color;
  return out;
}

function fmt10(n10: string): string {
  return `${n10.slice(0, 3)} ${n10.slice(3, 6)} ${n10.slice(6)}`;
}

/** Cambia un número por otro en todo el HTML (wa.me, tel: y texto visible) sin regenerar. */
export function swapPhone(html: string, oldTel: string | null | undefined, newTel: string): string {
  const o = toWaNumber(oldTel);
  const n = toWaNumber(newTel);
  if (!o || !n || o === n) return html;
  const o10 = o.slice(2);
  const n10 = n.slice(2);
  const digits = o10.split("").join("[\\s.\\-()]*");
  const re = new RegExp(`(?<!\\d)(\\+?52[\\s.\\-]*1?[\\s.\\-]*)?\\(?${digits}(?!\\d)`, "g");
  return html.replace(re, (m) => {
    const compact = !/[\s.\-()]/.test(m);
    const prefix = m.startsWith("+") ? "+52" : /^52/.test(m) && m.replace(/\D/g, "").length > 10 ? "52" : "";
    if (compact) return `${prefix}${n10}`;
    return prefix ? `${prefix} ${fmt10(n10)}` : fmt10(n10);
  });
}

/** Instrucción de edición para los cambios que no se pueden parchar con texto. */
export function instruccionPorCambios(prev: Ajustes, next: Ajustes): string | null {
  const partes: string[] = [];
  if (next.nombre && next.nombre !== prev.nombre) {
    partes.push(`El nombre del negocio es "${next.nombre}": úsalo en título, <title>, logo tipográfico, textos y JSON-LD.`);
  }
  if (next.horario && next.horario !== prev.horario) {
    partes.push(`El horario correcto es: ${next.horario}. Reemplaza cualquier horario anterior (incluye JSON-LD openingHours).`);
  }
  if (next.direccion && next.direccion !== prev.direccion) {
    partes.push(`La dirección correcta es: ${next.direccion}. Reemplaza la anterior en toda la página y en JSON-LD.`);
  }
  if (next.color && next.color !== prev.color) {
    partes.push(`El color principal de la marca es ${next.color}: úsalo como acento (botones, detalles, degradados) manteniendo buen contraste.`);
  }
  if (next.notas && next.notas !== prev.notas) {
    partes.push(`Datos confirmados por el dueño que deben reflejarse donde corresponda (puedes afirmarlos): ${next.notas}`);
  }
  return partes.length ? partes.join("\n") : null;
}
