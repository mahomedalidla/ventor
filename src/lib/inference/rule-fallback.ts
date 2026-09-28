import { conversionProfile } from "@/lib/categories/conversion";
import { resolvePlaybook } from "@/lib/categories/playbooks";
import type {
  InferInsightRow,
  InferLeadRow,
  InferPricingRow,
  InferProductRow,
  InferSignalRow,
  InferredOpportunity,
} from "@/lib/inference/prompt";

/**
 * Fallback si no hay LLM: genera 1 oportunidad + demo básica coherente con el playbook.
 */
export function ruleBasedInfer(input: {
  lead: InferLeadRow;
  signals: InferSignalRow[];
  products: InferProductRow[];
  pricing: InferPricingRow[];
  insights?: InferInsightRow[];
}): InferredOpportunity[] {
  const playbook = resolvePlaybook(input.lead.tipo_negocio ?? "general");
  const friction = input.signals.filter(
    (s) => s.tipo_signal !== "playbook_categoria",
  );
  const primary =
    friction.find((s) =>
      [
        "sin_sitio_web",
        "falta_booking",
        "falta_orders",
        "falta_whatsapp",
        "falta_appointments",
        "usa_apps_delivery",
        "depende_otas",
        "quejas_resenas",
      ].includes(s.tipo_signal),
    ) ?? friction[0];

  const growthAlto = friction.some((s) => s.tipo_signal === "crecimiento_alto");
  const esceptico = friction.some((s) =>
    ["quejas_resenas", "sitio_web_caido", "sin_crecimiento_visible"].includes(
      s.tipo_signal,
    ),
  );

  const lessons = input.insights ?? [];
  const pushPriceDown = lessons.some(
    (l) =>
      l.tono_sugerido === "bajar_precio" ||
      /caro|precio/i.test(l.motivo_rechazo ?? "") ||
      /caro|precio/i.test(l.leccion),
  );
  const softer = lessons.some(
    (l) =>
      l.tono_sugerido === "menos_agresivo" ||
      l.tono_sugerido === "mas_prueba",
  );

  const pricing =
    input.pricing.find(
      (p) =>
        p.producto_categoria === playbook.pricing_categoria &&
        zonaMatch(p.zona, input.lead.zona),
    ) ??
    input.pricing.find(
      (p) => p.producto_categoria === playbook.pricing_categoria,
    ) ??
    input.pricing[0];

  const min = Number(pricing?.precio_min ?? 2500);
  const max = Number(pricing?.precio_max ?? 5000);
  const mid = Math.round((min + max) / 2);
  let precio = growthAlto ? max : esceptico || softer ? min : mid;
  if (pushPriceDown) precio = Math.max(min, Math.round(precio * 0.85));

  const modelo =
    esceptico || softer || pricing?.modelo_precio_default === "suscripcion"
      ? "suscripcion"
      : ((pricing?.modelo_precio_default as "pago_unico" | "suscripcion") ??
        "suscripcion");

  const productoNombre = playbook.producto_prioridad[0];
  const matched = input.products.find((p) =>
    normalize(p.nombre).includes(normalize(productoNombre).slice(0, 18)),
  );

  const nombre = input.lead.nombre;
  const zona = input.lead.zona ?? "la zona";
  const conv = conversionProfile(playbook.id, input.lead.tipo_negocio);
  const razon = `${primary ? `${primary.detalle} ` : ""}En ${playbook.label} el objetivo es: ${conv.objetivo.toLowerCase()}. Su cliente necesita resolver “${conv.friccion[0]?.duda ?? ""}” antes de actuar; ${playbook.pain_context}`;

  const guion =
    playbook.id === "hoteleria"
      ? `Hola, vi ${nombre} en Google. Noté que les llega mucha gente por reseñas pero el canal directo aún se puede fortalecer. ¿Le muestro en 5 min cómo tomaría una reserva su huésped, tal como la buscaría hoy? ¿Hoy en la tarde o mañana en la mañana?`
      : playbook.id === "comida"
        ? `Hola, vi ${nombre}. En hora pico se pierden pedidos si solo es por llamada. Le puedo mostrar cómo se vería su menú y el pedido por WhatsApp —como lo buscaría un cliente en ${zona}. ¿Demo de 3 días o llamada de 5 minutos?`
        : `Hola, vi ${nombre}. Podemos ordenar su atención por WhatsApp. ¿Le muestro cómo lo buscaría y contactaría un cliente hoy — en 5 minutos?`;

  const demo = buildDemoForPlaybook(playbook.id, nombre, zona);

  return [
    {
      signal_id: primary?.id ?? null,
      product_id: matched?.id ?? null,
      producto_sugerido_texto: matched ? null : productoNombre,
      razon,
      canal_sugerido: input.lead.telefono ? "whatsapp" : "en_persona",
      guion,
      evitar:
        softer || playbook.id === "hoteleria"
          ? "No empujar cierre el día 1; primero enseñar la demo como la viviría su cliente."
          : "No empezar con jerga técnica ni 'transformación digital'.",
      precio_sugerido: precio,
      modelo_precio_sugerido: modelo,
      escenario: esceptico || softer ? "esceptico" : growthAlto ? "facil" : "esceptico",
      ...demo,
    },
  ];
}

function buildDemoForPlaybook(
  playbookId: string,
  nombre: string,
  zona: string,
): Pick<
  InferredOpportunity,
  | "demo_cliente_busca"
  | "demo_experiencia"
  | "demo_gustos_deducidos"
  | "demo_pitch"
> {
  if (playbookId === "hoteleria") {
    return {
      demo_gustos_deducidos:
        "Huésped que compara en Google/Booking: limpio, respuesta rápida, fotos claras, reserva sin fricción.",
      demo_cliente_busca: `Busca "${nombre} ${zona}" o "hotel cerca de ${zona}" en Google; abre fotos, precio y WhatsApp/reservar.`,
      demo_experiencia: `Entra a una página simple de ${nombre}: galería, disponibilidad de fin de semana, botón "Reservar por WhatsApp" que ya lleva fechas y tipo de habitación. Recibe confirmación al instante sin pasar por Booking.`,
      demo_pitch: `Mire: así busca su huésped hoy. Entra a ${nombre}, ve las fotos, elige fechas y en un toque le escribe por WhatsApp con la reserva lista. Eso es lo que le muestro en la demo — directo, sin comisión de OTA.`,
    };
  }
  if (playbookId === "comida") {
    return {
      demo_gustos_deducidos:
        "Cliente local/turista: quiere menú visible, precio claro y pedir rápido por WhatsApp sin app rara.",
      demo_cliente_busca: `Busca "${nombre} ${zona}" o "mariscos cerca de mí"; espera menú, fotos y un link de pedido/WhatsApp.`,
      demo_experiencia: `Abre el menú digital de ${nombre}: categorías, platillos de ${zona}, totales claros. Toca "Pedir por WhatsApp" y el mensaje ya va armado con lo que eligió. Ustedes solo confirman.`,
      demo_pitch: `Así lo buscaría su cliente: Google → ${nombre} → menú → pedido en WhatsApp ya escrito. En la demo se lo enseño con sus platillos, no con un ejemplo genérico.`,
    };
  }
  return {
    demo_gustos_deducidos:
      "Cliente local que quiere respuesta rápida y claridad de precio/servicio.",
    demo_cliente_busca: `Busca "${nombre} ${zona}" en Google o Instagram y espera un WhatsApp claro para cotizar o agendar.`,
    demo_experiencia: `Página o flujo corto de ${nombre}: servicios, precio orientativo y botón de WhatsApp con el mensaje prearmado (cita o cotización).`,
    demo_pitch: `Así lo contactaría un cliente hoy: encuentra ${nombre}, ve qué ofrecen y les escribe ya con lo que necesita. Eso es la demo que le muestro.`,
  };
}

function zonaMatch(pricingZona: string, leadZona: string | null): boolean {
  if (!leadZona) return false;
  const a = normalize(pricingZona);
  const b = normalize(leadZona);
  return b.includes(a) || a.includes(b);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}
