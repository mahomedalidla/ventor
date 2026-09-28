import type { SupabaseClient } from "@supabase/supabase-js";

import type { PhotoSlot } from "@/lib/demo/slots";

export type DemoPhoto = { url: string; label: string };

export type DemoReview = {
  text: string;
  rating: number | null;
  author: string | null;
};

export type DemoAssets = {
  logo_url: string | null;
  logo_source: "sitio" | "red_social" | "favicon" | "manual" | null;
  photos: DemoPhoto[];
  theme_color: string | null;
  theme_secondary: string | null;
  theme_tertiary: string | null;
  address: string | null;
  maps_uri: string | null;
  hours: string[];
  rating: number | null;
  reviews_count: number | null;
  reviews: DemoReview[];
  editorial_summary: string | null;
  website_title: string | null;
  website_description: string | null;
  slots?: PhotoSlot[];
};

type LeadForAssets = {
  id: string;
  nombre: string;
  google_place_id: string | null;
  perfil_url: string | null;
  metadata: Record<string, unknown> | null;
};

const BUCKET = "demo-assets";
const UA = "Mozilla/5.0 (compatible; VendorBot/1.0; +local prospecting)";

/**
 * Junta marca y material real del negocio (logo, fotos, reseñas, horarios)
 * y persiste imágenes en Storage para que el entregable no dependa de URLs que caducan.
 */
export async function gatherDemoAssets(
  supabase: SupabaseClient,
  lead: LeadForAssets,
): Promise<DemoAssets> {
  const meta = lead.metadata ?? {};
  const assets: DemoAssets = {
    logo_url: null,
    logo_source: null,
    photos: [],
    theme_color: null,
    theme_secondary: null,
    theme_tertiary: null,
    address: (meta.direccion as string) ?? null,
    maps_uri: (meta.google_maps_uri as string) ?? null,
    hours: [],
    rating: (meta.rating as number) ?? null,
    reviews_count: (meta.user_rating_count as number) ?? null,
    reviews: Array.isArray(meta.reviews)
      ? (meta.reviews as Array<{ text?: string; rating?: number }>).map((r) => ({
          text: r.text ?? "",
          rating: r.rating ?? null,
          author: null,
        }))
      : [],
    editorial_summary: null,
    website_title: null,
    website_description: null,
  };

  const stamp = Date.now();

  // 1) Google Places: fotos reales, horarios, reseñas con autor
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  if (lead.google_place_id && placesKey && !placesKey.includes("your_google")) {
    try {
      const details = await fetchPlaceDetails(lead.google_place_id, placesKey);
      if (details) {
        assets.address = details.formattedAddress ?? assets.address;
        assets.maps_uri = details.googleMapsUri ?? assets.maps_uri;
        assets.rating = details.rating ?? assets.rating;
        assets.reviews_count = details.userRatingCount ?? assets.reviews_count;
        assets.hours = details.regularOpeningHours?.weekdayDescriptions ?? [];
        assets.editorial_summary = details.editorialSummary?.text ?? null;
        if (details.reviews?.length) {
          assets.reviews = details.reviews.slice(0, 8).map((r) => ({
            text: r.text?.text ?? r.originalText?.text ?? "",
            rating: r.rating ?? null,
            author: r.authorAttribution?.displayName ?? null,
          }));
        }

        const photos = (details.photos ?? []).slice(0, 6);
        for (let i = 0; i < photos.length; i++) {
          const uri = await fetchPhotoUri(photos[i].name, placesKey);
          if (!uri) continue;
          const stored = await persistImage(
            supabase,
            uri,
            `leads/${lead.id}/${stamp}-foto-${i}`,
          );
          assets.photos.push({
            url: stored ?? uri,
            label: i === 0 ? "principal" : `foto ${i + 1}`,
          });
        }
      }
    } catch {
      // seguimos con lo que haya
    }
  }

  // 2) Sitio web: logo, color de marca, título / descripción
  const website = (meta.website_uri as string) ?? null;
  if (website) {
    const site = await scrapeBrandFromSite(website);
    if (site) {
      assets.theme_color = site.theme_color;
      assets.website_title = site.title;
      assets.website_description = site.description;
      if (site.logo) {
        const stored = await persistImage(
          supabase,
          site.logo,
          `leads/${lead.id}/${stamp}-logo`,
        );
        assets.logo_url = stored ?? site.logo;
        assets.logo_source = "sitio";
      }
      if (site.og_image && assets.photos.length < 3) {
        const stored = await persistImage(
          supabase,
          site.og_image,
          `leads/${lead.id}/${stamp}-og`,
        );
        assets.photos.push({ url: stored ?? site.og_image, label: "del sitio" });
      }
    }
  }

  // 3) Red social: foto de perfil como logo
  if (!assets.logo_url && lead.perfil_url) {
    const og = await scrapeBrandFromSite(lead.perfil_url);
    if (og?.og_image) {
      const stored = await persistImage(
        supabase,
        og.og_image,
        `leads/${lead.id}/${stamp}-perfil`,
      );
      assets.logo_url = stored ?? og.og_image;
      assets.logo_source = "red_social";
    }
  }

  // 4) Favicon de Google como último recurso (solo si hay dominio)
  if (!assets.logo_url && website) {
    try {
      const host = new URL(website).hostname;
      assets.logo_url = `https://www.google.com/s2/favicons?domain=${host}&sz=256`;
      assets.logo_source = "favicon";
    } catch {
      // sin logo: el HTML usará logotipo tipográfico
    }
  }

  return assets;
}

type PlaceDetails = {
  formattedAddress?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: { text?: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: Array<{ name: string }>;
  reviews?: Array<{
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string };
  }>;
};

async function fetchPlaceDetails(
  placeId: string,
  key: string,
): Promise<PlaceDetails | null> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?languageCode=es`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": [
          "formattedAddress",
          "googleMapsUri",
          "rating",
          "userRatingCount",
          "editorialSummary",
          "regularOpeningHours.weekdayDescriptions",
          "photos",
          "reviews",
        ].join(","),
      },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) return null;
  return (await res.json()) as PlaceDetails;
}

async function fetchPhotoUri(
  photoName: string,
  key: string,
): Promise<string | null> {
  const res = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1600&skipHttpRedirect=true&key=${key}`,
    { signal: AbortSignal.timeout(10000) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { photoUri?: string };
  return data.photoUri ?? null;
}

async function persistImage(
  supabase: SupabaseClient,
  url: string,
  pathNoExt: string,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const ext = type.includes("png")
      ? "png"
      : type.includes("svg")
        ? "svg"
        : type.includes("webp")
          ? "webp"
          : type.includes("icon")
            ? "ico"
            : "jpg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > 6_000_000) return null;
    const path = `${pathNoExt}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: type, upsert: false });
    if (error) return null;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

type SiteBrand = {
  logo: string | null;
  og_image: string | null;
  theme_color: string | null;
  title: string | null;
  description: string | null;
};

async function scrapeBrandFromSite(url: string): Promise<SiteBrand | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const base = res.url || url;

    const abs = (href: string | null) => {
      if (!href) return null;
      try {
        return new URL(decodeEntities(href), base).toString();
      } catch {
        return null;
      }
    };

    // <img> con "logo" en src/alt/class/id
    let logo: string | null = null;
    const imgRe = /<img\b[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(html)) !== null) {
      const tag = m[0];
      if (/logo/i.test(tag)) {
        const src =
          attr(tag, "src") ?? attr(tag, "data-src") ?? attr(tag, "data-lazy-src");
        if (src && !src.startsWith("data:")) {
          logo = abs(src);
          break;
        }
      }
    }

    if (!logo) {
      const touch = matchLink(html, "apple-touch-icon");
      logo = abs(touch);
    }
    if (!logo) {
      const icon = matchLink(html, "icon");
      if (icon && !/\.ico(\?|$)/i.test(icon)) logo = abs(icon);
    }

    return {
      logo,
      og_image: abs(matchMeta(html, "og:image")),
      theme_color: matchMeta(html, "theme-color"),
      title: decodeEntities(
        matchMeta(html, "og:title") ?? html.match(/<title[^>]*>([^<]+)</i)?.[1] ?? "",
      ).trim() || null,
      description: decodeEntities(
        matchMeta(html, "og:description") ?? matchMeta(html, "description") ?? "",
      ).trim() || null,
    };
  } catch {
    return null;
  }
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return m?.[1] ?? null;
}

function matchLink(html: string, rel: string): string | null {
  const re = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const r = attr(m[0], "rel");
    if (r && r.toLowerCase().split(/\s+/).includes(rel)) {
      return attr(m[0], "href");
    }
  }
  return null;
}

function matchMeta(html: string, property: string): string | null {
  const re = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const p = attr(m[0], "property") ?? attr(m[0], "name");
    if (p && p.toLowerCase() === property) return attr(m[0], "content");
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
