import { detectarManchas, type Mancha } from './deteccao';
import { brilhoMedio, type ImagemCinza } from './imagem';

/**
 * Orientação de enquadramento para quem não enxerga a tela: analisa um quadro
 * reduzido da câmera e devolve UMA instrução curta, para ser falada.
 *
 * "Esquerda/direita" e "cima/baixo" referem-se ao movimento do aparelho, segurado
 * com a tela voltada para a pessoa e a câmera voltada para a folha.
 */
export type EstadoEnquadramento = 'escuro' | 'sem-pontos' | 'ruido' | 'cortado' | 'longe' | 'bom';

export interface AvaliacaoEnquadramento {
  estado: EstadoEnquadramento;
  mensagem: string;
}

function percentil(v: number[], p: number): number {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]!;
}

export function avaliarEnquadramento(img: ImagemCinza, pontosEsperados: number): AvaliacaoEnquadramento {
  const brilho = brilhoMedio(img);
  if (brilho < 0.18) {
    return { estado: 'escuro', mensagem: 'Está escuro. Acenda uma luz, de preferência vinda de um lado da folha.' };
  }
  const esperado = Math.max(3, pontosEsperados);
  let manchas: Mancha[] = [];
  let melhorDist = Infinity;
  for (const raio of [1.5, 2.5, 4, 6]) {
    const m = detectarManchas(img, raio, 'escura');
    const dist = Math.abs(Math.log(Math.max(1, m.length) / esperado));
    if (dist < melhorDist) {
      melhorDist = dist;
      manchas = m;
    }
  }
  if (manchas.length < Math.max(3, Math.round(esperado * 0.3))) {
    return {
      estado: 'sem-pontos',
      mensagem: 'Não encontro os pontos. Aproxime o aparelho da escrita, mantenha-o paralelo à folha e ilumine de lado.',
    };
  }
  if (manchas.length > esperado * 6 + 60) {
    return {
      estado: 'ruido',
      mensagem: 'Há muitas marcas na imagem. Use um fundo liso e afaste outros objetos da folha.',
    };
  }
  const xs = manchas.map((m) => m.x);
  const ys = manchas.map((m) => m.y);
  const x0 = percentil(xs, 0.03);
  const x1 = percentil(xs, 0.97);
  const y0 = percentil(ys, 0.03);
  const y1 = percentil(ys, 0.97);
  const mx = img.largura * 0.04;
  const my = img.altura * 0.04;
  const esquerda = x0 < mx;
  const direita = x1 > img.largura - mx;
  const cima = y0 < my;
  const baixo = y1 > img.altura - my;
  if (esquerda && direita) {
    return { estado: 'cortado', mensagem: 'A escrita não cabe na imagem. Afaste um pouco o aparelho da folha.' };
  }
  if (cima && baixo) {
    return { estado: 'cortado', mensagem: 'A escrita não cabe na imagem. Afaste um pouco o aparelho da folha.' };
  }
  if (esquerda) return { estado: 'cortado', mensagem: 'A escrita está cortada à esquerda. Mova o aparelho um pouco para a esquerda.' };
  if (direita) return { estado: 'cortado', mensagem: 'A escrita está cortada à direita. Mova o aparelho um pouco para a direita.' };
  if (cima) return { estado: 'cortado', mensagem: 'A escrita está cortada em cima. Mova o aparelho um pouco para cima.' };
  if (baixo) return { estado: 'cortado', mensagem: 'A escrita está cortada embaixo. Mova o aparelho um pouco para baixo.' };
  if (x1 - x0 < img.largura * 0.3 && y1 - y0 < img.altura * 0.3) {
    return { estado: 'longe', mensagem: 'A escrita está pequena na imagem. Aproxime um pouco o aparelho.' };
  }
  return { estado: 'bom', mensagem: 'Enquadramento bom. Mantenha o aparelho parado.' };
}
