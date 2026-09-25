import type { Dot } from '../braille/types';

/**
 * Modelo físico das duas modalidades de reglete.
 *
 * Premissas (documentadas em docs/REGRAS-BRAILLE.md, seção "Modelo da reglete",
 * e marcadas como "a validar com usuários"):
 *
 * TRADICIONAL (também chamada reglete negativa):
 *  - A punção empurra o papel para longe de quem escreve; os pontos em relevo
 *    aparecem do OUTRO lado da folha. Para ler, vira-se a folha.
 *  - Por isso escreve-se da DIREITA para a ESQUERDA, e cada cela é o espelho
 *    horizontal da cela de leitura: pontos 1-2-3 ficam na coluna da DIREITA da
 *    janela e 4-5-6 na coluna da ESQUERDA.
 *  - A ordem das letras NÃO é invertida: a primeira letra do texto vai na primeira
 *    janela à direita. Inverter a sequência das letras não produz a escrita correta.
 *
 * POSITIVA:
 *  - A punção (de ponta côncava) forma o relevo do mesmo lado em que se escreve.
 *  - Escreve-se da ESQUERDA para a DIREITA, com a cela na mesma orientação da
 *    leitura: 1-2-3 na coluna da ESQUERDA e 4-5-6 na DIREITA.
 */
export type Modalidade = 'tradicional' | 'positiva';

export type Coluna = 'esquerda' | 'direita';
export type Altura = 'superior' | 'meio' | 'inferior';

export interface PosicaoFisica {
  coluna: Coluna;
  altura: Altura;
}

export interface ModalidadeInfo {
  id: Modalidade;
  nome: string;
  direcao: 'direita-para-esquerda' | 'esquerda-para-direita';
  descricaoDirecao: string;
  ladoDoRelevo: string;
  leitura: string;
}

export const MODALIDADES: Record<Modalidade, ModalidadeInfo> = {
  tradicional: {
    id: 'tradicional',
    nome: 'Reglete tradicional',
    direcao: 'direita-para-esquerda',
    descricaoDirecao: 'da direita para a esquerda, começando pela janela mais à direita de cada linha',
    ladoDoRelevo: 'O relevo se forma no outro lado da folha.',
    leitura: 'Para ler, retire a folha e vire-a; a leitura é feita da esquerda para a direita.',
  },
  positiva: {
    id: 'positiva',
    nome: 'Reglete positiva',
    direcao: 'esquerda-para-direita',
    descricaoDirecao: 'da esquerda para a direita, começando pela janela mais à esquerda de cada linha',
    ladoDoRelevo: 'O relevo se forma do mesmo lado em que você escreve.',
    leitura: 'A leitura é feita sem virar a folha, da esquerda para a direita.',
  },
};

/** Posição do ponto na cela de LEITURA (padrão Braille). */
export function posicaoDeLeitura(dot: Dot): PosicaoFisica {
  const coluna: Coluna = dot <= 3 ? 'esquerda' : 'direita';
  const alturas: Altura[] = ['superior', 'meio', 'inferior'];
  const altura = alturas[(dot - 1) % 3]!;
  return { coluna, altura };
}

/** Posição em que o ponto deve ser marcado na janela da reglete, para quem escreve. */
export function posicaoNaReglete(modalidade: Modalidade, dot: Dot): PosicaoFisica {
  const leitura = posicaoDeLeitura(dot);
  if (modalidade === 'positiva') return leitura;
  return { altura: leitura.altura, coluna: leitura.coluna === 'esquerda' ? 'direita' : 'esquerda' };
}

/** Qual ponto fica numa posição da janela, para quem escreve (inverso de `posicaoNaReglete`). */
export function pontoNaPosicao(modalidade: Modalidade, pos: PosicaoFisica): Dot {
  for (const dot of [1, 2, 3, 4, 5, 6] as Dot[]) {
    const p = posicaoNaReglete(modalidade, dot);
    if (p.coluna === pos.coluna && p.altura === pos.altura) return dot;
  }
  throw new Error('Posição inválida');
}

/**
 * Grade 3×2 como quem escreve vê a janela: linhas de cima para baixo,
 * colunas [esquerda, direita]. `true` = marcar.
 */
export function gradeDaJanela(modalidade: Modalidade, dots: readonly Dot[]): boolean[][] {
  const grade = [
    [false, false],
    [false, false],
    [false, false],
  ];
  const alturas: Altura[] = ['superior', 'meio', 'inferior'];
  for (const dot of dots) {
    const p = posicaoNaReglete(modalidade, dot);
    grade[alturas.indexOf(p.altura)]![p.coluna === 'esquerda' ? 0 : 1] = true;
  }
  return grade;
}

export function descreverPosicao(p: PosicaoFisica): string {
  const altura = { superior: 'em cima', meio: 'no meio', inferior: 'embaixo' }[p.altura];
  return `coluna da ${p.coluna}, ${altura}`;
}
