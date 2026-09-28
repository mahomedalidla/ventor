/** Correos que pueden entrar. Vacío = aún no configurado (no te deja fuera). */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const list = allowedEmails();
  if (!list.length) return true;
  return Boolean(email && list.includes(email.trim().toLowerCase()));
}
