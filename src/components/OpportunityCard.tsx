import Link from "next/link";
import { ScoreBadge } from "@/components/sales/ScoreBadge";
import type { NextAction } from "@/lib/sales/next-action";
import type { Offer } from "@/lib/sales/offer";
import type { OpportunityScore } from "@/lib/sales/score";
import { ETAPA_LABEL, type SalesPlan } from "@/lib/sales/types";
import {
  ORIGEN_LABELS,
  type LeadOrigen,
  type OpportunityWithLead,
} from "@/lib/types/database";

function whenLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round(
    (new Date(d.toDateString()).getTime() - new Date(today.toDateString()).getTime()) / 864e5,
  );
  if (diff < 0) return `atrasado ${-diff}d`;
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function OpportunityCard({
  opportunity,
  score,
  action,
}: {
  opportunity: OpportunityWithLead;
  score?: OpportunityScore;
  action?: NextAction;
}) {
  const hot = action?.grupo === "ahora";
  const lead = opportunity.leads;
  const producto = opportunity.producto_sugerido_texto ?? "Producto por definir";
  const offer = opportunity.oferta as Offer | null;
  const plan = opportunity.plan_venta as SalesPlan | null;
  const paso = plan?.pasos?.[Math.min(opportunity.paso_actual ?? 0, (plan?.pasos.length ?? 1) - 1)];
  const cuando = whenLabel(opportunity.proximo_contacto_at);

  return (
    <Link
      href={`/oportunidad/${opportunity.id}`}
      className={`block rounded-lg border bg-surface p-4 transition hover:border-accent ${
        hot ? "border-2 border-warning" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold leading-tight">
            {lead?.nombre ?? "Lead"}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {[lead?.zona, lead?.tipo_negocio].filter(Boolean).join(" · ") || "Sin zona"}
            {lead?.origen ? ` · ${ORIGEN_LABELS[lead.origen as LeadOrigen]}` : ""}
          </p>
        </div>
        {score && <ScoreBadge score={score.score} nivel={score.nivel} />}
      </div>

      {action && action.accion !== "esperar" && (
        <div className={`mt-3 rounded-md px-3 py-2 ${hot ? "bg-warning/10" : "bg-background"}`}>
          <p className={`text-sm font-bold ${hot ? "text-warning" : ""}`}>→ {action.titulo}</p>
          <p className="text-xs text-muted">{action.porque}</p>
        </div>
      )}

      <p className="mt-3 text-sm font-semibold text-accent">{producto}</p>
      {score?.razones.length ? (
        <p className="mt-1 text-xs text-muted">{score.razones.join(" · ")}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {offer && (
          <span className="rounded border border-border px-2 py-0.5 font-medium">
            {offer.resumen}
          </span>
        )}
        {paso && (
          <span className="rounded bg-background px-2 py-0.5 font-medium">
            → {ETAPA_LABEL[paso.etapa]}
            {cuando ? ` · ${cuando}` : ""}
          </span>
        )}
        {opportunity.prueba_fin && (
          <span className="rounded bg-accent/10 px-2 py-0.5 font-semibold text-accent">
            En prueba
          </span>
        )}
      </div>
    </Link>
  );
}
