/**
 * Tipos do mecanismo Braille. Este módulo não depende do DOM.
 */

/** Um dos seis pontos da cela Braille, numerados de 1 a 6. */
export type Dot = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Situação de uma regra.
 * - `verificada`: conferida em pelo menos duas fontes independentes e coberta por testes.
 *   É usada pelo conversor. Ainda assim depende de revisão humana (ver `revisaoHumana`).
 * - `pendente`: não confirmada. O conversor NUNCA a usa; o caractere vira um aviso.
 */
export type RuleStatus = 'verificada' | 'pendente';

/** Revisão por pessoa qualificada (revisor(a) Braille, professor(a) especializado(a)). */
export type HumanReview = 'pendente' | 'aprovada';

export type RuleCategory =
  | 'letra'
  | 'letra-acentuada'
  | 'pontuacao'
  | 'sinal-composicao'
  | 'numero'
  | 'espaco';

export interface BrailleRule {
  /** Identificador estável, usado em testes e na documentação (ex.: `letra-a`). */
  id: string;
  /** Caractere(s) em tinta a que a regra se aplica. Vazio para sinais de composição. */
  tinta: string;
  /** Nome legível em português. */
  nome: string;
  categoria: RuleCategory;
  /**
   * Celas produzidas (cada cela é uma lista de pontos). `null` quando a regra está
   * pendente e não temos correspondência confirmada — nunca inventamos pontos.
   */
  celas: Dot[][] | null;
  status: RuleStatus;
  revisaoHumana: HumanReview;
  /** Chaves de `SOURCES` que sustentam a regra. */
  fontes: string[];
  observacao?: string;
}

/** Papel da cela na escrita, útil para as mensagens do modo guiado. */
export type CellRole =
  | 'letra'
  | 'pontuacao'
  | 'sinal-maiuscula'
  | 'sinal-caixa-alta'
  | 'sinal-numero'
  | 'digito'
  | 'espaco'
  | 'nao-suportado';

export interface BrailleCell {
  /** Pontos a marcar. Vazio para espaço e para caracteres não suportados. */
  dots: Dot[];
  role: CellRole;
  /** Trecho do texto original que originou a cela (ex.: "B" para o sinal de maiúscula de "B"). */
  origem: string;
  /** Posição (índice) do caractere de origem no texto normalizado. */
  indiceTexto: number;
  /** Regra aplicada. */
  ruleId: string;
}

export interface ConversionWarning {
  indiceTexto: number;
  caractere: string;
  mensagem: string;
}

export interface ConversionResult {
  textoNormalizado: string;
  cells: BrailleCell[];
  avisos: ConversionWarning[];
  /** Verdadeiro quando o texto contém algo sem regra validada. */
  temPendencias: boolean;
}
