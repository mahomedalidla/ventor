/**
 * Extrae slug / URL canónica de un perfil Doctoralia (MX u otros ccTLDs).
 * Sin scraping del directorio — solo pegar URL.
 */
export type ParsedDoctoralia = {
  slug: string;
  perfil_url: string;
  /** Si viene en el path, p.ej. oftalmologo */
  especialidad_hint: string | null;
};

export function parseDoctoraliaUrl(raw: string): ParsedDoctoralia | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!host.includes("doctoralia.")) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  // doctoralia.com.mx/medico/nombre-slug  |  /clinica/...  |  /nombre/...
  const skip = new Set(["buscar", "search", "login", "registro", "premium"]);
  let slug: string | null = null;
  let especialidad_hint: string | null = null;

  if (parts[0] === "medico" || parts[0] === "doctor" || parts[0] === "clinica") {
    slug = parts[1] ?? null;
    if (parts[2] && !/^\d+$/.test(parts[2])) especialidad_hint = parts[2].replace(/-/g, " ");
  } else if (parts.length >= 1 && !skip.has(parts[0])) {
    // a veces /nombre-del-medico
    slug = parts[parts.length - 1];
    if (parts.length >= 2) especialidad_hint = parts[0].replace(/-/g, " ");
  }

  if (!slug || slug.length < 2) return null;
  slug = decodeURIComponent(slug).replace(/\/$/, "");

  return {
    slug,
    perfil_url: `https://${host}/${parts[0] === "medico" || parts[0] === "doctor" || parts[0] === "clinica" ? parts[0] : "medico"}/${slug}`,
    especialidad_hint,
  };
}

export function nombreFromDoctoraliaSlug(slug: string): string {
  return slug
    .replace(/-\d+$/, "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
