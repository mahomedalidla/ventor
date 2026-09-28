export type RenderCtx = {
  origin: string;
  slugs: Partial<Record<"landing" | "whatsapp", string>>;
  visitas: number;
  clicsWhatsapp: number;
};

/** Sustituye los tokens de los mensajes de venta por links y números reales. */
export function renderMessage(
  msg: string,
  ctx: RenderCtx,
  adjunto: "landing" | "whatsapp" | null = null,
): string {
  const main = ctx.slugs.landing || ctx.slugs.whatsapp;
  const slug = (adjunto && ctx.slugs[adjunto]) || main;
  const missing = "[genera la demo primero]";
  const url = (s: string | undefined, q: string) => (s && ctx.origin ? `${ctx.origin}/p/${s}${q}` : missing);
  return msg
    .replace(/\{link\}/g, url(slug, "?src=demo"))
    .replace(/\{link_maps\}/g, url(main, "?src=maps"))
    .replace(/\{reporte\}/g, url(main, "/reporte"))
    .replace(/\{visitas\}/g, String(ctx.visitas))
    .replace(/\{clics_whatsapp\}/g, String(ctx.clicsWhatsapp));
}
