import { resolvePlaybook, type Capability } from "@/lib/categories/playbooks";
import type {
  DetectedSignal,
  PlaceSearchResult,
  WebsiteScan,
} from "@/lib/places/types";

const CAPABILITY_PATTERNS: Record<Capability, RegExp> = {
  menu: /menu|carta|menú|food.?menu|ver.?carta|nuestro.?menu/i,
  orders:
    /pedido|ordenar|ordena|order\b|compra\s*ahora|domicilio|delivery|encarg/i,
  booking:
    /reserv(a|ar|as)|booking|disponibilidad|habitaci[oó]n|check.?in|book\s*now|otar?/i,
  whatsapp: /wa\.me|api\.whatsapp|whatsapp\.com|whats?app/i,
  delivery:
    /rappi|ubereats|uber.?eats|didi.?food|didifood|cornershop|pedidosya|booking\.com|expedia|despegar|airbnb\.com/i,
  catalog:
    /cat[aá]logo|productos|servicios|precios|paquetes|planes|membres/i,
  quotes: /cotiz(a|ar|aci[oó]n)|presupuesto/i,
  appointments:
    /cita|agendar|agenda|reservar\s*cita|book\s*appointment|horario(s)?\s*de\s*atenci/i,
};

const OTA_OR_DELIVERY =
  /rappi|ubereats|uber.?eats|didi.?food|booking\.com|expedia|despegar|airbnb\.com/i;

export function emptyCapabilities(): Record<Capability, boolean> {
  return {
    menu: false,
    orders: false,
    booking: false,
    whatsapp: false,
    delivery: false,
    catalog: false,
    quotes: false,
    appointments: false,
  };
}

export function scanWebsiteHtml(
  html: string,
  baseUrl: string,
): Omit<WebsiteScan, "reachable" | "error"> {
  const capabilities = emptyCapabilities();
  const matched_links: string[] = [];

  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    const haystack = `${href} ${decodeSafe(href)} ${nearbyText(html, m.index)}`;
    for (const [cap, re] of Object.entries(CAPABILITY_PATTERNS) as Array<
      [Capability, RegExp]
    >) {
      if (re.test(haystack)) {
        capabilities[cap] = true;
        matched_links.push(absolutize(baseUrl, href));
      }
    }
  }

  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  for (const [cap, re] of Object.entries(CAPABILITY_PATTERNS) as Array<
    [Capability, RegExp]
  >) {
    if (re.test(plain)) capabilities[cap] = true;
  }

  return {
    capabilities,
    // compat con UI / señales legadas
    has_menu_link: capabilities.menu,
    has_order_link: capabilities.orders || capabilities.booking,
    has_whatsapp_link: capabilities.whatsapp,
    has_delivery_app_link: capabilities.delivery,
    matched_links: [...new Set(matched_links)].slice(0, 16),
  };
}

export async function fetchAndScanWebsite(
  websiteUri: string,
): Promise<WebsiteScan> {
  try {
    const res = await fetch(websiteUri, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; VendorBot/1.0; +local prospecting)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) {
      return {
        reachable: false,
        capabilities: emptyCapabilities(),
        has_menu_link: false,
        has_order_link: false,
        has_whatsapp_link: false,
        has_delivery_app_link: false,
        matched_links: [],
        error: `HTTP ${res.status}`,
      };
    }
    const html = await res.text();
    return {
      reachable: true,
      ...scanWebsiteHtml(html, websiteUri),
    };
  } catch (e) {
    return {
      reachable: false,
      capabilities: emptyCapabilities(),
      has_menu_link: false,
      has_order_link: false,
      has_whatsapp_link: false,
      has_delivery_app_link: false,
      matched_links: [],
      error: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

export function detectSignalsForPlace(
  place: PlaceSearchResult,
  scan: WebsiteScan | null,
  categoria: string,
): DetectedSignal[] {
  const playbook = resolvePlaybook(categoria);
  const signals: DetectedSignal[] = [];

  signals.push({
    tipo_signal: "playbook_categoria",
    detalle: `Rubro ${playbook.label}: ${playbook.pain_context} Priorizar: ${playbook.producto_prioridad.join(" · ")}.`,
  });

  if (!place.tiene_sitio_web) {
    const sitioHint =
      playbook.id === "hoteleria"
        ? "Sin web propia empujan al huésped a OTAs con comisión."
        : playbook.id === "comida"
          ? "Sin web/menú digital pierden pedidos fuera de horario de llamada."
          : "Sin presencia web reduce confianza y captura de leads.";
    signals.push({
      tipo_signal: "sin_sitio_web",
      detalle: `${place.nombre} no tiene sitio en Google. ${sitioHint}`,
    });
  } else if (scan && !scan.reachable) {
    signals.push({
      tipo_signal: "sitio_web_caido",
      detalle: `websiteUri no responde (${scan.error ?? "error"}).`,
    });
  }

  if (!place.telefono) {
    signals.push({
      tipo_signal: "sin_telefono",
      detalle: "No publica teléfono en Google.",
    });
  }

  if (place.tiene_sitio_web && scan?.reachable) {
    const caps = scan.capabilities;

    for (const need of playbook.critical_capabilities) {
      if (!caps[need]) {
        signals.push({
          tipo_signal: `falta_${need}`,
          detalle:
            playbook.missing_capability_copy[need] ??
            `Falta capacidad crítica para ${playbook.label}: ${need}.`,
        });
      }
    }

    // Combos útiles por rubro
    if (playbook.id === "comida" && caps.menu && !caps.orders && !caps.whatsapp) {
      signals.push({
        tipo_signal: "menu_sin_canal_pedido",
        detalle:
          "Tiene menú pero no canal de pedido (web ni WhatsApp) — fricción clásica de comida.",
      });
    }

    if (playbook.id === "hoteleria" && caps.delivery && OTA_OR_DELIVERY.test(
      scan.matched_links.join(" "),
    )) {
      signals.push({
        tipo_signal: "depende_otas",
        detalle:
          "El sitio empuja a Booking/Expedia/AirBNB — margen comido por comisión; vender directo.",
      });
    }

    if (playbook.id === "comida" && caps.delivery) {
      signals.push({
        tipo_signal: "usa_apps_delivery",
        detalle:
          "Usa Rappi/Uber/DiDi — ángulo: canal propio por WhatsApp sin comisión.",
      });
    }
  }

  // Reseñas: genéricas del playbook
  const hits = new Map<string, number>();
  for (const review of place.reviews) {
    if (!review.text) continue;
    for (const { re, label } of playbook.review_patterns) {
      if (re.test(review.text)) {
        hits.set(label, (hits.get(label) ?? 0) + 1);
      }
    }
  }
  if (hits.size > 0) {
    const summary = [...hits.entries()]
      .map(([label, n]) => `${label} (${n})`)
      .join(", ");
    signals.push({
      tipo_signal: "quejas_resenas",
      detalle: `Patrones (${playbook.label}): ${summary}.`,
    });
  }

  // Crecimiento con umbrales del rubro
  const count = place.user_rating_count ?? 0;
  const rating = place.rating ?? 0;
  const { alto, estable, bajo_max_reviews } = playbook.growth;

  if (count >= alto.min_reviews && rating >= alto.min_rating) {
    signals.push({
      tipo_signal: "crecimiento_alto",
      detalle: `${count} reseñas, ★${rating} — en ${playbook.label} indica demanda real; buen momento para subir precio/producto.`,
    });
  } else if (count >= estable.min_reviews && rating >= estable.min_rating) {
    signals.push({
      tipo_signal: "crecimiento_estable",
      detalle: `${count} reseñas, ★${rating} (${playbook.label}).`,
    });
  } else if (count > 0 && count < bajo_max_reviews) {
    signals.push({
      tipo_signal: "sin_crecimiento_visible",
      detalle: `Pocas reseñas (${count}) para ${playbook.label}.`,
    });
  }

  return signals;
}

function nearbyText(html: string, index: number): string {
  return html.slice(Math.max(0, index - 80), index + 120);
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function absolutize(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}
