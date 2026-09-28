import type { DemoAssets } from "@/lib/demo/assets";
import { injectCatalogIntoHtml, type CatalogItem } from "@/lib/demo/catalog";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** CRUD del catálogo genérico (misma UI para menú / habitaciones / servicios). */
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
    tipo?: "landing" | "whatsapp";
    items?: CatalogItem[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body.opportunity_id || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "opportunity_id e items requeridos" }, { status: 400 });
  }

  const tipo = body.tipo === "whatsapp" ? "whatsapp" : "landing";
  const items: CatalogItem[] = body.items
    .filter((i) => i && typeof i.name === "string" && i.name.trim())
    .map((i, idx) => ({
      id: String(i.id || `item-${idx}`).replace(/[^\w-]/g, ""),
      name: i.name.trim().slice(0, 120),
      price_hint: (i.price_hint || "consultar").slice(0, 40),
      note: i.note?.slice(0, 120) ?? null,
      photo_url: i.photo_url || null,
      available: i.available !== false,
    }));

  const { data: d, error } = await supabase
    .from("demo_deliverables")
    .select("id, html, assets")
    .eq("opportunity_id", body.opportunity_id)
    .eq("tipo", tipo)
    .maybeSingle();
  if (error || !d) {
    return NextResponse.json(
      { error: "Genera primero la landing para editar el catálogo" },
      { status: 404 },
    );
  }

  const prev = (d.assets as DemoAssets | null) ?? ({} as DemoAssets);
  const slots = items.map((i) => ({
    id: i.id,
    label: i.name,
    photo_url: i.photo_url ?? null,
  }));
  const html = injectCatalogIntoHtml(d.html as string, items);

  const { error: updErr } = await supabase
    .from("demo_deliverables")
    .update({
      html,
      assets: { ...prev, catalog_items: items, slots },
      html_anterior: d.html,
      ultimo_cambio: "Catálogo actualizado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, items });
}
