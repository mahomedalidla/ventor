import type { DemoAssets } from "@/lib/demo/assets";
import { vocabFor } from "@/lib/categories/vocab";
import { layoutFor, type LayoutId } from "@/lib/categories/goals";
import type { Secciones } from "@/lib/sales/alcance";

export type Benefit = { titulo: string; texto: string };
export type FaqItem = { duda: string; respuesta: string };

export type DeliverableData = {
  nombre: string;
  zona: string;
  rubro: string;
  playbook_id: string;
  producto: string;
  tagline: string;
  beneficios: Benefit[];
  faq: FaqItem[];
  offer_label: string;
  items: Array<{ name: string; price_hint: string; note?: string | null; photo_url?: string | null; slot_id?: string }>;
  accent: string;
  accent2: string;
  accent3: string;
  wa_url: string;
  cta_label: string;
  assets: DemoAssets;
  secciones: Secciones;
  con_bot: boolean;
  estrella: { titulo: string; texto: string } | null;
};

export function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function initials(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || nombre.slice(0, 2).toUpperCase();
}

type Skin = {
  fonts: string;
  display: string;
  body: string;
  paper: string;
  ink: string;
  muted: string;
  radius: string;
  heroAlign: "end" | "center";
  items: "list" | "cards";
};

const SKIN: Record<string, Skin> = {
  comida: { fonts: "Playfair+Display:wght@700;800&family=Source+Sans+3:wght@400;600;700", display: "Playfair Display,Georgia,serif", body: "Source Sans 3,system-ui,sans-serif", paper: "#fff8ef", ink: "#1a120c", muted: "#7a6554", radius: "22px", heroAlign: "end", items: "list" },
  hoteleria: { fonts: "Cormorant+Garamond:wght@600;700&family=Nunito+Sans:wght@400;600;700", display: "Cormorant Garamond,Georgia,serif", body: "Nunito Sans,system-ui,sans-serif", paper: "#f6f1e8", ink: "#1c1610", muted: "#6e6256", radius: "8px", heroAlign: "center", items: "cards" },
  salud: { fonts: "DM+Serif+Display&family=DM+Sans:wght@400;600;700", display: "DM Serif Display,Georgia,serif", body: "DM Sans,system-ui,sans-serif", paper: "#f3f7f6", ink: "#12201a", muted: "#5b6b64", radius: "16px", heroAlign: "center", items: "cards" },
  belleza: { fonts: "Italiana&family=Karla:wght@400;600;700", display: "Italiana,Georgia,serif", body: "Karla,system-ui,sans-serif", paper: "#fbf6f3", ink: "#2a1814", muted: "#7a6158", radius: "28px", heroAlign: "end", items: "cards" },
  automotriz: { fonts: "Oswald:wght@500;600&family=Barlow:wght@400;600;700", display: "Oswald,system-ui,sans-serif", body: "Barlow,system-ui,sans-serif", paper: "#f2f3f5", ink: "#111318", muted: "#5c6270", radius: "6px", heroAlign: "end", items: "list" },
  fitness: { fonts: "Bebas+Neue&family=Manrope:wght@400;600;700", display: "Bebas Neue,Impact,sans-serif", body: "Manrope,system-ui,sans-serif", paper: "#111214", ink: "#f4f4f2", muted: "#a0a29a", radius: "4px", heroAlign: "center", items: "cards" },
  retail: { fonts: "Libre+Baskerville:wght@700&family=Lato:wght@400;700", display: "Libre Baskerville,Georgia,serif", body: "Lato,system-ui,sans-serif", paper: "#faf8f4", ink: "#1a1714", muted: "#6b645c", radius: "12px", heroAlign: "end", items: "cards" },
  servicios: { fonts: "Archivo:wght@600;700&family=Source+Sans+3:wght@400;600", display: "Archivo,system-ui,sans-serif", body: "Source Sans 3,system-ui,sans-serif", paper: "#f5f5f3", ink: "#171717", muted: "#5c5c57", radius: "10px", heroAlign: "end", items: "list" },
  veterinaria: { fonts: "Quicksand:wght@600;700&family=Nunito:wght@400;700", display: "Quicksand,system-ui,sans-serif", body: "Nunito,system-ui,sans-serif", paper: "#f3f7ee", ink: "#172012", muted: "#5d6b55", radius: "20px", heroAlign: "end", items: "cards" },
  tours: { fonts: "Pacifico&family=Outfit:wght@400;600;700", display: "Pacifico,cursive", body: "Outfit,system-ui,sans-serif", paper: "#eef7f8", ink: "#0c1f24", muted: "#4f6970", radius: "24px", heroAlign: "center", items: "cards" },
  educacion: { fonts: "Merriweather:wght@700;800&family=Work+Sans:wght@400;600", display: "Merriweather,Georgia,serif", body: "Work Sans,system-ui,sans-serif", paper: "#f4f6fb", ink: "#121829", muted: "#586079", radius: "14px", heroAlign: "center", items: "list" },
  inmobiliaria: { fonts: "Playfair+Display:wght@700&family=Mulish:wght@400;700", display: "Playfair Display,Georgia,serif", body: "Mulish,system-ui,sans-serif", paper: "#f4f1ea", ink: "#191712", muted: "#66625a", radius: "2px", heroAlign: "end", items: "cards" },
  general: { fonts: "Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;600;700", display: "Fraunces,Georgia,serif", body: "Inter,system-ui,sans-serif", paper: "#faf7f1", ink: "#14120f", muted: "#6b645a", radius: "18px", heroAlign: "end", items: "list" },
};

function skinOf(id: string): Skin {
  return SKIN[id] ?? SKIN.general;
}

function localBusinessLd(d: DeliverableData): Record<string, unknown> {
  const tel = d.wa_url.match(/wa\.me\/(\d+)/)?.[1];
  return {
    "@context": "https://schema.org",
    "@type": vocabFor(d.playbook_id).ld_type,
    name: d.nombre,
    ...(d.assets.address ? { address: d.assets.address } : {}),
    ...(tel ? { telephone: `+${tel}` } : {}),
    ...(d.assets.photos[0] ? { image: d.assets.photos.map((p) => p.url) } : {}),
    ...(d.assets.hours.length ? { openingHours: d.assets.hours } : {}),
    ...(d.assets.rating && d.assets.reviews_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: d.assets.rating,
            reviewCount: d.assets.reviews_count,
          },
        }
      : {}),
  };
}

export function landingTemplate(d: DeliverableData): string {
  const s = d.secciones;
  const hero = d.assets.photos[0]?.url;
  const gallery = s.galeria ? d.assets.photos.slice(1, 7) : [];
  const reviews = s.resenas
    ? d.assets.reviews
        .filter((r) => r.text.trim().length > 20 && (r.rating ?? 5) >= 4)
        .slice(0, 8)
    : [];
  const beneficios = s.beneficios ? d.beneficios : [];
  const faq = s.faq ? d.faq : [];
  const logo = d.assets.logo_url
    ? `<img src="${esc(d.assets.logo_url)}" alt="${esc(d.nombre)}" class="logo-img">`
    : `<span class="logo-mono">${esc(initials(d.nombre))}</span>`;
  const sk = skinOf(d.playbook_id);
  const dark = sk.paper.startsWith("#11");
  const layout: LayoutId = layoutFor(`${d.nombre}|${d.zona}|${d.playbook_id}`);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.nombre)} | ${esc(d.rubro)} en ${esc(d.zona)}</title>
<meta name="description" content="${esc(`${d.nombre} en ${d.zona}. ${d.tagline}`.slice(0, 155))}">
<meta property="og:title" content="${esc(d.nombre)}">
<meta property="og:description" content="${esc(d.tagline)}">
${hero ? `<meta property="og:image" content="${esc(hero)}">` : ""}
<script type="application/ld+json">${jsonForScript(localBusinessLd(d))}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${sk.fonts}&display=swap" rel="stylesheet">
<style>
:root{--a:${esc(d.accent)};--b:${esc(d.accent2)};--c:${esc(d.accent3)};--ink:${sk.ink};--paper:${sk.paper};--muted:${sk.muted};--r:${sk.radius}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:${sk.body};background:var(--paper);color:var(--ink);overflow-x:hidden}
h1,h2,h3{font-family:${sk.display};letter-spacing:-.02em}
.nav{position:fixed;inset:0 0 auto 0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:14px 20px;transition:.4s}
.nav.solid{background:rgba(250,247,241,.86);backdrop-filter:blur(14px);box-shadow:0 1px 0 rgba(0,0,0,.06)}
.brand{display:flex;gap:10px;align-items:center;font-weight:700;color:#fff;transition:.4s}
.nav.solid .brand{color:var(--ink)}
.logo-img{width:40px;height:40px;border-radius:12px;object-fit:cover;background:#fff}
.logo-mono{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--a);color:#fff;font-family:${sk.display};font-weight:800}
.btn{display:inline-flex;align-items:center;gap:10px;background:var(--a);color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px;position:relative;overflow:hidden;transition:transform .25s}
.btn:hover{transform:translateY(-2px) scale(1.02)}
.btn::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.45) 50%,transparent 70%);transform:translateX(-100%);animation:shine 3.2s infinite}
@keyframes shine{60%,100%{transform:translateX(100%)}}
.hero{position:relative;min-height:100svh;display:flex;align-items:${sk.heroAlign === "center" ? "center" : "flex-end"};${sk.heroAlign === "center" ? "text-align:center;" : ""}padding:120px 22px 64px;color:#fff;overflow:hidden;isolation:isolate}
.hero-bg{position:absolute;inset:-10%;z-index:-2;background:${hero ? `url("${esc(hero)}") center/cover` : "linear-gradient(135deg,var(--a),#111)"};transform:scale(1.1);animation:kb 18s ease-in-out infinite alternate;will-change:transform}
@keyframes kb{to{transform:scale(1.22) translate(-2%,-2%)}}
.hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.78))}
.hero-inner{max-width:760px;${sk.heroAlign === "center" ? "margin:0 auto;" : ""}}
.chip{display:inline-flex;gap:8px;align-items:center;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.14);backdrop-filter:blur(8px);font-size:13px;margin-bottom:18px}
.chip b{color:var(--c)}
.hero h1{font-size:clamp(44px,9vw,96px);line-height:.95}
.hero p{font-size:clamp(17px,2.4vw,22px);opacity:.9;margin:18px 0 28px;max-width:560px}
.split span{display:inline-block;opacity:0;transform:translateY(40px) rotate(4deg);animation:up .9s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes up{to{opacity:1;transform:none}}
section{padding:88px 22px;max-width:1100px;margin:0 auto}
.eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:var(--a);font-weight:700}
.title{font-size:clamp(32px,5vw,54px);margin:10px 0 36px;line-height:1.05}
.reveal{opacity:0;transform:translateY(48px);transition:1s cubic-bezier(.2,.8,.2,1)}
.reveal.in{opacity:1;transform:none}
.pains{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.pain{background:${dark ? "#1c1d20" : "#fff"};border-radius:var(--r);padding:26px;box-shadow:0 20px 50px -30px rgba(0,0,0,.35);position:relative;overflow:hidden;transform-style:preserve-3d;transition:transform .2s}
.pain .num{font-family:${sk.display};font-size:14px;color:var(--a);font-weight:800}
.pain .after{font-size:22px;font-weight:700;margin-top:10px;font-family:${sk.display}}
.pain .txt{color:var(--muted);margin-top:6px;line-height:1.5}
.faq details{background:${dark ? "#1c1d20" : "#fff"};border-radius:var(--r);padding:18px 20px;margin-bottom:10px;border:1px solid rgba(0,0,0,.06);transition:.3s}
.faq details[open]{border-color:var(--a);box-shadow:0 14px 40px -28px rgba(0,0,0,.4)}
.faq summary{cursor:pointer;font-weight:700;list-style:none;display:flex;justify-content:space-between;gap:12px}
.faq summary::after{content:"+";color:var(--a);font-size:22px;line-height:1;transition:.3s}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq p{margin-top:10px;color:var(--muted);line-height:1.55}
.pain::before{content:"";position:absolute;width:180px;height:180px;border-radius:50%;background:var(--b);opacity:.18;right:-60px;top:-60px}
.stats{display:flex;gap:28px;flex-wrap:wrap;margin-top:8px}
.stat b{display:block;font-family:${sk.display};font-size:56px;line-height:1;color:var(--a)}
.items{display:grid;gap:12px;${sk.items === "cards" ? "grid-template-columns:repeat(auto-fit,minmax(220px,1fr));" : ""}}
.item{display:flex;flex-direction:column;gap:12px;padding:0 0 16px;overflow:hidden;border-radius:var(--r);background:${dark ? "#1c1d20" : "#fff"};border:1px solid rgba(0,0,0,.06);transition:.3s}
.item:hover{transform:translateY(-4px);border-color:var(--a)}
.item .shot{aspect-ratio:4/3;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--a) 70%,#111),var(--b))}
.item .shot img{width:100%;height:100%;object-fit:cover}
.item .shot-ph{width:100%;height:100%;display:grid;place-items:center;color:#fff;font-weight:700;font-size:15px;text-align:center;padding:16px;letter-spacing:.02em}
.item .item-body{padding:0 18px}
.item strong{font-size:17px}
.item small{display:block;color:var(--muted);margin-top:2px}
.item .p{font-weight:800;color:var(--a);white-space:nowrap;padding:0 18px}
body[data-layout=split] .hero{align-items:stretch;padding:0;min-height:100svh;display:grid;grid-template-columns:1fr 1fr}
body[data-layout=split] .hero-inner{padding:120px 40px 64px;margin:0;background:rgba(0,0,0,.35)}
body[data-layout=editorial] .hero h1{font-style:italic}
body[data-layout=editorial] .items{grid-template-columns:1fr}
body[data-layout=bento] .items{grid-template-columns:repeat(6,1fr);gap:10px}
body[data-layout=bento] .item:first-child{grid-column:span 4;grid-row:span 2}
body[data-layout=bento] .item{grid-column:span 2}
body[data-layout=warm-local] .hero{min-height:70svh}
body[data-layout=warm-local] .info{margin-top:-40px;position:relative;z-index:2}
@media(max-width:720px){body[data-layout=split] .hero{grid-template-columns:1fr}body[data-layout=bento] .items,body[data-layout=bento] .item,body[data-layout=bento] .item:first-child{grid-column:span 6}}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.gallery div{aspect-ratio:${sk.items === "cards" ? "16/10" : "4/5"};border-radius:var(--r);overflow:hidden}
.gallery img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s}
.gallery div:hover img{transform:scale(1.12)}
.marquee{overflow:hidden;padding:24px 0;mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.track{display:flex;gap:16px;width:max-content;animation:mq 40s linear infinite}
.marquee:hover .track{animation-play-state:paused}
@keyframes mq{to{transform:translateX(-50%)}}
.rv{width:320px;background:${dark ? "#1c1d20" : "#fff"};border-radius:var(--r);padding:22px;box-shadow:0 14px 40px -28px rgba(0,0,0,.4)}
.rv .s{color:#f5a623;letter-spacing:2px}
.rv p{margin:10px 0;line-height:1.5}
.rv small{color:var(--muted)}
.info{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:var(--ink);color:#fff;border-radius:24px;padding:28px}
.card li{list-style:none;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.1);font-size:14px}
.final{text-align:center;background:radial-gradient(circle at 50% 0,color-mix(in srgb,var(--a) 35%,transparent),transparent 60%),var(--ink);color:#fff;border-radius:32px;margin:0 16px 100px;padding:80px 24px;max-width:none}
.final h2{font-size:clamp(34px,6vw,64px);margin-bottom:24px}
.fab{position:fixed;right:18px;bottom:18px;z-index:50;width:62px;height:62px;border-radius:50%;background:#25d366;display:grid;place-items:center;box-shadow:0 10px 30px rgba(37,211,102,.5);animation:pulse 2.2s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(37,211,102,.6)}70%{box-shadow:0 0 0 18px rgba(37,211,102,0)}100%{box-shadow:0 0 0 0 rgba(37,211,102,0)}}
.glow{position:fixed;width:420px;height:420px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,color-mix(in srgb,var(--a) 22%,transparent),transparent 65%);transform:translate(-50%,-50%);z-index:0;transition:opacity .3s}
footer{text-align:center;color:var(--muted);font-size:12px;padding:0 20px 40px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body data-layout="${layout}">
<div class="glow" id="glow"></div>
<nav class="nav" id="nav"><div class="brand">${logo}<span>${esc(d.nombre)}</span></div><a class="btn" href="${esc(d.wa_url)}" target="_blank" rel="noopener">${esc(d.cta_label)}</a></nav>

<header class="hero">
  <div class="hero-bg" id="heroBg"></div>
  <div class="hero-inner">
    ${d.assets.rating ? `<div class="chip"><b>★ ${esc(String(d.assets.rating))}</b> ${esc(String(d.assets.reviews_count ?? ""))} reseñas en Google · ${esc(d.zona)}</div>` : `<div class="chip">${esc(d.zona)}</div>`}
    <h1 class="split" data-split>${esc(d.nombre)}</h1>
    <p>${esc(d.tagline)}</p>
    <a class="btn" href="${esc(d.wa_url)}" target="_blank" rel="noopener">${esc(d.cta_label)} →</a>
  </div>
</header>

${d.estrella ? `<section class="final reveal">
  <div class="eyebrow">Nuevo en ${esc(d.nombre)}</div>
  <h2>${esc(d.estrella.titulo)}</h2>
  <p style="opacity:.85;max-width:560px;margin:12px auto 22px">${esc(d.estrella.texto)}</p>
  <a class="btn" href="${esc(d.wa_url)}" target="_blank" rel="noopener">Lo quiero →</a>
</section>` : ""}

${beneficios.length ? `<section>
  <div class="pains">${beneficios
    .map(
      (b, i) => `<article class="pain reveal tilt"><div class="num">0${i + 1}</div><div class="after">${esc(b.titulo)}</div><div class="txt">${esc(b.texto)}</div></article>`,
    )
    .join("")}</div>
</section>` : ""}

${s.stats && d.assets.rating ? `<section class="reveal">
  <div class="stats">
    <div class="stat"><b data-count="${esc(String(d.assets.rating))}" data-dec="1">0</b>calificación en Google</div>
    <div class="stat"><b data-count="${esc(String(d.assets.reviews_count ?? 0))}">0</b>personas ya opinaron</div>
  </div>
</section>` : ""}

${d.items.length ? `<section>
  <div class="eyebrow reveal">${esc(d.offer_label)}</div>
  <h2 class="title reveal">${esc(vocabFor(d.playbook_id).oferta_titulo)}</h2>
  <div class="items">${d.items
    .map((it) => {
      const shot = it.photo_url
        ? `<img src="${esc(it.photo_url)}" alt="${esc(it.name)}" loading="lazy">`
        : `<div class="shot-ph">${esc(it.name)}</div>`;
      return `<div class="item reveal" data-slot="${esc(it.slot_id ?? it.name)}"><div class="shot">${shot}</div><div class="item-body"><strong>${esc(it.name)}</strong>${it.note ? `<small>${esc(it.note)}</small>` : ""}</div><div class="p">${esc(it.price_hint)}</div></div>`;
    })
    .join("")}</div>
</section>` : ""}

${gallery.length ? `<section><div class="gallery">${gallery
    .map((g) => `<div class="reveal"><img src="${esc(g.url)}" alt="${esc(d.nombre)}" loading="lazy"></div>`)
    .join("")}</div></section>` : ""}

${reviews.length ? `<div class="marquee"><div class="track">${[...reviews, ...reviews]
    .map(
      (r) => `<div class="rv"><div class="s">${"★".repeat(Math.round(r.rating ?? 5))}</div><p>“${esc(r.text.slice(0, 180))}${r.text.length > 180 ? "…" : ""}”</p><small>${esc(r.author ?? "Cliente en Google")}</small></div>`,
    )
    .join("")}</div></div>` : ""}

${d.con_bot ? `<section class="final reveal">
  <div class="eyebrow">Atención 24/7</div>
  <h2>Te contestamos al instante, a cualquier hora</h2>
  <p style="opacity:.8;max-width:520px;margin:12px auto 22px">Escríbenos por WhatsApp y nuestro asistente te atiende en segundos.</p>
  <a class="btn" href="${esc(d.wa_url)}" target="_blank" rel="noopener">${esc(d.cta_label)} →</a>
</section>` : ""}

${faq.length ? `<section class="faq">
  <div class="eyebrow reveal">Preguntas frecuentes</div>
  <h2 class="title reveal">Antes de que preguntes</h2>
  ${faq.map((f) => `<details class="reveal"><summary>${esc(f.duda)}</summary><p>${esc(f.respuesta)}</p></details>`).join("")}
</section>` : ""}

<section>
  <div class="info">
    ${d.assets.hours.length ? `<div class="card reveal"><h3 style="margin-bottom:12px">Horario</h3><ul>${d.assets.hours.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>` : ""}
    ${d.assets.address ? `<div class="card reveal"><h3 style="margin-bottom:12px">Dónde estamos</h3><p style="opacity:.85;line-height:1.5">${esc(d.assets.address)}</p>${d.assets.maps_uri ? `<p style="margin-top:18px"><a class="btn" href="${esc(d.assets.maps_uri)}" target="_blank" rel="noopener">Cómo llegar</a></p>` : ""}</div>` : ""}
  </div>
</section>

<section class="final reveal">
  <h2>${esc(d.nombre)}, a un mensaje</h2>
  <a class="btn" href="${esc(d.wa_url)}" target="_blank" rel="noopener">${esc(d.cta_label)} →</a>
</section>

<footer>© ${new Date().getFullYear()} ${esc(d.nombre)} · ${esc(d.zona)}${d.assets.stock_attribution ? `<br><span style="opacity:.7">${esc(d.assets.stock_attribution)}</span>` : ""}</footer>

<a class="fab" href="${esc(d.wa_url)}" target="_blank" rel="noopener" aria-label="WhatsApp"><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.3z"/></svg></a>

<script>
(function(){
  var nav=document.getElementById('nav');
  addEventListener('scroll',function(){nav.classList.toggle('solid',scrollY>60);var bg=document.getElementById('heroBg');if(bg)bg.style.translate='0 '+(scrollY*0.25)+'px'},{passive:true});
  document.querySelectorAll('[data-split]').forEach(function(el){var t=el.textContent;el.textContent='';t.split(' ').forEach(function(w,i){var s=document.createElement('span');s.textContent=w+'\\u00a0';s.style.animationDelay=(i*0.12)+'s';el.appendChild(s)})});
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.15});
  document.querySelectorAll('.reveal').forEach(function(el,i){el.style.transitionDelay=(i%4)*0.08+'s';io.observe(el)});
  var co=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var el=e.target,to=parseFloat(el.dataset.count),dec=+(el.dataset.dec||0),t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/1600),v=to*(1-Math.pow(1-k,3));el.textContent=v.toFixed(dec);if(k<1)requestAnimationFrame(f)})(t0);co.unobserve(el)})});
  document.querySelectorAll('[data-count]').forEach(function(el){co.observe(el)});
  document.querySelectorAll('.tilt').forEach(function(c){c.addEventListener('mousemove',function(e){var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform='perspective(700px) rotateY('+x*10+'deg) rotateX('+(-y*10)+'deg)'});c.addEventListener('mouseleave',function(){c.style.transform=''})});
  var g=document.getElementById('glow');addEventListener('pointermove',function(e){g.style.left=e.clientX+'px';g.style.top=e.clientY+'px'});
})();
</script>
</body>
</html>`;
}

export type ChatStep = {
  from: "cliente" | "bot";
  text: string;
  buttons?: string[];
};

export function whatsappTemplate(
  d: DeliverableData,
  script: ChatStep[],
  ownerView: string[],
  toast: string,
): string {
  const avatar = d.assets.logo_url
    ? `<img src="${esc(d.assets.logo_url)}" alt="">`
    : `<span>${esc(initials(d.nombre))}</span>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.nombre)} · WhatsApp automático</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
:root{--a:${esc(d.accent)}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,system-ui,sans-serif;min-height:100svh;display:flex;align-items:center;justify-content:center;gap:48px;flex-wrap:wrap;padding:32px 16px;color:#fff;background:radial-gradient(circle at 20% 20%,color-mix(in srgb,var(--a) 55%,#000),#07110d 60%);overflow-x:hidden}
.blob{position:fixed;width:520px;height:520px;border-radius:50%;filter:blur(90px);opacity:.35;background:var(--a);animation:float 14s ease-in-out infinite alternate;z-index:-1}
@keyframes float{to{transform:translate(30vw,40vh) scale(1.3)}}
.side{max-width:380px}
.side h1{font-size:clamp(30px,5vw,46px);line-height:1.05;letter-spacing:-.02em}
.side p{opacity:.8;margin:14px 0 22px;line-height:1.5}
.side li{list-style:none;display:flex;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.1);opacity:0;transform:translateX(-20px);transition:.6s}
.side li.on{opacity:1;transform:none}
.side li b{color:#7dffb3}
.phone{width:340px;height:690px;border-radius:52px;background:#0b0b0b;padding:12px;box-shadow:0 40px 90px -20px rgba(0,0,0,.8),inset 0 0 0 2px #2a2a2a;position:relative;transform:rotate(-2deg);animation:hover 6s ease-in-out infinite}
@keyframes hover{50%{transform:rotate(-2deg) translateY(-12px)}}
.screen{width:100%;height:100%;border-radius:42px;overflow:hidden;display:flex;flex-direction:column;background:#efeae2}
.notch{position:absolute;top:18px;left:50%;transform:translateX(-50%);width:110px;height:28px;border-radius:20px;background:#000;z-index:5}
.head{background:#075e54;color:#fff;padding:46px 14px 12px;display:flex;align-items:center;gap:10px}
.av{width:38px;height:38px;border-radius:50%;overflow:hidden;background:var(--a);display:grid;place-items:center;font-weight:800}
.av img{width:100%;height:100%;object-fit:cover;background:#fff}
.head small{display:block;font-size:11px;opacity:.8}
.chat{flex:1;overflow-y:auto;padding:14px 10px;display:flex;flex-direction:column;gap:6px;background-image:radial-gradient(rgba(0,0,0,.035) 1px,transparent 1px);background-size:14px 14px;scroll-behavior:smooth}
.msg{max-width:82%;padding:8px 10px 18px;border-radius:10px;font-size:13.5px;line-height:1.35;color:#111;position:relative;animation:pop .35s cubic-bezier(.2,1.4,.4,1);white-space:pre-line;box-shadow:0 1px 1px rgba(0,0,0,.08)}
.msg.cliente{align-self:flex-end;background:#d9fdd3;border-top-right-radius:2px}
.msg.bot{align-self:flex-start;background:#fff;border-top-left-radius:2px}
.msg time{position:absolute;right:8px;bottom:3px;font-size:10px;color:#667}
@keyframes pop{from{opacity:0;transform:scale(.8) translateY(10px)}}
.btns{display:flex;flex-direction:column;gap:4px;align-self:flex-start;width:82%}
.btns span{background:#fff;color:#027eb5;text-align:center;padding:8px;border-radius:8px;font-size:13px;font-weight:600;animation:pop .35s}
.btns span.tap{background:#e7f6ff;transform:scale(.97);transition:.2s}
.typing{align-self:flex-start;background:#fff;border-radius:10px;padding:10px 14px;display:flex;gap:4px}
.typing i{width:6px;height:6px;border-radius:50%;background:#999;animation:b 1s infinite}
.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}
@keyframes b{50%{transform:translateY(-4px);opacity:.4}}
.bar{background:#f0f0f0;padding:8px 10px 18px;display:flex;gap:8px;align-items:center}
.bar div{flex:1;background:#fff;border-radius:20px;padding:9px 14px;font-size:13px;color:#999}
.bar b{width:38px;height:38px;border-radius:50%;background:#00a884;display:grid;place-items:center}
.replay{margin-top:18px;background:#fff;color:#07110d;border:0;border-radius:999px;padding:12px 20px;font-weight:800;cursor:pointer}
.toast{position:fixed;top:20px;left:50%;transform:translate(-50%,-140%);background:#fff;color:#111;border-radius:16px;padding:12px 16px;font-size:14px;box-shadow:0 20px 40px -10px rgba(0,0,0,.5);transition:.5s cubic-bezier(.2,1.4,.4,1);display:flex;gap:10px;align-items:center;z-index:20;max-width:92vw}
.toast.show{transform:translate(-50%,0)}
@media (max-width:760px){.phone{order:-1}.side{text-align:center}.side li{text-align:left}}
</style>
</head>
<body>
<div class="blob"></div>
<div class="toast" id="toast"><b style="color:var(--a)">●</b><span id="toastText"></span></div>

<div class="side">
  <h1>${esc(d.nombre)} atiende solo, 24/7</h1>
  <p>${esc(d.tagline)}</p>
  <ul id="owner">${ownerView.map((o) => `<li><b>✓</b><span>${esc(o)}</span></li>`).join("")}</ul>
  <button class="replay" id="replay">▶ Ver de nuevo</button>
</div>

<div class="phone">
  <div class="notch"></div>
  <div class="screen">
    <div class="head"><div class="av">${avatar}</div><div><b>${esc(d.nombre)}</b><small id="status">en línea</small></div></div>
    <div class="chat" id="chat"></div>
    <div class="bar"><div>Mensaje</div><b><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg></b></div>
  </div>
</div>

<script>
(function(){
  var script=${jsonForScript(script)};
  var chat=document.getElementById('chat'),status=document.getElementById('status'),owner=[].slice.call(document.querySelectorAll('#owner li'));
  var toast=document.getElementById('toast'),toastText=document.getElementById('toastText');
  var run=0;
  function now(){var d=new Date();return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')}
  function wait(ms,id){return new Promise(function(r,j){setTimeout(function(){id===run?r():j()},ms)})}
  function add(el){chat.appendChild(el);chat.scrollTop=chat.scrollHeight}
  function bubble(s){var m=document.createElement('div');m.className='msg '+s.from;m.textContent=s.text;var t=document.createElement('time');t.textContent=now()+(s.from==='cliente'?' ✓✓':'');m.appendChild(t);add(m)}
  async function play(){
    var id=++run;chat.innerHTML='';owner.forEach(function(l){l.classList.remove('on')});
    try{
      for(var i=0;i<script.length;i++){
        var s=script[i];
        if(s.from==='bot'){status.textContent='escribiendo…';var ty=document.createElement('div');ty.className='typing';ty.innerHTML='<i></i><i></i><i></i>';add(ty);await wait(900+Math.min(1400,s.text.length*12),id);ty.remove();status.textContent='en línea'}
        else{await wait(1100,id)}
        bubble(s);
        if(s.buttons&&s.buttons.length){var b=document.createElement('div');b.className='btns';s.buttons.forEach(function(x){var e=document.createElement('span');e.textContent=x;b.appendChild(e)});add(b);await wait(900,id);b.firstChild.classList.add('tap')}
        var o=owner[Math.floor(i*owner.length/script.length)];if(o)o.classList.add('on');
        await wait(500,id);
      }
      owner.forEach(function(l){l.classList.add('on')});
      toastText.textContent=${jsonForScript(toast)};toast.classList.add('show');
      await wait(3200,id);toast.classList.remove('show');await wait(2500,id);play();
    }catch(e){}
  }
  document.getElementById('replay').onclick=play;
  play();
})();
</script>
</body>
</html>`;
}
