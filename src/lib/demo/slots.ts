import type { DemoPhoto } from "@/lib/demo/assets";

export type OfferItem = {
  name: string;
  price_hint: string;
  note?: string | null;
  photo_url?: string | null;
  slot_id?: string;
};

export type PhotoSlot = {
  id: string;
  label: string;
  photo_url: string | null;
};

/** Asigna foto a cada ítem. Si hay fotos, se reciclan (nunca se deja el hueco vacío por defecto). */
export function withPhotoSlots(items: OfferItem[], photos: DemoPhoto[]): OfferItem[] {
  return items.map((it, i) => ({
    ...it,
    slot_id: it.slot_id ?? `item-${i}`,
    photo_url: it.photo_url ?? (photos.length ? photos[i % photos.length].url : null),
  }));
}

export function slotsFromItems(items: OfferItem[]): PhotoSlot[] {
  return items
    .filter((it) => it.slot_id)
    .map((it) => ({ id: it.slot_id!, label: it.name, photo_url: it.photo_url ?? null }));
}

/** Reemplaza la foto de un data-slot en el HTML ya generado. */
export function swapSlotPhoto(html: string, slotId: string, url: string): string {
  const id = slotId.replace(/[^\w-]/g, "");
  const src = url.replace(/"/g, "");
  const blockRe = new RegExp(
    `(data-slot="${id}"[\\s\\S]{0,800}?)(?:<img[^>]*>|<div class="shot-ph"[^<]*</div>)`,
    "i",
  );
  if (blockRe.test(html)) {
    return html.replace(blockRe, `$1<img src="${src}" alt="" loading="lazy">`);
  }
  return html.replace(
    new RegExp(`(data-slot="${id}"[^>]*>)`, "i"),
    `$1<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover">`,
  );
}
