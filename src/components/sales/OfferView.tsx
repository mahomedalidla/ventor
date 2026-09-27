import type { Offer } from "@/lib/sales/offer";

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

export function OfferView({ offer }: { offer: Offer }) {
  const ordered = [...offer.planes].sort(
    (a, b) => Number(b.recomendado) - Number(a.recomendado),
  );
  return (
    <div className="flex flex-col gap-3">
      {offer.prueba.dias > 0 && (
        <div className="rounded-md bg-accent/10 px-3 py-2 text-sm">
          <span className="font-bold text-accent">
            {offer.prueba.dias} días de prueba gratis
          </span>{" "}
          — {offer.prueba.que_incluye}. {offer.prueba.condicion}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {ordered.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border p-3 ${
              p.recomendado ? "border-accent bg-surface shadow-sm" : "border-border"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-muted">
              {p.nombre}
              {p.recomendado ? " ⭐ ofrecer primero" : ""}
            </p>
            <p className="mt-1 text-lg font-bold">
              {money(p.mensual)}
              <span className="text-xs font-medium text-muted">/mes</span>
            </p>
            <p className="text-xs text-muted">
              + {money(p.instalacion)} instalación (una vez)
            </p>
            <ul className="mt-2 list-disc pl-4 text-xs">
              {p.incluye.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Ancla: el Recomendado sale en {offer.ancla_diaria}.
        {offer.instalacion_diferida
          ? " Cliente escéptico: ofrece la instalación en 2 pagos (el primero al terminar la prueba)."
          : ""}{" "}
        Si pide descuento, baja de plan antes que bajar precio.
      </p>
    </div>
  );
}
