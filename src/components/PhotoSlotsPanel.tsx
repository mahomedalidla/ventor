"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PhotoSlot } from "@/lib/demo/slots";

export function PhotoSlotsPanel({
  opportunityId,
  slots,
}: {
  opportunityId: string;
  slots: PhotoSlot[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(slot: PhotoSlot, file: File | undefined) {
    if (!file) return;
    setBusy(slot.id);
    setError(null);
    setMsg(null);
    try {
      const body = new FormData();
      body.set("opportunity_id", opportunityId);
      body.set("slot_id", slot.id);
      body.set("file", file);
      const res = await fetch("/api/demo/slot", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo subir");
      setMsg(`Listo: ${slot.label}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir");
    }
    setBusy(null);
  }

  if (!slots.length) {
    return (
      <p className="text-xs text-muted">
        Cuando se genere la landing, cada platillo, habitación o servicio tendrá
        su hueco de foto. No esperamos las fotos del dueño para generar: si no
        hay, sale un recuadro con el nombre y aquí se cambia después.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Cada ítem ya tiene foto (o un recuadro diseñado). Si el dueño trae una
        distinta, cámbiala aquí sin regenerar la página.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {slots.map((s) => (
          <li key={s.id} className="overflow-hidden rounded-md border border-border">
            <div className="aspect-[4/3] bg-background">
              {s.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photo_url} alt={s.label} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center bg-gradient-to-br from-accent/80 to-foreground px-3 text-center text-sm font-semibold text-white">
                  {s.label}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 p-2">
              <span className="truncate text-sm font-medium">{s.label}</span>
              <label className="cursor-pointer text-xs font-semibold text-accent">
                {busy === s.id ? "Subiendo…" : s.photo_url ? "Cambiar" : "Agregar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={busy !== null}
                  onChange={(e) => onFile(s, e.target.files?.[0])}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
      {msg && <p className="text-xs text-accent">{msg}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
