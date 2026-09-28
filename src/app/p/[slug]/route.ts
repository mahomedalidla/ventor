import { after } from "next/server";
import { injectCatalogIntoHtml, type CatalogItem } from "@/lib/demo/catalog";
import {
  anonSupabase,
  cleanSrc,
  deviceOf,
  isBot,
  srcFromReferrer,
  visitorId,
} from "@/lib/tracking";

/**
 * Entregable público (landing / demo WhatsApp) para mandar al cliente.
 * El HTML generado se sirve con CSP sandbox: corre en origen opaco y no puede
 * leer cookies ni llamar a la app aunque el modelo meta scripts.
 * ?preview=1 no cuenta visita (vista previa del panel / descarga).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{4,80}$/.test(slug)) {
    return notFound();
  }

  const supabase = anonSupabase();
  if (!supabase) return notFound();

  const { data, error } = await supabase.rpc("get_public_demo", { p_slug: slug });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row?.demo_html) return notFound();

  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "1";
  const download = url.searchParams.get("dl") === "1";
  const ua = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");
  const src = cleanSrc(url.searchParams.get("src")) ?? srcFromReferrer(referrer);

  const internal = /(?:^|;\s*)sb-[^=]+-auth-token/.test(request.headers.get("cookie") ?? "");

  if (!preview && !download && !internal && !isBot(ua)) {
    const visitor = visitorId(request);
    after(async () => {
      await supabase.rpc("track_demo_event", {
        p_slug: slug,
        p_tipo: "view",
        p_src: src,
        p_referrer: referrer,
        p_device: deviceOf(ua),
        p_visitor: visitor,
      });
    });
  }

  let html = row.demo_html as string;
  const assets = row.assets as { catalog_items?: CatalogItem[] } | null;
  if (Array.isArray(assets?.catalog_items) && assets.catalog_items.length) {
    html = injectCatalogIntoHtml(html, assets.catalog_items);
  }

  const body = preview || (internal && !download)
    ? html
    : injectTracker(html, `${url.origin}/api/t`, slug, download ? "dominio" : src);

  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy":
        "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store",
    },
  });
}

function injectTracker(html: string, endpoint: string, slug: string, src: string | null) {
  const cfg = JSON.stringify({ u: endpoint, s: slug, c: src }).replace(/</g, "\\u003c");
  const script = `<script>(function(){var c=${cfg};function send(t){try{navigator.sendBeacon(c.u,JSON.stringify({slug:c.s,t:t,src:c.c}))}catch(e){}}document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a"):null;if(!a)return;var h=a.getAttribute("href")||"";if(/wa\\.me|whatsapp/i.test(h))send("whatsapp");else if(/^tel:/i.test(h))send("llamar");else if(/google\\.[a-z.]+\\/maps|maps\\.app|goo\\.gl\\/maps|maps\\.google/i.test(h))send("mapa")},true)})();</script>`;
  const i = html.toLowerCase().lastIndexOf("</body>");
  return i >= 0 ? html.slice(0, i) + script + html.slice(i) : html + script;
}

function notFound() {
  return new Response(
    "<!doctype html><meta charset=utf-8><title>No disponible</title><body style=\"font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0\"><p>Esta propuesta ya no está disponible.</p>",
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
