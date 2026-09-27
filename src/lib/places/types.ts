export type CapabilityFlags = {
  menu: boolean;
  orders: boolean;
  booking: boolean;
  whatsapp: boolean;
  delivery: boolean;
  catalog: boolean;
  quotes: boolean;
  appointments: boolean;
};

export type PlaceReview = {
  text: string;
  rating: number | null;
};

export type PlaceSearchResult = {
  google_place_id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  tiene_sitio_web: boolean;
  website_uri: string | null;
  types: string[];
  primary_type: string | null;
  rating: number | null;
  user_rating_count: number | null;
  business_status: string | null;
  google_maps_uri: string | null;
  reviews: PlaceReview[];
};

export type WebsiteScan = {
  reachable: boolean;
  capabilities: CapabilityFlags;
  has_menu_link: boolean;
  has_order_link: boolean;
  has_whatsapp_link: boolean;
  has_delivery_app_link: boolean;
  matched_links: string[];
  error?: string;
};

export type DetectedSignal = {
  tipo_signal: string;
  detalle: string;
};

export type ProspectedLead = {
  place: PlaceSearchResult;
  website_scan: WebsiteScan | null;
  signals: DetectedSignal[];
  playbook_id?: string;
  playbook_label?: string;
  action: "created" | "updated" | "skipped";
  lead_id: string | null;
};

export type PlacesProspectResponse = {
  query: string;
  playbook_id: string;
  playbook_label: string;
  zona_geo: string | null;
  filtered_out: number;
  created: number;
  updated: number;
  skipped: number;
  signals_created: number;
  leads: ProspectedLead[];
};
