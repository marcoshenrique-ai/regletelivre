import type { Dot } from '../braille/types';
import type { LayoutStep } from '../reglete/layout';
import { criarImagem, type ImagemCinza } from './imagem';

/**
 * Gera fotos SINTÉTICAS de uma folha escrita, com relevo iluminado de lado, ruído,
 * inclinação e falhas controladas. Serve para testar e medir o algoritmo.
 * Resultados em imagens sintéticas NÃO equivalem a resultados em fotos reais.
 */
export interface OpcoesSinteticas {
  largura?: number;
  altura?: number;
  /** Distância entre pontos, em pixels. */
  passoPonto?: number;
  razaoCela?: number;
  razaoLinha?: number;
  angulo?: number;
  espelhar?: boolean;
  girar180?: boolean;
  ruido?: number;
  /** Intensidade do relevo (sombra/brilho). */
  relevo?: number;
  margem?: number;
  semente?: number;
  /** Pontos que a pessoa esqueceu de marcar: "passo:ponto". */
  omitir?: string[];
  /** Pontos marcados a mais: "passo:ponto". */
  acrescentar?: string[];
}

function rng(semente: number) {
  let s = semente >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

export function fotoSintetica(steps: readonly LayoutStep[], o: OpcoesSinteticas = {}): ImagemCinza {
  const d = o.passoPonto ?? 12;
  const rc = o.razaoCela ?? 2.5;
  const rl = o.razaoLinha ?? 4;
  const margem = o.margem ?? 3 * d;
  const pontos: { x: number; y: number }[] = [];
  const omitir = new Set(o.omitir ?? []);
  const acrescentar = new Set(o.acrescentar ?? []);
  let maxX = 0;
  let maxY = 0;
  steps.forEach((s, passo) => {
    if (!s.placement) return;
    for (const dot of [1, 2, 3, 4, 5, 6] as Dot[]) {
      const chave = `${passo}:${dot}`;
      const marcado = (s.cell.dots.includes(dot) && !omitir.has(chave)) || acrescentar.has(chave);
      const gx = (s.placement.ordemNaLinha - 1) * rc + (dot <= 3 ? 0 : 1);
      const gy = (s.placement.linha - 1) * rl + ((dot - 1) % 3);
      maxX = Math.max(maxX, gx);
      maxY = Math.max(maxY, gy);
      if (marcado) pontos.push({ x: gx, y: gy });
    }
  });
  const w = o.largura ?? Math.ceil(maxX * d + 2 * margem);
  const h = o.altura ?? Math.ceil(maxY * d + 2 * margem);
  const img = criarImagem(w, h, 0.82);
  const aleatorio = rng(o.semente ?? 7);
  const ruido = o.ruido ?? 0.02;
  for (let i = 0; i < img.dados.length; i++) img.dados[i] = 0.82 + (aleatorio() - 0.5) * 2 * ruido;

  const cx = (maxX * d) / 2;
  const cy = (maxY * d) / 2;
  const ang = o.angulo ?? 0;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const sigma = d * 0.22;
  const amp = o.relevo ?? 0.25;
  for (const p of pontos) {
    let x = p.x * d - cx;
    let y = p.y * d - cy;
    if (o.espelhar) x = -x;
    if (o.girar180) {
      x = -x;
      y = -y;
    }
    const px = x * ca - y * sa + w / 2;
    const py = x * sa + y * ca + h / 2;
    const r = Math.ceil(sigma * 4);
    for (let yy = Math.floor(py - r); yy <= py + r; yy++) {
      if (yy < 0 || yy >= h) continue;
      for (let xx = Math.floor(px - r); xx <= px + r; xx++) {
        if (xx < 0 || xx >= w) continue;
        const dx = xx - px;
        const dy = yy - py;
        const g = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        // luz vinda de cima à esquerda: lado iluminado claro, lado oposto escuro
        const sombra = (-(dx + dy) / sigma) * g;
        const i = yy * w + xx;
        img.dados[i] = Math.min(1, Math.max(0, img.dados[i]! + amp * sombra * 0.6));
      }
    }
  }
  return img;
}
