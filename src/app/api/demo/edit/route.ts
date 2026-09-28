import type { DemoAssets } from "@/lib/demo/assets";
import { editDeliverableHtml, geminiAvailable } from "@/lib/demo/deliverable";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 300;

/** Cambio en lenguaje natural sobre un entregable ya generado, o deshacer el último cambio. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    opportunity_id?: string;
    tipo?: string;
    instruccion?: string;
    deshacer?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body.opportunity_id || (body.tipo !== "landing" && body.tipo !== "whatsapp")) {
    return NextResponse.json({ error: "opportunity_id y tipo requeridos" }, { status: 400 });
  }

  const { data: d, error } = await supabase
    .from("demo_deliverables")
    .select("id, html, html_anterior, assets")
    .eq("opportunity_id", body.opportunity_id)
    .eq("tipo", body.tipo)
    .maybeSingle();
  if (error || !d) {
    return NextResponse.json({ error: "Primero genera este entregable" }, { status: 404 });
  }

  if (body.deshacer) {
    if (!d.html_anterior) {
      return NextResponse.json({ error: "No hay cambio para deshacer" }, { status: 400 });
    }
    const { error: updErr } = await supabase
      .from("demo_deliverables")
      .update({
        html: d.html_anterior,
        html_anterior: d.html,
        ultimo_cambio: "Cambio deshecho",
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const instruccion = (body.instruccion ?? "").trim().slice(0, 2000);
  if (instruccion.length < 4) {
    return NextResponse.json({ error: "Escribe qué quieres cambiar" }, { status: 400 });
  }
  if (!geminiAvailable()) {
    return NextResponse.json(
      { error: "Los cambios con IA necesitan GEMINI_API_KEY. Usa Ajustes + Regenerar." },
      { status: 400 },
    );
  }

  const assets = d.assets as DemoAssets | null;
  const imagenes = [
    ...(assets?.photos ?? []).map((p) => p.url),
    ...(assets?.logo_url ? [assets.logo_url] : []),
  ];

  let html: string;
  try {
    html = await editDeliverableHtml(d.html as string, instruccion, imagenes);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message.slice(0, 200) : "No se pudo editar" },
      { status: 502 },
    );
  }

  const { error: updErr } = await supabase
    .from("demo_deliverables")
    .update({
      html,
      html_anterior: d.html,
      ultimo_cambio: instruccion.slice(0, 160),
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
