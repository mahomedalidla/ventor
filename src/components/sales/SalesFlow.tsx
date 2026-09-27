"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { waLink } from "@/lib/phone";
import { ETAPA_LABEL, type SalesPlan } from "@/lib/sales/types";

function when(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round(
    (new Date(d.toDateString()).getTime() - new Date(today.toDateString()).getTime()) / 864e5,
  );
  if (diff < 0) return `atrasado ${-diff} día${diff === -1 ? "" : "s"}`;
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
}

export function SalesFlow({
  opportunityId,
  telefono,
  plan,
  pasoActual,
  proximoContacto,
  pruebaFin,
  slugs,
  stats,
}: {
  stats: { visitas: number; whatsapp: number } | null;
  opportunityId: string;
  telefono: string | null;
  plan: SalesPlan | null;
  pasoActual: number;
  proximoContacto: string | null;
  pruebaFin: string | null;
  slugs: Partial<Record<"landing" | "whatsapp", string>>;
}) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  async function post(url: string, body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunityId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Error");
      else router.refresh();
    } catch {
      setError("Error de red");
    }
    setBusy(null);
  }

  function render(msg: string, adjunto: "landing" | "whatsapp" | null) {
    const slug = (adjunto && slugs[adjunto]) || slugs.landing || slugs.whatsapp;
    const mainSlug = slugs.landing || slugs.whatsapp;
    const link = slug && origin ? `${origin}/p/${slug}?src=demo` : "[genera la demo primero]";
    const reporte = mainSlug && origin ? `${origin}/p/${mainSlug}/reporte` : "[genera la demo primero]";
    return msg
      .replace(/\{link\}/g, link)
      .replace(/\{reporte\}/g, reporte)
      .replace(/\{visitas\}/g, String(stats?.visitas ?? 0))
      .replace(/\{clics_whatsapp\}/g, String(stats?.whatsapp ?? 0));
  }

  if (!plan?.pasos?.length) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          Aún no hay flujo de venta para esta oportunidad.
        </p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => post("/api/sales/plan", {}, "plan")}
          className="self-start rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy === "plan" ? "Armando oferta y copys…" : "Generar oferta y flujo de venta"}
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  const actual = Math.min(pasoActual, plan.pasos.length - 1);
  const proximo = when(proximoContacto);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-xs">
        <span>
          <span className="font-semibold">Siguiente:</span>{" "}
          {ETAPA_LABEL[plan.pasos[actual].etapa]}
          {proximo ? ` · ${proximo}` : " · cuando quieras empezar"}
        </span>
        {pruebaFin && (
          <span className="font-semibold text-accent">
            Prueba hasta {new Date(pruebaFin + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      <ol className="flex flex-col gap-2">
        {plan.pasos.map((p, i) => {
          const isCurrent = i === actual;
          const done = i < actual;
          const text = render(p.mensaje, p.adjunto);
          return (
            <li
              key={p.etapa}
              className={`rounded-lg border p-3 ${
                isCurrent ? "border-accent bg-surface" : done ? "border-border opacity-60" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">
                  {done ? "✓ " : isCurrent ? "→ " : ""}
                  {ETAPA_LABEL[p.etapa]}
                  <span className="ml-1 text-xs font-normal text-muted">
                    Día {p.dia}
                  </span>
                </p>
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => post("/api/sales/step", { action: "ir_a", paso: i }, `go${i}`)}
                    className="text-[11px] text-muted underline-offset-2 hover:underline"
                  >
                    ir aquí
                  </button>
                )}
              </div>
              <p className="text-xs text-muted">
                {p.cuando} Objetivo: {p.objetivo}.
              </p>

              {(isCurrent || !done) && (
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-[#d9fdd3] px-3 py-2 text-sm text-[#111]">
                  {text}
                </p>
              )}

              {isCurrent && (
                <>
                  <p className="mt-2 text-xs">
                    <span className="font-semibold">Tip:</span> {p.tip}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
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
                        setCopied(i);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      className="rounded-md border border-border px-3 py-2 text-sm"
                    >
                      {copied === i ? "¡Copiado!" : "Copiar"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => post("/api/sales/step", { action: "enviado" }, "sent")}
                      className="rounded-md border border-accent px-3 py-2 text-sm font-semibold text-accent disabled:opacity-60"
                    >
                      Ya lo envié
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => post("/api/sales/step", { action: "respondio" }, "reply")}
                      className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-60"
                    >
                      Respondió → siguiente
                    </button>
                    {p.etapa === "oferta_prueba" && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => post("/api/sales/step", { action: "iniciar_prueba" }, "trial")}
                        className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Aceptó: iniciar prueba
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>

      {plan.objeciones.length > 0 && (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Si le dice… (manejo de objeciones)
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {plan.objeciones.map((o) => (
              <li key={o.objecion} className="text-sm">
                <span className="font-semibold">“{o.objecion}”</span>
                <br />
                <span className="text-muted">{o.respuesta}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {plan.evitar && (
        <p className="text-xs">
          <span className="font-semibold text-danger">Evitar:</span> {plan.evitar}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => post("/api/sales/plan", {}, "plan")}
          className="text-xs font-medium text-accent underline-offset-2 hover:underline disabled:opacity-60"
        >
          {busy === "plan" ? "Reescribiendo…" : "Regenerar oferta y copys"}
        </button>
        <span className="text-[11px] text-muted">
          {plan.generado_por === "gemini" ? "Copys: Gemini" : "Copys: plantilla"}
        </span>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
