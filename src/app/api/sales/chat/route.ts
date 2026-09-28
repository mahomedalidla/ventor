import { adviseFromChat } from "@/lib/sales/chat-advise";
import type { SalesPlan } from "@/lib/sales/types";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { opportunity_id?: string; chat?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const chat = body.chat?.trim() ?? "";
  if (!body.opportunity_id || chat.length < 4) {
    return NextResponse.json(
      { error: "Pega al menos unas líneas del chat" },
      { status: 400 },
    );
  }
  if (chat.length > 8000) {
    return NextResponse.json({ error: "El chat es demasiado largo" }, { status: 400 });
  }

  const { data: op, error } = await supabase
    .from("opportunities")
    .select("id, paso_actual, plan_venta")
    .eq("id", body.opportunity_id)
    .single();
  if (error || !op) {
    return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
  }

  const plan = op.plan_venta as SalesPlan | null;
  if (!plan?.pasos?.length) {
    return NextResponse.json(
      { error: "Genera primero el flujo de venta" },
      { status: 400 },
    );
  }

  const advice = await adviseFromChat({
    chat,
    plan,
    pasoActual: op.paso_actual ?? 0,
  });

  const paso = plan.pasos.findIndex((p) => p.etapa === advice.etapa_sugerida);

  return NextResponse.json({
    ok: true,
    ...advice,
    paso_index: paso >= 0 ? paso : op.paso_actual ?? 0,
  });
}
