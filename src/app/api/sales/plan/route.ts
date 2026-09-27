import { buildSalesForOpportunity } from "@/lib/sales/build";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 120;

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
  if (!body.opportunity_id) {
    return NextResponse.json({ error: "opportunity_id requerido" }, { status: 400 });
  }

  try {
    const { plan } = await buildSalesForOpportunity(supabase, body.opportunity_id);
    return NextResponse.json({ ok: true, generado_por: plan.generado_por });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
