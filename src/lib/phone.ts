/** Normaliza un teléfono MX a formato wa.me (52 + 10 dígitos). */
export function toWaNumber(telefono: string | null | undefined): string | null {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  if (digits.length === 13 && digits.startsWith("521")) return `52${digits.slice(3)}`;
  return null;
}

export function waLink(telefono: string | null | undefined, text: string): string {
  const n = toWaNumber(telefono);
  const q = `text=${encodeURIComponent(text)}`;
  return n ? `https://wa.me/${n}?${q}` : `https://wa.me/?${q}`;
}
