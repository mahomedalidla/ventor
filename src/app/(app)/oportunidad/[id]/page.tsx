import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DeliverableDemoPanel,
  type DeliverableSummary,
} from "@/components/DeliverableDemoPanel";
import { DemoMockupView } from "@/components/DemoMockupView";
import { GenerateDemoButton } from "@/components/GenerateDemoButton";
import { OutcomeButtons } from "@/components/OutcomeButtons";
import { ScoreBadge } from "@/components/sales/ScoreBadge";
import { OfferView } from "@/components/sales/OfferView";
import { SalesFlow } from "@/components/sales/SalesFlow";
import { TrialActivation } from "@/components/sales/TrialActivation";
import { fetchDemoStats } from "@/lib/stats";
import { resolvePlaybook } from "@/lib/categories/playbooks";
import { pickDeliverableType } from "@/lib/demo/deliverable";
import { isDemoMockup } from "@/lib/demo/types";
import type { Offer } from "@/lib/sales/offer";
import { scoreOpportunity } from "@/lib/sales/score";
import type { SalesPlan } from "@/lib/sales/types";
import { createClient } from "@/lib/supabase/server";
import {
  ORIGEN_LABELS,
  STATUS_LABELS,
  type LeadOrigen,
  type OpportunityStatus,
} from "@/lib/types/database";

const ESCENARIO: Record<string, string> = {
  facil: "Fácil",
  esceptico: "Escéptico",
  upsell_cliente_activo: "Upsell",
};

export default async function OportunidadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "*, leads(id, nombre, zona, tipo_negocio, telefono, origen, metadata), products(id, nombre, estado)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const lead = data.leads as {
    id: string;
    nombre: string;
    zona: string | null;
    tipo_negocio: string | null;
    telefono: string | null;
    origen: LeadOrigen;
    metadata: Record<string, unknown> | null;
  } | null;

  const product = data.products as {
    id: string;
    nombre: string;
    estado: string;
  } | null;

  const producto =
    product?.nombre ?? data.producto_sugerido_texto ?? "Producto por definir";

  const mockup = isDemoMockup(data.demo_mockup) ? data.demo_mockup : null;
  const playbook = resolvePlaybook(lead?.tipo_negocio ?? "general");
  const offer = (data.oferta ?? null) as Offer | null;
  const plan = (data.plan_venta ?? null) as SalesPlan | null;

  const [{ data: deliverables }, { data: signals }] = await Promise.all([
    supabase
      .from("demo_deliverables")
      .select("tipo, public_slug, generated_at, engine")
      .eq("opportunity_id", id),
    supabase.from("signals").select("tipo_signal").eq("lead_id", lead?.id ?? ""),
  ]);

  const score = scoreOpportunity({
    tipo_negocio: lead?.tipo_negocio ?? null,
    zona: lead?.zona ?? null,
    telefono: lead?.telefono ?? null,
    metadata: lead?.metadata ?? null,
    signals: (signals ?? []).map((s) => s.tipo_signal),
    status: data.status,
    deliverables: deliverables?.length ?? 0,
  });

  const slugs = Object.fromEntries(
    (deliverables ?? []).map((d) => [d.tipo, d.public_slug]),
  ) as Partial<Record<"landing" | "whatsapp", string>>;
  const mainSlug = slugs.landing ?? slugs.whatsapp ?? null;
  const stats = mainSlug ? await fetchDemoStats(supabase, mainSlug) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {STATUS_LABELS[data.status as OpportunityStatus] ?? data.status}
          {data.escenario ? ` · ${ESCENARIO[data.escenario] ?? data.escenario}` : ""}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {lead?.nombre ?? "Oportunidad"}
          </h1>
          <ScoreBadge score={score.score} nivel={score.nivel} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {[lead?.zona, lead?.tipo_negocio].filter(Boolean).join(" · ")}
          {lead?.origen ? ` · ${ORIGEN_LABELS[lead.origen]}` : ""}
        </p>
        {score.razones.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            Por qué vale la pena: {score.razones.join(" · ")}
          </p>
        )}
      </div>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Qué ofrecer
        </p>
        <p className="mt-1 text-lg font-bold text-accent">{producto}</p>
        <p className="mt-2 text-sm text-muted">{data.razon}</p>
        <div className="mt-3">
          {offer ? (
            <OfferView offer={offer} />
          ) : (
            <p className="text-xs text-muted">
              Sin oferta estructurada todavía. Genérala en “Flujo de venta”.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-accent/40 bg-surface p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
          Flujo de venta
        </p>
        <SalesFlow
          opportunityId={data.id}
          telefono={lead?.telefono ?? null}
          plan={plan}
          pasoActual={data.paso_actual ?? 0}
          proximoContacto={data.proximo_contacto_at ?? null}
          pruebaFin={data.prueba_fin ?? null}
          slugs={slugs}
          stats={stats}
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Activación y resultados
        </p>
        <TrialActivation
          nombre={lead?.nombre ?? "este negocio"}
          telefono={lead?.telefono ?? null}
          rubro={lead?.tipo_negocio ?? playbook.label}
          zona={lead?.zona ?? "su zona"}
          slug={mainSlug}
          stats={stats}
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Demo para el cliente
        </p>
        <p className="mt-1 text-sm text-muted">
          Se envía en el paso “Entrega de la demo”: su logo, fotos y reseñas.
        </p>

        <div className="mt-3">
          <DeliverableDemoPanel
            opportunityId={data.id}
            nombre={lead?.nombre ?? "este negocio"}
            telefono={lead?.telefono ?? null}
            deliverables={(deliverables ?? []) as DeliverableSummary[]}
            suggested={pickDeliverableType(producto)}
          />
          <Link
            href={`/catalogo/conversion#${playbook.id}`}
            className="mt-2 inline-block text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            Anatomía de conversión: {playbook.label} →
          </Link>
        </div>

        <details className="mt-6">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted">
            Cómo lo busca su cliente (para explicar en persona)
          </summary>
          <div className="mt-2">
            <GenerateDemoButton
              opportunityId={data.id}
              hasDemo={Boolean(mockup)}
            />
          </div>
          {mockup && (
            <div className="mt-4">
              <DemoMockupView demo={mockup} />
            </div>
          )}
          {data.demo_pitch && (
            <div className="mt-4 rounded-md bg-background px-3 py-3">
              <p className="text-[11px] font-semibold uppercase text-muted">
                Qué decir mientras lo muestras
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-relaxed">
                {data.demo_pitch}
              </p>
            </div>
          )}
        </details>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Resultado
        </p>
        <OutcomeButtons
          opportunityId={data.id}
          currentStatus={data.status as OpportunityStatus}
        />
      </section>

      <Link
        href="/"
        className="text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        ← Volver a oportunidades
      </Link>
    </div>
  );
}
