import { describeDots } from '../braille/converter';
import { ruleById } from '../braille/rules-pt-br';
import type { BrailleCell } from '../braille/types';
import type { LayoutStep } from '../reglete/layout';
import { MODALIDADES, descreverPosicao, posicaoDeLeitura, posicaoNaReglete, type Modalidade } from '../reglete/modality';

/**
 * Nível de orientação verbal:
 * - `breve`: só o essencial (número da cela e pontos);
 * - `padrao`: acrescenta o que a cela representa e a linha;
 * - `detalhada`: acrescenta a posição física de cada ponto na janela.
 */
export type Verbosidade = 'breve' | 'padrao' | 'detalhada';

export function nomeDaCela(cell: BrailleCell): string {
  switch (cell.role) {
    case 'letra': {
      const rule = ruleById(cell.ruleId);
      return rule.nome;
    }
    case 'pontuacao':
      return ruleById(cell.ruleId).nome;
    case 'sinal-maiuscula':
      return `sinal de maiúscula, para a letra ${cell.origem.toLocaleLowerCase('pt-BR')} maiúscula`;
    case 'sinal-caixa-alta':
      return `sinal de palavra em maiúsculas, para "${cell.origem}"`;
    case 'sinal-numero':
      return `sinal de número, para ${cell.origem}`;
    case 'digito':
      return `algarismo ${cell.origem}`;
    case 'espaco':
      return 'espaço';
    case 'nao-suportado':
      return `caractere "${cell.origem}" sem regra validada`;
  }
}

export function instrucaoDePontos(cell: BrailleCell, modalidade: Modalidade, verbosidade: Verbosidade): string {
  if (cell.role === 'espaco') return 'Deixe esta janela em branco e passe para a próxima.';
  if (cell.role === 'nao-suportado') {
    return 'Ainda não há regra Braille validada para este caractere. Não marque nada; peça orientação a um revisor ou professor de Braille.';
  }
  const pontos = `Marque ${cell.dots.length === 1 ? 'o' : 'os'} ${describeDots(cell.dots)}.`;
  if (verbosidade !== 'detalhada') return pontos;
  const posicoes = [...cell.dots]
    .sort((a, b) => a - b)
    .map((dot) => `ponto ${dot}: ${descreverPosicao(posicaoNaReglete(modalidade, dot))}`)
    .join('; ');
  return `${pontos} Na ${MODALIDADES[modalidade].nome.toLowerCase()}: ${posicoes}.`;
}

/** Linha dentro da posição atual da reglete (1..N), quando N (linhas da reglete) é conhecido. */
export function linhaNaReglete(linha: number, linhasDaReglete: number): number {
  return linhasDaReglete > 0 ? ((linha - 1) % linhasDaReglete) + 1 : linha;
}

/** A primeira cela de uma linha que não cabe mais na posição atual da reglete. */
export function precisaDeslocar(step: LayoutStep, linhasDaReglete: number): boolean {
  return (
    linhasDaReglete > 0 && step.iniciaNovaLinha && !!step.placement && (step.placement.linha - 1) % linhasDaReglete === 0
  );
}

export function localizacao(step: LayoutStep, modalidade: Modalidade, linhasDaReglete = 0): string {
  if (!step.placement) return 'Este espaço coincide com o fim da linha: nada a marcar.';
  const lado = modalidade === 'tradicional' ? 'da direita' : 'da esquerda';
  const janela = modalidade === 'tradicional' ? step.placement.janelaDaDireita : step.placement.janelaDaEsquerda;
  const linha = step.placement.linha;
  const extra =
    linhasDaReglete > 0 && linha > linhasDaReglete ? ` (linha ${linhaNaReglete(linha, linhasDaReglete)} da reglete)` : '';
  return `Linha ${linha}${extra}, janela ${janela} a partir ${lado}.`;
}

export function anunciarPasso(
  steps: readonly LayoutStep[],
  indice: number,
  modalidade: Modalidade,
  verbosidade: Verbosidade,
  linhasDaReglete = 0,
): string {
  const step = steps[indice];
  if (!step) return 'Não há celas para escrever.';
  const total = steps.length;
  const cabecalho = `Cela ${indice + 1} de ${total}.`;
  const partes: string[] = [cabecalho];

  if (precisaDeslocar(step, linhasDaReglete)) {
    partes.push(
      `A reglete está cheia (${linhasDaReglete} ${linhasDaReglete === 1 ? 'linha' : 'linhas'}). ` +
        'Desloque a reglete para baixo na folha, ou troque de folha, e continue pela primeira linha dela, ' +
        (modalidade === 'tradicional' ? 'começando pela janela mais à direita.' : 'começando pela janela mais à esquerda.'),
    );
  } else if (step.iniciaNovaLinha) {
    const alvo = linhaNaReglete(step.placement!.linha, linhasDaReglete);
    partes.push(
      modalidade === 'tradicional'
        ? `Mude para a linha ${alvo} e comece pela janela mais à direita.`
        : `Mude para a linha ${alvo} e comece pela janela mais à esquerda.`,
    );
  }

  if (verbosidade === 'breve') {
    partes.push(step.cell.role === 'espaco' ? 'Espaço.' : `${capitalizar(nomeDaCela(step.cell))}.`);
    partes.push(instrucaoDePontos(step.cell, modalidade, verbosidade));
    return partes.join(' ');
  }

  partes.push(localizacao(step, modalidade, linhasDaReglete));
  partes.push(`${capitalizar(nomeDaCela(step.cell))}.`);
  partes.push(instrucaoDePontos(step.cell, modalidade, verbosidade));
  return partes.join(' ');
}

export function anunciarInicio(totalCelas: number, totalLinhas: number, modalidade: Modalidade, verbosidade: Verbosidade): string {
  const info = MODALIDADES[modalidade];
  const base = `Modo guiado iniciado: ${totalCelas} ${totalCelas === 1 ? 'cela' : 'celas'} em ${totalLinhas} ${totalLinhas === 1 ? 'linha' : 'linhas'}, ${info.nome.toLowerCase()}.`;
  if (verbosidade === 'breve') return base;
  return `${base} Escreva ${info.descricaoDirecao}. ${info.ladoDoRelevo}`;
}

export function anunciarFim(modalidade: Modalidade): string {
  return `Fim do texto. ${MODALIDADES[modalidade].leitura} Para conferir cela por cela, use Conferir pelo tato.`;
}

// ---------------------------------------------------------------------------
// Conferência pelo tato
//
// Depois de escrever, a pessoa lê a folha com os dedos e compara com o que o app
// esperava. Quem valida é sempre a pessoa (ou quem a acompanha): o app só diz o
// que deveria estar ali, na orientação de LEITURA (pontos 1-2-3 à esquerda).
// ---------------------------------------------------------------------------

export function anunciarInicioConferencia(modalidade: Modalidade, verbosidade: Verbosidade): string {
  const preparo =
    modalidade === 'tradicional'
      ? 'Retire a folha da reglete e vire-a.'
      : 'Não é preciso virar a folha; se quiser, retire-a da reglete.';
  const base = `Conferência pelo tato. ${preparo} Leia da esquerda para a direita, começando pela linha 1.`;
  if (verbosidade === 'breve') return base;
  return `${base} Em cada cela, compare com o que eu disser. Se algo estiver diferente ou pouco nítido, marque a cela com problema.`;
}

export function anunciarPassoConferencia(
  steps: readonly LayoutStep[],
  indice: number,
  verbosidade: Verbosidade,
  marcada: boolean,
): string {
  const step = steps[indice];
  if (!step) return 'Não há celas para conferir.';
  const partes = [`Leitura, cela ${indice + 1} de ${steps.length}.`];
  if (step.iniciaNovaLinha) partes.push(`Passe para a linha ${step.placement!.linha}, no começo à esquerda.`);
  if (!step.placement) {
    partes.push('Espaço que coincide com o fim da linha: nada a sentir aqui.');
  } else if (verbosidade !== 'breve') {
    partes.push(`Linha ${step.placement.linha}, cela ${step.placement.ordemNaLinha} a partir da esquerda.`);
  }
  const cell = step.cell;
  if (cell.role === 'espaco') {
    if (step.placement) partes.push('Deve estar em branco: espaço.');
  } else if (cell.role === 'nao-suportado') {
    partes.push('Aqui não havia regra validada; esta cela deveria estar em branco.');
  } else {
    partes.push(`Você deve sentir: ${nomeDaCela(cell)}, ${describeDots(cell.dots)}.`);
    if (verbosidade === 'detalhada') {
      const posicoes = [...cell.dots]
        .sort((a, b) => a - b)
        .map((dot) => `ponto ${dot}: ${descreverPosicao(posicaoDeLeitura(dot))}`)
        .join('; ');
      partes.push(`Na leitura: ${posicoes}.`);
    }
  }
  if (marcada) partes.push('Esta cela está marcada com problema.');
  return partes.join(' ');
}

export function resumoConferencia(steps: readonly LayoutStep[], marcadas: readonly number[]): string {
  if (marcadas.length === 0) {
    return 'Fim da conferência. Nenhuma cela marcada com problema. Lembre: só o toque confirma que o relevo ficou legível.';
  }
  const lista = marcadas
    .map((i) => {
      const s = steps[i]!;
      return `cela ${i + 1}${s.placement ? `, linha ${s.placement.linha}` : ''}: ${nomeDaCela(s.cell)}`;
    })
    .join('; ');
  const n = marcadas.length;
  return `Fim da conferência. ${n} ${n === 1 ? 'cela marcada' : 'celas marcadas'} com problema: ${lista}. Use Reescrever celas marcadas para receber a orientação de escrita de cada uma.`;
}

function capitalizar(s: string): string {
  return s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1);
}
