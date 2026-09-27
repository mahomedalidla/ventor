import type { Offer } from "@/lib/sales/offer";
import type { SalesPlan } from "@/lib/sales/types";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Action = "enviado" | "respondio" | "ir_a" | "iniciar_prueba";

const DAY = 864e5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { opportunity_id?: string; action?: Action; paso?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body.opportunity_id || !body.action) {
    return NextResponse.json({ error: "opportunity_id y action requeridos" }, { status: 400 });
  }

  const { data: op, error } = await supabase
    .from("opportunities")
    .select("id, status, paso_actual, plan_venta, oferta")
    .eq("id", body.opportunity_id)
    .single();
  if (error || !op) {
    return NextResponse.json({ error: error?.message ?? "No encontrada" }, { status: 404 });
  }

  const plan = op.plan_venta as SalesPlan | null;
  if (!plan?.pasos?.length) {
    return NextResponse.json({ error: "Genera primero el flujo de venta" }, { status: 400 });
  }
  const pasos = plan.pasos;
  const now = new Date();
  const actual = Math.min(op.paso_actual ?? 0, pasos.length - 1);
  const idx = (etapa: string) => pasos.findIndex((p) => p.etapa === etapa);

  const update: Record<string, unknown> = {};

  if (body.action === "enviado") {
    const next = Math.min(actual + 1, pasos.length - 1);
    const gapDays = Math.max(1, pasos[next].dia - pasos[actual].dia);
    update.paso_actual = next;
    update.ultimo_contacto_at = now.toISOString();
    update.proximo_contacto_at = new Date(now.getTime() + gapDays * DAY).toISOString();
    if (op.status === "pendiente") update.status = "contactado";
  } else if (body.action === "respondio") {
    // Respondió: el siguiente paso toca ya
    const next = Math.min(actual + 1, pasos.length - 1);
    update.paso_actual = next;
    update.proximo_contacto_at = now.toISOString();
    if (op.status === "pendiente") update.status = "contactado";
  } else if (body.action === "ir_a") {
    const target = Math.max(0, Math.min(body.paso ?? 0, pasos.length - 1));
    update.paso_actual = target;
    update.proximo_contacto_at = now.toISOString();
  } else if (body.action === "iniciar_prueba") {
    const offer = op.oferta as Offer | null;
    const dias = offer?.prueba?.dias || 7;
    const fin = new Date(now.getTime() + dias * DAY);
    const check = idx("check_prueba");
    update.prueba_inicio = now.toISOString().slice(0, 10);
    update.prueba_fin = fin.toISOString().slice(0, 10);
    update.paso_actual = check >= 0 ? check : actual;
    update.proximo_contacto_at = new Date(now.getTime() + Math.ceil(dias / 2) * DAY).toISOString();
    update.status = "contactado";
  }

  const { error: updErr } = await supabase
    .from("opportunities")
    .update(update)
    .eq("id", op.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...update });
}
