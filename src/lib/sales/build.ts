import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePlaybook } from "@/lib/categories/playbooks";
import { pickDeliverableType } from "@/lib/demo/deliverable";
import { estimateAMedida } from "@/lib/sales/a-medida";
import { buildOffer, offerLineFor, type Complejidad, type Offer } from "@/lib/sales/offer";
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
      "id, status, escenario, oferta, producto_sugerido_texto, products(*), leads(id, nombre, tipo_negocio, zona, telefono, metadata), demo_deliverables(tipo)",
    )
    .eq("id", opportunityId)
    .single();
  if (error || !op) throw new Error(error?.message ?? "Oportunidad no encontrada");

  const leadRel = op.leads as unknown as LeadRow | LeadRow[] | null;
  const lead = Array.isArray(leadRel) ? leadRel[0] : leadRel;
  if (!lead) throw new Error("Lead no encontrado");

  type ProductRow = { nombre: string; linea?: string | null; complejidad?: string | null };
  const productRel = op.products as unknown as ProductRow | ProductRow[] | null;
  const catalogo = Array.isArray(productRel) ? productRel[0] : productRel;
  const producto = catalogo?.nombre ?? op.producto_sugerido_texto ?? "Página web";
  const enCatalogo = Boolean(catalogo) || !op.producto_sugerido_texto;

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
  const previa = op.oferta as Offer | null;
  const linea = offerLineFor(producto, enCatalogo, catalogo?.linea);

  let offer: Offer;
  if (linea === "a_medida" && previa?.a_medida?.confirmado && previa.a_medida.producto === producto) {
    offer = previa;
  } else {
    const estimado =
      linea === "a_medida"
        ? await estimateAMedida({
            producto,
            playbookId: playbook.id,
            rubro: lead.tipo_negocio ?? playbook.label,
            zona: lead.zona,
            dolencias: (signals ?? [])
              .filter((s) => s.tipo_signal !== "playbook_categoria" && s.detalle)
              .map((s) => s.detalle as string)
              .slice(0, 8),
          })
        : undefined;
    const cx = catalogo?.complejidad as Complejidad | null | undefined;
    const aMedida =
      estimado && (cx === "simple" || cx === "media" || cx === "alta")
        ? { ...estimado, complejidad: cx }
        : estimado;
    offer = buildOffer({
      producto,
      playbookId: playbook.id,
      zona: lead.zona,
      escenario: op.escenario,
      score,
      rechazosPorCaro,
      enCatalogo,
      lineaCatalogo: catalogo?.linea,
      aMedida,
    });
  }

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
