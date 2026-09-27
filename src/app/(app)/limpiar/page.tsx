import { CleanupPanel } from "@/components/admin/CleanupPanel";
import { createClient } from "@/lib/supabase/server";
import type { LeadOrigen } from "@/lib/types/database";

export default async function LimpiarPage() {
  const supabase = await createClient();

  const [
    { data: leads },
    { count: leadsCount },
    { count: signalsCount },
    { count: opsCount },
    insightsRes,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id, nombre, zona, tipo_negocio, origen, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("signals").select("*", { count: "exact", head: true }),
    supabase.from("opportunities").select("*", { count: "exact", head: true }),
    supabase.from("sales_insights").select("*", { count: "exact", head: true }),
  ]);

  return (
    <CleanupPanel
      initialLeads={(leads ?? []).map((l) => ({
        ...l,
        origen: l.origen as LeadOrigen,
      }))}
      counts={{
        leads: leadsCount ?? 0,
        signals: signalsCount ?? 0,
        opportunities: opsCount ?? 0,
        insights: insightsRes.count ?? 0,
      }}
    />
  );
}
