import {
  nombreFromDoctoraliaSlug,
  parseDoctoraliaUrl,
} from "@/lib/doctoralia/parse-profile-url";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Guarda lead desde URL de Doctoralia + intenta enlazar Google Place para fotos.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    url?: string;
    nombre?: string;
    zona?: string;
    tipo_negocio?: string;
    telefono?: string;
    nota?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = parseDoctoraliaUrl(body.url ?? "");
  if (!parsed) {
    return NextResponse.json(
      { error: "URL de Doctoralia no válida (pega el perfil del médico o clínica)" },
      { status: 400 },
    );
  }

  const nombre =
    body.nombre?.trim() || nombreFromDoctoraliaSlug(parsed.slug);
  const zona = body.zona?.trim() || null;
  const tipo =
    body.tipo_negocio?.trim() ||
    parsed.especialidad_hint ||
    "consultorio";

  let placeId: string | null = null;
  let placeMeta: Record<string, unknown> = {};
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  if (placesKey && !placesKey.includes("your_google")) {
    try {
      const q = [nombre, tipo, zona, "México"].filter(Boolean).join(" ");
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": placesKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.googleMapsUri",
        },
        body: JSON.stringify({ textQuery: q, languageCode: "es", maxResultCount: 3 }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          places?: Array<{
            id?: string;
            displayName?: { text?: string };
            formattedAddress?: string;
            nationalPhoneNumber?: string;
            rating?: number;
            userRatingCount?: number;
            googleMapsUri?: string;
          }>;
        };
        const hit = data.places?.[0];
        if (hit?.id) {
          placeId = hit.id;
          placeMeta = {
            direccion: hit.formattedAddress ?? null,
            google_maps_uri: hit.googleMapsUri ?? null,
            rating: hit.rating ?? null,
            user_rating_count: hit.userRatingCount ?? null,
            places_match: hit.displayName?.text ?? null,
            nationalPhoneNumber: hit.nationalPhoneNumber ?? null,
          };
        }
      }
    } catch {
      // sin Places: igual guardamos el lead
    }
  }

    const telefono =
      body.telefono?.trim() ||
      (typeof placeMeta.nationalPhoneNumber === "string"
        ? placeMeta.nationalPhoneNumber
        : null);

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("origen", "doctoralia")
    .contains("metadata", { doctoralia_slug: parsed.slug })
    .maybeSingle();

  let leadId = existing?.id as string | undefined;

  if (leadId) {
    await supabase
      .from("leads")
      .update({
        nombre,
        zona,
        tipo_negocio: tipo,
        telefono: telefono || undefined,
        perfil_url: parsed.perfil_url,
        google_place_id: placeId,
        metadata: {
          doctoralia_slug: parsed.slug,
          doctoralia_url: parsed.perfil_url,
          ...placeMeta,
        },
      })
      .eq("id", leadId);
  } else {
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        origen: "doctoralia",
        nombre,
        zona,
        tipo_negocio: tipo,
        telefono,
        perfil_url: parsed.perfil_url,
        google_place_id: placeId,
        metadata: {
          doctoralia_slug: parsed.slug,
          doctoralia_url: parsed.perfil_url,
          ...placeMeta,
        },
      })
      .select("id")
      .single();
    if (error || !lead) {
      return NextResponse.json({ error: error?.message ?? "No se pudo guardar" }, { status: 500 });
    }
    leadId = lead.id;
  }

  if (body.nota?.trim()) {
    await supabase.from("signals").insert({
      lead_id: leadId,
      tipo_signal: "nota_vendedor",
      detalle: body.nota.trim(),
      detectado_por: "manual",
    });
  }

  await supabase.from("signals").insert({
    lead_id: leadId,
    tipo_signal: "origen_doctoralia",
    detalle: `Perfil Doctoralia: ${parsed.perfil_url}`,
    detectado_por: "manual",
  });

  let inferMsg = "";
  try {
    const inferRes = await fetch(new URL("/api/infer/batch", request.url).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ lead_ids: [leadId] }),
    });
    const inferData = await inferRes.json();
    inferMsg = inferRes.ok
      ? ` · ${inferData.inserted_total ?? 0} oportunidades`
      : "";
  } catch {
    /* optional */
  }

  return NextResponse.json({
    ok: true,
    lead_id: leadId,
    google_place_id: placeId,
    mensaje: `Lead Doctoralia guardado${placeId ? " · enlazado a Google Places" : ""}${inferMsg}`,
  });
}
