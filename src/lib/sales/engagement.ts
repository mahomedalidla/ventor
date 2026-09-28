import type { SupabaseClient } from "@supabase/supabase-js";

export type DemoEvent = {
  tipo: "view" | "whatsapp" | "llamar" | "mapa";
  src: string | null;
  created_at: string;
};

export type Engagement = {
  /** Aperturas del link que le mandamos al dueño (src=demo). */
  duenoVistas: number;
  duenoUltima: string | null;
  duenoDesdeContacto: number;
  /** Clientes finales (todo lo que no es src=demo). */
  visitas: number;
  contactos: number;
  clientesWa: number;
  ultimaVisita: string | null;
  visitasPrueba: number;
  contactosPrueba: number;
  primerContactoPrueba: string | null;
};

export const NO_ENGAGEMENT: Engagement = {
  duenoVistas: 0,
  duenoUltima: null,
  duenoDesdeContacto: 0,
  visitas: 0,
  contactos: 0,
  clientesWa: 0,
  ultimaVisita: null,
  visitasPrueba: 0,
  contactosPrueba: 0,
  primerContactoPrueba: null,
};

export function engagementFrom(
  events: DemoEvent[],
  opts: { ultimoContacto: string | null; pruebaInicio: string | null },
): Engagement {
  const e: Engagement = { ...NO_ENGAGEMENT };
  const contacto = opts.ultimoContacto ? Date.parse(opts.ultimoContacto) : 0;
  const prueba = opts.pruebaInicio ? Date.parse(opts.pruebaInicio + "T00:00:00-07:00") : null;
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));

  for (const ev of sorted) {
    const t = Date.parse(ev.created_at);
    if (ev.src === "demo") {
      if (ev.tipo !== "view") continue;
      e.duenoVistas++;
      e.duenoUltima = ev.created_at;
      if (t > contacto) e.duenoDesdeContacto++;
      continue;
    }
    const enPrueba = prueba !== null && t >= prueba;
    if (ev.tipo === "view") {
      e.visitas++;
      e.ultimaVisita = ev.created_at;
      if (enPrueba) e.visitasPrueba++;
    } else {
      e.contactos++;
      if (ev.tipo === "whatsapp") e.clientesWa++;
      if (enPrueba) {
        e.contactosPrueba++;
        e.primerContactoPrueba ??= ev.created_at;
      }
    }
  }
  return e;
}

/** Eventos de los últimos 120 días agrupados por oportunidad. */
export async function fetchEventsByOpportunity(
  supabase: SupabaseClient,
  opportunityIds: string[],
): Promise<Map<string, DemoEvent[]>> {
  const out = new Map<string, DemoEvent[]>();
  if (!opportunityIds.length) return out;

  const { data: dels } = await supabase
    .from("demo_deliverables")
    .select("id, opportunity_id")
    .in("opportunity_id", opportunityIds.slice(0, 300));
  if (!dels?.length) return out;

  const opOf = new Map(dels.map((d) => [d.id as string, d.opportunity_id as string]));
  const since = new Date(Date.now() - 120 * 864e5).toISOString();
  const { data: events } = await supabase
    .from("demo_events")
    .select("deliverable_id, tipo, src, created_at")
    .in("deliverable_id", [...opOf.keys()])
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(10000);

  for (const ev of events ?? []) {
    const op = opOf.get(ev.deliverable_id as string);
    if (!op) continue;
    const list = out.get(op) ?? [];
    list.push({ tipo: ev.tipo, src: ev.src, created_at: ev.created_at } as DemoEvent);
    out.set(op, list);
  }
  return out;
}
