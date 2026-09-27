/** Canales de activación de la prueba y su etiqueta en reportes. */
export const CHANNELS = [
  {
    src: "maps",
    label: "Google Maps",
    donde: "Perfil de Google (Maps) → Editar perfil → Sitio web",
    porque: "Es lo que sale arriba cuando buscan “{rubro} en {zona}”. Ya tiene tráfico hoy.",
  },
  {
    src: "wa",
    label: "WhatsApp",
    donde: "WhatsApp Business → Perfil → Sitio web, y en el mensaje de bienvenida",
    porque: "Quien le escribe ve el menú/servicios sin preguntar.",
  },
  {
    src: "ig",
    label: "Instagram",
    donde: "Editar perfil → Enlaces",
    porque: "Link en bio para quien lo descubre en redes.",
  },
  {
    src: "fb",
    label: "Facebook",
    donde: "Página → Editar → Sitio web, y en publicaciones",
    porque: "Muchos clientes locales lo buscan ahí primero.",
  },
  {
    src: "qr",
    label: "QR en el local",
    donde: "Mesas, recepción, mostrador, tarjetas",
    porque: "Para ver menú/servicios y volver a pedir.",
  },
] as const;

export const SRC_LABEL: Record<string, string> = {
  maps: "Google Maps",
  google: "Google",
  wa: "WhatsApp",
  ig: "Instagram",
  fb: "Facebook",
  qr: "QR en el local",
  demo: "Usted (dueño)",
  directo: "Directo / otros",
};
