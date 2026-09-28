"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AJUSTE_LABEL, type Ajustes } from "@/lib/demo/ajustes";

const PLACEHOLDER: Record<keyof Ajustes, string> = {
  nombre: "Como quiere que aparezca",
  whatsapp: "311 123 4567",
  horario: "Lun a Sáb 9:00–21:00 · Dom 10:00–18:00",
  direccion: "Calle, número, colonia",
  color: "#0b6e4f",
  notas: "Ej. Aceptamos tarjeta. Tenemos estacionamiento. Servicio a domicilio en Compostela centro.",
};

export function AjustesPanel({
  opportunityId,
  initial,
  detectado,
  hasDeliverables,
}: {
  opportunityId: string;
  initial: Ajustes;
  detectado: { nombre: string; telefono: string | null };
  hasDeliverables: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Ajustes>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Ajustes, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy("Guardando…");
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/demo/ajustes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunityId, ajustes: form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        setBusy(null);
        return;
      }
      const hechos: string[] = ["Guardado"];
      if (data.parchados) hechos.push("WhatsApp cambiado en los links al instante");

      if (data.instruccion && data.tipos?.length) {
        for (const tipo of data.tipos as string[]) {
          setBusy(`Aplicando cambios a ${tipo === "landing" ? "la landing" : "la demo WhatsApp"}…`);
          const r = await fetch("/api/demo/edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opportunity_id: opportunityId, tipo, instruccion: data.instruccion }),
          });
          const d = await r.json();
          if (!r.ok) {
            hechos.push(`${tipo}: ${d.error ?? "no se pudo aplicar"} (regenera para aplicarlo)`);
          } else {
            hechos.push(`${tipo === "landing" ? "Landing" : "Demo WhatsApp"} actualizada`);
          }
        }
      }
      setMsg(hechos.join(" · "));
      router.refresh();
    } catch {
      setError("Error de red");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Lo que el dueño te corrija va aquí. Se aplica a lo ya generado y a todo lo
        que generes después. Detectado: {detectado.nombre}
        {detectado.telefono ? ` · ${detectado.telefono}` : " · sin teléfono"}.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["nombre", "whatsapp", "horario", "direccion"] as const).map((k) => (
          <label key={k} className="flex flex-col gap-1 text-xs font-medium">
            {AJUSTE_LABEL[k]}
            <input
              value={form[k] ?? ""}
              onChange={(e) => set(k, e.target.value)}
              placeholder={PLACEHOLDER[k]}
              inputMode={k === "whatsapp" ? "tel" : undefined}
              className="rounded-md border border-border bg-background px-2 py-2 text-sm font-normal"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1 text-xs font-medium">
          {AJUSTE_LABEL.color}
          <span className="flex gap-2">
            <input
              type="color"
              value={form.color || "#0b6e4f"}
              onChange={(e) => set("color", e.target.value)}
              className="h-9 w-12 rounded border border-border"
            />
            <input
              value={form.color ?? ""}
              onChange={(e) => set("color", e.target.value)}
              placeholder="Automático (logo)"
              className="flex-1 rounded-md border border-border bg-background px-2 py-2 text-sm font-normal"
            />
          </span>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium">
        {AJUSTE_LABEL.notas}
        <textarea
          value={form.notas ?? ""}
          onChange={(e) => set("notas", e.target.value)}
          placeholder={PLACEHOLDER.notas}
          rows={3}
          className="rounded-md border border-border bg-background px-2 py-2 text-sm font-normal"
        />
      </label>
      <button
        type="button"
        onClick={save}
        disabled={Boolean(busy)}
        className="self-start rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ?? (hasDeliverables ? "Guardar y aplicar" : "Guardar")}
      </button>
      {msg && <p className="text-xs text-accent">{msg}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
