import { after } from "next/server";
import { anonSupabase, cleanSrc, deviceOf, isBot, visitorId } from "@/lib/tracking";

const TIPOS = new Set(["whatsapp", "llamar", "mapa"]);

/** Beacon público de clics desde los entregables (sendBeacon, text/plain). */
export async function POST(request: Request) {
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) return new Response(null, { status: 204 });

  let body: { slug?: string; t?: string; src?: string | null };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 204 });
  }
  if (!body.slug || !/^[a-z0-9-]{4,80}$/.test(body.slug) || !TIPOS.has(body.t ?? "")) {
    return new Response(null, { status: 204 });
  }

  const supabase = anonSupabase();
  if (supabase) {
    const visitor = visitorId(request);
    after(async () => {
      await supabase.rpc("track_demo_event", {
        p_slug: body.slug,
        p_tipo: body.t,
        p_src: cleanSrc(body.src ?? null),
        p_referrer: null,
        p_device: deviceOf(ua),
        p_visitor: visitor,
      });
    });
  }

  return new Response(null, {
    status: 204,
    headers: { "access-control-allow-origin": "*" },
  });
}
