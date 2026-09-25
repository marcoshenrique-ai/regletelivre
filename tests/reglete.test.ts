import { describe, expect, it } from 'vitest';
import { convertText } from '../src/braille/converter';
import type { Dot } from '../src/braille/types';
import { layoutCells } from '../src/reglete/layout';
import { gradeDaJanela, pontoNaPosicao, posicaoNaReglete, type Modalidade } from '../src/reglete/modality';

const TODOS: Dot[] = [1, 2, 3, 4, 5, 6];

describe('geometria da cela — reglete positiva', () => {
  it('mesma orientação da leitura: 1-2-3 à esquerda, 4-5-6 à direita', () => {
    expect(TODOS.map((d) => posicaoNaReglete('positiva', d))).toEqual([
      { coluna: 'esquerda', altura: 'superior' },
      { coluna: 'esquerda', altura: 'meio' },
      { coluna: 'esquerda', altura: 'inferior' },
      { coluna: 'direita', altura: 'superior' },
      { coluna: 'direita', altura: 'meio' },
      { coluna: 'direita', altura: 'inferior' },
    ]);
  });
});

describe('geometria da cela — reglete tradicional', () => {
  it('espelhada: 1-2-3 à direita, 4-5-6 à esquerda, alturas preservadas', () => {
    expect(TODOS.map((d) => posicaoNaReglete('tradicional', d))).toEqual([
      { coluna: 'direita', altura: 'superior' },
      { coluna: 'direita', altura: 'meio' },
      { coluna: 'direita', altura: 'inferior' },
      { coluna: 'esquerda', altura: 'superior' },
      { coluna: 'esquerda', altura: 'meio' },
      { coluna: 'esquerda', altura: 'inferior' },
    ]);
  });

  it('pontoNaPosicao é o inverso de posicaoNaReglete nas duas modalidades', () => {
    for (const m of ['tradicional', 'positiva'] as Modalidade[]) {
      for (const d of TODOS) expect(pontoNaPosicao(m, posicaoNaReglete(m, d))).toBe(d);
    }
  });

  it('a letra e escrita na tradicional tem o desenho da letra i lida — por isso a cela precisa ser espelhada', () => {
    expect(gradeDaJanela('tradicional', [1, 5])).toEqual(gradeDaJanela('positiva', [2, 4]));
  });
});

/** Linha inteira como quem escreve vê: janelas da esquerda para a direita. */
function linhaVistaPorQuemEscreve(texto: string, m: Modalidade, n: number): boolean[][][] {
  const { cells } = convertText(texto);
  const { steps } = layoutCells(cells, { modalidade: m, celasPorLinha: n });
  const vazia = () => gradeDaJanela(m, []);
  const linha: boolean[][][] = Array.from({ length: n }, vazia);
  for (const s of steps) {
    if (s.placement && s.placement.linha === 1) linha[s.placement.janelaDaEsquerda - 1] = gradeDaJanela(m, s.cell.dots);
  }
  return linha;
}

/** Virar a folha: inverte a ordem das janelas e espelha cada janela. */
function virarFolha(linha: boolean[][][]): boolean[][][] {
  return [...linha].reverse().map((g) => g.map(([esq, dir]) => [dir!, esq!]));
}

describe('ordem de escrita nas duas modalidades', () => {
  it('tradicional começa pela janela mais à direita; positiva pela mais à esquerda', () => {
    const { cells } = convertText('bola');
    const trad = layoutCells(cells, { modalidade: 'tradicional', celasPorLinha: 10 }).steps;
    const pos = layoutCells(cells, { modalidade: 'positiva', celasPorLinha: 10 }).steps;
    expect(trad.map((s) => s.cell.origem)).toEqual(['b', 'o', 'l', 'a']);
    expect(pos.map((s) => s.cell.origem)).toEqual(['b', 'o', 'l', 'a']);
    expect(trad.map((s) => s.placement!.janelaDaEsquerda)).toEqual([10, 9, 8, 7]);
    expect(trad.map((s) => s.placement!.janelaDaDireita)).toEqual([1, 2, 3, 4]);
    expect(pos.map((s) => s.placement!.janelaDaEsquerda)).toEqual([1, 2, 3, 4]);
  });

  it('virar a folha escrita na tradicional resulta exatamente na leitura da positiva', () => {
    for (const texto of ['bola', 'Oi, tudo bem?', 'maçã', 'ONU 25']) {
      const trad = linhaVistaPorQuemEscreve(texto, 'tradicional', 16);
      const pos = linhaVistaPorQuemEscreve(texto, 'positiva', 16);
      expect(virarFolha(trad), texto).toEqual(pos);
    }
  });

  it('apenas inverter a sequência das letras NÃO produz a escrita da reglete tradicional', () => {
    const n = 4;
    const tradicional = linhaVistaPorQuemEscreve('bola', 'tradicional', n);
    // Abordagem ingênua: escrever "alob" da esquerda para a direita com a cela na orientação de leitura.
    const ingenua = linhaVistaPorQuemEscreve('alob', 'positiva', n);
    expect(ingenua).not.toEqual(tradicional);
  });
});

describe('distribuição em linhas', () => {
  it('não divide palavras: passa a palavra inteira para a próxima linha', () => {
    const { cells } = convertText('casa amarela');
    const { steps, totalLinhas, avisos } = layoutCells(cells, { modalidade: 'positiva', celasPorLinha: 8 });
    expect(totalLinhas).toBe(2);
    expect(avisos).toEqual([]);
    const espaco = steps.find((s) => s.cell.role === 'espaco')!;
    expect(espaco.placement).toBeNull();
    const a = steps[5]!;
    expect(a.cell.origem).toBe('a');
    expect(a.iniciaNovaLinha).toBe(true);
    expect(a.placement).toMatchObject({ linha: 2, ordemNaLinha: 1, janelaDaEsquerda: 1 });
  });

  it('na tradicional a nova linha também começa pela direita', () => {
    const { cells } = convertText('casa amarela');
    const { steps } = layoutCells(cells, { modalidade: 'tradicional', celasPorLinha: 8 });
    expect(steps[5]!.placement).toMatchObject({ linha: 2, ordemNaLinha: 1, janelaDaEsquerda: 8, janelaDaDireita: 1 });
  });

  it('mantém o espaço quando a próxima palavra cabe', () => {
    const { cells } = convertText('sol mar');
    const { steps, totalLinhas } = layoutCells(cells, { modalidade: 'positiva', celasPorLinha: 8 });
    expect(totalLinhas).toBe(1);
    expect(steps[3]!.placement).toMatchObject({ linha: 1, ordemNaLinha: 4 });
  });

  it('palavra maior que a linha gera aviso sobre translineação não validada', () => {
    const { cells } = convertText('paralelepipedo');
    const r = layoutCells(cells, { modalidade: 'tradicional', celasPorLinha: 8 });
    expect(r.totalLinhas).toBe(2);
    expect(r.avisos.length).toBe(1);
  });

  it('sinais de composição ficam na mesma palavra (não se separam da letra)', () => {
    const { cells } = convertText('sol Ana');
    const { steps } = layoutCells(cells, { modalidade: 'positiva', celasPorLinha: 8 });
    // "sol " = 4, "⠨ana" = 4 -> cabe exatamente
    expect(steps[4]!.cell.role).toBe('sinal-maiuscula');
    expect(steps[4]!.placement!.linha).toBe(1);
    const { steps: s2 } = layoutCells(cells, { modalidade: 'positiva', celasPorLinha: 7 });
    expect(s2[4]!.placement!.linha).toBe(2);
    expect(s2[4]!.iniciaNovaLinha).toBe(true);
  });

  it('rejeita número de janelas fora do intervalo', () => {
    expect(() => layoutCells([], { modalidade: 'positiva', celasPorLinha: 3 })).toThrow(RangeError);
    expect(() => layoutCells([], { modalidade: "positiva", celasPorLinha: 99 })).toThrow(RangeError);
  });
});
