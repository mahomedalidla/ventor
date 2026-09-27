import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Vista previa ligera vía Open Graph (título/descripción públicos).
 * No es scraping masivo — un fetch puntual a la página del perfil.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "url requerida" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; VendorBot/1.0; +https://localhost)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({
        title: null,
        description: null,
        warning: `No se pudo leer el perfil (${res.status})`,
      });
    }

    const html = await res.text();
    const title =
      matchMeta(html, "og:title") ||
      matchMeta(html, "twitter:title") ||
      matchTitleTag(html);
    const description =
      matchMeta(html, "og:description") ||
      matchMeta(html, "twitter:description") ||
      matchMeta(html, "description");

    return NextResponse.json({
      title: clean(title),
      description: clean(description),
    });
  } catch {
    return NextResponse.json({
      title: null,
      description: null,
      warning: "No se pudo obtener la vista previa",
    });
  }
}

function matchMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function matchTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ?? null;
}

function clean(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
