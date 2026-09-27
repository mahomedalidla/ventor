import type { SupabaseClient } from "@supabase/supabase-js";
import { SRC_LABEL } from "@/lib/channels";

export type StatRow = {
  nombre: string;
  tipo: string | null;
  src: string;
  dia: string | null;
  eventos: number;
  personas: number;
};

export type DemoStats = {
  nombre: string;
  visitas: number;
  personas: number;
  whatsapp: number;
  llamar: number;
  mapa: number;
  dueno: number;
  porCanal: Array<{ src: string; label: string; visitas: number; acciones: number }>;
  porDia: Array<{ dia: string; visitas: number }>;
};

export async function fetchDemoStats(
  supabase: SupabaseClient,
  slug: string,
): Promise<DemoStats | null> {
  const { data, error } = await supabase.rpc("get_public_demo_stats", { p_slug: slug });
  if (error || !data?.length) return null;
  return summarize(data as StatRow[]);
}

export function emptyStats(nombre: string): DemoStats {
  return summarize([{ nombre, tipo: null, src: "directo", dia: null, eventos: 0, personas: 0 }]);
}

export function summarize(rows: StatRow[]): DemoStats {
  const s: DemoStats = {
    nombre: rows[0]?.nombre ?? "",
    visitas: 0,
    personas: 0,
    whatsapp: 0,
    llamar: 0,
    mapa: 0,
    dueno: 0,
    porCanal: [],
    porDia: [],
  };
  const canal = new Map<string, { visitas: number; acciones: number }>();
  const dia = new Map<string, number>();

  for (const r of rows) {
    if (!r.tipo) continue;
    const n = Number(r.eventos);
    if (r.src === "demo") {
      if (r.tipo === "view") s.dueno += n;
      continue;
    }
    const c = canal.get(r.src) ?? { visitas: 0, acciones: 0 };
    if (r.tipo === "view") {
      s.visitas += n;
      s.personas += Number(r.personas);
      c.visitas += n;
      if (r.dia) dia.set(r.dia, (dia.get(r.dia) ?? 0) + n);
    } else {
      c.acciones += n;
      if (r.tipo === "whatsapp") s.whatsapp += n;
      if (r.tipo === "llamar") s.llamar += n;
      if (r.tipo === "mapa") s.mapa += n;
    }
    canal.set(r.src, c);
  }

  s.porCanal = [...canal.entries()]
    .map(([src, v]) => ({ src, label: SRC_LABEL[src] ?? src, ...v }))
    .sort((a, b) => b.visitas - a.visitas);
  s.porDia = [...dia.entries()]
    .map(([d, v]) => ({ dia: d, visitas: v }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
  return s;
}
