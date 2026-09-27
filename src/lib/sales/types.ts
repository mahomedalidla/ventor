export type Etapa =
  | "apertura"
  | "entrega_demo"
  | "seguimiento"
  | "oferta_prueba"
  | "check_prueba"
  | "cierre"
  | "despedida";

export type CadenceStep = {
  etapa: Etapa;
  dia: number;
  cuando: string;
  objetivo: string;
  mensaje: string;
  adjunto: "landing" | "whatsapp" | null;
  tip: string;
};

export type Objecion = { objecion: string; respuesta: string };

export type SalesPlan = {
  pasos: CadenceStep[];
  objeciones: Objecion[];
  evitar: string;
  generado_por: "gemini" | "plantilla";
};

export const ETAPA_LABEL: Record<Etapa, string> = {
  apertura: "Apertura",
  entrega_demo: "Entrega de la demo",
  seguimiento: "Seguimiento",
  oferta_prueba: "Oferta: prueba gratis",
  check_prueba: "Revisión a mitad de prueba",
  cierre: "Cierre",
  despedida: "Despedida",
};
