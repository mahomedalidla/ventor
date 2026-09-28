import {
  buildInferencePrompt,
  GEMINI_OPPORTUNITY_SCHEMA,
  parseLlmOpportunities,
  type InferHistoryRow,
  type InferInsightRow,
  type InferLeadRow,
  type InferPricingRow,
  type InferProductRow,
  type InferSignalRow,
  type InferredOpportunity,
} from "@/lib/inference/prompt";
import { geminiGenerate, geminiKey } from "@/lib/gemini";
import { ruleBasedInfer } from "@/lib/inference/rule-fallback";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InferenceEngine = "gemini" | "claude" | "rules";

type InferContext = {
  lead: InferLeadRow;
  signals: InferSignalRow[];
  products: InferProductRow[];
  pricing: InferPricingRow[];
  history: InferHistoryRow[];
  insights: InferInsightRow[];
};

export async function inferOpportunitiesForLead(
  supabase: SupabaseClient,
  leadId: string,
): Promise<{
  opportunities: InferredOpportunity[];
  engine: InferenceEngine;
  inserted: number;
}> {
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, nombre, tipo_negocio, zona, telefono, origen, metadata")
    .eq("id", leadId)
    .single();

  if (leadErr || !lead) {
    throw new Error(leadErr?.message ?? "Lead no encontrado");
  }

  const leadRow = lead as InferLeadRow;

  const { data: signals } = await supabase
    .from("signals")
    .select("id, tipo_signal, detalle")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  const signalRows = (signals ?? []) as InferSignalRow[];
  const friction = signalRows.filter(
    (s) => s.tipo_signal !== "playbook_categoria",
  );

  if (friction.length === 0) {
    return { opportunities: [], engine: "rules", inserted: 0 };
  }

  const { data: existingOps } = await supabase
    .from("opportunities")
    .select("id")
    .eq("lead_id", leadId)
    .in("status", ["pendiente", "contactado"]);

  if ((existingOps ?? []).length > 0) {
    return { opportunities: [], engine: "rules", inserted: 0 };
  }

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, nombre, descripcion, precio_base, modelo_precio, estado, veces_cerrado, veces_rechazado",
    )
    .in("estado", ["propuesto", "validado"]);

  const { data: pricing } = await supabase
    .from("pricing_baseline")
    .select(
      "zona, tipo_negocio, producto_categoria, precio_min, precio_max, modelo_precio_default",
    );

  const { data: history, error: historyErr } = await supabase
    .from("opportunities")
    .select(
      "producto_sugerido_texto, precio_sugerido, status, escenario, motivo_rechazo, leads(tipo_negocio, zona)",
    )
    .in("status", ["cerrado", "rechazado"])
    .order("created_at", { ascending: false })
    .limit(20);

  // Si aún no corrieron la migración de motivo_rechazo, reintenta sin esa columna
  let historyData: unknown[] | null = history;
  if (historyErr) {
    const retry = await supabase
      .from("opportunities")
      .select(
        "producto_sugerido_texto, precio_sugerido, status, escenario, leads(tipo_negocio, zona)",
      )
      .in("status", ["cerrado", "rechazado"])
      .order("created_at", { ascending: false })
      .limit(20);
    historyData = retry.data;
  }

  const historyRows: InferHistoryRow[] = (historyData ?? []).map((h) => {
    const row = h as {
      producto_sugerido_texto: string | null;
      precio_sugerido: number | null;
      status: string;
      escenario: string | null;
      motivo_rechazo?: string | null;
      leads:
        | { tipo_negocio: string | null; zona: string | null }
        | { tipo_negocio: string | null; zona: string | null }[]
        | null;
    };
    const leadRel = Array.isArray(row.leads) ? row.leads[0] ?? null : row.leads;
    return {
      producto_sugerido_texto: row.producto_sugerido_texto,
      precio_sugerido: row.precio_sugerido,
      status: row.status,
      escenario: row.escenario,
      motivo_rechazo: row.motivo_rechazo ?? null,
      leads: leadRel,
    };
  });

  const { data: insights } = await supabase
    .from("sales_insights")
    .select(
      "leccion, tono_sugerido, motivo_rechazo, zona, tipo_negocio, origen_evento",
    )
    .order("created_at", { ascending: false })
    .limit(20);

  const insightRows = (insights ?? []) as InferInsightRow[];

  // Preferir insights del mismo segmento
  const zona = leadRow.zona;
  const tipo = leadRow.tipo_negocio;
  const rankedInsights = [...insightRows].sort((a, b) => {
    const score = (i: InferInsightRow) =>
      (i.zona && zona && i.zona === zona ? 2 : 0) +
      (i.tipo_negocio && tipo && i.tipo_negocio === tipo ? 2 : 0);
    return score(b) - score(a);
  });

  const ctx: InferContext = {
    lead: leadRow,
    signals: signalRows,
    products: (products ?? []) as InferProductRow[],
    pricing: (pricing ?? []) as InferPricingRow[],
    history: historyRows,
    insights: rankedInsights,
  };

  const { opportunities, engine } = await runInference(ctx);

  const productIds = new Set(ctx.products.map((p) => p.id));
  const signalIds = new Set(signalRows.map((s) => s.id));

  const rows = opportunities.map((o) => ({
    lead_id: leadId,
    signal_id:
      o.signal_id && signalIds.has(o.signal_id) ? o.signal_id : friction[0]?.id,
    product_id: o.product_id && productIds.has(o.product_id) ? o.product_id : null,
    producto_sugerido_texto:
      o.product_id && productIds.has(o.product_id)
        ? null
        : o.producto_sugerido_texto,
    razon: o.razon,
    canal_sugerido: o.canal_sugerido,
    guion: o.guion,
    evitar: o.evitar,
    precio_sugerido: o.precio_sugerido,
    modelo_precio_sugerido: o.modelo_precio_sugerido,
    escenario: o.escenario,
    demo_cliente_busca: o.demo_cliente_busca,
    demo_experiencia: o.demo_experiencia,
    demo_gustos_deducidos: o.demo_gustos_deducidos,
    demo_pitch: o.demo_pitch,
    status: "pendiente",
  }));

  for (const row of rows) {
    if (!row.product_id && row.producto_sugerido_texto) {
      const match = ctx.products.find((p) =>
        normalize(p.nombre).includes(
          normalize(row.producto_sugerido_texto!).slice(0, 16),
        ),
      );
      if (match) {
        row.product_id = match.id;
        row.producto_sugerido_texto = null;
      }
    }
  }

  if (rows.length === 0) {
    return { opportunities, engine, inserted: 0 };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("opportunities")
    .insert(rows)
    .select("id, producto_sugerido_texto, product_id");

  if (insErr) throw new Error(insErr.message);

  // Propuesta visual GENUINA por cada oportunidad (mockup, no texto genérico)
  const { generateGenuineDemo } = await import("@/lib/demo/generate");
  for (const row of inserted ?? []) {
    const productName =
      ctx.products.find((p) => p.id === row.product_id)?.nombre ??
      row.producto_sugerido_texto ??
      "Propuesta digital";
    try {
      const demo = await generateGenuineDemo({
        lead: leadRow,
        signals: signalRows,
        producto: productName,
      });
      await supabase
        .from("opportunities")
        .update({
          demo_mockup: demo,
          demo_cliente_busca: `Busca en Google: “${demo.search_query}” → ve “${demo.search_title}”.`,
          demo_experiencia: `${demo.tagline}. Flujo: ${demo.flow_steps.join(" → ")}.`,
          demo_gustos_deducidos: demo.vibe,
          demo_pitch: `Mire: su cliente escribe “${demo.search_query}”, abre ${demo.headline}, ve esto y toca “${demo.cta_label}”. ${demo.why_this}`,
        })
        .eq("id", row.id);
    } catch {
      // La oportunidad ya existe; la demo se puede regenerar desde la ficha
    }
  }

  const { buildSalesForOpportunity } = await import("@/lib/sales/build");
  for (const row of inserted ?? []) {
    try {
      await buildSalesForOpportunity(supabase, row.id);
    } catch {
      // Se puede regenerar desde la ficha
    }
  }

  return {
    opportunities,
    engine,
    inserted: inserted?.length ?? rows.length,
  };
}

async function runInference(
  ctx: InferContext,
): Promise<{ opportunities: InferredOpportunity[]; engine: InferenceEngine }> {
  if (geminiKey()) {
    try {
      return { opportunities: await callGemini(ctx), engine: "gemini" };
    } catch {
      // fallback
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && !anthropicKey.includes("your_anthropic")) {
    try {
      return { opportunities: await callClaude(ctx), engine: "claude" };
    } catch {
      // fallback
    }
  }

  return { opportunities: ruleBasedInfer(ctx), engine: "rules" };
}

async function callGemini(ctx: InferContext): Promise<InferredOpportunity[]> {
  const { system, user } = buildInferencePrompt(ctx);
  const text = await geminiGenerate({
    system,
    user,
    temperature: 0.4,
    maxOutputTokens: 3072,
    responseMimeType: "application/json",
    responseSchema: GEMINI_OPPORTUNITY_SCHEMA,
  });
  return parseLlmOpportunities(text);
}

async function callClaude(ctx: InferContext): Promise<InferredOpportunity[]> {
  const { system, user } = buildInferencePrompt(ctx);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude error: ${detail}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Claude sin texto");
  return parseLlmOpportunities(text);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}
