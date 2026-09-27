import Link from "next/link";
import { CONVERSION_PROFILES } from "@/lib/categories/conversion";
import { playbookById, type CategoryId } from "@/lib/categories/playbooks";

export default function ConversionCatalogPage() {
  const profiles = Object.values(CONVERSION_PROFILES);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Conversión por rubro</h1>
        <p className="mt-1 text-sm text-muted">
          Anatomía de la página, factores que generan confianza y urgencia, y
          las dudas que el comprador necesita resolver antes de irse. Las
          landings y demos se construyen con esto.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {profiles.map((p) => (
          <a
            key={p.categoria}
            href={`#${p.categoria}`}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium"
          >
            {playbookById(p.categoria as CategoryId).label}
          </a>
        ))}
      </nav>

      {profiles.map((p) => (
        <section
          key={p.categoria}
          id={p.categoria}
          className="scroll-mt-4 rounded-lg border border-border bg-surface p-4"
        >
          <h2 className="text-lg font-bold">
            {playbookById(p.categoria as CategoryId).label}
          </h2>
          <p className="mt-1 text-sm">
            <span className="font-semibold text-accent">Objetivo:</span>{" "}
            {p.objetivo} · CTA “{p.cta_primario}” / “{p.cta_secundario}”
          </p>

          <div className="mt-3 rounded-md bg-background p-3">
            <p className="text-[11px] font-semibold uppercase text-muted">
              Intención del usuario
            </p>
            <p className="mt-1 text-sm">{p.quien_busca}</p>
            <p className="mt-2 text-xs text-muted">
              Busca: {p.como_busca.join(" · ")}
            </p>
          </div>

          <details className="mt-3" open>
            <summary className="cursor-pointer text-sm font-semibold">
              Anatomía de conversión ({p.anatomia.length} secciones)
            </summary>
            <ol className="mt-2 flex flex-col gap-2">
              {p.anatomia.map((s, i) => (
                <li key={s.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-semibold">
                    {i + 1}. {s.titulo}
                  </p>
                  <p className="text-xs text-muted">{s.proposito}</p>
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {s.elementos.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </details>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">Factores de confianza</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {p.confianza.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Factores de urgencia</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {p.urgencia.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Puntos de fricción ({p.friccion.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-2">
              {p.friccion.map((f) => (
                <li key={f.duda} className="text-xs">
                  <span className="font-semibold">“{f.duda}”</span>
                  <br />
                  <span className="text-muted">→ {f.respuesta}</span>
                </li>
              ))}
            </ul>
          </details>

          <p className="mt-3 text-xs">
            <span className="font-semibold text-danger">Evitar:</span>{" "}
            {p.evitar.join(" · ")}
          </p>
        </section>
      ))}

      <Link
        href="/catalogo"
        className="text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        ← Volver al catálogo
      </Link>
    </div>
  );
}
