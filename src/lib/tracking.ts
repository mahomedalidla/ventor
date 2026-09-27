import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export function anonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const BOT_RE =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|headless|lighthouse/i;

export function isBot(ua: string | null): boolean {
  return !ua || BOT_RE.test(ua);
}

export function deviceOf(ua: string | null): string {
  if (!ua) return "otro";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "celular";
  return "escritorio";
}

/** Visitante anónimo por día (no guarda IP). */
export function visitorId(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "";
  const ua = request.headers.get("user-agent") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${ua}|${day}`).digest("hex").slice(0, 32);
}

export function cleanSrc(src: string | null): string | null {
  if (!src) return null;
  const s = src.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return s || null;
}

export function srcFromReferrer(ref: string | null): string | null {
  if (!ref) return null;
  if (/google\.[a-z.]+\/maps|maps\.google|maps\.app\.goo\.gl/i.test(ref)) return "maps";
  if (/google\./i.test(ref)) return "google";
  if (/instagram/i.test(ref)) return "ig";
  if (/facebook|fb\.com|m\.me/i.test(ref)) return "fb";
  if (/wa\.me|whatsapp/i.test(ref)) return "wa";
  return null;
}
