import { createClient } from "@/lib/supabase/server";
import {
  lessonFromOutcome,
  type RejectionMotivo,
} from "@/lib/learning/lessons";
import type { OpportunityStatus } from "@/lib/types/database";
import { NextResponse } from "next/server";

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
    status?: OpportunityStatus;
    motivo_rechazo?: RejectionMotivo;
    notas?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const opportunityId = body.opportunity_id;
  const status = body.status;
  if (!opportunityId || !status) {
    return NextResponse.json(
      { error: "opportunity_id y status requeridos" },
      { status: 400 },
    );
  }

  const { data: op, error: opErr } = await supabase
    .from("opportunities")
    .select(
      "id, lead_id, product_id, producto_sugerido_texto, precio_sugerido, modelo_precio_sugerido, escenario, leads(zona, tipo_negocio, nombre)",
    )
    .eq("id", opportunityId)
    .single();

  if (opErr || !op) {
    return NextResponse.json(
      { error: opErr?.message ?? "Oportunidad no encontrada" },
      { status: 404 },
    );
  }

  const leadRel = op.leads as
    | { zona: string | null; tipo_negocio: string | null; nombre: string }
    | { zona: string | null; tipo_negocio: string | null; nombre: string }[]
    | null;
  const lead = Array.isArray(leadRel) ? leadRel[0] : leadRel;

  const updatePayload: Record<string, unknown> = {
    status,
    resultado_notas: body.notas?.trim() || null,
  };
  if (status === "rechazado" && body.motivo_rechazo) {
    updatePayload.motivo_rechazo = body.motivo_rechazo;
  }

  const { error: updErr } = await supabase
    .from("opportunities")
    .update(updatePayload)
    .eq("id", opportunityId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  if (status === "cerrado") {
    if (op.product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("veces_cerrado, estado")
        .eq("id", op.product_id)
        .single();
      if (product) {
        await supabase
          .from("products")
          .update({
            veces_cerrado: (product.veces_cerrado ?? 0) + 1,
            estado: "validado",
          })
          .eq("id", op.product_id);
      }
    } else if (op.producto_sugerido_texto) {
      await supabase.from("products").insert({
        nombre: op.producto_sugerido_texto,
        precio_base: op.precio_sugerido,
        modelo_precio: op.modelo_precio_sugerido,
        estado: "validado",
        veces_cerrado: 1,
      });
    }
  }

  if (status === "rechazado" && op.product_id) {
    const { data: product } = await supabase
      .from("products")
      .select("veces_rechazado")
      .eq("id", op.product_id)
      .single();
    if (product) {
      await supabase
        .from("products")
        .update({ veces_rechazado: (product.veces_rechazado ?? 0) + 1 })
        .eq("id", op.product_id);
    }
  }

  let leccion: string | null = null;
  let tono: string | null = null;

  if (
    status === "rechazado" ||
    status === "cerrado" ||
    status === "sin_respuesta"
  ) {
    const learned = lessonFromOutcome({
      origen_evento: status,
      motivo_rechazo: body.motivo_rechazo,
      notas: body.notas,
      zona: lead?.zona,
      tipo_negocio: lead?.tipo_negocio,
      precio_sugerido: op.precio_sugerido,
      escenario: op.escenario,
      producto_texto: op.producto_sugerido_texto,
    });
    leccion = learned.leccion;
    tono = learned.tono_sugerido;

    await supabase.from("sales_insights").insert({
      opportunity_id: opportunityId,
      lead_id: op.lead_id,
      origen_evento: status,
      zona: lead?.zona,
      tipo_negocio: lead?.tipo_negocio,
      producto_texto: op.producto_sugerido_texto,
      precio_sugerido: op.precio_sugerido,
      escenario: op.escenario,
      motivo_rechazo: body.motivo_rechazo ?? null,
      tono_sugerido: learned.tono_sugerido,
      leccion: learned.leccion,
    });
  }

  return NextResponse.json({ ok: true, leccion, tono_sugerido: tono });
}
