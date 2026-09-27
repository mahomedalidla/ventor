import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePlaybook } from "@/lib/categories/playbooks";
import { pickDeliverableType } from "@/lib/demo/deliverable";
import { buildOffer, type Offer } from "@/lib/sales/offer";
import { generateSalesPlan, type SalesPlan } from "@/lib/sales/plan";
import { scoreOpportunity } from "@/lib/sales/score";

type LeadRow = {
  id: string;
  nombre: string;
  tipo_negocio: string | null;
  zona: string | null;
  telefono: string | null;
  metadata: Record<string, unknown> | null;
};

/** Calcula oferta + flujo de venta y los guarda en la oportunidad. */
export async function buildSalesForOpportunity(
  supabase: SupabaseClient,
  opportunityId: string,
): Promise<{ offer: Offer; plan: SalesPlan }> {
  const { data: op, error } = await supabase
    .from("opportunities")
    .select(
      "id, status, escenario, producto_sugerido_texto, products(nombre), leads(id, nombre, tipo_negocio, zona, telefono, metadata), demo_deliverables(tipo)",
    )
    .eq("id", opportunityId)
    .single();
  if (error || !op) throw new Error(error?.message ?? "Oportunidad no encontrada");

  const leadRel = op.leads as unknown as LeadRow | LeadRow[] | null;
  const lead = Array.isArray(leadRel) ? leadRel[0] : leadRel;
  if (!lead) throw new Error("Lead no encontrado");

  const productRel = op.products as unknown as { nombre: string } | { nombre: string }[] | null;
  const producto =
    (Array.isArray(productRel) ? productRel[0]?.nombre : productRel?.nombre) ??
    op.producto_sugerido_texto ??
    "Página web";

  const deliverables = (op.demo_deliverables ?? []) as Array<{ tipo: "landing" | "whatsapp" }>;

  const { data: signals } = await supabase
    .from("signals")
    .select("tipo_signal, detalle")
    .eq("lead_id", lead.id);

  const { data: insights } = await supabase
    .from("sales_insights")
    .select("leccion, motivo_rechazo, zona, tipo_negocio")
    .order("created_at", { ascending: false })
    .limit(40);

  const segment = (insights ?? []).filter(
    (i) => (!i.zona || i.zona === lead.zona) && (!i.tipo_negocio || i.tipo_negocio === lead.tipo_negocio),
  );
  const rechazosPorCaro = segment.filter((i) => i.motivo_rechazo === "caro").length;

  const { score } = scoreOpportunity({
    tipo_negocio: lead.tipo_negocio,
    zona: lead.zona,
    telefono: lead.telefono,
    metadata: lead.metadata,
    signals: (signals ?? []).map((s) => s.tipo_signal),
    status: op.status,
    deliverables: deliverables.length,
  });

  const playbook = resolvePlaybook(lead.tipo_negocio ?? "general");
  const offer = buildOffer({
    producto,
    playbookId: playbook.id,
    zona: lead.zona,
    escenario: op.escenario,
    score,
    rechazosPorCaro,
  });

  const suggested = pickDeliverableType(producto);
  const demoTipo = deliverables.some((d) => d.tipo === suggested)
    ? suggested
    : deliverables[0]?.tipo ?? suggested;

  const plan = await generateSalesPlan({
    lead,
    signals: signals ?? [],
    producto,
    offer,
    escenario: op.escenario,
    demoTipo,
    lecciones: (segment.length ? segment : insights ?? []).map((i) => i.leccion),
  });

  const rec = offer.planes.find((p) => p.recomendado)!;
  const { error: updErr } = await supabase
    .from("opportunities")
    .update({
      oferta: offer,
      plan_venta: plan,
      precio_sugerido: rec.instalacion,
      modelo_precio_sugerido: "suscripcion",
      guion: plan.pasos[0]?.mensaje ?? null,
      evitar: plan.evitar,
    })
    .eq("id", opportunityId);
  if (updErr) throw new Error(updErr.message);

  return { offer, plan };
}
