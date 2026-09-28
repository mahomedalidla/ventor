"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlanId } from "@/lib/sales/alcance";
import type { Offer } from "@/lib/sales/offer";

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

export function OfferView({
  offer,
  opportunityId,
  planElegido,
}: {
  offer: Offer;
  opportunityId: string;
  planElegido: PlanId | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [precios, setPrecios] = useState<
    Partial<Record<PlanId, { instalacion?: number; mensual?: number }>>
  >({});
  const setPrecio = (id: PlanId, k: "instalacion" | "mensual", v: string) =>
    setPrecios((s) => ({ ...s, [id]: { ...s[id], [k]: Number(v) } }));
  const ordered = [...offer.planes].sort(
    (a, b) => Number(b.recomendado) - Number(a.recomendado),
  );

  async function elegir(plan: PlanId) {
    setBusy(plan);
    await fetch("/api/sales/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunity_id: opportunityId, action: "elegir_plan", plan }),
    });
    setBusy(null);
    router.refresh();
  }

  async function confirmar() {
    setBusy("confirmar");
    const res = await fetch("/api/sales/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunity_id: opportunityId, action: "confirmar_oferta", precios }),
    });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  const am = offer.a_medida;

  return (
    <div className="flex flex-col gap-3">
      {am && (
        <div
          className={`rounded-md border p-3 text-sm ${am.confirmado ? "border-border" : "border-warning/60 bg-warning/5"}`}
        >
          <p className="font-semibold">
            Producto nuevo (fuera de catálogo) · complejidad {am.complejidad}
            {am.confirmado ? " · precios confirmados ✓" : ""}
          </p>
          <p className="mt-1 text-muted">{am.que_es}</p>
          <p className="mt-1 text-xs text-muted">
            Lo que muestra la demo: {am.demo_enfoque}
          </p>
          {!am.confirmado && (
            <>
              <p className="mt-2 text-xs">
                Precios de referencia {am.estimado_por === "gemini" ? "estimados por IA" : "por reglas"} según
                complejidad y zona. Revísalos antes de mandar el cierre: el
                flujo de venta se actualiza con lo que confirmes.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {ordered.map((p) => (
                  <div key={p.id} className="rounded border border-border p-2 text-xs">
                    <p className="font-semibold">{p.nombre}</p>
                    <label className="mt-1 flex items-center gap-1">
                      Instalación $
                      <input
                        type="number"
                        value={precios[p.id]?.instalacion ?? p.instalacion}
                        onChange={(e) => setPrecio(p.id, "instalacion", e.target.value)}
                        className="w-20 rounded border border-border bg-background px-1 py-0.5"
                      />
                    </label>
                    <label className="mt-1 flex items-center gap-1">
                      Mensual $
                      <input
                        type="number"
                        value={precios[p.id]?.mensual ?? p.mensual}
                        onChange={(e) => setPrecio(p.id, "mensual", e.target.value)}
                        className="w-20 rounded border border-border bg-background px-1 py-0.5"
                      />
                    </label>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={confirmar}
                className="mt-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy === "confirmar" ? "Guardando…" : "Confirmar precios"}
              </button>
            </>
          )}
        </div>
      )}

      {offer.prueba.dias > 0 && (
        <div className="rounded-md bg-accent/10 px-3 py-2 text-sm">
          <span className="font-bold text-accent">
            {offer.prueba.dias} días {am ? "de piloto" : "de prueba"} gratis
          </span>{" "}
          — {offer.prueba.que_incluye}. {offer.prueba.condicion}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {ordered.map((p) => {
          const elegido = planElegido === p.id;
          return (
            <div
              key={p.id}
              className={`flex flex-col rounded-lg border p-3 ${
                elegido
                  ? "border-2 border-accent bg-accent/5"
                  : p.recomendado
                    ? "border-accent bg-surface shadow-sm"
                    : "border-border"
              }`}
            >
              <p className="text-xs font-semibold uppercase text-muted">
                {p.nombre}
                {elegido ? " ✓ elegido" : p.recomendado ? " ⭐ ofrecer primero" : ""}
              </p>
              <p className="mt-1 text-lg font-bold">
                {money(p.mensual)}
                <span className="text-xs font-medium text-muted">/mes</span>
              </p>
              <p className="text-xs text-muted">
                + {money(p.instalacion)} instalación (una vez)
              </p>
              <ul className="mt-2 flex-1 list-disc pl-4 text-xs">
                {p.incluye.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              {!elegido && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => elegir(p.id)}
                  className="mt-2 rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-60"
                >
                  {busy === p.id ? "Guardando…" : "Eligió este"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Ancla: el Recomendado sale en {offer.ancla_diaria}.
        {offer.instalacion_diferida
          ? " Cliente escéptico: ofrece la instalación en 2 pagos (el primero al terminar la prueba)."
          : ""}{" "}
        Si pide descuento, baja de plan antes que bajar precio: al elegir otro
        plan, la demo se ajusta para mostrar exactamente lo que incluye.
      </p>
    </div>
  );
}
