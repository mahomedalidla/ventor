export type RejectionMotivo =
  | "caro"
  | "no_confia"
  | "no_lo_necesita"
  | "mal_timing"
  | "ya_tiene_algo"
  | "sin_presupuesto"
  | "otro";

export const REJECTION_MOTIVOS: Array<{ value: RejectionMotivo; label: string }> =
  [
    { value: "caro", label: "Muy caro" },
    { value: "no_confia", label: "No confía / escéptico" },
    { value: "no_lo_necesita", label: "Dice que no lo necesita" },
    { value: "mal_timing", label: "Mal momento" },
    { value: "ya_tiene_algo", label: "Ya tiene otra solución" },
    { value: "sin_presupuesto", label: "Sin presupuesto" },
    { value: "otro", label: "Otro" },
  ];

export type TonoSugerido =
  | "mas_agresivo"
  | "menos_agresivo"
  | "igual"
  | "mas_prueba"
  | "bajar_precio"
  | "subir_precio";

/** Heurística local + opcional LLM después */
export function lessonFromOutcome(input: {
  origen_evento: "rechazado" | "cerrado" | "sin_respuesta";
  motivo_rechazo?: RejectionMotivo | null;
  notas?: string | null;
  zona?: string | null;
  tipo_negocio?: string | null;
  precio_sugerido?: number | null;
  escenario?: string | null;
  producto_texto?: string | null;
}): { leccion: string; tono_sugerido: TonoSugerido } {
  if (input.origen_evento === "cerrado") {
    return {
      tono_sugerido:
        input.escenario === "esceptico" ? "mas_prueba" : "igual",
      leccion: `Cierre OK en ${input.zona ?? "zona"} / ${input.tipo_negocio ?? "rubro"} a ~$${input.precio_sugerido ?? "?"} (${input.producto_texto ?? "producto"}). Repetir tono ${input.escenario ?? "actual"} y anclar la demo al cliente de ese negocio.`,
    };
  }

  if (input.origen_evento === "sin_respuesta") {
    return {
      tono_sugerido: "menos_agresivo",
      leccion:
        "Sin respuesta: acortar el primer mensaje, mandar la demo en 2 líneas (cómo lo buscaría su cliente) y una sola pregunta de cierre. Reintentar a otra hora.",
    };
  }

  switch (input.motivo_rechazo) {
    case "caro":
    case "sin_presupuesto":
      return {
        tono_sugerido: "bajar_precio",
        leccion: `Rechazo por precio en ${input.zona ?? "zona"}. Próximas: anclar más bajo del rango, empujar suscripción/prueba 3 días, y mostrar ROI con un pedido/reserva de ejemplo de SU negocio — no pelear el precio primero.`,
      };
    case "no_confia":
      return {
        tono_sugerido: "menos_agresivo",
        leccion:
          "Rechazo por desconfianza: menos pitch de cierre, más demo vivida (cómo lo busca su cliente → cómo pide). Ofrecer prueba sin compromiso antes de hablar de plata.",
      };
    case "no_lo_necesita":
      return {
        tono_sugerido: "igual",
        leccion:
          "Dice que no lo necesita: el dolor no quedó claro. Abrir con la señal concreta (reseña/queja/sin menú) y enseñar la pantalla como si YA fuera su página — no el producto genérico.",
      };
    case "mal_timing":
      return {
        tono_sugerido: "menos_agresivo",
        leccion:
          "Mal timing: dejar un gancho corto (demo de 1 min) y fecha de follow-up. No insistir el mismo día.",
      };
    case "ya_tiene_algo":
      return {
        tono_sugerido: "mas_agresivo",
        leccion:
          "Ya tiene algo: comparar en 1 contraste concreto (comisión Rappi/OTA vs canal propio, o demora de su herramienta actual). Demo lado a lado, no features.",
      };
    default:
      return {
        tono_sugerido: "igual",
        leccion:
          input.notas?.trim() ||
          "Rechazo sin motivo claro: pedir 1 frase de por qué la próxima vez; mientras tanto priorizar demo personalizada sobre el guion genérico.",
      };
  }
}
