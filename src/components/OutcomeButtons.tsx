"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  REJECTION_MOTIVOS,
  type RejectionMotivo,
} from "@/lib/learning/lessons";
import type { OpportunityStatus } from "@/lib/types/database";

const ACTIONS: Array<{ status: OpportunityStatus; label: string }> = [
  { status: "contactado", label: "Contactado" },
  { status: "cerrado", label: "Cerrado" },
  { status: "rechazado", label: "Rechazado" },
  { status: "sin_respuesta", label: "Sin respuesta" },
];

export function OutcomeButtons({
  opportunityId,
  currentStatus,
}: {
  opportunityId: string;
  currentStatus: OpportunityStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingReject, setPendingReject] = useState(false);
  const [motivo, setMotivo] = useState<RejectionMotivo>("caro");
  const [notas, setNotas] = useState("");
  const [lesson, setLesson] = useState<string | null>(null);

  async function submit(status: OpportunityStatus, extra?: {
    motivo_rechazo?: RejectionMotivo;
    notas?: string;
  }) {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch("/api/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          status,
          motivo_rechazo: extra?.motivo_rechazo,
          notas: extra?.notas,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar");
        setLoading(null);
        return;
      }
      if (data.leccion) setLesson(data.leccion);
      setPendingReject(false);
      setLoading(null);
      router.refresh();
    } catch {
      setError("Error de red");
      setLoading(null);
    }
  }

  function onAction(status: OpportunityStatus) {
    if (status === "rechazado") {
      setPendingReject(true);
      return;
    }
    void submit(status);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.status}
            type="button"
            disabled={loading !== null || currentStatus === a.status}
            onClick={() => onAction(a.status)}
            className={
              currentStatus === a.status
                ? "rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg"
                : "rounded-md border border-border px-3 py-2.5 text-sm font-medium disabled:opacity-50"
            }
          >
            {loading === a.status ? "…" : a.label}
          </button>
        ))}
      </div>

      {pendingReject && (
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-sm font-semibold">¿Por qué rechazó?</p>
          <p className="mt-0.5 text-xs text-muted">
            Esto alimenta cómo vender mejor la próxima vez.
          </p>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as RejectionMotivo)}
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          >
            {REJECTION_MOTIVOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <textarea
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Nota opcional (qué dijo exactamente)"
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                submit("rechazado", { motivo_rechazo: motivo, notas })
              }
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-fg"
            >
              Guardar rechazo
            </button>
            <button
              type="button"
              onClick={() => setPendingReject(false)}
              className="rounded-md border border-border px-3 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {lesson && (
        <p className="rounded-md border border-accent/30 bg-surface px-3 py-2 text-sm">
          <span className="font-semibold text-accent">Aprendizaje: </span>
          {lesson}
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
