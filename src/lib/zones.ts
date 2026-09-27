/**
 * Zonas de prospección con ancla geográfica.
 * Places ya no busca solo por texto ("Compostela" puede ser calle en GDL):
 * usamos query + Nayarit/Jalisco + locationBias + filtro por distancia.
 */

export type ZonaGeo = {
  name: string;
  /** Centro aproximado para sesgar / filtrar Places */
  lat: number;
  lng: number;
  /** Radio máx. en metros para aceptar un resultado */
  radius_m: number;
  /** Pista de estado en la query y en la dirección */
  estado: "Nayarit" | "Jalisco";
};

export type ZonaGroup = {
  group: string;
  zonas: string[];
};

export const ZONA_GEO: Record<string, ZonaGeo> = {
  // Tepic
  Tepic: {
    name: "Tepic",
    lat: 21.5041,
    lng: -104.8946,
    radius_m: 12000,
    estado: "Nayarit",
  },
  "Centro Tepic": {
    name: "Centro Tepic",
    lat: 21.5039,
    lng: -104.8942,
    radius_m: 4000,
    estado: "Nayarit",
  },
  "Ciudad del Valle": {
    name: "Ciudad del Valle",
    lat: 21.4755,
    lng: -104.842,
    radius_m: 5000,
    estado: "Nayarit",
  },
  "La Loma": {
    name: "La Loma",
    lat: 21.521,
    lng: -104.905,
    radius_m: 4000,
    estado: "Nayarit",
  },

  // Costa / Riviera
  "Puerto Vallarta": {
    name: "Puerto Vallarta",
    lat: 20.6534,
    lng: -105.2253,
    radius_m: 14000,
    estado: "Jalisco",
  },
  "Nuevo Vallarta": {
    name: "Nuevo Vallarta",
    lat: 20.698,
    lng: -105.293,
    radius_m: 8000,
    estado: "Nayarit",
  },
  Bucerías: {
    name: "Bucerías",
    lat: 20.755,
    lng: -105.333,
    radius_m: 6000,
    estado: "Nayarit",
  },
  "La Cruz de Huanacaxtle": {
    name: "La Cruz de Huanacaxtle",
    lat: 20.738,
    lng: -105.38,
    radius_m: 5000,
    estado: "Nayarit",
  },
  "Punta de Mita": {
    name: "Punta de Mita",
    lat: 20.773,
    lng: -105.518,
    radius_m: 7000,
    estado: "Nayarit",
  },
  Guayabitos: {
    name: "Guayabitos",
    lat: 21.028,
    lng: -105.267,
    radius_m: 5000,
    estado: "Nayarit",
  },
  "Rincón de Guayabitos": {
    name: "Rincón de Guayabitos",
    lat: 21.028,
    lng: -105.267,
    radius_m: 5000,
    estado: "Nayarit",
  },
  "La Peñita de Jaltemba": {
    name: "La Peñita de Jaltemba",
    lat: 21.038,
    lng: -105.248,
    radius_m: 5000,
    estado: "Nayarit",
  },

  // Pueblos Mágicos Nayarit
  Compostela: {
    name: "Compostela",
    lat: 21.2367,
    lng: -104.9003,
    radius_m: 8000,
    estado: "Nayarit",
  },
  Jala: {
    name: "Jala",
    lat: 21.1894,
    lng: -104.4386,
    radius_m: 6000,
    estado: "Nayarit",
  },
  "San Blas": {
    name: "San Blas",
    lat: 21.5436,
    lng: -105.2856,
    radius_m: 9000,
    estado: "Nayarit",
  },
  Sayulita: {
    name: "Sayulita",
    lat: 20.8697,
    lng: -105.4408,
    radius_m: 5000,
    estado: "Nayarit",
  },
  Mexcaltitán: {
    name: "Mexcaltitán",
    lat: 21.908,
    lng: -105.475,
    radius_m: 5000,
    estado: "Nayarit",
  },
  Ahuacatlán: {
    name: "Ahuacatlán",
    lat: 21.0536,
    lng: -104.4836,
    radius_m: 6000,
    estado: "Nayarit",
  },
  "Amatlán de Cañas": {
    name: "Amatlán de Cañas",
    lat: 20.806,
    lng: -104.403,
    radius_m: 7000,
    estado: "Nayarit",
  },
  "Ixtlán del Río": {
    name: "Ixtlán del Río",
    lat: 21.0367,
    lng: -104.3681,
    radius_m: 7000,
    estado: "Nayarit",
  },
  "Puerto Balleto": {
    name: "Puerto Balleto",
    lat: 21.633,
    lng: -106.55,
    radius_m: 12000,
    estado: "Nayarit",
  },
};

export const ZONA_GROUPS: ZonaGroup[] = [
  {
    group: "Tepic y alrededores",
    zonas: ["Tepic", "Centro Tepic", "Ciudad del Valle", "La Loma"],
  },
  {
    group: "Costa / Riviera",
    zonas: [
      "Puerto Vallarta",
      "Nuevo Vallarta",
      "Bucerías",
      "La Cruz de Huanacaxtle",
      "Punta de Mita",
      "Guayabitos",
      "Rincón de Guayabitos",
      "La Peñita de Jaltemba",
    ],
  },
  {
    group: "Pueblos Mágicos de Nayarit",
    zonas: [
      "Compostela",
      "Jala",
      "San Blas",
      "Sayulita",
      "Mexcaltitán",
      "Ahuacatlán",
      "Amatlán de Cañas",
      "Ixtlán del Río",
      "Puerto Balleto",
    ],
  },
];

export const ZONAS = ZONA_GROUPS.flatMap((g) => g.zonas);

export function resolveZonaGeo(zona: string): ZonaGeo | null {
  if (ZONA_GEO[zona]) return ZONA_GEO[zona];
  const hit = Object.values(ZONA_GEO).find(
    (z) => z.name.toLowerCase() === zona.trim().toLowerCase(),
  );
  return hit ?? null;
}

/** Distancia en metros (Haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isPlaceInZona(
  geo: ZonaGeo,
  place: {
    lat?: number | null;
    lng?: number | null;
    direccion?: string | null;
  },
): boolean {
  if (place.lat != null && place.lng != null) {
    return (
      distanceMeters(
        { lat: geo.lat, lng: geo.lng },
        { lat: place.lat, lng: place.lng },
      ) <= geo.radius_m
    );
  }
  // Fallback débil si Google no devolvió coords
  const addr = (place.direccion ?? "").toLowerCase();
  const estadoOk = addr.includes(geo.estado.toLowerCase());
  const zonaOk = addr.includes(geo.name.toLowerCase().split(" ")[0].toLowerCase());
  return estadoOk && zonaOk;
}

export type ZonaPricingTier =
  | "tepica"
  | "pueblo_interior"
  | "pueblo_costa"
  | "riviera";

export function pricingTierForZona(zona: string): ZonaPricingTier {
  const z = zona.toLowerCase();
  if (
    ["puerto vallarta", "nuevo vallarta", "bucerías", "bucerias", "punta de mita"].some(
      (x) => z.includes(x),
    )
  ) {
    return "riviera";
  }
  if (
    ["sayulita", "san blas", "guayabitos", "la peñita", "la penita", "la cruz"].some(
      (x) => z.includes(x),
    )
  ) {
    return "pueblo_costa";
  }
  if (
    [
      "compostela",
      "jala",
      "mexcaltitán",
      "mexcaltitan",
      "ahuacatlán",
      "ahuacatlan",
      "amatlán",
      "amatlan",
      "ixtlán",
      "ixtlan",
      "puerto balleto",
    ].some((x) => z.includes(x))
  ) {
    return "pueblo_interior";
  }
  return "tepica";
}
