"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AJUSTE_LABEL, type Ajustes } from "@/lib/demo/ajustes";
import { extractPaletteFromFile } from "@/lib/demo/extract-palette";

const PLACEHOLDER: Record<keyof Ajustes, string> = {
  nombre: "Como quiere que aparezca",
  whatsapp: "311 123 4567",
  horario: "Lun a Sáb 9:00–21:00 · Dom 10:00–18:00",
  direccion: "Calle, número, colonia",
  logo_url: "",
  color: "#0b6e4f",
  color_sec: "#1c1914",
  color_ter: "#d4a017",
  notas: "Ej. Aceptamos tarjeta. Tenemos estacionamiento. Servicio a domicilio en Compostela centro.",
};

export function AjustesPanel({
  opportunityId,
  initial,
  detectado,
  hasDeliverables,
  logoDetectado,
}: {
  opportunityId: string;
  initial: Ajustes;
  detectado: { nombre: string; telefono: string | null };
  hasDeliverables: boolean;
  logoDetectado: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Ajustes>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState(initial.logo_url ?? logoDetectado);

  const set = (k: keyof Ajustes, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setBusy("Leyendo logo…");
    setError(null);
    try {
      const pal = await extractPaletteFromFile(file);
      setForm((f) => ({
        ...f,
        color: pal.principal,
        color_sec: pal.secundario,
        color_ter: pal.acento,
      }));
      setLogoPreview(URL.createObjectURL(file));
      setBusy("Subiendo logo…");
      const body = new FormData();
      body.set("opportunity_id", opportunityId);
      body.set("file", file);
      body.set("color", pal.principal);
      body.set("color_sec", pal.secundario);
      body.set("color_ter", pal.acento);
      const res = await fetch("/api/demo/logo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo subir");
      setForm((f) => ({ ...f, logo_url: data.logo_url }));
      setLogoPreview(data.logo_url);
      setMsg("Logo listo. Saqué los 3 colores: puedes ajustarlos abajo y pulsar Guardar.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el logo");
    }
    setBusy(null);
  }

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
      if (data.parchados) hechos.push("Aplicado a lo ya generado");

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

      <div className="rounded-md border border-dashed border-border p-3">
        <p className="text-xs font-semibold">Logo del negocio</p>
        <p className="text-[11px] text-muted">
          Casi nunca lo encontramos solos. Arrastra el archivo o tócalo: sacamos
          principal, secundario y acento, y puedes cambiarlos.
        </p>
        <label className="mt-2 flex cursor-pointer items-center gap-3">
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoPreview}
              alt="Logo"
              className="h-16 w-16 rounded-md border border-border bg-white object-contain"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-md border border-border bg-background text-[11px] text-muted">
              Sin logo
            </span>
          )}
          <span className="text-sm font-medium text-accent">
            {busy?.startsWith("Leyendo") || busy?.startsWith("Subiendo")
              ? busy
              : logoPreview
                ? "Cambiar logo"
                : "Subir logo"}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(e) => onLogo(e.target.files?.[0])}
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {([
          ["color", "Principal (botones)"],
          ["color_sec", "Secundario (fondos)"],
          ["color_ter", "Acento (detalles)"],
        ] as const).map(([k, label]) => (
          <label key={k} className="flex flex-col gap-1 text-xs font-medium">
            {label}
            <span className="flex gap-2">
              <input
                type="color"
                value={form[k] || PLACEHOLDER[k]}
                onChange={(e) => set(k, e.target.value)}
                className="h-9 w-12 rounded border border-border"
              />
              <input
                value={form[k] ?? ""}
                onChange={(e) => set(k, e.target.value)}
                placeholder={PLACEHOLDER[k]}
                className="flex-1 rounded-md border border-border bg-background px-2 py-2 text-sm font-normal"
              />
            </span>
          </label>
        ))}
      </div>

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
