import Link from "next/link";
import { PromoteProductButton } from "@/components/PromoteProductButton";
import { agruparDemanda, type DemandaRow } from "@/lib/sales/demanda";
import { createClient } from "@/lib/supabase/server";

const TONO_LABEL: Record<string, string> = {
  mas_agresivo: "Más agresivo",
  menos_agresivo: "Menos agresivo",
  igual: "Mantener tono",
  mas_prueba: "Más prueba / demo",
  bajar_precio: "Bajar precio",
  subir_precio: "Subir precio",
};

export default async function AprendizajesPage() {
  const supabase = await createClient();
  const { data: insights, error } = await supabase
    .from("sales_insights")
    .select(
      "id, origen_evento, zona, tipo_negocio, motivo_rechazo, tono_sugerido, leccion, precio_sugerido, producto_texto, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(40);

  const rows = insights ?? [];

  const { data: propuestos } = await supabase
    .from("opportunities")
    .select("id, producto_sugerido_texto, status, oferta, leads(nombre, tipo_negocio, zona)")
    .is("product_id", null)
    .not("producto_sugerido_texto", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  const demanda = agruparDemanda((propuestos ?? []) as unknown as DemandaRow[]);
  const money = (n: number | null) => (n == null ? "—" : `$${n.toLocaleString("es-MX")}`);

  const tonoCounts = rows.reduce<Record<string, number>>((acc, r) => {
    if (!r.tono_sugerido) return acc;
    acc[r.tono_sugerido] = (acc[r.tono_sugerido] ?? 0) + 1;
    return acc;
  }, {});

  const topTono = Object.entries(tonoCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Aprendizajes</h1>
        <p className="mt-1 text-sm text-muted">
          El sistema se alimenta de cierres y rechazos para vender mejor.
        </p>
      </div>

      {topTono && (
        <div className="rounded-lg border border-accent/40 bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Señal dominante ahora
          </p>
          <p className="mt-1 text-base font-bold">
            {TONO_LABEL[topTono[0]] ?? topTono[0]}
          </p>
          <p className="mt-1 text-sm text-muted">
            Aparece en {topTono[1]} de las últimas {rows.length} lecciones. Las
            nuevas oportunidades ya reciben este sesgo en el prompt.
          </p>
        </div>
      )}

      {demanda.length > 0 && (
        <section className="flex flex-col gap-2">
          <div>
            <h2 className="text-sm font-bold">Lo que está pidiendo el mercado</h2>
            <p className="text-xs text-muted">
              Productos que la IA propuso por las dolencias de los leads y que no
              están en tu catálogo. Si se repiten en varios negocios o ya cerraste
              uno, conviene construirlo.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {demanda.slice(0, 15).map((g) => (
              <li
                key={g.opportunity_ids[0]}
                className={`rounded-lg border bg-surface p-3 ${g.candidato ? "border-accent" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">
                    {g.nombre}
                    {g.candidato ? " ⭐" : ""}
                  </p>
                  <span className="shrink-0 text-xs font-bold text-accent">
                    {g.negocios.length} negocio{g.negocios.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {g.rubros.join(", ") || "—"} · {g.zonas.join(", ") || "—"}
                  {g.cerradas ? ` · ${g.cerradas} cerrada${g.cerradas === 1 ? "" : "s"}` : ""}
                  {g.rechazadas ? ` · ${g.rechazadas} rechazada${g.rechazadas === 1 ? "" : "s"}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {g.linea === "a_medida" ? `A la medida${g.complejidad ? ` · complejidad ${g.complejidad}` : ""}` : `Se vende como ${g.linea}`}
                  {g.precio_ref ? ` · ref. ${money(g.precio_ref)} + ${money(g.mensual_ref)}/mes` : ""}
                </p>
                {g.variantes.length > 0 && (
                  <p className="mt-1 text-[11px] text-muted">También como: {g.variantes.join(" · ")}</p>
                )}
                {g.candidato && (
                  <div className="mt-2">
                    <PromoteProductButton
                      nombre={g.nombre}
                      descripcion={`Nació de la demanda: ${g.negocios.slice(0, 5).join(", ")}.`}
                      linea={g.linea}
                      complejidad={g.complejidad}
                      precioBase={g.precio_ref}
                      opportunityIds={g.opportunity_ids}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p className="text-sm text-danger">
          {error.message.includes("sales_insights")
            ? "Falta correr la migración 20260927000002_demo_and_learning.sql en Supabase."
            : error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="font-semibold">Aún no hay aprendizajes</p>
          <p className="mt-1 text-sm text-muted">
            Marca oportunidades como cerradas o rechazadas (con motivo) y aquí
            verás qué ajustar: precio, agresividad, demo…
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="rounded bg-background px-2 py-0.5 font-medium capitalize">
                {r.origen_evento}
              </span>
              {r.tono_sugerido && (
                <span className="rounded bg-background px-2 py-0.5 font-medium text-accent">
                  {TONO_LABEL[r.tono_sugerido] ?? r.tono_sugerido}
                </span>
              )}
              {r.motivo_rechazo && <span>motivo: {r.motivo_rechazo}</span>}
              <span>
                {[r.zona, r.tipo_negocio].filter(Boolean).join(" · ") || "—"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{r.leccion}</p>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        ← Volver a oportunidades
      </Link>
    </div>
  );
}
