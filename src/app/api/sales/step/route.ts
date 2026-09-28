import { isPlanId } from "@/lib/sales/alcance";
import { resumenDe, type Offer } from "@/lib/sales/offer";
import type { SalesPlan } from "@/lib/sales/types";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Action =
  | "enviado"
  | "respondio"
  | "ir_a"
  | "iniciar_prueba"
  | "toque"
  | "elegir_plan"
  | "confirmar_oferta";

const DAY = 864e5;

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
    action?: Action;
    paso?: number;
    etapa?: string;
    plan?: string;
    precios?: Partial<Record<string, { instalacion?: number; mensual?: number }>>;
  };
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
    .select("id, status, paso_actual, plan_venta, oferta, plan_elegido")
    .eq("id", body.opportunity_id)
    .single();
  if (error || !op) {
    return NextResponse.json({ error: error?.message ?? "No encontrada" }, { status: 404 });
  }

  if (body.action === "confirmar_oferta") {
    const offer = op.oferta as Offer | null;
    if (!offer) return NextResponse.json({ error: "Sin oferta" }, { status: 400 });
    const fmt = (v: number) => `$${v.toLocaleString("es-MX")}`;
    const reemplazos: Array<[string, string]> = [];
    const planes = offer.planes.map((p) => {
      const nuevo = body.precios?.[p.id];
      const instalacion = Math.round(Number(nuevo?.instalacion ?? p.instalacion));
      const mensual = Math.round(Number(nuevo?.mensual ?? p.mensual));
      if (!(instalacion >= 0 && mensual >= 0)) return p;
      if (instalacion !== p.instalacion) reemplazos.push([fmt(p.instalacion), fmt(instalacion)]);
      if (mensual !== p.mensual) reemplazos.push([fmt(p.mensual), fmt(mensual)]);
      return { ...p, instalacion, mensual };
    });
    const rec = planes.find((p) => p.recomendado) ?? planes[0];
    const oferta: Offer = {
      ...offer,
      planes,
      ancla_diaria: `menos de $${Math.ceil(rec.mensual / 30)} al día`,
      resumen: resumenDe({ planes, prueba: offer.prueba, instalacion_diferida: offer.instalacion_diferida }),
      ...(offer.a_medida ? { a_medida: { ...offer.a_medida, confirmado: true } } : {}),
    };
    const swap = (s: string) => reemplazos.reduce((acc, [a, b]) => acc.split(a).join(b), s);
    const pv = op.plan_venta as SalesPlan | null;
    const plan_venta = pv
      ? {
          ...pv,
          pasos: pv.pasos.map((p) => ({ ...p, mensaje: swap(p.mensaje) })),
          objeciones: pv.objeciones.map((o) => ({ ...o, respuesta: swap(o.respuesta) })),
        }
      : pv;
    const elegido = planes.find((p) => p.id === (op.plan_elegido ?? "recomendado")) ?? rec;
    const { error: updErr } = await supabase
      .from("opportunities")
      .update({ oferta, plan_venta, precio_sugerido: elegido.instalacion })
      .eq("id", op.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "elegir_plan") {
    const offer = op.oferta as Offer | null;
    const elegido = offer?.planes.find((p) => p.id === body.plan);
    if (!isPlanId(body.plan) || !elegido) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }
    const { error: updErr } = await supabase
      .from("opportunities")
      .update({ plan_elegido: body.plan, precio_sugerido: elegido.instalacion })
      .eq("id", op.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, plan: body.plan });
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
  } else if (body.action === "toque") {
    // Mensaje fuera del guion (reacción a una señal): cuenta como contacto y reprograma
    const target = body.etapa ? idx(body.etapa) : -1;
    if (target >= 0) update.paso_actual = target;
    update.ultimo_contacto_at = now.toISOString();
    update.proximo_contacto_at = new Date(now.getTime() + DAY).toISOString();
    if (op.status === "pendiente") update.status = "contactado";
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
