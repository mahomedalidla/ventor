"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { waLink } from "@/lib/phone";
import { PLAN_NOMBRE, type PlanId } from "@/lib/sales/alcance";

type Tipo = "landing" | "whatsapp";

export type DeliverableSummary = {
  tipo: Tipo;
  public_slug: string;
  generated_at: string;
  updated_at: string | null;
  engine: string | null;
  plan_id: PlanId | null;
  ultimo_cambio: string | null;
};

const CAMBIOS_RAPIDOS = [
  "Haz el botón de WhatsApp más grande y visible",
  "Cambia la foto principal por otra de la galería",
  "Quita los precios",
  "Agrega que tenemos servicio a domicilio",
];

const STEPS = [
  "Buscando logo y fotos reales…",
  "Aplicando anatomía del rubro…",
  "Diseñando secciones y efectos…",
  "Armando el HTML final…",
];

const LABEL: Record<Tipo, string> = {
  landing: "Landing",
  whatsapp: "Demo WhatsApp",
};

export function DeliverableDemoPanel({
  opportunityId,
  nombre,
  telefono,
  deliverables,
  suggested,
  planElegido,
}: {
  opportunityId: string;
  nombre: string;
  telefono: string | null;
  deliverables: DeliverableSummary[];
  suggested: Tipo;
  planElegido: PlanId | null;
}) {
  const router = useRouter();
  const byTipo = Object.fromEntries(deliverables.map((d) => [d.tipo, d])) as Partial<
    Record<Tipo, DeliverableSummary>
  >;
  const [active, setActive] = useState<Tipo>(
    byTipo[suggested] ? suggested : deliverables[0]?.tipo ?? suggested,
  );
  const [loading, setLoading] = useState<Tipo | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [cambio, setCambio] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function edit(body: { instruccion?: string; deshacer?: boolean }) {
    setEditing(body.deshacer ? "Deshaciendo…" : "Aplicando el cambio (~30–60 s)…");
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/demo/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunityId, tipo: active, ...body }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "No se pudo aplicar");
      else {
        setInfo(body.deshacer ? "Listo, regresó a la versión anterior" : "Cambio aplicado");
        setCambio("");
        router.refresh();
      }
    } catch {
      setError("Error de red");
    }
    setEditing(null);
  }

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 9000);
    return () => clearInterval(t);
  }, [loading]);

  async function generate(t: Tipo, refreshAssets = false, plan?: PlanId) {
    setLoading(t);
    setActive(t);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/demo/deliverable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          tipo: t,
          refresh_assets: refreshAssets,
          plan: plan ?? planElegido ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo generar");
      } else {
        setInfo(
          `${data.engine === "gemini" ? "Diseñado con Gemini" : "Plantilla base (Gemini no respondió)"} · plan ${PLAN_NOMBRE[data.plan as PlanId] ?? "Recomendado"} · ${data.fotos} fotos · ${data.logo ? "logo encontrado" : "sin logo (tipográfico)"}`,
        );
        router.refresh();
      }
    } catch {
      setError("Error de red");
    }
    setLoading(null);
  }

  const current = byTipo[active];
  const publicUrl = current && origin ? `${origin}/p/${current.public_slug}?src=demo` : null;
  const previewSrc = current
    ? `/p/${current.public_slug}?preview=1&v=${encodeURIComponent(current.updated_at ?? current.generated_at)}`
    : null;
  const currentPlan = current?.plan_id ?? "recomendado";
  const desalineado = Boolean(current && planElegido && planElegido !== currentPlan);
  const isLocal = /localhost|127\.0\.0\.1/.test(origin);

  async function copy() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function download() {
    if (!current) return;
    const res = await fetch(`/p/${current.public_slug}?dl=1`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${current.public_slug}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {(["landing", "whatsapp"] as const).map((t) => {
          const has = Boolean(byTipo[t]);
          const isActive = active === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActive(t)}
              className={`rounded-md border px-3 py-2 text-left text-sm ${
                isActive ? "border-accent bg-accent/10" : "border-border"
              }`}
            >
              <span className="font-semibold">
                {LABEL[t]}
                {t === suggested ? " ★" : ""}
              </span>
              <span className="block text-[11px] text-muted">
                {loading === t ? STEPS[step] : has ? "Lista" : "Sin generar"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => generate(active)}
          disabled={Boolean(loading)}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading === active
            ? STEPS[step]
            : current
              ? `Regenerar ${LABEL[active].toLowerCase()}`
              : `Generar ${LABEL[active].toLowerCase()}`}
        </button>
        {current && (
          <button
            type="button"
            onClick={() => generate(active, true)}
            disabled={Boolean(loading)}
            className="rounded-md border border-border px-3 py-2 text-xs font-medium text-muted disabled:opacity-60"
          >
            Regenerar con fotos nuevas
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        ★ recomendado según el producto. Cada tipo se guarda por separado.
        Tarda ~30–90 s.
        {current ? ` Hecha para plan ${PLAN_NOMBRE[currentPlan]}.` : ""}
      </p>
      {desalineado && planElegido && (
        <div className="rounded-md border border-warning/50 bg-warning/5 p-3 text-sm">
          <p>
            Eligió <b>{PLAN_NOMBRE[planElegido]}</b> pero esta versión es{" "}
            <b>{PLAN_NOMBRE[currentPlan]}</b>. Ajústala para entregarle
            exactamente lo que paga.
          </p>
          <button
            type="button"
            disabled={Boolean(loading)}
            onClick={() => generate(active, false, planElegido)}
            className="mt-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Ajustar al plan {PLAN_NOMBRE[planElegido]}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {info && <p className="text-xs text-accent">{info}</p>}

      {current && (
        <div className="rounded-md border border-border p-3">
          <p className="text-sm font-semibold">Pedir un cambio</p>
          <p className="text-xs text-muted">
            Escribe lo que te pidió el dueño, como se lo dirías a un diseñador.
          </p>
          <textarea
            value={cambio}
            onChange={(e) => setCambio(e.target.value)}
            rows={2}
            placeholder="Ej. Pon el platillo del día arriba y quita la sección de preguntas"
            className="mt-2 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
          />
          <div className="mt-1 flex flex-wrap gap-1">
            {CAMBIOS_RAPIDOS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCambio(c)}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={Boolean(editing) || Boolean(loading) || cambio.trim().length < 4}
              onClick={() => edit({ instruccion: cambio })}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {editing ?? "Aplicar cambio"}
            </button>
            {current.ultimo_cambio && (
              <button
                type="button"
                disabled={Boolean(editing)}
                onClick={() => edit({ deshacer: true })}
                className="rounded-md border border-border px-3 py-2 text-xs font-medium disabled:opacity-60"
              >
                Deshacer último cambio
              </button>
            )}
          </div>
          {current.ultimo_cambio && (
            <p className="mt-1 text-[11px] text-muted">Último: {current.ultimo_cambio}</p>
          )}
        </div>
      )}

      {previewSrc ? (
        <>
          <div className="flex justify-end">
            <div className="flex overflow-hidden rounded-md border border-border text-xs">
              {(["mobile", "desktop"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={`px-2 py-1 ${device === d ? "bg-accent text-white" : ""}`}
                >
                  {d === "mobile" ? "Celular" : "Escritorio"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <iframe
              key={previewSrc}
              src={previewSrc}
              title={`${LABEL[active]} ${nombre}`}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              className="mx-auto block bg-white"
              style={{
                width: device === "mobile" ? 390 : "100%",
                maxWidth: "100%",
                height: 720,
                border: 0,
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={previewSrc}
              target="_blank"
              rel="noopener"
              className="rounded-md border border-border px-3 py-2 text-sm font-medium"
            >
              Abrir
            </a>
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium"
            >
              {copied ? "¡Copiado!" : "Copiar link"}
            </button>
            {publicUrl && (
              <a
                href={waLink(
                  telefono,
                  active === "landing"
                    ? `Hola, ¿qué tal? Le preparé una página para ${nombre}, véala desde su celular: ${publicUrl}`
                    : `Hola, ¿qué tal? Así se vería ${nombre} atendiendo por WhatsApp en automático: ${publicUrl}`,
                )}
                target="_blank"
                rel="noopener"
                className="rounded-md bg-[#25d366] px-3 py-2 text-sm font-semibold text-white"
              >
                Enviar al cliente
              </a>
            )}
            <button
              type="button"
              onClick={download}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium"
            >
              Descargar HTML
            </button>
          </div>
          {isLocal && (
            <p className="text-xs text-warning">
              Estás en localhost: el link solo abre en tu compu. Para mandarlo
              al cliente, usa “Descargar HTML” o despliega (Vercel).
            </p>
          )}
        </>
      ) : (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted">
          Aún no hay {LABEL[active].toLowerCase()} para {nombre}.
        </p>
      )}
    </div>
  );
}
