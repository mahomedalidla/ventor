import type { DemoAssets } from "@/lib/demo/assets";
import { cleanAjustes, swapBrand } from "@/lib/demo/ajustes";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BUCKET = "demo-assets";

/** Sube un logo del dueño, lo guarda en ajustes y lo pinta en los entregables ya hechos. */
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
  const file = form.get("file");
  if (!opportunityId || !(file instanceof File)) {
    return NextResponse.json({ error: "opportunity_id y file requeridos" }, { status: 400 });
  }
  if (file.size > 4_000_000) {
    return NextResponse.json({ error: "El logo debe pesar menos de 4 MB" }, { status: 400 });
  }
  const type = file.type || "image/png";
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "Sube una imagen (PNG, JPG, WebP o SVG)" }, { status: 400 });
  }

  const { data: op, error } = await supabase
    .from("opportunities")
    .select("id, ajustes")
    .eq("id", opportunityId)
    .single();
  if (error || !op) {
    return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
  }

  const ext = type.includes("png")
    ? "png"
    : type.includes("webp")
      ? "webp"
      : type.includes("svg")
        ? "svg"
        : "jpg";
  const path = `${opportunityId}/logo-manual-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: type, upsert: true });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  const logo_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const palette = {
    color: hexOrNull(form.get("color")),
    color_sec: hexOrNull(form.get("color_sec")),
    color_ter: hexOrNull(form.get("color_ter")),
  };
  const next = cleanAjustes({ ...cleanAjustes(op.ajustes), logo_url, ...palette });

  const { error: updErr } = await supabase
    .from("opportunities")
    .update({ ajustes: next })
    .eq("id", op.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { data: deliverables } = await supabase
    .from("demo_deliverables")
    .select("id, html, assets")
    .eq("opportunity_id", op.id);

  for (const d of deliverables ?? []) {
    const html = swapBrand(d.html as string, next);
    const assets = {
      ...((d.assets as DemoAssets | null) ?? {}),
      logo_url,
      logo_source: "manual",
      ...(next.color ? { theme_color: next.color } : {}),
      ...(next.color_sec ? { theme_secondary: next.color_sec } : {}),
      ...(next.color_ter ? { theme_tertiary: next.color_ter } : {}),
    };
    await supabase
      .from("demo_deliverables")
      .update({
        html,
        assets,
        html_anterior: d.html,
        ultimo_cambio: "Logo del dueño",
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.id);
  }

  return NextResponse.json({ ok: true, logo_url, ...palette });
}

function hexOrNull(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return /^#[0-9a-f]{6}$/i.test(s) ? s : undefined;
}
