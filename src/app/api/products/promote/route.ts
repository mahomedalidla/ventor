import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Convierte un producto que pide el mercado en producto del catálogo y le liga sus oportunidades. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    nombre?: string;
    descripcion?: string;
    linea?: string;
    complejidad?: string | null;
    precio_base?: number | null;
    opportunity_ids?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const nombre = body.nombre?.trim().slice(0, 120);
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const row: Record<string, unknown> = {
    nombre,
    descripcion: body.descripcion?.slice(0, 500) ?? null,
    precio_base: body.precio_base ?? null,
    modelo_precio: "suscripcion",
    estado: "propuesto",
  };
  if (["landing", "whatsapp", "sitio_completo", "a_medida"].includes(body.linea ?? "")) row.linea = body.linea;
  if (["simple", "media", "alta"].includes(body.complejidad ?? "")) row.complejidad = body.complejidad;

  let { data: product, error } = await supabase.from("products").insert(row).select("id").single();
  if (error && /linea|complejidad/.test(error.message)) {
    // Migración 000009 aún no corrida: guarda sin línea
    delete row.linea;
    delete row.complejidad;
    ({ data: product, error } = await supabase.from("products").insert(row).select("id").single());
  }
  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? "No se pudo crear" }, { status: 500 });
  }

  const ids = (body.opportunity_ids ?? []).slice(0, 200);
  if (ids.length) {
    await supabase
      .from("opportunities")
      .update({ product_id: product.id, producto_sugerido_texto: null })
      .in("id", ids);
  }
  return NextResponse.json({ ok: true, id: product.id, ligadas: ids.length });
}
