import type { Dot } from '../braille/types';
import type { LayoutStep } from '../reglete/layout';
import type { Mancha } from './deteccao';

/**
 * Ajuste da grade Braille às manchas detectadas.
 *
 * Não tentamos "ler" a foto sem contexto: sabemos o que DEVERIA estar escrito
 * (as celas do layout) e procuramos o encaixe da grade esperada que melhor explica
 * as manchas. Depois comparamos posição a posição. Isso é mais robusto do que uma
 * leitura cega, mas continua sujeito a erros de luz, ângulo e papel — por isso o
 * resultado só aponta onde conferir, nunca confirma que a escrita está legível.
 */

/** Posição de um ponto na grade de leitura, em unidades de "distância entre pontos". */
export interface PosicaoEsperada {
  passo: number;
  dot: Dot;
  gx: number;
  gy: number;
  marcado: boolean;
}

/** Como a folha aparece na foto em relação à leitura. */
export type Orientacao = 'leitura' | 'espelhada' | 'invertida-vertical' | 'girada-180';

export const ORIENTACOES: Orientacao[] = ['leitura', 'espelhada', 'girada-180', 'invertida-vertical'];

export interface ParametrosGrade {
  /** Distância entre celas / distância entre pontos. */
  razaoCela: number;
  /** Distância entre linhas / distância entre pontos. */
  razaoLinha: number;
}

export function posicoesEsperadas(steps: readonly LayoutStep[], p: ParametrosGrade): PosicaoEsperada[] {
  const saida: PosicaoEsperada[] = [];
  steps.forEach((s, passo) => {
    if (!s.placement) return;
    const baseX = (s.placement.ordemNaLinha - 1) * p.razaoCela;
    const baseY = (s.placement.linha - 1) * p.razaoLinha;
    for (const dot of [1, 2, 3, 4, 5, 6] as Dot[]) {
      saida.push({
        passo,
        dot,
        gx: baseX + (dot <= 3 ? 0 : 1),
        gy: baseY + ((dot - 1) % 3),
        marcado: s.cell.dots.includes(dot),
      });
    }
  });
  return saida;
}

function orientar(o: Orientacao, x: number, y: number): [number, number] {
  switch (o) {
    case 'leitura':
      return [x, y];
    case 'espelhada':
      return [-x, y];
    case 'invertida-vertical':
      return [x, -y];
    case 'girada-180':
      return [-x, -y];
  }
}

/** Índice espacial simples para busca de vizinhos. */
class Grade2D {
  private readonly celas = new Map<number, number[]>();
  constructor(
    private readonly pts: readonly { x: number; y: number }[],
    private readonly tam: number,
  ) {
    pts.forEach((p, i) => {
      const k = this.chave(Math.floor(p.x / tam), Math.floor(p.y / tam));
      const lista = this.celas.get(k);
      if (lista) lista.push(i);
      else this.celas.set(k, [i]);
    });
  }
  private chave(cx: number, cy: number): number {
    return (cx + 50000) * 100003 + (cy + 50000);
  }
  /** Índice do ponto mais próximo dentro de `raio` (≤ tam), ou -1. */
  maisProximo(x: number, y: number, raio: number): number {
    const cx = Math.floor(x / this.tam);
    const cy = Math.floor(y / this.tam);
    let melhor = -1;
    let melhorD = raio * raio;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const lista = this.celas.get(this.chave(cx + dx, cy + dy));
        if (!lista) continue;
        for (const i of lista) {
          const p = this.pts[i]!;
          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d <= melhorD) {
            melhorD = d;
            melhor = i;
          }
        }
      }
    }
    return melhor;
  }
}

export interface PosicaoVista {
  x: number;
  y: number;
  passo: number;
  dot: Dot;
  estado: 'confere' | 'faltando' | 'sobrando' | 'vazio';
}

export interface ResultadoGrade {
  encontrou: boolean;
  orientacao: Orientacao;
  /** Fração dos pontos esperados que foram achados na foto (0–1). */
  fracaoEncontrada: number;
  pontosEsperados: number;
  pontosEncontrados: number;
  /** Por passo do layout: pontos esperados não vistos e pontos vistos a mais. */
  diferencas: Map<number, { faltando: Dot[]; sobrando: Dot[] }>;
  /** Posições da grade em pixels da imagem analisada, com o que foi visto (para o desenho). */
  posicoes: PosicaoVista[];
  pontuacao: number;
}

const FALHA = (): ResultadoGrade => ({
  encontrou: false,
  orientacao: 'leitura',
  fracaoEncontrada: 0,
  pontosEsperados: 0,
  pontosEncontrados: 0,
  diferencas: new Map(),
  posicoes: [],
  pontuacao: -Infinity,
});

function percentilOrdenado(v: number[], p: number): number {
  if (v.length === 0) return NaN;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]!;
}

export function mediana(v: number[]): number {
  if (v.length === 0) return NaN;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * Encaixa a grade esperada nas manchas. `orientacoes` permite restringir as
 * orientações testadas (por exemplo, quando a pessoa diz qual lado fotografou).
 */
export function ajustarGrade(
  manchasPx: readonly Mancha[],
  steps: readonly LayoutStep[],
  orientacoes: readonly Orientacao[] = ORIENTACOES,
): ResultadoGrade {
  const temPontos = steps.some((s) => s.placement && s.cell.dots.length > 0);
  if (!temPontos || manchasPx.length < 2) return FALHA();

  // Mantém as manchas mais fortes para limitar o custo.
  const manchas = [...manchasPx].sort((a, b) => b.forca - a.forca).slice(0, 700);

  // 1) Distância de referência: percentil baixo da distância ao vizinho mais próximo.
  const nn: number[] = [];
  for (let i = 0; i < manchas.length; i++) {
    let best = Infinity;
    for (let j = 0; j < manchas.length; j++) {
      if (i === j) continue;
      const d = (manchas[i]!.x - manchas[j]!.x) ** 2 + (manchas[i]!.y - manchas[j]!.y) ** 2;
      if (d < best) best = d;
    }
    nn.push(Math.sqrt(best));
  }
  const base = percentilOrdenado(nn, 0.25);
  if (!(base > 0)) return FALHA();

  // 2) Inclinação: pico do histograma dos ângulos (módulo 90°) entre pares próximos.
  //    Pares na mesma linha/coluna da grade dão 0°; diagonais se espalham em outros ângulos.
  const pares: { dx: number; dy: number; dist: number }[] = [];
  const raioPar = 3.2 * base;
  for (let i = 0; i < manchas.length; i++) {
    for (let j = i + 1; j < manchas.length; j++) {
      const dx = manchas[j]!.x - manchas[i]!.x;
      const dy = manchas[j]!.y - manchas[i]!.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist <= raioPar) pares.push({ dx, dy, dist });
    }
  }
  const dobrar = (a: number) => {
    let g = (a * 180) / Math.PI;
    g = ((g % 90) + 90) % 90;
    return g >= 45 ? g - 90 : g;
  };
  const hist = new Array<number>(90).fill(0);
  for (const q of pares) {
    const g = dobrar(Math.atan2(q.dy, q.dx));
    const k = Math.floor(g + 45);
    for (const v of [k - 1, k, k + 1]) hist[(v + 90) % 90]! += v === k ? 2 : 1;
  }
  const pico = hist.indexOf(Math.max(...hist)) - 45 + 0.5;
  const proximos = pares.map((q) => dobrar(Math.atan2(q.dy, q.dx))).filter((g) => Math.abs(g - pico) <= 3);
  const theta = ((proximos.length ? proximos.reduce((t, g) => t + g, 0) / proximos.length : 0) * Math.PI) / 180;

  // 3) Escala: menor agrupamento de distâncias entre pares alinhados aos eixos.
  const cT = Math.cos(-theta);
  const sT = Math.sin(-theta);
  const alinhadas: number[] = [];
  for (const q of pares) {
    const rx = q.dx * cT - q.dy * sT;
    const ry = q.dx * sT + q.dy * cT;
    const ax = Math.abs(rx);
    const ay = Math.abs(ry);
    if (ay < 0.15 * ax || ax < 0.15 * ay) alinhadas.push(Math.max(ax, ay));
  }
  if (alinhadas.length === 0) return FALHA();
  const p10 = percentilOrdenado(alinhadas, 0.1);
  const d0 = mediana(alinhadas.filter((v) => v <= p10 * 1.25));
  if (!(d0 > 0)) return FALHA();

  const cx0 = manchas.reduce((t, m) => t + m.x, 0) / manchas.length;
  const cy0 = manchas.reduce((t, m) => t + m.y, 0) / manchas.length;
  const cosT = Math.cos(-theta);
  const sinT = Math.sin(-theta);
  const P = manchas.map((m) => {
    const x = m.x - cx0;
    const y = m.y - cy0;
    return { x: (x * cosT - y * sinT) / d0, y: (x * sinT + y * cosT) / d0 };
  });
  const indice = new Grade2D(P, 1);
  // Âncoras: as manchas mais "acima e à esquerda" na foto já endireitada; o primeiro
  // ponto esperado (no mesmo referencial) deve coincidir com uma delas.
  const ancoras = P.map((_, i) => i)
    .sort((a, b) => P[a]!.x + P[a]!.y - (P[b]!.x + P[b]!.y))
    .slice(0, 60);

  // 3) Busca do encaixe: orientação, razões (grossa e depois fina) e deslocamento.
  const TOL = 0.3;
  type Candidato = { o: Orientacao; p: ParametrosGrade; ox: number; oy: number; nota: number };
  let melhor = null as Candidato | null;
  const avaliar = (o: Orientacao, p: ParametrosGrade) => {
    const E = posicoesEsperadas(steps, p)
      .filter((e) => e.marcado)
      .map((e) => orientar(o, e.gx, e.gy));
    const ordenados = [...E].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
    const passo = Math.ceil(E.length / 60);
    const amostra = passo > 1 ? E.filter((_, i) => i % passo === 0) : E;
    for (const e0 of ordenados.slice(0, 3)) {
      for (const ai of ancoras) {
        const ox = P[ai]!.x - e0[0];
        const oy = P[ai]!.y - e0[1];
        let nota = 0;
        for (const e of amostra) if (indice.maisProximo(e[0] + ox, e[1] + oy, TOL) >= 0) nota++;
        nota /= amostra.length;
        if (!melhor || nota > melhor.nota) melhor = { o, p, ox, oy, nota };
      }
    }
  };
  for (const o of orientacoes) {
    for (let rc = 2.1; rc <= 2.95; rc += 0.2) {
      for (let rl = 3.2; rl <= 5.25; rl += 0.4) avaliar(o, { razaoCela: rc, razaoLinha: rl });
    }
  }
  const primeiro = melhor as Candidato | null;
  if (primeiro) {
    const base: Candidato = primeiro;
    for (const drc of [-0.1, 0, 0.1]) {
      for (const drl of [-0.2, 0, 0.2]) {
        if (drc === 0 && drl === 0) continue;
        avaliar(base.o, { razaoCela: base.p.razaoCela + drc, razaoLinha: base.p.razaoLinha + drl });
      }
    }
  }
  const escolhido = melhor as Candidato | null;
  if (!escolhido) return FALHA();

  // 4) Refinamento por mínimos quadrados (escala e deslocamento em cada eixo).
  const todas = posicoesEsperadas(steps, escolhido.p);
  let ax = escolhido.ox;
  let ay = escolhido.oy;
  let sx = 1;
  let sy = 1;
  const o = escolhido.o;
  for (let it = 0; it < 3; it++) {
    const pares: [number, number, number, number][] = [];
    for (const e of todas) {
      if (!e.marcado) continue;
      const [ex, ey] = orientar(o, e.gx, e.gy);
      const k = indice.maisProximo(ax + sx * ex, ay + sy * ey, 0.45);
      if (k >= 0) pares.push([ex, ey, P[k]!.x, P[k]!.y]);
    }
    if (pares.length < 3) break;
    const ajuste = (u: number[], v: number[]): [number, number] => {
      const n = u.length;
      const mu = u.reduce((t, a) => t + a, 0) / n;
      const mv = v.reduce((t, a) => t + a, 0) / n;
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        num += (u[i]! - mu) * (v[i]! - mv);
        den += (u[i]! - mu) ** 2;
      }
      const s = den > 1e-9 ? num / den : 1;
      return [mv - s * mu, s];
    };
    const [nax, nsx] = ajuste(pares.map((q) => q[0]), pares.map((q) => q[2]));
    const [nay, nsy] = ajuste(pares.map((q) => q[1]), pares.map((q) => q[3]));
    // Só aceita escalas plausíveis (o eixo pode ter pouca variação, ex.: uma linha só).
    if (nsx > 0.8 && nsx < 1.25) {
      ax = nax;
      sx = nsx;
    }
    if (nsy > 0.8 && nsy < 1.25) {
      ay = nay;
      sy = nsy;
    }
  }

  const cosB = Math.cos(theta);
  const sinB = Math.sin(theta);
  const paraPixel = (gx: number, gy: number) => {
    const [ex, ey] = orientar(o, gx, gy);
    const ux = (ax + sx * ex) * d0;
    const uy = (ay + sy * ey) * d0;
    return { x: ux * cosB - uy * sinB + cx0, y: ux * sinB + uy * cosB + cy0 };
  };

  // 5) Comparação posição a posição.
  const diferencas = new Map<number, { faltando: Dot[]; sobrando: Dot[] }>();
  let esperados = 0;
  let encontrados = 0;
  let sobrandoTotal = 0;
  const posicoes: PosicaoVista[] = [];
  for (const e of todas) {
    const [ex, ey] = orientar(o, e.gx, e.gy);
    const k = indice.maisProximo(ax + sx * ex, ay + sy * ey, 0.33);
    let estado: PosicaoVista['estado'] = 'vazio';
    if (e.marcado) {
      esperados++;
      if (k >= 0) {
        encontrados++;
        estado = 'confere';
      } else {
        registrar(diferencas, e.passo).faltando.push(e.dot);
        estado = 'faltando';
      }
    } else if (k >= 0) {
      sobrandoTotal++;
      registrar(diferencas, e.passo).sobrando.push(e.dot);
      estado = 'sobrando';
    }
    const px = paraPixel(e.gx, e.gy);
    posicoes.push({ x: px.x, y: px.y, passo: e.passo, dot: e.dot, estado });
  }

  const fracao = esperados ? encontrados / esperados : 0;
  return {
    encontrou: fracao >= 0.7 && encontrados >= Math.min(3, esperados),
    orientacao: o,
    fracaoEncontrada: fracao,
    pontosEsperados: esperados,
    pontosEncontrados: encontrados,
    diferencas,
    posicoes,
    pontuacao: encontrados - 0.5 * sobrandoTotal,
  };
}

function registrar(m: Map<number, { faltando: Dot[]; sobrando: Dot[] }>, passo: number) {
  let r = m.get(passo);
  if (!r) {
    r = { faltando: [], sobrando: [] };
    m.set(passo, r);
  }
  return r;
}
