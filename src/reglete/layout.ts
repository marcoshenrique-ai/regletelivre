import type { BrailleCell } from '../braille/types';
import type { Modalidade } from './modality';

export interface LayoutOptions {
  modalidade: Modalidade;
  /** Janelas (celas) por linha da reglete. Varia conforme o modelo; padrão 28. */
  celasPorLinha: number;
}

export interface Placement {
  /** Linha da reglete, começando em 1. */
  linha: number;
  /** Ordem de escrita dentro da linha: 1 = primeira janela a ser usada. */
  ordemNaLinha: number;
  /** Número da janela contando a partir da borda ESQUERDA da reglete, como quem escreve a vê. */
  janelaDaEsquerda: number;
  /** Número da janela contando a partir da borda DIREITA. */
  janelaDaDireita: number;
}

export interface LayoutStep {
  /** Índice da cela em `cells`. */
  cellIndex: number;
  cell: BrailleCell;
  /** `null` quando o espaço foi substituído por mudança de linha. */
  placement: Placement | null;
  /** Primeira cela escrita numa linha nova (linha > 1). */
  iniciaNovaLinha: boolean;
}

export interface LayoutResult {
  steps: LayoutStep[];
  totalLinhas: number;
  avisos: string[];
}

export const CELAS_POR_LINHA_PADRAO = 28;
export const CELAS_POR_LINHA_MIN = 4;
export const CELAS_POR_LINHA_MAX = 42;

/**
 * Distribui as celas nas linhas da reglete, respeitando a ordem do texto.
 * As palavras não são divididas; uma palavra maior que a linha é quebrada com aviso,
 * pois a translineação Braille ainda não foi validada.
 *
 * A ORDEM das celas é a mesma nas duas modalidades. O que muda é a janela física:
 * na tradicional a ordem 1 é a janela mais à direita; na positiva, a mais à esquerda.
 */
export function layoutCells(cells: readonly BrailleCell[], opts: LayoutOptions): LayoutResult {
  const n = Math.round(opts.celasPorLinha);
  if (!Number.isFinite(n) || n < CELAS_POR_LINHA_MIN || n > CELAS_POR_LINHA_MAX) {
    throw new RangeError(`celasPorLinha deve estar entre ${CELAS_POR_LINHA_MIN} e ${CELAS_POR_LINHA_MAX}`);
  }

  const steps: LayoutStep[] = [];
  const avisos: string[] = [];
  let linha = 1;
  let usadas = 0;

  const place = (cellIndex: number, novaLinha: boolean) => {
    usadas++;
    const ordem = usadas;
    const janelaDaEsquerda = opts.modalidade === 'tradicional' ? n - ordem + 1 : ordem;
    steps.push({
      cellIndex,
      cell: cells[cellIndex]!,
      placement: { linha, ordemNaLinha: ordem, janelaDaEsquerda, janelaDaDireita: n - janelaDaEsquerda + 1 },
      iniciaNovaLinha: novaLinha,
    });
  };

  // Agrupar em palavras separadas por celas de espaço.
  let i = 0;
  let pendenteNovaLinha = false;
  while (i < cells.length) {
    const cell = cells[i]!;
    if (cell.role === 'espaco') {
      if (usadas === 0 || usadas >= n) {
        // Espaço no início de linha ou no fim da linha: substituído pela mudança de linha.
        steps.push({ cellIndex: i, cell, placement: null, iniciaNovaLinha: false });
      } else {
        // Se a próxima palavra não cabe depois do espaço, o espaço vira mudança de linha.
        const proxima = wordLength(cells, i + 1);
        if (usadas + 1 + proxima > n && proxima <= n) {
          steps.push({ cellIndex: i, cell, placement: null, iniciaNovaLinha: false });
          linha++;
          usadas = 0;
          pendenteNovaLinha = true;
        } else {
          place(i, false);
        }
      }
      i++;
      continue;
    }

    const len = wordLength(cells, i);
    if (usadas > 0 && usadas + len > n && len <= n) {
      linha++;
      usadas = 0;
      pendenteNovaLinha = true;
    }
    if (len > n) {
      avisos.push(
        `Uma palavra tem ${len} celas e não cabe em uma linha de ${n}. Ela foi continuada na linha seguinte sem hífen; a regra de divisão silábica em Braille ainda não foi validada.`,
      );
    }
    for (let k = i; k < i + len; k++) {
      if (usadas >= n) {
        linha++;
        usadas = 0;
        pendenteNovaLinha = true;
      }
      place(k, pendenteNovaLinha && linha > 1);
      pendenteNovaLinha = false;
    }
    i += len;
  }

  return { steps, totalLinhas: steps.some((s) => s.placement) ? linha : 0, avisos };
}

function wordLength(cells: readonly BrailleCell[], inicio: number): number {
  let k = inicio;
  while (k < cells.length && cells[k]!.role !== 'espaco') k++;
  return k - inicio;
}
