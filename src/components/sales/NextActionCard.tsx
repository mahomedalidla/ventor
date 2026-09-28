"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { waLink } from "@/lib/phone";
import type { NextAction } from "@/lib/sales/next-action";
import { renderMessage } from "@/lib/sales/render";

export function NextActionCard({
  opportunityId,
  telefono,
  action,
  slugs,
  visitas,
  clicsWhatsapp,
}: {
  opportunityId: string;
  telefono: string | null;
  action: NextAction;
  slugs: Partial<Record<"landing" | "whatsapp", string>>;
  visitas: number;
  clicsWhatsapp: number;
}) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const text = action.mensaje
    ? renderMessage(action.mensaje, { origin, slugs, visitas, clicsWhatsapp })
    : null;
  const hot = action.grupo === "ahora";

  async function done() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action.accion === "paso"
            ? { opportunity_id: opportunityId, action: "enviado" }
            : { opportunity_id: opportunityId, action: "toque", etapa: action.etapa },
        ),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Error");
      else router.refresh();
    } catch {
      setError("Error de red");
    }
    setBusy(false);
  }

  return (
    <section
      className={`rounded-lg border-2 p-4 ${hot ? "border-warning bg-warning/5" : "border-accent/50 bg-surface"}`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${hot ? "text-warning" : "text-accent"}`}>
        Siguiente jugada
      </p>
      <p className="mt-1 text-lg font-bold">{action.titulo}</p>
      <p className="mt-1 text-sm text-muted">{action.porque}</p>

      {text && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-[#d9fdd3] px-3 py-2 text-sm text-[#111]">
          {text}
        </p>
      )}
      {action.tip && (
        <p className="mt-2 text-xs">
          <span className="font-semibold">Tip:</span> {action.tip}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {text && (
          <>
            <a
              href={waLink(telefono, text)}
              target="_blank"
              rel="noopener"
              className="rounded-md bg-[#25d366] px-3 py-2 text-sm font-semibold text-white"
            >
              Abrir en WhatsApp
            </a>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={done}
              className="rounded-md border border-accent px-3 py-2 text-sm font-semibold text-accent disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Ya lo envié"}
            </button>
          </>
        )}
        {action.accion === "demo" && (
          <a
            href="#demo"
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
          >
            Ir a generar la demo ↓
          </a>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  );
}
