import Link from "next/link";
import { OpportunityCard } from "@/components/OpportunityCard";
import { engagementFrom, fetchEventsByOpportunity } from "@/lib/sales/engagement";
import { nextAction, type Grupo } from "@/lib/sales/next-action";
import type { Offer } from "@/lib/sales/offer";
import { scoreOpportunity } from "@/lib/sales/score";
import type { SalesPlan } from "@/lib/sales/types";
import { createClient } from "@/lib/supabase/server";
import {
  ORIGEN_LABELS,
  type LeadOrigen,
  type OpportunityWithLead,
} from "@/lib/types/database";

type SearchParams = Promise<{ origen?: string }>;

const ORIGEN_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "prospection", label: "Prospección" },
  { value: "app_interna", label: "App interna" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const origenFilter = params.origen ?? "all";
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("YOUR_PROJECT");

  let opportunities: OpportunityWithLead[] = [];
  let loadError: string | null = null;

  if (configured) {
    const supabase = await createClient();
    let query = supabase
      .from("opportunities")
      .select(
        "*, leads(id, nombre, zona, tipo_negocio, telefono, origen, metadata, signals(tipo_signal)), demo_deliverables(tipo)",
      )
      .in("status", ["pendiente", "contactado"])
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      loadError = error.message;
    } else {
      opportunities = (data ?? []) as OpportunityWithLead[];
      if (origenFilter === "app_interna") {
        opportunities = opportunities.filter(
          (o) => o.leads?.origen === "app_interna",
        );
      } else if (origenFilter === "prospection") {
        opportunities = opportunities.filter((o) =>
          (["places_api", "redes_sociales", "manual"] as LeadOrigen[]).includes(
            (o.leads?.origen ?? "manual") as LeadOrigen,
          ),
        );
      }
    }
  }

  const events = configured && opportunities.length
    ? await fetchEventsByOpportunity(await createClient(), opportunities.map((o) => o.id))
    : new Map();

  const scored = opportunities.map((op) => {
    const lead = op.leads as (typeof op.leads & {
      metadata?: Record<string, unknown> | null;
      signals?: Array<{ tipo_signal: string }>;
    }) | null;
    const deliverables = (op as { demo_deliverables?: unknown[] }).demo_deliverables ?? [];
    const eng = engagementFrom(events.get(op.id) ?? [], {
      ultimoContacto: op.ultimo_contacto_at,
      pruebaInicio: op.prueba_inicio,
    });
    const score = scoreOpportunity({
      tipo_negocio: lead?.tipo_negocio ?? null,
      zona: lead?.zona ?? null,
      telefono: lead?.telefono ?? null,
      metadata: lead?.metadata ?? null,
      signals: (lead?.signals ?? []).map((s) => s.tipo_signal),
      status: op.status,
      deliverables: deliverables.length,
      engagement: eng,
    });
    const offer = op.oferta as Offer | null;
    const action = nextAction({
      nombre: lead?.nombre ?? "su negocio",
      status: op.status,
      score: score.score,
      plan: op.plan_venta as SalesPlan | null,
      pasoActual: op.paso_actual ?? 0,
      proximoContacto: op.proximo_contacto_at,
      ultimoContacto: op.ultimo_contacto_at,
      pruebaInicio: op.prueba_inicio,
      pruebaFin: op.prueba_fin,
      diasPrueba: offer?.prueba?.dias ?? 7,
      hasDeliverable: deliverables.length > 0,
      eng,
    });
    return { op, score, action, eng };
  });

  const byPriority = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    b.action.prioridad - a.action.prioridad;
  const inGroup = (g: Grupo) => scored.filter((s) => s.action.grupo === g).sort(byPriority);
  const ahora = inGroup("ahora");
  const hoy = inGroup("hoy");
  const programadas = inGroup("programadas").sort(
    (a, b) =>
      new Date(a.op.proximo_contacto_at ?? 0).getTime() -
      new Date(b.op.proximo_contacto_at ?? 0).getTime(),
  );
  const nuevas = inGroup("nuevas");

  const groups = [
    { id: "ahora", title: "🔥 Ahora", hint: "Señales en vivo: abrió la demo, le llegan clientes o se acaba la prueba. Escríbele ya.", items: ahora },
    { id: "hoy", title: "Toca hoy", hint: "Seguimientos del flujo, los más interesantes primero.", items: hoy },
    { id: "prueba", title: "En prueba", hint: "Probando gratis. Te avisamos aquí si algo requiere acción.", items: inGroup("prueba") },
    { id: "nuevas", title: "Nuevas por abrir", hint: "De más a menos interesante. Empieza por arriba.", items: nuevas },
    { id: "programadas", title: "Programadas", hint: "Esperando su momento; suben solas si abren la demo.", items: programadas },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Oportunidades</h1>
        <p className="mt-1 text-sm text-muted">
          {ahora.length
            ? `${ahora.length} oportunidad${ahora.length === 1 ? "" : "es"} caliente${ahora.length === 1 ? "" : "s"} ahora mismo. Empieza por ahí.`
            : hoy.length
            ? `Hoy te tocan ${hoy.length} contacto${hoy.length === 1 ? "" : "s"}.`
            : nuevas.length
              ? `Nada vencido. Abre ${Math.min(5, nuevas.length)} nuevas de las más calientes.`
              : "Todo al día."}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ORIGEN_FILTERS.map((f) => {
          const active = origenFilter === f.value;
          const href = f.value === "all" ? "/" : `/?origen=${f.value}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={
                active
                  ? "shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg"
                  : "shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {!configured && (
        <div className="rounded-lg border border-warning/40 bg-surface p-4 text-sm">
          <p className="font-semibold">Falta conectar Supabase</p>
          <p className="mt-1 text-muted">
            Copia <code className="text-xs">.env.example</code> a{" "}
            <code className="text-xs">.env.local</code>, crea el proyecto de
            ventas y corre la migración. Luego recarga.
          </p>
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-danger/30 bg-surface p-4 text-sm text-danger">
          Error al cargar: {loadError}
        </div>
      )}

      {configured && !loadError && opportunities.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="font-semibold">Aún no hay oportunidades</p>
          <p className="mt-1 text-sm text-muted">
            {origenFilter === "app_interna"
              ? "La monetización de app llega en una fase posterior. Por ahora usa prospección local."
              : "Empieza buscando negocios locales o pegando un perfil de red social."}
          </p>
          {origenFilter !== "app_interna" && (
            <Link
              href="/leads/nuevo"
              className="mt-4 inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg"
            >
              Buscar leads nuevos
            </Link>
          )}
        </div>
      )}

      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.id} className="flex flex-col gap-2">
              <div>
                <h2 className="text-sm font-bold">
                  {g.title}{" "}
                  <span className="font-normal text-muted">({g.items.length})</span>
                </h2>
                <p className="text-xs text-muted">{g.hint}</p>
              </div>
              <ul className="flex flex-col gap-3">
                {g.items.map(({ op, score, action }) => (
                  <li key={op.id}>
                    <OpportunityCard opportunity={op} score={score} action={action} />
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}

      <p className="text-center text-[11px] text-muted">
        Orígenes listos:{" "}
        {(Object.keys(ORIGEN_LABELS) as LeadOrigen[])
          .map((k) => ORIGEN_LABELS[k])
          .join(" · ")}
      </p>
    </div>
  );
}
