import { LeadSearchForm } from "@/components/leads/LeadSearchForm";

export default function NuevoLeadPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Nuevo lead</h1>
        <p className="mt-1 text-sm text-muted">
          Places prospecta solo (guarda + señales). También puedes pegar un
          perfil o capturar a mano.
        </p>
      </div>
      <LeadSearchForm />
    </div>
  );
}
