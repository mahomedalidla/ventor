import { geminiGenerate } from "@/lib/gemini";

export type QaIssue = { code: string; detalle: string; critico: boolean };

export type InspectOpts = {
  /** URLs de fotos permitidas (bucket / Unsplash ya persistidas). No marcan "falso". */
  allowedImageHosts?: string[];
};

/** Revisión determinista: campos rotos, placeholders, HTML truncado, mobile. */
export function inspectHtml(html: string, opts: InspectOpts = {}): QaIssue[] {
  const issues: QaIssue[] = [];
  const low = html.toLowerCase();
  if (!/<!doctype html/i.test(html) || !low.includes("</html>")) {
    issues.push({ code: "truncado", detalle: "HTML incompleto (sin doctype o </html>)", critico: true });
  }
  if (html.length < 2500) {
    issues.push({ code: "corto", detalle: "HTML demasiado corto, parece recortado", critico: true });
  }

  if (/lorem ipsum|negocio demo|cliente ejemplo|placeholder\.com|via\.placeholder/i.test(html)) {
    issues.push({
      code: "falso",
      detalle: "Hay lorem, “negocio demo” o placeholders genéricos",
      critico: true,
    });
  }
  // Unsplash directo del CDN = el modelo inventó URLs. Las fotos de stock van al bucket.
  if (
    /images\.unsplash\.com|source\.unsplash\.com/i.test(html) &&
    !/supabase\.co\/storage|\/demo-assets\//i.test(html)
  ) {
    issues.push({
      code: "falso",
      detalle: "Hay URLs de Unsplash no persistidas (el modelo no debe inventarlas)",
      critico: true,
    });
  }

  const inputs = html.match(/<input\b[^>]*>/gi) ?? [];
  for (const tag of inputs) {
    if (/type=["']hidden["']/i.test(tag)) continue;
    if (/type=["'](?:submit|button|image)["']/i.test(tag)) continue;
    const id = tag.match(/\bid=["']([^"']+)/i)?.[1];
    const aria = /aria-label=/i.test(tag);
    const hasLabel = id ? new RegExp(`<label[^>]+for=["']${id}["']`, "i").test(html) : false;
    if (!aria && !hasLabel && !/placeholder=/i.test(tag)) {
      issues.push({ code: "input", detalle: "Hay un input sin etiqueta ni placeholder", critico: true });
    }
    // Zoom iOS: inputs con font-size < 16px
    if (!/font-size\s*:\s*(1[6-9]|[2-9]\d)/i.test(tag) && !/font-size\s*:\s*1[6-9]px/i.test(html.slice(0, 8000))) {
      // solo avisar una vez
      if (!issues.some((i) => i.code === "ios_zoom")) {
        issues.push({
          code: "ios_zoom",
          detalle: "Inputs en mobile: asegúrate font-size ≥16px en CSS para evitar zoom iOS",
          critico: false,
        });
      }
    }
  }
  if ((html.match(/href=["']#["']/gi) ?? []).length > 2) {
    issues.push({ code: "href", detalle: "Enlaces vacíos href='#' (malos en mobile)", critico: false });
  }
  if (/#7c3aed|#8b5cf6|#a855f7|purple-600/i.test(html) && !/--a:#7c/i.test(html)) {
    issues.push({ code: "purpura", detalle: "Paleta púrpura genérica de plantilla", critico: false });
  }
  if ((html.match(/<img\b/gi) ?? []).length > 0 && (html.match(/<img\b[^>]*src=["']["']/gi) ?? []).length) {
    issues.push({ code: "img_vacia", detalle: "Hay <img> sin src", critico: true });
  }
  const opens = (html.match(/<div\b/gi) ?? []).length;
  const closes = (html.match(/<\/div>/gi) ?? []).length;
  if (Math.abs(opens - closes) > 3) {
    issues.push({ code: "divs", detalle: `divs desbalanceados (${opens} vs ${closes})`, critico: false });
  }

  // --- Mobile ---
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    issues.push({
      code: "viewport",
      detalle: "Falta <meta name=\"viewport\"> — la página se verá mal en celular",
      critico: true,
    });
  }
  if (/overflow-x\s*:\s*scroll|width\s*:\s*\d{4,}px|min-width\s*:\s*[8-9]\d{2,}px/i.test(html)) {
    issues.push({
      code: "overflow_x",
      detalle: "Posible scroll horizontal en mobile (width fijo grande o overflow-x)",
      critico: false,
    });
  }
  if (/class=["'][^"']*\bfab\b/i.test(html) && /padding-bottom\s*:\s*[0-4]\dpx/i.test(html) === false) {
    // FAB suele tapar CTAs; aviso suave
    if (!/padding-bottom\s*:\s*(8|9|[1-9]\d)\d?px|margin-bottom\s*:\s*100px|pb-24|safe-area/i.test(html)) {
      issues.push({
        code: "fab_cta",
        detalle: "Hay FAB de WhatsApp: deja espacio inferior para que no tape el CTA final",
        critico: false,
      });
    }
  }
  if (!/@media\s*\(/i.test(html) && html.length > 4000) {
    issues.push({
      code: "media_queries",
      detalle: "Casi no hay @media — revisa que el layout funcione en 390px",
      critico: false,
    });
  }

  return issues;
}

const QA_SYSTEM = `Eres QA de frontend mobile-first. Te pasan un HTML de landing de un negocio local y una lista de errores.
Devuelve el HTML COMPLETO corregido (empieza con <!doctype html>).
- Arregla SOLO los errores listados. No rediseñes.
- No inventes URLs de imágenes. Si un src está vacío, quita el img o deja el placeholder .shot-ph.
- Inputs: etiqueta <label> o aria-label. font-size ≥16px en inputs (anti-zoom iOS).
- Meta viewport obligatorio. Evita scroll horizontal. Deja padding-bottom si hay FAB.
- Quita lorem ipsum y “negocio demo”. No agregues unsplash.com inventado.
- Conserva data-slot, scripts, CSS, WhatsApp y fotos reales (incl. las del storage).
Sin markdown.`;

export async function qaFixHtml(html: string, issues: QaIssue[]): Promise<string> {
  const raw = await geminiGenerate({
    system: QA_SYSTEM,
    user: JSON.stringify({ errores: issues, html }, null, 2),
    temperature: 0.1,
    maxOutputTokens: 60000,
  });
  let s = raw.trim().replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "");
  const start = s.search(/<!doctype html|<html/i);
  if (start < 0) throw new Error("QA no devolvió HTML");
  s = s.slice(start);
  const end = s.toLowerCase().lastIndexOf("</html>");
  if (end < 0) throw new Error("QA HTML truncado");
  return s.slice(0, end + "</html>".length);
}
