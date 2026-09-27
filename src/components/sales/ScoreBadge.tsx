const STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  caliente: { bg: "#fde8e1", fg: "#b42318", label: "Caliente" },
  tibia: { bg: "#fef4e0", fg: "#9a6700", label: "Tibia" },
  fria: { bg: "#eef0f3", fg: "#5b6472", label: "Fría" },
};

export function ScoreBadge({
  score,
  nivel,
}: {
  score: number;
  nivel: "caliente" | "tibia" | "fria";
}) {
  const s = STYLE[nivel];
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ background: s.bg, color: s.fg }}
      title="Interés: demanda × necesidad × capacidad de pago × contacto"
    >
      {s.label} · {score}
    </span>
  );
}
