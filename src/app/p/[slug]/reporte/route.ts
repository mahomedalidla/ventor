import { fetchDemoStats } from "@/lib/stats";
import { esc } from "@/lib/demo/templates";
import { anonSupabase } from "@/lib/tracking";

/** Reporte público para el dueño: cuánta gente llegó y por dónde. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = anonSupabase();
  if (!supabase || !/^[a-z0-9-]{4,80}$/.test(slug)) return new Response("No encontrado", { status: 404 });

  const s = await fetchDemoStats(supabase, slug);
  if (!s) return new Response("No encontrado", { status: 404 });

  const max = Math.max(1, ...s.porDia.map((d) => d.visitas));
  const acciones = s.whatsapp + s.llamar + s.mapa;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Resultados · ${esc(s.nombre)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,system-ui,sans-serif;background:#f6f4ef;color:#15130f;padding:24px 16px 48px}
.w{max-width:560px;margin:0 auto}h1{font-size:26px;letter-spacing:-.02em}.sub{color:#6b645a;margin-top:6px;font-size:14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}.k{background:#fff;border-radius:18px;padding:18px;box-shadow:0 10px 30px -24px #000}
.k b{display:block;font-size:34px;font-weight:800;color:#0b6e4f}.k span{font-size:13px;color:#6b645a}
h2{font-size:15px;margin:28px 0 10px}.row{display:flex;justify-content:space-between;background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:6px;font-size:14px}
.bars{display:flex;align-items:flex-end;gap:4px;height:120px;background:#fff;border-radius:16px;padding:14px}.bars div{flex:1;background:#0b6e4f;border-radius:4px 4px 0 0;min-height:2px}
.note{margin-top:24px;font-size:12px;color:#6b645a;line-height:1.5}
</style></head><body><div class="w">
<h1>${esc(s.nombre)}</h1><p class="sub">Así le está funcionando su página</p>
<div class="grid">
<div class="k"><b>${s.visitas}</b><span>visitas de clientes</span></div>
<div class="k"><b>${acciones}</b><span>quisieron contactarlo</span></div>
<div class="k"><b>${s.whatsapp}</b><span>tocaron WhatsApp</span></div>
<div class="k"><b>${s.mapa + s.llamar}</b><span>llamar / cómo llegar</span></div>
</div>
${s.porDia.length ? `<h2>Visitas por día</h2><div class="bars">${s.porDia.map((d) => `<div title="${esc(d.dia)}: ${d.visitas}" style="height:${Math.round((d.visitas / max) * 100)}%"></div>`).join("")}</div>` : ""}
${s.porCanal.length ? `<h2>Por dónde llegaron</h2>${s.porCanal.map((c) => `<div class="row"><span>${esc(c.label)}</span><span><b>${c.visitas}</b> visitas · ${c.acciones} contactos</span></div>`).join("")}` : ""}
<p class="note">Solo cuenta personas reales (no robots ni sus propias visitas de prueba). Los mensajes que le llegan desde la página empiezan con “Vi su página”.</p>
</div></body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "no-store",
    },
  });
}
