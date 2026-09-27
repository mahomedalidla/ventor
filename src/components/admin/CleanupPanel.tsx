"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ORIGEN_LABELS, type LeadOrigen } from "@/lib/types/database";

type LeadRow = {
  id: string;
  nombre: string;
  zona: string | null;
  tipo_negocio: string | null;
  origen: LeadOrigen;
  created_at: string;
};

export function CleanupPanel({
  initialLeads,
  counts,
}: {
  initialLeads: LeadRow[];
  counts: {
    leads: number;
    signals: number;
    opportunities: number;
    insights: number;
  };
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterZona, setFilterZona] = useState("all");

  const zonas = useMemo(() => {
    const s = new Set(
      leads.map((l) => l.zona).filter((z): z is string => Boolean(z)),
    );
    return [...s].sort();
  }, [leads]);

  const visible = leads.filter(
    (l) => filterZona === "all" || l.zona === filterZona,
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const ids = visible.map((l) => l.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function run(
    action:
      | "delete_leads"
      | "delete_all_leads"
      | "delete_opportunities"
      | "delete_insights"
      | "wipe_prospecting",
    lead_ids?: string[],
  ) {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          lead_ids,
          confirm:
            action === "delete_leads" ? undefined : confirm.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error");
        setLoading(false);
        return;
      }
      setStatus(JSON.stringify(data));
      setConfirm("");
      setSelected(new Set());

      if (
        action === "delete_leads" ||
        action === "delete_all_leads" ||
        action === "wipe_prospecting"
      ) {
        const supabase = createClient();
        const { data: fresh } = await supabase
          .from("leads")
          .select("id, nombre, zona, tipo_negocio, origen, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        setLeads((fresh ?? []) as LeadRow[]);
      }
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted">
          Mantenimiento
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Limpiar BD</h1>
        <p className="mt-1 text-sm text-muted">
          Solo para pruebas. Borrar un lead también borra sus señales y
          oportunidades.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-lg font-bold">{counts.leads}</p>
          <p className="text-xs text-muted">leads</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-lg font-bold">{counts.opportunities}</p>
          <p className="text-xs text-muted">oportunidades</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-lg font-bold">{counts.signals}</p>
          <p className="text-xs text-muted">señales</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-lg font-bold">{counts.insights}</p>
          <p className="text-xs text-muted">aprendizajes</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-semibold">Acciones masivas</p>
        <p className="mt-1 text-xs text-muted">
          Escribe <span className="font-mono">BORRAR</span> para habilitar.
        </p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="BORRAR"
          className="mt-2 w-full rounded-md border border-border px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        />
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            disabled={loading || confirm !== "BORRAR"}
            onClick={() => run("delete_opportunities")}
            className="rounded-md border border-border px-3 py-2 text-left text-sm disabled:opacity-40"
          >
            Borrar solo oportunidades (deja leads)
          </button>
          <button
            type="button"
            disabled={loading || confirm !== "BORRAR"}
            onClick={() => run("delete_insights")}
            className="rounded-md border border-border px-3 py-2 text-left text-sm disabled:opacity-40"
          >
            Borrar aprendizajes
          </button>
          <button
            type="button"
            disabled={loading || confirm !== "BORRAR"}
            onClick={() => run("delete_all_leads")}
            className="rounded-md border border-danger/40 px-3 py-2 text-left text-sm text-danger disabled:opacity-40"
          >
            Borrar todos los leads (+ señales/oportunidades)
          </button>
          <button
            type="button"
            disabled={loading || confirm !== "BORRAR"}
            onClick={() => run("wipe_prospecting")}
            className="rounded-md bg-danger px-3 py-2 text-left text-sm font-semibold text-white disabled:opacity-40"
          >
            Wipe completo de prospección
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Leads recientes</p>
          <select
            value={filterZona}
            onChange={(e) => setFilterZona(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
          >
            <option value="all">Todas las zonas</option>
            {zonas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={toggleAllVisible}
            className="text-xs font-medium text-muted underline-offset-2 hover:underline"
          >
            Seleccionar visibles
          </button>
          <button
            type="button"
            disabled={loading || selected.size === 0}
            onClick={() => run("delete_leads", [...selected])}
            className="text-xs font-semibold text-danger underline-offset-2 hover:underline disabled:opacity-40"
          >
            Borrar {selected.size || ""} seleccionado(s)
          </button>
        </div>

        <ul className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
          {visible.map((l) => (
            <li key={l.id}>
              <label className="flex cursor-pointer gap-3 rounded-md border border-border p-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggle(l.id)}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {l.nombre}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {[l.zona, l.tipo_negocio, ORIGEN_LABELS[l.origen]]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="text-sm text-muted">No hay leads.</li>
          )}
        </ul>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="font-mono text-xs text-muted" role="status">
          {status}
        </p>
      )}

      <Link
        href="/"
        className="text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        ← Volver
      </Link>
    </div>
  );
}
