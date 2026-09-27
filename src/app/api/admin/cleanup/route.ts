import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Action =
  | "delete_leads"
  | "delete_all_leads"
  | "delete_opportunities"
  | "delete_insights"
  | "wipe_prospecting";

/**
 * Limpieza de BD para etapa de pruebas.
 * Solo usuarios autenticados (un solo dueño en fase 1).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    action?: Action;
    lead_ids?: string[];
    confirm?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "action requerida" }, { status: 400 });
  }

  const needsConfirm = [
    "delete_all_leads",
    "delete_opportunities",
    "delete_insights",
    "wipe_prospecting",
  ].includes(action);

  if (needsConfirm && body.confirm !== "BORRAR") {
    return NextResponse.json(
      { error: 'Escribe BORRAR para confirmar' },
      { status: 400 },
    );
  }

  if (action === "delete_leads") {
    const ids = [...new Set(body.lead_ids ?? [])];
    if (ids.length === 0) {
      return NextResponse.json({ error: "lead_ids vacío" }, { status: 400 });
    }
    const { error, count } = await supabase
      .from("leads")
      .delete({ count: "exact" })
      .in("id", ids);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted_leads: count ?? ids.length });
  }

  if (action === "delete_all_leads") {
    const { error, count } = await supabase
      .from("leads")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted_leads: count ?? 0 });
  }

  if (action === "delete_opportunities") {
    const { error, count } = await supabase
      .from("opportunities")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      deleted_opportunities: count ?? 0,
    });
  }

  if (action === "delete_insights") {
    const { error, count } = await supabase
      .from("sales_insights")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted_insights: count ?? 0 });
  }

  if (action === "wipe_prospecting") {
    // Orden: insights → opportunities no cascaded alone → leads (cascade signals/ops)
    await supabase
      .from("sales_insights")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    const { error, count } = await supabase
      .from("leads")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      wiped: true,
      deleted_leads: count ?? 0,
    });
  }

  return NextResponse.json({ error: "action desconocida" }, { status: 400 });
}
