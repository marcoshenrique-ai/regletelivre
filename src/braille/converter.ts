import { CHAR_RULES, pendingRuleFor, ruleById } from './rules-pt-br';
import type { BrailleCell, ConversionResult, ConversionWarning, Dot } from './types';

/**
 * Converte texto em português para celas Braille de seis pontos (Braille integral,
 * sem abreviaturas), usando somente regras com status `verificada`.
 *
 * O que não tem regra verificada vira uma cela `nao-suportado` sem pontos e gera
 * um aviso. O conversor nunca inventa correspondências.
 */
export function convertText(texto: string): ConversionResult {
  const textoNormalizado = normalize(texto);
  const cells: BrailleCell[] = [];
  const avisos: ConversionWarning[] = [];
  const chars = Array.from(textoNormalizado);

  const unsupported = (indice: number, mensagem: string, ruleId = 'nao-suportado') => {
    const caractere = chars[indice] ?? '';
    cells.push({ dots: [], role: 'nao-suportado', origem: caractere, indiceTexto: indice, ruleId });
    avisos.push({ indiceTexto: indice, caractere, mensagem });
  };

  let i = 0;
  while (i < chars.length) {
    const ch = chars[i]!;

    // Espaço
    if (ch === ' ') {
      cells.push({ dots: [], role: 'espaco', origem: ' ', indiceTexto: i, ruleId: 'espaco' });
      i++;
      continue;
    }

    // Início de palavra: decidir sobre o sinal de caixa alta.
    const inicioDePalavra = i === 0 || chars[i - 1] === ' ';
    if (inicioDePalavra) {
      const fim = indexOfWordEnd(chars, i);
      const palavra = chars.slice(i, fim);
      if (isAllCapsWord(palavra)) {
        i = emitCapsWord(chars, i, fim, cells, unsupported);
        continue;
      }
    }

    // Números
    if (isDigit(ch)) {
      i = emitNumber(chars, i, cells, unsupported);
      continue;
    }

    // Reticências digitadas como "..." ficam bloqueadas (regra pendente).
    if (ch === '.' && chars[i + 1] === '.' && chars[i + 2] === '.') {
      const msg = mensagemPendente('…');
      for (let k = 0; k < 3; k++) unsupported(i + k, msg, 'pontuacao-reticencias');
      i += 3;
      continue;
    }

    // Letras (com eventual maiúscula) e pontuação
    emitChar(chars, i, cells, unsupported, true);
    i++;
  }

  return { textoNormalizado, cells, avisos, temPendencias: avisos.length > 0 };
}

/** Normaliza para NFC, troca quebras de linha e tabulações por espaço e reduz espaços repetidos. */
export function normalize(texto: string): string {
  return texto.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

type UnsupportedFn = (indice: number, mensagem: string, ruleId?: string) => void;

function emitChar(
  chars: string[],
  i: number,
  cells: BrailleCell[],
  unsupported: UnsupportedFn,
  marcarMaiuscula: boolean,
): void {
  const ch = chars[i]!;
  const lower = ch.toLocaleLowerCase('pt-BR');
  const isUpper = lower !== ch;
  const rule = CHAR_RULES.get(lower);

  if (!rule || !rule.celas || rule.categoria === 'numero' || rule.categoria === 'espaco') {
    unsupported(i, mensagemPendente(ch), pendingRuleFor(lower)?.id);
    return;
  }

  if (isUpper && marcarMaiuscula) {
    cells.push({ dots: ruleById('sinal-maiuscula').celas![0]!, role: 'sinal-maiuscula', origem: ch, indiceTexto: i, ruleId: 'sinal-maiuscula' });
  }
  const role = rule.categoria === 'pontuacao' ? 'pontuacao' : 'letra';
  for (const dots of rule.celas) {
    cells.push({ dots: [...dots], role, origem: ch, indiceTexto: i, ruleId: rule.id });
  }
}

function emitCapsWord(
  chars: string[],
  inicio: number,
  fim: number,
  cells: BrailleCell[],
  unsupported: UnsupportedFn,
): number {
  const palavra = chars.slice(inicio, fim).join('');
  const primeiraLetra = chars.findIndex((c, k) => k >= inicio && k < fim && isLetter(c));
  for (let k = inicio; k < fim; k++) {
    if (k === primeiraLetra) {
      for (const dots of ruleById('sinal-caixa-alta').celas!) {
        cells.push({ dots: [...dots], role: 'sinal-caixa-alta', origem: palavra, indiceTexto: k, ruleId: 'sinal-caixa-alta' });
      }
    }
    const c = chars[k]!;
    if (isDigit(c)) {
      // Palavra em caixa alta com algarismos (ex.: "A4"): combinação não confirmada.
      unsupported(k, 'Palavra em maiúsculas misturada com algarismos: regra ainda não validada.', 'numero-seguido-de-letra');
      continue;
    }
    if (c === '.' && chars[k + 1] === '.' && chars[k + 2] === '.') {
      const msg = mensagemPendente('…');
      for (let j = 0; j < 3; j++) unsupported(k + j, msg, 'pontuacao-reticencias');
      k += 2;
      continue;
    }
    emitChar(chars, k, cells, unsupported, false);
  }
  return fim;
}

function emitNumber(chars: string[], inicio: number, cells: BrailleCell[], unsupported: UnsupportedFn): number {
  // Token numérico máximo: algarismos, com possíveis separadores internos , ou .
  let fim = inicio;
  while (fim < chars.length && isDigit(chars[fim]!)) fim++;
  let comSeparador = false;
  while (
    fim + 1 < chars.length &&
    (chars[fim] === ',' || chars[fim] === '.') &&
    isDigit(chars[fim + 1]!)
  ) {
    comSeparador = true;
    fim++;
    while (fim < chars.length && isDigit(chars[fim]!)) fim++;
  }

  const seguinte = chars[fim];
  const anterior = chars[inicio - 1];
  const delimitadoDepois = seguinte === undefined || seguinte === ' ';
  const delimitadoAntes = anterior === undefined || anterior === ' ';

  if (comSeparador) {
    for (let k = inicio; k < fim; k++) {
      unsupported(k, 'Número com vírgula decimal ou ponto de milhar: regra ainda não validada.', 'numero-separadores');
    }
    return fim;
  }
  if (!delimitadoDepois || !delimitadoAntes) {
    for (let k = inicio; k < fim; k++) {
      unsupported(
        k,
        'Número colado a letra ou sinal (ex.: "3a", "5.", "(2"): regra de separação ainda não validada. Separe com espaço ou escreva por extenso.',
        'numero-seguido-de-letra',
      );
    }
    return fim;
  }

  cells.push({
    dots: ruleById('sinal-numero').celas![0]!,
    role: 'sinal-numero',
    origem: chars.slice(inicio, fim).join(''),
    indiceTexto: inicio,
    ruleId: 'sinal-numero',
  });
  for (let k = inicio; k < fim; k++) {
    const rule = ruleById(`digito-${chars[k]}`);
    cells.push({ dots: [...rule.celas![0]!], role: 'digito', origem: chars[k]!, indiceTexto: k, ruleId: rule.id });
  }
  return fim;
}

function mensagemPendente(ch: string): string {
  const pend = pendingRuleFor(ch.toLocaleLowerCase('pt-BR'));
  if (pend) return `"${ch}" (${pend.nome}): regra ainda não validada. ${pend.observacao ?? ''}`.trim();
  return `"${ch}": não há regra Braille validada para este caractere nesta versão.`;
}

function indexOfWordEnd(chars: string[], inicio: number): number {
  let k = inicio;
  while (k < chars.length && chars[k] !== ' ') k++;
  return k;
}

function isAllCapsWord(palavra: string[]): boolean {
  const letras = palavra.filter(isLetter);
  if (letras.length < 2) return false;
  return letras.every((c) => c !== c.toLocaleLowerCase('pt-BR') && c === c.toLocaleUpperCase('pt-BR'));
}

export function isLetter(c: string): boolean {
  return /\p{L}/u.test(c);
}

export function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

/** Converte uma lista de pontos no caractere Unicode Braille correspondente (U+2800–U+283F). */
export function dotsToUnicode(dots: readonly Dot[]): string {
  const bits: Record<Dot, number> = { 1: 0x01, 2: 0x02, 3: 0x04, 4: 0x08, 5: 0x10, 6: 0x20 };
  let code = 0x2800;
  for (const dot of dots) code |= bits[dot];
  return String.fromCodePoint(code);
}

/** "pontos 1, 2 e 5" / "ponto 3" / "nenhum ponto". */
export function describeDots(dots: readonly Dot[]): string {
  const sorted = [...dots].sort((a, b) => a - b);
  if (sorted.length === 0) return 'nenhum ponto';
  if (sorted.length === 1) return `ponto ${sorted[0]}`;
  return `pontos ${sorted.slice(0, -1).join(', ')} e ${sorted[sorted.length - 1]}`;
}
