import type { DemoAssets } from "@/lib/demo/assets";
import { swapSlotPhoto, type PhotoSlot } from "@/lib/demo/slots";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BUCKET = "demo-assets";

/** El dueño (o el vendedor) cambia la foto de un ítem: habitación, platillo, servicio. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const form = await request.formData();
  const opportunityId = String(form.get("opportunity_id") ?? "");
  const slotId = String(form.get("slot_id") ?? "").replace(/[^\w-]/g, "");
  const file = form.get("file");
  if (!opportunityId || !slotId || !(file instanceof File)) {
    return NextResponse.json({ error: "opportunity_id, slot_id y file requeridos" }, { status: 400 });
  }
  if (file.size > 6_000_000) {
    return NextResponse.json({ error: "La foto debe pesar menos de 6 MB" }, { status: 400 });
  }
  const type = file.type || "image/jpeg";
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "Sube una imagen (JPG, PNG o WebP)" }, { status: 400 });
  }

  const { data: op, error } = await supabase
    .from("opportunities")
    .select("id")
    .eq("id", opportunityId)
    .single();
  if (error || !op) {
    return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
  }

  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const path = `${opportunityId}/slot-${slotId}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: type, upsert: true });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { data: deliverables } = await supabase
    .from("demo_deliverables")
    .select("id, html, assets")
    .eq("opportunity_id", op.id);

  for (const d of deliverables ?? []) {
    const html = swapSlotPhoto(d.html as string, slotId, url);
    const prev = (d.assets as DemoAssets | null) ?? ({} as DemoAssets);
    const slots: PhotoSlot[] = (prev.slots ?? []).map((s) =>
      s.id === slotId ? { ...s, photo_url: url } : s,
    );
    const catalog_items = (prev.catalog_items ?? []).map((c) =>
      c.id === slotId ? { ...c, photo_url: url } : c,
    );
    await supabase
      .from("demo_deliverables")
      .update({
        html,
        assets: { ...prev, slots, catalog_items },
        html_anterior: d.html,
        ultimo_cambio: `Foto: ${slots.find((s) => s.id === slotId)?.label ?? slotId}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.id);
  }

  return NextResponse.json({ ok: true, url, slot_id: slotId });
}
