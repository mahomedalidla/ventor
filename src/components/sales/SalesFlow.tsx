"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ChatAdvice } from "@/lib/sales/chat-advise";
import { waLink } from "@/lib/phone";
import { renderMessage } from "@/lib/sales/render";
import { ETAPA_LABEL, type Etapa, type SalesPlan } from "@/lib/sales/types";

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
  const [copied, setCopied] = useState<string | null>(null);
  const [chatPaste, setChatPaste] = useState("");
  const [advice, setAdvice] = useState<(ChatAdvice & { paso_index: number }) | null>(null);

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
    return renderMessage(
      msg,
      { origin, slugs, visitas: stats?.visitas ?? 0, clicsWhatsapp: stats?.whatsapp ?? 0 },
      adjunto,
    );
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

  async function analyzeChat() {
    setBusy("chat");
    setError(null);
    setAdvice(null);
    try {
      const res = await fetch("/api/sales/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunityId, chat: chatPaste }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "No se pudo analizar");
      else setAdvice(data);
    } catch {
      setError("Error de red");
    }
    setBusy(null);
  }

  function applyCambiosDemo(texto: string) {
    try {
      sessionStorage.setItem(`demo-cambio:${opportunityId}`, texto);
    } catch {
      /* ignore */
    }
    window.location.hash = "demo";
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-semibold">Pegar respuesta del WhatsApp</p>
        <p className="text-xs text-muted">
          Copia lo que contestó el cliente. Te digo a qué paso ir y qué adaptar.
        </p>
        <textarea
          value={chatPaste}
          onChange={(e) => setChatPaste(e.target.value)}
          rows={3}
          placeholder="Ej. Ok mándeme el link… / Está caro… / No soy el dueño, yo solo atiendo…"
          className="mt-2 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy !== null || chatPaste.trim().length < 4}
          onClick={analyzeChat}
          className="mt-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy === "chat" ? "Analizando…" : "¿A qué paso voy?"}
        </button>
        {advice && (
          <div className="mt-3 rounded-md bg-background p-3 text-sm">
            <p className="font-semibold">
              → {ETAPA_LABEL[advice.etapa_sugerida as Etapa]}
            </p>
            <p className="mt-1 text-xs text-muted">{advice.resumen}</p>
            <p className="mt-2 text-xs">
              <span className="font-semibold">Tip:</span> {advice.tip_vendedor}
            </p>
            {advice.objecion && (
              <p className="mt-2 text-xs">
                <span className="font-semibold">Objeción:</span> “{advice.objecion}”
              </p>
            )}
            {advice.respuesta_sugerida && (
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-[#d9fdd3] px-2 py-2 text-sm text-[#111]">
                {advice.respuesta_sugerida}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {advice.avanzar && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    post("/api/sales/step", { action: "ir_a", paso: advice.paso_index }, "goChat")
                  }
                  className="rounded-md border border-accent px-3 py-1.5 text-xs font-semibold text-accent disabled:opacity-60"
                >
                  Ir a ese paso
                </button>
              )}
              {advice.respuesta_sugerida && (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(advice.respuesta_sugerida!);
                    setCopied("adv");
                    setTimeout(() => setCopied(null), 1500);
                  }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs"
                >
                  {copied === "adv" ? "¡Copiado!" : "Copiar respuesta"}
                </button>
              )}
              {advice.cambios_demo && (
                <button
                  type="button"
                  onClick={() => applyCambiosDemo(advice.cambios_demo!)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
                >
                  Llevar cambio a la demo
                </button>
              )}
            </div>
          </div>
        )}
      </div>

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
                        setCopied(`copy-${i}`);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      className="rounded-md border border-border px-3 py-2 text-sm"
                    >
                      {copied === `copy-${i}` ? "¡Copiado!" : "Copiar"}
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
                    <button
                      type="button"
                      onClick={async () => {
                        const msg =
                          "Perfecto, no lo entretengo. ¿Me puede pasar con quien decide lo de la página o las redes? Si prefiere, le dejo este mensaje para reenviárselo.";
                        await navigator.clipboard.writeText(msg);
                        setCopied("gk");
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      className="rounded-md border border-border px-3 py-2 text-sm"
                    >
                      {copied === "gk" ? "¡Copiado!" : "No es quien decide"}
                    </button>
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
          <p className="mt-2 text-xs text-muted">
            Quien atiende WhatsApp muchas veces no es quien decide. Si dice “yo
            solo atiendo”, no le expliques precio: pide que reenvíe o el nombre
            del dueño.
          </p>
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
