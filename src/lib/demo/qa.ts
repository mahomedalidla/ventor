import { geminiGenerate } from "@/lib/gemini";

export type QaIssue = { code: string; detalle: string; critico: boolean };

/** Revisión determinista: campos rotos, placeholders, HTML truncado. */
export function inspectHtml(html: string): QaIssue[] {
  const issues: QaIssue[] = [];
  const low = html.toLowerCase();
  if (!/<!doctype html/i.test(html) || !low.includes("</html>")) {
    issues.push({ code: "truncado", detalle: "HTML incompleto (sin doctype o </html>)", critico: true });
  }
  if (html.length < 2500) {
    issues.push({ code: "corto", detalle: "HTML demasiado corto, parece recortado", critico: true });
  }
  if (/lorem ipsum|negocio demo|cliente ejemplo|unsplash\.com|placeholder\.com|via\.placeholder/i.test(html)) {
    issues.push({ code: "falso", detalle: "Hay lorem, “negocio demo” o fotos de stock/placeholder", critico: true });
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
  }
  if ((html.match(/href=["']#["']/gi) ?? []).length > 2) {
    issues.push({ code: "href", detalle: "Enlaces vacíos href='#'", critico: false });
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
  return issues;
}

const QA_SYSTEM = `Eres QA de frontend. Te pasan un HTML de landing de un negocio local y una lista de errores.
Devuelve el HTML COMPLETO corregido (empieza con <!doctype html>).
- Arregla SOLO los errores listados. No rediseñes.
- No inventes URLs de imágenes. Si un src está vacío, quita el img o deja el placeholder .shot-ph.
- Inputs: etiqueta <label> o aria-label. Nada de campos sueltos.
- Quita lorem ipsum, unsplash, “negocio demo”.
- Conserva data-slot, scripts, CSS, WhatsApp y fotos reales.
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
