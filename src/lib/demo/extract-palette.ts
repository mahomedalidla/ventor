/** Extrae 3 colores de marca de un logo (en el navegador). Omite blanco, negro y transparencia. */

export type Palette = { principal: string; secundario: string; acento: string };

function hex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function dist(a: number[], b: number[]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function usable(r: number, g: number, b: number, a: number): boolean {
  if (a < 140) return false;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx < 28) return false;
  if (mn > 248) return false;
  if (mx - mn < 12 && mx > 220) return false;
  return true;
}

function shift(hexColor: string, deg: number, sat = 0): string {
  const n = parseInt(hexColor.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.min(255, r + deg + sat));
  g = Math.max(0, Math.min(255, g - Math.round(deg / 3)));
  b = Math.max(0, Math.min(255, b + Math.round(deg * 0.6) - sat));
  return hex(r, g, b);
}

export async function extractPaletteFromFile(file: File): Promise<Palette> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("No se pudo leer la imagen"));
      i.src = url;
    });
    const size = 72;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { principal: "#0b6e4f", secundario: "#1c1914", acento: "#d4a017" };
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const buckets = new Map<string, { c: number[]; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (!usable(r, g, b, a)) continue;
      const q = [r >> 4, g >> 4, b >> 4];
      const key = q.join(",");
      const cur = buckets.get(key);
      if (cur) cur.n++;
      else buckets.set(key, { c: [r, g, b], n: 1 });
    }
    const ranked = [...buckets.values()].sort((x, y) => y.n - x.n);
    const picked: number[][] = [];
    for (const b of ranked) {
      if (picked.every((p) => dist(p, b.c) > 55)) {
        picked.push(b.c);
        if (picked.length === 3) break;
      }
    }
    const principal = picked[0] ? hex(picked[0][0], picked[0][1], picked[0][2]) : "#0b6e4f";
    const secundario = picked[1] ? hex(picked[1][0], picked[1][1], picked[1][2]) : shift(principal, -40);
    const acento = picked[2] ? hex(picked[2][0], picked[2][1], picked[2][2]) : shift(principal, 70, 20);
    return { principal, secundario, acento };
  } finally {
    URL.revokeObjectURL(url);
  }
}
