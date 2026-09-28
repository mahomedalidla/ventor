import type { Complejidad, Offer, OfferLine } from "@/lib/sales/offer";

export type DemandaRow = {
  id: string;
  producto_sugerido_texto: string;
  status: string;
  oferta: Offer | null;
  leads: { nombre: string; tipo_negocio: string | null; zona: string | null } | null;
};

export type DemandaGrupo = {
  nombre: string;
  variantes: string[];
  opportunity_ids: string[];
  negocios: string[];
  rubros: string[];
  zonas: string[];
  cerradas: number;
  rechazadas: number;
  linea: OfferLine;
  complejidad: Complejidad | null;
  precio_ref: number | null;
  mensual_ref: number | null;
  candidato: boolean;
};

const STOP = new Set([
  "para", "por", "con", "del", "los", "las", "una", "uno", "sus", "que", "sin", "the",
  "sistema", "servicio", "digital", "whatsapp", "clientes", "negocio", "automatico", "automatica",
]);

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
      .map((w) => w.replace(/(es|s)$/, "")),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const uniq = (xs: Array<string | null | undefined>) =>
  [...new Set(xs.filter((x): x is string => Boolean(x)))];

/** Agrupa productos propuestos por la IA que significan lo mismo (“Programa de lealtad QR” ≈ “Lealtad con puntos”). */
export function agruparDemanda(rows: DemandaRow[]): DemandaGrupo[] {
  const clusters: Array<{ tok: Set<string>; rows: DemandaRow[] }> = [];
  for (const r of rows) {
    const t = tokens(r.producto_sugerido_texto);
    const hit = clusters.find((c) => jaccard(c.tok, t) >= 0.4);
    if (hit) {
      hit.rows.push(r);
      for (const x of t) hit.tok.add(x);
    } else {
      clusters.push({ tok: t, rows: [r] });
    }
  }

  return clusters
    .map(({ rows: rs }) => {
      const nombres = rs.map((r) => r.producto_sugerido_texto.trim());
      const nombre =
        Object.entries(
          nombres.reduce<Record<string, number>>((acc, n) => ((acc[n] = (acc[n] ?? 0) + 1), acc), {}),
        ).sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]?.[0] ?? nombres[0];
      const recs = rs
        .map((r) => r.oferta?.planes?.find((p) => p.recomendado))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
      const cx = rs.map((r) => r.oferta?.a_medida?.complejidad).find(Boolean) ?? null;
      const cerradas = rs.filter((r) => r.status === "cerrado").length;
      const negocios = uniq(rs.map((r) => r.leads?.nombre));
      return {
        nombre,
        variantes: uniq(nombres).filter((n) => n !== nombre).slice(0, 4),
        opportunity_ids: rs.map((r) => r.id),
        negocios,
        rubros: uniq(rs.map((r) => r.leads?.tipo_negocio)),
        zonas: uniq(rs.map((r) => r.leads?.zona)),
        cerradas,
        rechazadas: rs.filter((r) => r.status === "rechazado").length,
        linea: (rs.map((r) => r.oferta?.linea).find(Boolean) ?? "a_medida") as OfferLine,
        complejidad: cx,
        precio_ref: median(recs.map((p) => p.instalacion)),
        mensual_ref: median(recs.map((p) => p.mensual)),
        candidato: negocios.length >= 3 || cerradas >= 1,
      };
    })
    .sort(
      (a, b) =>
        Number(b.candidato) - Number(a.candidato) ||
        b.cerradas - a.cerradas ||
        b.negocios.length - a.negocios.length,
    );
}
