import { resolvePlaybook } from "@/lib/categories/playbooks";
import { createClient } from "@/lib/supabase/server";
import {
  detectSignalsForPlace,
  fetchAndScanWebsite,
} from "@/lib/places/enrich";
import type {
  PlaceSearchResult,
  PlacesProspectResponse,
  ProspectedLead,
} from "@/lib/places/types";
import { isPlaceInZona, resolveZonaGeo } from "@/lib/zones";
import { NextResponse } from "next/server";

type GooglePlace = {
  id?: string;
  name?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
  reviews?: Array<{
    text?: { text?: string };
    rating?: number;
  }>;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey.includes("your_google")) {
    return NextResponse.json(
      {
        error:
          "Falta GOOGLE_PLACES_API_KEY en .env.local. Usa Redes/Manual mientras tanto.",
      },
      { status: 503 },
    );
  }

  let body: { categoria?: string; zona?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const categoria = body.categoria?.trim();
  const zona = body.zona?.trim();
  if (!categoria || !zona) {
    return NextResponse.json(
      { error: "categoria y zona son requeridos" },
      { status: 400 },
    );
  }

  const geo = resolveZonaGeo(zona);
  // Query explícita al estado: evita "Compostela" de GDL / calles homónimas
  const textQuery = geo
    ? `${categoria} en ${geo.name}, ${geo.estado}, México`
    : `${categoria} en ${zona}, Nayarit, México`;
  const playbook = resolvePlaybook(categoria);

  const requestBody: Record<string, unknown> = {
    textQuery,
    languageCode: "es",
    regionCode: "MX",
    maxResultCount: 20,
  };

  if (geo) {
    // Solo locationRestriction (Places no permite bias + restriction juntos).
    // Rectángulo aprox. del radio de la zona.
    const dLat = geo.radius_m / 111_000;
    const dLng =
      geo.radius_m / (111_000 * Math.cos((geo.lat * Math.PI) / 180));
    requestBody.locationRestriction = {
      rectangle: {
        low: {
          latitude: geo.lat - dLat,
          longitude: geo.lng - dLng,
        },
        high: {
          latitude: geo.lat + dLat,
          longitude: geo.lng + dLng,
        },
      },
    };
  }

  const placesRes = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.websiteUri",
          "places.types",
          "places.primaryType",
          "places.rating",
          "places.userRatingCount",
          "places.businessStatus",
          "places.googleMapsUri",
          "places.location",
          "places.reviews",
        ].join(","),
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!placesRes.ok) {
    const detail = await placesRes.text();
    return NextResponse.json(
      { error: "Error de Google Places", detail },
      { status: 502 },
    );
  }

  const data = (await placesRes.json()) as { places?: GooglePlace[] };
  const rawPlaces = data.places ?? [];

  const places: PlaceSearchResult[] = rawPlaces
    .filter((p) => {
      if (!geo) return true;
      return isPlaceInZona(geo, {
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
        direccion: p.formattedAddress ?? null,
      });
    })
    .map((p) => ({
      google_place_id: p.id ?? p.name?.replace(/^places\//, "") ?? "",
      nombre: p.displayName?.text ?? "Sin nombre",
      direccion: p.formattedAddress ?? null,
      telefono: p.nationalPhoneNumber ?? null,
      tiene_sitio_web: Boolean(p.websiteUri),
      website_uri: p.websiteUri ?? null,
      types: p.types ?? [],
      primary_type: p.primaryType ?? null,
      rating: p.rating ?? null,
      user_rating_count: p.userRatingCount ?? null,
      business_status: p.businessStatus ?? null,
      google_maps_uri: p.googleMapsUri ?? null,
      reviews: (p.reviews ?? []).slice(0, 5).map((r) => ({
        text: r.text?.text ?? "",
        rating: r.rating ?? null,
      })),
    }));

  const filtered_out = rawPlaces.length - places.length;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let signals_created = 0;
  const leads: ProspectedLead[] = [];

  for (const place of places) {
    if (!place.google_place_id) {
      skipped += 1;
      leads.push({
        place,
        website_scan: null,
        signals: [],
        action: "skipped",
        lead_id: null,
      });
      continue;
    }

    const website_scan = place.website_uri
      ? await fetchAndScanWebsite(place.website_uri)
      : null;

    const signals = detectSignalsForPlace(place, website_scan, categoria);

    const metadata = {
      direccion: place.direccion,
      website_uri: place.website_uri,
      types: place.types,
      primary_type: place.primary_type,
      rating: place.rating,
      user_rating_count: place.user_rating_count,
      business_status: place.business_status,
      google_maps_uri: place.google_maps_uri,
      reviews: place.reviews,
      website_scan,
      playbook: {
        id: playbook.id,
        label: playbook.label,
        pricing_categoria: playbook.pricing_categoria,
        pain_context: playbook.pain_context,
        producto_prioridad: playbook.producto_prioridad,
      },
      last_prospected_at: new Date().toISOString(),
      query: textQuery,
    };

    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("google_place_id", place.google_place_id)
      .maybeSingle();

    let leadId: string | null = existing?.id ?? null;
    let action: ProspectedLead["action"] = "skipped";

    if (existing) {
      const { error } = await supabase
        .from("leads")
        .update({
          nombre: place.nombre,
          tipo_negocio: categoria,
          zona,
          telefono: place.telefono,
          tiene_sitio_web: place.tiene_sitio_web,
          metadata,
        })
        .eq("id", existing.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      leadId = existing.id;
      action = "updated";
      updated += 1;
    } else {
      const { data: inserted, error } = await supabase
        .from("leads")
        .insert({
          origen: "places_api",
          nombre: place.nombre,
          tipo_negocio: categoria,
          zona,
          telefono: place.telefono,
          tiene_sitio_web: place.tiene_sitio_web,
          google_place_id: place.google_place_id,
          metadata,
        })
        .select("id")
        .single();
      if (error || !inserted) {
        return NextResponse.json(
          { error: error?.message ?? "No se pudo crear lead" },
          { status: 500 },
        );
      }
      leadId = inserted.id;
      action = "created";
      created += 1;
    }

    // Idempotencia: no duplicar mismo tipo_signal para el lead
    const { data: existingSignals } = await supabase
      .from("signals")
      .select("tipo_signal")
      .eq("lead_id", leadId);

    const have = new Set((existingSignals ?? []).map((s) => s.tipo_signal));
    const fresh = signals.filter((s) => !have.has(s.tipo_signal));

    if (fresh.length > 0) {
      const { error: sigErr } = await supabase.from("signals").insert(
        fresh.map((s) => ({
          lead_id: leadId,
          tipo_signal: s.tipo_signal,
          detalle: s.detalle,
          detectado_por: "sistema",
        })),
      );
      if (sigErr) {
        return NextResponse.json({ error: sigErr.message }, { status: 500 });
      }
      signals_created += fresh.length;
    }

    leads.push({
      place,
      website_scan,
      signals,
      playbook_id: playbook.id,
      playbook_label: playbook.label,
      action,
      lead_id: leadId,
    });
  }

  const payload: PlacesProspectResponse = {
    query: textQuery,
    playbook_id: playbook.id,
    playbook_label: playbook.label,
    zona_geo: geo ? `${geo.name}, ${geo.estado}` : null,
    filtered_out,
    created,
    updated,
    skipped,
    signals_created,
    leads,
  };
  return NextResponse.json(payload);
}
