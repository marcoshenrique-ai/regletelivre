import { integral, mediaLocal, type ImagemCinza } from './imagem';

/** Um possível ponto em relevo encontrado na foto (coordenadas em pixels). */
export interface Mancha {
  x: number;
  y: number;
  /** Contraste médio da mancha em relação à vizinhança. */
  forca: number;
  area: number;
}

/**
 * Detecta pontos em relevo pela diferença entre cada pixel e a média da vizinhança.
 * Com luz lateral, um ponto em relevo aparece como uma pequena região mais clara com
 * uma sombra ao lado. Procurar só as sombras (`escura`) ou só os brilhos (`clara`)
 * dá uma mancha por ponto, com um pequeno deslocamento constante que não atrapalha
 * o encaixe da grade. `ambas` junta as duas partes.
 *
 * `raio` é a escala esperada do ponto em pixels. Como a distância da câmera é
 * desconhecida, quem chama tenta várias escalas (ver `analisarFoto`).
 */
export type Polaridade = 'escura' | 'clara' | 'ambas';

export function detectarManchas(
  img: ImagemCinza,
  raio: number,
  polaridade: Polaridade = 'ambas',
  sensibilidade = 2.2,
): Mancha[] {
  const { largura: w, altura: h, dados } = img;
  const r = Math.max(1, Math.round(raio));
  const janela = r * 3;
  const s = integral(img);
  const resp = new Float32Array(w * h);
  let soma = 0;
  let soma2 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dif = dados[y * w + x]! - mediaLocal(s, w, h, x, y, janela);
      const v = polaridade === 'ambas' ? Math.abs(dif) : polaridade === 'clara' ? Math.max(0, dif) : Math.max(0, -dif);
      resp[y * w + x] = v;
      soma += v;
      soma2 += v * v;
    }
  }
  const n = w * h;
  const media = soma / n;
  const desvio = Math.sqrt(Math.max(0, soma2 / n - media * media));
  const limiar = Math.max(0.03, media + sensibilidade * desvio);

  // Componentes conexos (vizinhança 8) acima do limiar.
  const rotulo = new Int32Array(n).fill(-1);
  const pilha: number[] = [];
  const brutas: Mancha[] = [];
  const areaMin = Math.max(2, Math.round(0.25 * r * r));
  const areaMax = Math.round(12 * r * r);
  let proximo = 0;
  for (let i = 0; i < n; i++) {
    if (resp[i]! < limiar || rotulo[i] !== -1) continue;
    let area = 0;
    let sx = 0;
    let sy = 0;
    let sf = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    rotulo[i] = proximo;
    pilha.push(i);
    while (pilha.length) {
      const p = pilha.pop()!;
      const px = p % w;
      const py = (p - px) / w;
      const f = resp[p]!;
      area++;
      sx += px * f;
      sy += py * f;
      sf += f;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = py + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          if (nx < 0 || nx >= w) continue;
          const q = ny * w + nx;
          if (rotulo[q] === -1 && resp[q]! >= limiar) {
            rotulo[q] = proximo;
            pilha.push(q);
          }
        }
      }
    }
    proximo++;
    const larguraBox = maxX - minX + 1;
    const alturaBox = maxY - minY + 1;
    // Descarta bordas de papel, sombras longas e ruído minúsculo.
    if (area < areaMin || area > areaMax) continue;
    if (larguraBox > 5 * r || alturaBox > 5 * r) continue;
    brutas.push({ x: sx / sf, y: sy / sf, forca: sf / area, area });
  }

  // Limita o custo em imagens muito ruidosas.
  const limitadas = brutas.length > 2500 ? brutas.sort((a, b) => b.forca - a.forca).slice(0, 2500) : brutas;
  return fundirProximas(limitadas, r * 1.1);
}

/** Junta manchas muito próximas (as metades clara e escura de um mesmo ponto). */
function fundirProximas(manchas: Mancha[], distancia: number): Mancha[] {
  const d2 = distancia * distancia;
  const usadas = new Array<boolean>(manchas.length).fill(false);
  const saida: Mancha[] = [];
  for (let i = 0; i < manchas.length; i++) {
    if (usadas[i]) continue;
    const grupo = [manchas[i]!];
    usadas[i] = true;
    for (let j = i + 1; j < manchas.length; j++) {
      if (usadas[j]) continue;
      const a = manchas[i]!;
      const b = manchas[j]!;
      if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= d2) {
        grupo.push(b);
        usadas[j] = true;
      }
    }
    const peso = grupo.reduce((t, m) => t + m.forca * m.area, 0);
    saida.push({
      x: grupo.reduce((t, m) => t + m.x * m.forca * m.area, 0) / peso,
      y: grupo.reduce((t, m) => t + m.y * m.forca * m.area, 0) / peso,
      forca: peso / grupo.reduce((t, m) => t + m.area, 0),
      area: grupo.reduce((t, m) => t + m.area, 0),
    });
  }
  return saida;
}
