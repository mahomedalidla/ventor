import { inferOpportunitiesForLead } from "@/lib/inference/run";
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

  let body: { lead_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const leadIds = [...new Set(body.lead_ids ?? [])].slice(0, 10);
  if (leadIds.length === 0) {
    return NextResponse.json({ error: "lead_ids requerido" }, { status: 400 });
  }

  const results: Array<{
    lead_id: string;
    inserted: number;
    engine: "gemini" | "claude" | "rules";
    error?: string;
  }> = [];

  let insertedTotal = 0;
  for (const leadId of leadIds) {
    try {
      const r = await inferOpportunitiesForLead(supabase, leadId);
      results.push({
        lead_id: leadId,
        inserted: r.inserted,
        engine: r.engine,
      });
      insertedTotal += r.inserted;
    } catch (e) {
      results.push({
        lead_id: leadId,
        inserted: 0,
        engine: "rules",
        error: e instanceof Error ? e.message : "error",
      });
    }
  }

  return NextResponse.json({
    inserted_total: insertedTotal,
    results,
  });
}
