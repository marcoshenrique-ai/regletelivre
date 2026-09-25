/**
 * Imagem em tons de cinza (0 = preto, 1 = branco), independente do DOM.
 * Toda a análise de foto trabalha sobre esta estrutura, o que permite testá-la em Node
 * com imagens sintéticas.
 */
export interface ImagemCinza {
  largura: number;
  altura: number;
  dados: Float32Array;
}

export function criarImagem(largura: number, altura: number, valor = 1): ImagemCinza {
  return { largura, altura, dados: new Float32Array(largura * altura).fill(valor) };
}

/**
 * Converte RGBA (ImageData do canvas) em cinza, reduzindo para no máximo `larguraMax`
 * pixels de largura por média de blocos.
 */
export function deRGBA(rgba: Uint8ClampedArray, largura: number, altura: number, larguraMax = 1000): ImagemCinza {
  const fator = Math.max(1, Math.ceil(largura / larguraMax));
  const w = Math.floor(largura / fator);
  const h = Math.floor(altura / fator);
  const saida = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let soma = 0;
      for (let dy = 0; dy < fator; dy++) {
        const linha = (y * fator + dy) * largura;
        for (let dx = 0; dx < fator; dx++) {
          const i = (linha + x * fator + dx) * 4;
          soma += 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!;
        }
      }
      saida[y * w + x] = soma / (fator * fator * 255);
    }
  }
  return { largura: w, altura: h, dados: saida };
}

/** Imagem integral (soma acumulada) para médias locais em O(1). */
export function integral(img: ImagemCinza): Float64Array {
  const { largura: w, altura: h, dados } = img;
  const s = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let linha = 0;
    for (let x = 1; x <= w; x++) {
      linha += dados[(y - 1) * w + (x - 1)]!;
      s[y * (w + 1) + x] = s[(y - 1) * (w + 1) + x]! + linha;
    }
  }
  return s;
}

export function mediaLocal(s: Float64Array, w: number, h: number, x: number, y: number, r: number): number {
  const x0 = Math.max(0, x - r);
  const y0 = Math.max(0, y - r);
  const x1 = Math.min(w, x + r + 1);
  const y1 = Math.min(h, y + r + 1);
  const W = w + 1;
  const soma = s[y1 * W + x1]! - s[y0 * W + x1]! - s[y1 * W + x0]! + s[y0 * W + x0]!;
  return soma / ((x1 - x0) * (y1 - y0));
}

export function brilhoMedio(img: ImagemCinza): number {
  let soma = 0;
  for (let i = 0; i < img.dados.length; i++) soma += img.dados[i]!;
  return soma / img.dados.length;
}
