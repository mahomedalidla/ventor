import type { DemoAssets } from "@/lib/demo/assets";
import { cleanAjustes, instruccionPorCambios, swapBrand, swapPhone } from "@/lib/demo/ajustes";
import { toWaNumber } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Guarda los ajustes del dueño. El número de WhatsApp se cambia al instante en los
 * entregables; lo demás regresa como instrucción para aplicarse con /api/demo/edit.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { opportunity_id?: string; ajustes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body.opportunity_id) {
    return NextResponse.json({ error: "opportunity_id requerido" }, { status: 400 });
  }

  const { data: op, error } = await supabase
    .from("opportunities")
    .select("id, ajustes, leads(telefono)")
    .eq("id", body.opportunity_id)
    .single();
  if (error || !op) {
    return NextResponse.json({ error: error?.message ?? "No encontrada" }, { status: 404 });
  }

  const next = cleanAjustes(body.ajustes);
  if (next.whatsapp && !toWaNumber(next.whatsapp)) {
    return NextResponse.json(
      { error: "El WhatsApp debe tener 10 dígitos (ej. 311 123 4567)" },
      { status: 400 },
    );
  }
  const prev = cleanAjustes(op.ajustes);
  const leadRel = op.leads as { telefono: string | null } | { telefono: string | null }[] | null;
  const leadTel = (Array.isArray(leadRel) ? leadRel[0] : leadRel)?.telefono ?? null;

  const { error: updErr } = await supabase
    .from("opportunities")
    .update({ ajustes: next })
    .eq("id", op.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { data: deliverables } = await supabase
    .from("demo_deliverables")
    .select("id, tipo, html, assets")
    .eq("opportunity_id", op.id);

  const oldTel = prev.whatsapp ?? leadTel;
  const newTel = next.whatsapp ?? leadTel;
  const brandChanged =
    next.logo_url !== prev.logo_url ||
    next.color !== prev.color ||
    next.color_sec !== prev.color_sec ||
    next.color_ter !== prev.color_ter;
  let parchados = 0;
  for (const d of deliverables ?? []) {
    let html = d.html as string;
    if (newTel && toWaNumber(oldTel) !== toWaNumber(newTel)) {
      html = swapPhone(html, oldTel, newTel);
    }
    if (brandChanged) html = swapBrand(html, next);
    if (html === d.html && !brandChanged) continue;
    const assets = {
      ...((d.assets as DemoAssets | null) ?? {}),
      ...(next.logo_url ? { logo_url: next.logo_url, logo_source: "manual" } : {}),
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
        ultimo_cambio: brandChanged ? "Marca actualizada" : "WhatsApp actualizado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.id);
    parchados++;
  }

  return NextResponse.json({
    ok: true,
    parchados,
    instruccion: instruccionPorCambios(
      prev,
      { ...next, color: brandChanged ? undefined : next.color, logo_url: brandChanged ? undefined : next.logo_url },
    ),
    tipos: (deliverables ?? []).map((d) => d.tipo),
  });
}
