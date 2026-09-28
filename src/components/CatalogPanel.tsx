"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CatalogItem } from "@/lib/demo/catalog";

export function CatalogPanel({
  opportunityId,
  initial,
  planAllowsEdit,
}: {
  opportunityId: string;
  initial: CatalogItem[];
  /** Esencial: solo lectura / aviso; Recomendado+ editable */
  planAllowsEdit: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function set(i: number, patch: Partial<CatalogItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function add() {
    const id = `item-${Date.now().toString(36)}`;
    setItems((prev) => [
      ...prev,
      { id, name: "Nuevo ítem", price_hint: "consultar", note: null, photo_url: null, available: true },
    ]);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/demo/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunityId, tipo: "landing", items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setItems(data.items ?? items);
      setMsg("Catálogo publicado en la página");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  if (!initial.length && !items.length) {
    return (
      <p className="text-xs text-muted">
        Genera la landing primero: el catálogo se crea con los platillos /
        habitaciones / servicios detectados. Luego lo editas aquí sin regenerar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Panel genérico (mismo para menú, habitaciones o servicios). Con la
        mensualidad ustedes actualizan; el dueño podrá entrar después.
        {!planAllowsEdit && (
          <span className="text-warning">
            {" "}
            Plan Esencial: conviene subir a Recomendado para catálogo editable
            continuo.
          </span>
        )}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((it, i) => (
          <li key={it.id} className="rounded-md border border-border p-2">
            <div className="flex flex-wrap gap-2">
              <input
                value={it.name}
                onChange={(e) => set(i, { name: e.target.value })}
                disabled={!planAllowsEdit}
                className="min-w-[140px] flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                placeholder="Nombre"
              />
              <input
                value={it.price_hint}
                onChange={(e) => set(i, { price_hint: e.target.value })}
                disabled={!planAllowsEdit}
                className="w-28 rounded border border-border bg-background px-2 py-1 text-sm"
                placeholder="Precio"
              />
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={it.available}
                  disabled={!planAllowsEdit}
                  onChange={(e) => set(i, { available: e.target.checked })}
                />
                Visible
              </label>
            </div>
            <input
              value={it.note ?? ""}
              onChange={(e) => set(i, { note: e.target.value || null })}
              disabled={!planAllowsEdit}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
              placeholder="Nota (opcional)"
            />
          </li>
        ))}
      </ul>
      {planAllowsEdit && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={add}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
          >
            + Ítem
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Publicar catálogo"}
          </button>
        </div>
      )}
      {msg && <p className="text-xs text-accent">{msg}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
