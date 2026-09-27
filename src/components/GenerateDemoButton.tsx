"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateDemoButton({
  opportunityId,
  hasDemo,
}: {
  opportunityId: string;
  hasDemo: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo generar");
        setLoading(false);
        return;
      }
      setLoading(false);
      router.refresh();
    } catch {
      setError("Error de red");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="rounded-md border border-accent px-3 py-2 text-sm font-semibold text-accent disabled:opacity-60"
      >
        {loading
          ? "Creando propuesta genuina…"
          : hasDemo
            ? "Regenerar propuesta visual"
            : "Crear propuesta visual genuina"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
