import type { DemoAssets } from "@/lib/demo/assets";
import { toWaNumber } from "@/lib/phone";

/** Datos que el dueño corrige o confirma. Tienen prioridad sobre lo detectado en Google. */
export type Ajustes = {
  nombre?: string;
  whatsapp?: string;
  horario?: string;
  direccion?: string;
  logo_url?: string;
  color?: string;
  color_sec?: string;
  color_ter?: string;
  notas?: string;
};

export const AJUSTE_LABEL: Record<keyof Ajustes, string> = {
  nombre: "Nombre visible",
  whatsapp: "WhatsApp que recibe los mensajes",
  horario: "Horario",
  direccion: "Dirección",
  logo_url: "Logo",
  color: "Color principal",
  color_sec: "Color secundario",
  color_ter: "Color de acento",
  notas: "Datos confirmados por el dueño",
};

export function cleanAjustes(raw: unknown): Ajustes {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Ajustes = {};
  for (const k of Object.keys(AJUSTE_LABEL) as Array<keyof Ajustes>) {
    const v = typeof src[k] === "string" ? (src[k] as string).trim() : "";
    if (v) out[k] = v.slice(0, k === "notas" ? 1200 : k === "logo_url" ? 500 : 200);
  }
  for (const k of ["color", "color_sec", "color_ter"] as const) {
    if (out[k] && !/^#[0-9a-f]{6}$/i.test(out[k]!)) delete out[k];
  }
  if (out.logo_url && !/^https?:\/\//i.test(out.logo_url)) delete out.logo_url;
  return out;
}

export function applyAjustesToAssets(assets: DemoAssets, aj: Ajustes): DemoAssets {
  return {
    ...assets,
    logo_url: aj.logo_url ?? assets.logo_url,
    logo_source: aj.logo_url ? "manual" : assets.logo_source,
    theme_color: aj.color ?? assets.theme_color,
    theme_secondary: aj.color_sec ?? assets.theme_secondary,
    theme_tertiary: aj.color_ter ?? assets.theme_tertiary,
  };
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
    partes.push(`Paleta de marca: principal ${next.color}${next.color_sec ? `, secundario ${next.color_sec}` : ""}${next.color_ter ? `, acento ${next.color_ter}` : ""}. Úsalos como --a --b --c (botones, fondos de sección, detalles).`);
  }
  if (next.logo_url && next.logo_url !== prev.logo_url) {
    partes.push(`Usa este logo real en nav, favicon y JSON-LD: ${next.logo_url}`);
  }
  if (next.notas && next.notas !== prev.notas) {
    partes.push(`Datos confirmados por el dueño que deben reflejarse donde corresponda (puedes afirmarlos): ${next.notas}`);
  }
  return partes.length ? partes.join("\n") : null;
}

function setCssVar(html: string, name: string, value: string): string {
  const re = new RegExp(`(--${name}\\s*:\\s*)#[0-9a-fA-F]{3,8}`, "g");
  if (re.test(html)) return html.replace(re, `$1${value}`);
  return html.replace(/:root\s*\{/, `:root{--${name}:${value};`);
}

/** Aplica logo y paleta en el HTML ya generado, sin regenerar. */
export function swapBrand(html: string, aj: Ajustes): string {
  let out = html;
  if (aj.color) out = setCssVar(out, "a", aj.color);
  if (aj.color_sec) out = setCssVar(out, "b", aj.color_sec);
  if (aj.color_ter) out = setCssVar(out, "c", aj.color_ter);
  if (aj.logo_url) {
    const src = aj.logo_url.replace(/"/g, "");
    if (/class="logo-img"/.test(out)) {
      out = out.replace(
        /(<img[^>]*class="logo-img"[^>]*src=")[^"]+(")/i,
        `$1${src}$2`,
      );
    } else {
      out = out.replace(
        /<span class="logo-mono">[^<]*<\/span>/,
        `<img src="${src}" alt="" class="logo-img">`,
      );
    }
    out = out.replace(
      /(<div class="av">)(?:<img[^>]*>|[^<]+)(<\/div>)/,
      `$1<img src="${src}" alt="">$2`,
    );
  }
  return out;
}
