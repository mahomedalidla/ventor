"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { CHANNELS } from "@/lib/channels";
import { waLink } from "@/lib/phone";
import type { DemoStats } from "@/lib/stats";

export function TrialActivation({
  nombre,
  telefono,
  rubro,
  zona,
  slug,
  stats,
}: {
  nombre: string;
  telefono: string | null;
  rubro: string;
  zona: string;
  slug: string | null;
  stats: DemoStats | null;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const link = (src: string) => (slug && origin ? `${origin}/p/${slug}?src=${src}` : "");
  const reporte = slug && origin ? `${origin}/p/${slug}/reporte` : "";

  useEffect(() => {
    if (!slug || !origin) return;
    QRCode.toDataURL(`${origin}/p/${slug}?src=qr`, { width: 720, margin: 2 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [slug, origin]);

  if (!slug) {
    return (
      <p className="text-sm text-muted">
        Genera primero la landing (o la demo) para obtener los links de cada canal.
      </p>
    );
  }

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const instrucciones = `Para que le empiecen a llegar clientes por la página, póngala aquí (son 2 minutos):
1) Google Maps: su perfil de Google → Editar perfil → Sitio web:
${link("maps")}
2) WhatsApp Business: Perfil → Sitio web:
${link("wa")}
3) Instagram/Facebook, en la bio:
${link("ig")}
Si gusta, lo hacemos juntos por llamada.`;

  const reporteMsg = `Así va su página: ${stats?.visitas ?? 0} visitas y ${stats?.whatsapp ?? 0} personas tocaron WhatsApp. Véalo aquí 👉 ${reporte}`;
  const acciones = (stats?.whatsapp ?? 0) + (stats?.llamar ?? 0) + (stats?.mapa ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { v: stats?.visitas ?? 0, l: "visitas" },
          { v: stats?.whatsapp ?? 0, l: "WhatsApp" },
          { v: (stats?.llamar ?? 0) + (stats?.mapa ?? 0), l: "llamar/mapa" },
          { v: stats?.dueno ?? 0, l: "del dueño" },
        ].map((m) => (
          <div key={m.l} className="rounded-md bg-background p-2">
            <p className="text-xl font-bold text-accent">{m.v}</p>
            <p className="text-[11px] text-muted">{m.l}</p>
          </div>
        ))}
      </div>
      {stats && stats.porCanal.length > 0 && (
        <p className="text-xs text-muted">
          Por canal:{" "}
          {stats.porCanal.map((c) => `${c.label} ${c.visitas}`).join(" · ")}
          {acciones ? ` · ${acciones} contactos` : ""}
        </p>
      )}

      <div className="rounded-md border border-border p-3 text-xs leading-relaxed">
        <p className="font-semibold">Cómo le llegan clientes durante la prueba</p>
        <p className="mt-1 text-muted">
          En la prueba no dependemos de que Google encuentre esta página (eso
          tarda semanas). Cuando alguien busca “{rubro} en {zona}”, lo que sale
          arriba es el mapa con su ficha de Google, y esa ya tiene tráfico.
          Ponemos este link como su “Sitio web” en esa ficha, en su WhatsApp y
          en sus redes, y medimos cada visita y cada clic por canal.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {CHANNELS.map((c) => (
          <li key={c.src} className="rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{c.label}</p>
                <p className="text-xs text-muted">{c.donde}</p>
                <p className="text-xs text-muted">
                  {c.porque.replace("{rubro}", rubro).replace("{zona}", zona)}
                </p>
              </div>
              {c.src === "qr" ? (
                qr && (
                  <a
                    href={qr}
                    download={`qr-${slug}.png`}
                    className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium"
                  >
                    Descargar QR
                  </a>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => copy(c.src, link(c.src))}
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium"
                >
                  {copied === c.src ? "¡Copiado!" : "Copiar link"}
                </button>
              )}
            </div>
            {c.src === "qr" && qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR" className="mt-2 h-28 w-28 rounded border border-border" />
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <a
          href={waLink(telefono, instrucciones)}
          target="_blank"
          rel="noopener"
          className="rounded-md bg-[#25d366] px-3 py-2 text-sm font-semibold text-white"
        >
          Mandar instrucciones al dueño
        </a>
        <a
          href={waLink(telefono, reporteMsg)}
          target="_blank"
          rel="noopener"
          className="rounded-md border border-border px-3 py-2 text-sm font-medium"
        >
          Mandar reporte de resultados
        </a>
        <a
          href={reporte}
          target="_blank"
          rel="noopener"
          className="rounded-md border border-border px-3 py-2 text-sm font-medium"
        >
          Ver reporte
        </a>
      </div>
      <p className="text-[11px] text-muted">
        Los mensajes que le llegan desde la página empiezan con “Vi su página”,
        así el dueño también los reconoce. Las visitas del link que le mandamos
        a él se cuentan aparte como “del dueño”.
      </p>
    </div>
  );
}
