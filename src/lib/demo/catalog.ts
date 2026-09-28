import type { PhotoSlot } from "@/lib/demo/slots";

/** Ítem genérico del catálogo (menú, habitaciones, servicios, propiedades). */
export type CatalogItem = {
  id: string;
  name: string;
  price_hint: string;
  note?: string | null;
  photo_url?: string | null;
  available: boolean;
};

export function catalogFromSlots(slots: PhotoSlot[], prices?: Map<string, string>): CatalogItem[] {
  return slots.map((s) => ({
    id: s.id,
    name: s.label,
    price_hint: prices?.get(s.id) ?? "consultar",
    photo_url: s.photo_url,
    available: true,
  }));
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Reemplaza el bloque .items (o cada data-slot) con el catálogo actual. */
export function injectCatalogIntoHtml(html: string, items: CatalogItem[]): string {
  const visible = items.filter((i) => i.available);
  if (!visible.length) return html;

  let out = html;
  for (const it of visible) {
    const id = it.id.replace(/[^\w-]/g, "");
    const shot = it.photo_url
      ? `<img src="${esc(it.photo_url)}" alt="${esc(it.name)}" loading="lazy">`
      : `<div class="shot-ph">${esc(it.name)}</div>`;
    const block = `<div class="item reveal" data-slot="${esc(id)}"><div class="shot">${shot}</div><div class="item-body"><strong>${esc(it.name)}</strong>${it.note ? `<small>${esc(it.note)}</small>` : ""}</div><div class="p">${esc(it.price_hint)}</div></div>`;
    const re = new RegExp(
      `<div[^>]*data-slot="${id}"[^>]*>[\\s\\S]*?</div>(?:\\s*</div>){0,2}`,
      "i",
    );
    if (re.test(out)) {
      out = out.replace(re, block);
    }
  }

  // Ocultar no disponibles (quitar del HTML)
  for (const it of items.filter((i) => !i.available)) {
    const id = it.id.replace(/[^\w-]/g, "");
    out = out.replace(
      new RegExp(`<div[^>]*data-slot="${id}"[^>]*>[\\s\\S]*?</div>(?:\\s*</div>){0,2}`, "i"),
      "",
    );
  }

  // Si no había data-slots, reemplaza el contenedor .items entero
  if (!/data-slot=/i.test(html) && /class=["'][^"']*\bitems\b/i.test(out)) {
    const inner = visible
      .map((it) => {
        const shot = it.photo_url
          ? `<img src="${esc(it.photo_url)}" alt="${esc(it.name)}" loading="lazy">`
          : `<div class="shot-ph">${esc(it.name)}</div>`;
        return `<div class="item reveal" data-slot="${esc(it.id)}"><div class="shot">${shot}</div><div class="item-body"><strong>${esc(it.name)}</strong>${it.note ? `<small>${esc(it.note)}</small>` : ""}</div><div class="p">${esc(it.price_hint)}</div></div>`;
      })
      .join("");
    out = out.replace(
      /(<div class="items"[^>]*>)([\s\S]*?)(<\/div>\s*(?:<\/section>|$))/i,
      `$1${inner}$3`,
    );
  }

  return out;
}
