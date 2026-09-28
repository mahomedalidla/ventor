import { resolvePlaybook } from "@/lib/categories/playbooks";
import { pricingTierForZona } from "@/lib/zones";

export type ScoreInput = {
  tipo_negocio: string | null;
  zona: string | null;
  telefono: string | null;
  metadata: Record<string, unknown> | null;
  signals: string[];
  status: string;
  deliverables: number;
  engagement?: { duenoVistas: number; contactos: number };
};

export type OpportunityScore = {
  score: number;
  nivel: "caliente" | "tibia" | "fria";
  razones: string[];
};

/**
 * Qué tan interesante es la oportunidad (0–100):
 * demanda real (reseñas) × necesidad (fricción) × capacidad de pago (zona) × contactabilidad.
 */
export function scoreOpportunity(i: ScoreInput): OpportunityScore {
  const playbook = resolvePlaybook(i.tipo_negocio ?? "general");
  const meta = i.metadata ?? {};
  const reviews = Number(meta.user_rating_count ?? 0);
  const rating = Number(meta.rating ?? 0);
  const has = (t: string) => i.signals.includes(t);
  const parts: Array<{ pts: number; razon: string }> = [];

  // Demanda
  if (reviews >= playbook.growth.alto.min_reviews) {
    parts.push({ pts: 28, razon: `Mucho movimiento (${reviews} reseñas)` });
  } else if (reviews >= playbook.growth.estable.min_reviews) {
    parts.push({ pts: 16, razon: `Movimiento estable (${reviews} reseñas)` });
  } else if (reviews > 0) {
    parts.push({ pts: 5, razon: `Pocas reseñas (${reviews})` });
  }
  if (rating >= 4.4) parts.push({ pts: 8, razon: `Clientes contentos (★${rating})` });

  // Necesidad
  if (has("sin_sitio_web")) parts.push({ pts: 14, razon: "No tiene página" });
  if (has("sitio_web_caido")) parts.push({ pts: 12, razon: "Su página no abre" });
  if (has("usa_apps_delivery") || has("depende_otas")) {
    parts.push({ pts: 10, razon: "Paga comisión a intermediarios" });
  }
  if (has("quejas_resenas")) parts.push({ pts: 8, razon: "Clientes se quejan de atención" });
  const faltas = i.signals.filter((s) => s.startsWith("falta_")).length;
  if (faltas) parts.push({ pts: Math.min(12, faltas * 4), razon: `${faltas} huecos clave para su rubro` });

  // Capacidad de pago
  const tier = pricingTierForZona(i.zona ?? "");
  if (tier === "riviera") parts.push({ pts: 10, razon: "Zona de ticket alto" });
  else if (tier === "pueblo_costa") parts.push({ pts: 6, razon: "Zona turística" });
  if (playbook.id === "hoteleria" || playbook.id === "salud") {
    parts.push({ pts: 5, razon: "Rubro con ticket alto" });
  }

  // Contactabilidad / avance
  if (i.telefono) parts.push({ pts: 10, razon: "Tiene WhatsApp/teléfono" });
  else parts.push({ pts: -20, razon: "Sin teléfono" });
  if (i.deliverables > 0) parts.push({ pts: 5, razon: "Demo lista para enviar" });
  if (i.status === "contactado") parts.push({ pts: 6, razon: "Ya en conversación" });

  // Interés demostrado (lo que más predice el cierre)
  const vistas = i.engagement?.duenoVistas ?? 0;
  if (vistas >= 3) parts.push({ pts: 20, razon: `Vio su demo ${vistas} veces` });
  else if (vistas > 0) parts.push({ pts: 12, razon: "Abrió su demo" });
  const contactos = i.engagement?.contactos ?? 0;
  if (contactos > 0) parts.push({ pts: 15, razon: `Ya le llegan clientes (${contactos})` });

  const score = Math.max(0, Math.min(100, parts.reduce((s, p) => s + p.pts, 0)));
  const razones = parts
    .filter((p) => p.pts > 0)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3)
    .map((p) => p.razon);

  return {
    score,
    nivel: score >= 65 ? "caliente" : score >= 40 ? "tibia" : "fria",
    razones,
  };
}
