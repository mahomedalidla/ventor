import { gatherDemoAssets, type DemoAssets } from "@/lib/demo/assets";
import {
  buildDeliverable,
  pickDeliverableType,
  type DeliverableTipo,
} from "@/lib/demo/deliverable";
import { isDemoMockup } from "@/lib/demo/types";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 300;

type LeadRow = {
  id: string;
  nombre: string;
  tipo_negocio: string | null;
  zona: string | null;
  telefono: string | null;
  google_place_id: string | null;
  perfil_url: string | null;
  metadata: Record<string, unknown> | null;
};

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
    tipo?: DeliverableTipo | "auto";
    refresh_assets?: boolean;
  };
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
    .select(
      "id, producto_sugerido_texto, demo_mockup, products(nombre), leads(id, nombre, tipo_negocio, zona, telefono, google_place_id, perfil_url, metadata)",
    )
    .eq("id", body.opportunity_id)
    .single();
  if (error || !op) {
    return NextResponse.json({ error: error?.message ?? "No encontrada" }, { status: 404 });
  }

  const leadRel = op.leads as LeadRow | LeadRow[] | null;
  const lead = Array.isArray(leadRel) ? leadRel[0] : leadRel;
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  const productRel = op.products as { nombre: string } | { nombre: string }[] | null;
  const producto =
    (Array.isArray(productRel) ? productRel[0]?.nombre : productRel?.nombre) ??
    op.producto_sugerido_texto ??
    "Propuesta digital";

  const tipo: DeliverableTipo =
    body.tipo === "landing" || body.tipo === "whatsapp"
      ? body.tipo
      : pickDeliverableType(producto);

  const { data: signals } = await supabase
    .from("signals")
    .select("tipo_signal, detalle")
    .eq("lead_id", lead.id);

  const { data: existing } = await supabase
    .from("demo_deliverables")
    .select("tipo, public_slug, assets, generated_at")
    .eq("opportunity_id", op.id);

  const sameTipo = existing?.find((d) => d.tipo === tipo);
  const reusable = existing
    ?.filter((d) => d.assets && Date.now() - Date.parse(d.generated_at) < 7 * 864e5)
    .sort((a, b) => Date.parse(b.generated_at) - Date.parse(a.generated_at))[0];

  const assets =
    !body.refresh_assets && reusable?.assets
      ? (reusable.assets as DemoAssets)
      : await gatherDemoAssets(supabase, lead);

  const { html, engine } = await buildDeliverable({
    lead,
    signals: signals ?? [],
    producto,
    mockup: isDemoMockup(op.demo_mockup) ? op.demo_mockup : null,
    assets,
    tipo,
  });

  const slug =
    sameTipo?.public_slug ??
    makeSlug(tipo === "whatsapp" ? `${lead.nombre} whatsapp` : lead.nombre);

  const { error: updErr } = await supabase.from("demo_deliverables").upsert(
    {
      opportunity_id: op.id,
      tipo,
      html,
      public_slug: slug,
      assets,
      engine,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "opportunity_id,tipo" },
  );
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    slug,
    tipo,
    engine,
    fotos: assets.photos.length,
    logo: Boolean(assets.logo_url),
  });
}

function makeSlug(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base || "propuesta"}-${rand}`;
}
