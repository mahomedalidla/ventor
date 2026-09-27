import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, nombre, descripcion, precio_base, modelo_precio, estado, veces_cerrado, veces_rechazado",
    )
    .order("veces_cerrado", { ascending: false });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Catálogo</h1>
        <p className="mt-1 text-sm text-muted">
          Validados vs propuestos. Crece cuando cierras ventas.
        </p>
      </div>

      <Link
        href="/catalogo/conversion"
        className="rounded-lg border border-accent/40 bg-surface p-4"
      >
        <p className="font-bold text-accent">Conversión por rubro →</p>
        <p className="mt-1 text-sm text-muted">
          Anatomía de página, factores de confianza/urgencia y puntos de
          fricción para hotelería, comida, salud y demás.
        </p>
      </Link>

      {error && (
        <p className="text-sm text-danger">{error.message}</p>
      )}

      {!error && (products ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="font-semibold">Catálogo vacío</p>
          <p className="mt-1 text-sm text-muted">
            Corre el seed SQL o cierra una oportunidad con producto nuevo.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {(products ?? []).map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold">{p.nombre}</h2>
              <span className="shrink-0 rounded bg-background px-2 py-0.5 text-[11px] font-medium capitalize text-muted">
                {p.estado}
              </span>
            </div>
            {p.descripcion && (
              <p className="mt-1 text-sm text-muted">{p.descripcion}</p>
            )}
            <p className="mt-2 text-xs text-muted">
              Cerrados: {p.veces_cerrado} · Rechazados: {p.veces_rechazado}
              {p.precio_base != null ? ` · base $${p.precio_base}` : ""}
            </p>
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
