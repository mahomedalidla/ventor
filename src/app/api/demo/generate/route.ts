import { generateGenuineDemo } from "@/lib/demo/generate";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { opportunity_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const opportunityId = body.opportunity_id;
  if (!opportunityId) {
    return NextResponse.json(
      { error: "opportunity_id requerido" },
      { status: 400 },
    );
  }

  const { data: op, error } = await supabase
    .from("opportunities")
    .select(
      "id, producto_sugerido_texto, products(nombre), leads(id, nombre, tipo_negocio, zona, telefono, origen, metadata)",
    )
    .eq("id", opportunityId)
    .single();

  if (error || !op) {
    return NextResponse.json(
      { error: error?.message ?? "No encontrada" },
      { status: 404 },
    );
  }

  const leadRel = op.leads as
    | {
        id: string;
        nombre: string;
        tipo_negocio: string | null;
        zona: string | null;
        telefono: string | null;
        origen: string;
        metadata: Record<string, unknown> | null;
      }
    | Array<{
        id: string;
        nombre: string;
        tipo_negocio: string | null;
        zona: string | null;
        telefono: string | null;
        origen: string;
        metadata: Record<string, unknown> | null;
      }>
    | null;
  const lead = Array.isArray(leadRel) ? leadRel[0] : leadRel;
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  const productRel = op.products as
    | { nombre: string }
    | { nombre: string }[]
    | null;
  const productName = Array.isArray(productRel)
    ? productRel[0]?.nombre
    : productRel?.nombre;

  const { data: signals } = await supabase
    .from("signals")
    .select("id, tipo_signal, detalle")
    .eq("lead_id", lead.id);

  const demo = await generateGenuineDemo({
    lead: {
      id: lead.id,
      nombre: lead.nombre,
      tipo_negocio: lead.tipo_negocio,
      zona: lead.zona,
      telefono: lead.telefono,
      origen: lead.origen,
      metadata: lead.metadata,
    },
    signals: (signals ?? []).map((s) => ({
      id: s.id,
      tipo_signal: s.tipo_signal,
      detalle: s.detalle,
    })),
    producto:
      productName ?? op.producto_sugerido_texto ?? "Propuesta digital",
  });

  const { error: updErr } = await supabase
    .from("opportunities")
    .update({
      demo_mockup: demo,
      demo_cliente_busca: `Busca en Google: “${demo.search_query}” → ve el resultado “${demo.search_title}”.`,
      demo_experiencia: `${demo.tagline}. Flujo: ${demo.flow_steps.join(" → ")}.`,
      demo_gustos_deducidos: demo.vibe,
      demo_pitch: `Mire: su cliente escribe “${demo.search_query}”, abre ${demo.headline}, ve esto y toca “${demo.cta_label}”. ${demo.why_this}`,
    })
    .eq("id", opportunityId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, demo });
}
