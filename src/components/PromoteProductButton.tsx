"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PromoteProductButton({
  nombre,
  descripcion,
  linea,
  complejidad,
  precioBase,
  opportunityIds,
}: {
  nombre: string;
  descripcion: string;
  linea: string;
  complejidad: string | null;
  precioBase: number | null;
  opportunityIds: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function promote() {
    setBusy(true);
    const res = await fetch("/api/products/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        descripcion,
        linea,
        complejidad,
        precio_base: precioBase,
        opportunity_ids: opportunityIds,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "No se pudo agregar");
      return;
    }
    setMsg(`Agregado al catálogo · ${data.ligadas} oportunidades ligadas`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={promote}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Agregando…" : "Agregar al catálogo"}
      </button>
      {msg && <p className="text-[11px] text-muted">{msg}</p>}
    </div>
  );
}
