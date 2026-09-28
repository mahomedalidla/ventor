import Link from "next/link";
import { PLAN_NOMBRE, isPlanId } from "@/lib/sales/alcance";
import { engagementFrom, fetchEventsByOpportunity } from "@/lib/sales/engagement";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, type OpportunityStatus } from "@/lib/types/database";

type Row = {
  id: string;
  status: OpportunityStatus;
  ultimo_contacto_at: string | null;
  prueba_inicio: string | null;
  prueba_fin: string | null;
  plan_elegido: string | null;
  leads: { nombre: string; zona: string | null; tipo_negocio: string | null } | null;
  demo_deliverables: Array<{ tipo: string; public_slug: string; generated_at: string; plan_id: string | null }>;
};

function ago(iso: string | null): string {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  return `hace ${d} días`;
}

export default async function ResultadosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id, status, ultimo_contacto_at, prueba_inicio, prueba_fin, plan_elegido, leads(nombre, zona, tipo_negocio), demo_deliverables!inner(tipo, public_slug, generated_at, plan_id)",
    )
    .order("updated_at", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as unknown as Row[];
  const events = await fetchEventsByOpportunity(supabase, rows.map((r) => r.id));
  const today = new Date().toISOString().slice(0, 10);

  const items = rows
    .map((r) => ({
      r,
      e: engagementFrom(events.get(r.id) ?? [], {
        ultimoContacto: r.ultimo_contacto_at,
        pruebaInicio: r.prueba_inicio,
      }),
    }))
    .sort(
      (a, b) =>
        b.e.contactos - a.e.contactos ||
        b.e.visitas - a.e.visitas ||
        b.e.duenoVistas - a.e.duenoVistas,
    );

  const tot = items.reduce(
    (s, { e }) => ({ visitas: s.visitas + e.visitas, contactos: s.contactos + e.contactos, abiertas: s.abiertas + (e.duenoVistas > 0 ? 1 : 0) }),
    { visitas: 0, contactos: 0, abiertas: 0 },
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Resultados</h1>
        <p className="mt-1 text-sm text-muted">
          Todo lo generado queda guardado con su link y sus métricas, aunque ya
          esté cerrado. Números de los últimos 120 días.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { v: items.length, l: "entregables" },
          { v: `${tot.abiertas}/${items.length}`, l: "dueños la abrieron" },
          { v: tot.contactos, l: "clientes generados" },
        ].map((m) => (
          <div key={m.l} className="rounded-md border border-border bg-surface p-3">
            <p className="text-xl font-bold text-accent">{m.v}</p>
            <p className="text-[11px] text-muted">{m.l}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-danger">Error al cargar: {error.message}</p>}
      {!error && items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
          Aún no hay entregables generados.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items.map(({ r, e }) => {
          const enPrueba = Boolean(r.prueba_fin && r.prueba_fin >= today);
          const main = r.demo_deliverables.find((d) => d.tipo === "landing") ?? r.demo_deliverables[0];
          return (
            <li key={r.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/oportunidad/${r.id}`} className="truncate text-base font-bold hover:text-accent">
                    {r.leads?.nombre ?? "Negocio"}
                  </Link>
                  <p className="text-xs text-muted">
                    {[r.leads?.zona, r.leads?.tipo_negocio].filter(Boolean).join(" · ")} ·{" "}
                    {enPrueba ? "En prueba" : STATUS_LABELS[r.status] ?? r.status}
                    {isPlanId(r.plan_elegido) ? ` · plan ${PLAN_NOMBRE[r.plan_elegido]}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">
                  {r.demo_deliverables.map((d) => (d.tipo === "landing" ? "Landing" : "WhatsApp")).join(" + ")}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[
                  { v: e.visitas, l: "visitas" },
                  { v: e.contactos, l: "contactos" },
                  { v: e.duenoVistas, l: "vistas dueño" },
                  { v: ago(e.ultimaVisita ?? e.duenoUltima), l: "última" },
                ].map((m) => (
                  <div key={m.l} className="rounded-md bg-background p-2">
                    <p className="text-sm font-bold">{m.v}</p>
                    <p className="text-[10px] text-muted">{m.l}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                <Link href={`/oportunidad/${r.id}`} className="text-accent hover:underline">
                  Abrir ficha →
                </Link>
                {main && (
                  <>
                    <a href={`/p/${main.public_slug}/reporte`} target="_blank" rel="noopener" className="hover:underline">
                      Reporte del dueño
                    </a>
                    <a href={`/p/${main.public_slug}?preview=1`} target="_blank" rel="noopener" className="hover:underline">
                      Ver página
                    </a>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
