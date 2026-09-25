import type { BrailleRule, Dot } from './types';

/**
 * Tabela de regras Braille para o português do Brasil.
 *
 * Política do projeto (ver docs/REGRAS-BRAILLE.md):
 * 1. Só entra como `verificada` o que foi encontrado igual em ≥ 2 fontes independentes
 *    e tem teste automatizado.
 * 2. O que não foi confirmado fica `pendente`, com `celas: null`. O conversor recusa
 *    esses caracteres e avisa a pessoa — nunca inventa pontos.
 * 3. Toda regra tem `revisaoHumana: 'pendente'` até conferência na Grafia Braille
 *    para a Língua Portuguesa por revisor(a) qualificado(a).
 */

const d = (...dots: Dot[]): Dot[] => dots;

const FONTES_LETRAS = ['wikipediaPt', 'wikipediaEn', 'liblouisPtPt', 'grafia2018'];
const FONTES_ACENTOS = ['wikipediaPt', 'megapontes', 'liblouisPtPt', 'grafia2018'];
const FONTES_PONTUACAO = ['wikipediaPt', 'megapontes', 'intervox', 'liblouisPtPt', 'grafia2018'];

function letra(ch: string, dots: Dot[]): BrailleRule {
  return {
    id: `letra-${ch}`,
    tinta: ch,
    nome: `letra ${ch}`,
    categoria: 'letra',
    celas: [dots],
    status: 'verificada',
    revisaoHumana: 'pendente',
    fontes: FONTES_LETRAS,
  };
}

function acentuada(ch: string, nome: string, dots: Dot[]): BrailleRule {
  return {
    id: `letra-${ch}`,
    tinta: ch,
    nome,
    categoria: 'letra-acentuada',
    celas: [dots],
    status: 'verificada',
    revisaoHumana: 'pendente',
    fontes: FONTES_ACENTOS,
  };
}

function pontuacao(id: string, ch: string, nome: string, dots: Dot[], fontes = FONTES_PONTUACAO): BrailleRule {
  return {
    id: `pontuacao-${id}`,
    tinta: ch,
    nome,
    categoria: 'pontuacao',
    celas: [dots],
    status: 'verificada',
    revisaoHumana: 'pendente',
    fontes,
  };
}

function pendente(
  id: string,
  tinta: string,
  nome: string,
  categoria: BrailleRule['categoria'],
  observacao: string,
): BrailleRule {
  return {
    id,
    tinta,
    nome,
    categoria,
    celas: null,
    status: 'pendente',
    revisaoHumana: 'pendente',
    fontes: ['grafia2018'],
    observacao,
  };
}

export const RULES: BrailleRule[] = [
  // --- Alfabeto básico -------------------------------------------------------
  letra('a', d(1)),
  letra('b', d(1, 2)),
  letra('c', d(1, 4)),
  letra('d', d(1, 4, 5)),
  letra('e', d(1, 5)),
  letra('f', d(1, 2, 4)),
  letra('g', d(1, 2, 4, 5)),
  letra('h', d(1, 2, 5)),
  letra('i', d(2, 4)),
  letra('j', d(2, 4, 5)),
  letra('k', d(1, 3)),
  letra('l', d(1, 2, 3)),
  letra('m', d(1, 3, 4)),
  letra('n', d(1, 3, 4, 5)),
  letra('o', d(1, 3, 5)),
  letra('p', d(1, 2, 3, 4)),
  letra('q', d(1, 2, 3, 4, 5)),
  letra('r', d(1, 2, 3, 5)),
  letra('s', d(2, 3, 4)),
  letra('t', d(2, 3, 4, 5)),
  letra('u', d(1, 3, 6)),
  letra('v', d(1, 2, 3, 6)),
  letra('w', d(2, 4, 5, 6)),
  letra('x', d(1, 3, 4, 6)),
  letra('y', d(1, 3, 4, 5, 6)),
  letra('z', d(1, 3, 5, 6)),

  // --- Letras com diacríticos usadas no português do Brasil -------------------
  acentuada('á', 'a com acento agudo', d(1, 2, 3, 5, 6)),
  acentuada('é', 'e com acento agudo', d(1, 2, 3, 4, 5, 6)),
  acentuada('í', 'i com acento agudo', d(3, 4)),
  acentuada('ó', 'o com acento agudo', d(3, 4, 6)),
  acentuada('ú', 'u com acento agudo', d(2, 3, 4, 5, 6)),
  acentuada('à', 'a com acento grave (crase)', d(1, 2, 4, 6)),
  acentuada('â', 'a com acento circunflexo', d(1, 6)),
  acentuada('ê', 'e com acento circunflexo', d(1, 2, 6)),
  acentuada('ô', 'o com acento circunflexo', d(1, 4, 5, 6)),
  acentuada('ã', 'a com til', d(3, 4, 5)),
  acentuada('õ', 'o com til', d(2, 4, 6)),
  acentuada('ç', 'c cedilha', d(1, 2, 3, 4, 6)),
  acentuada('ü', 'u com trema', d(1, 2, 5, 6)),

  // --- Pontuação ---------------------------------------------------------------
  pontuacao('virgula', ',', 'vírgula', d(2)),
  pontuacao('ponto-e-virgula', ';', 'ponto e vírgula', d(2, 3)),
  pontuacao('dois-pontos', ':', 'dois-pontos', d(2, 5)),
  pontuacao('ponto-final', '.', 'ponto final', d(3), ['wikipediaPt', 'megapontes', 'wikipediaEn', 'liblouisPtPt', 'grafia2018']),
  pontuacao('interrogacao', '?', 'ponto de interrogação', d(2, 6)),
  pontuacao('exclamacao', '!', 'ponto de exclamação', d(2, 3, 5)),
  pontuacao('hifen', '-', 'hífen', d(3, 6)),

  // --- Sinais de composição -----------------------------------------------------
  {
    id: 'sinal-maiuscula',
    tinta: '',
    nome: 'sinal de maiúscula',
    categoria: 'sinal-composicao',
    celas: [d(4, 6)],
    status: 'verificada',
    revisaoHumana: 'pendente',
    fontes: ['wikipediaPt', 'megapontes', 'intervox', 'wikipediaEn', 'liblouisPtPt', 'grafia2018'],
    observacao: 'Colocado antes da letra maiúscula.',
  },
  {
    id: 'sinal-caixa-alta',
    tinta: '',
    nome: 'sinal de palavra em caixa alta',
    categoria: 'sinal-composicao',
    celas: [d(4, 6), d(4, 6)],
    status: 'verificada',
    revisaoHumana: 'pendente',
    fontes: ['wikipediaPt', 'intervox', 'liblouisPtPt', 'grafia2018'],
    observacao:
      'Duas celas 46 antes de uma palavra inteira em maiúsculas (2 letras ou mais). Aplicado palavra a palavra; o sinal para sequência de várias palavras está pendente.',
  },
  {
    id: 'sinal-numero',
    tinta: '',
    nome: 'sinal de número',
    categoria: 'sinal-composicao',
    celas: [d(3, 4, 5, 6)],
    status: 'verificada',
    revisaoHumana: 'pendente',
    fontes: ['wikipediaPt', 'megapontes', 'intervox', 'wikipediaEn', 'liblouisPtPt', 'grafia2018'],
    observacao:
      'Antecede os algarismos, que usam as celas das letras a–j. Nesta versão, só para números inteiros seguidos de espaço ou fim do texto.',
  },

  // --- Algarismos (após o sinal de número) --------------------------------------
  ...(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const).map(
    (digito, i): BrailleRule => ({
      id: `digito-${digito}`,
      tinta: digito,
      nome: `algarismo ${digito}`,
      categoria: 'numero',
      celas: [
        [d(1), d(1, 2), d(1, 4), d(1, 4, 5), d(1, 5), d(1, 2, 4), d(1, 2, 4, 5), d(1, 2, 5), d(2, 4), d(2, 4, 5)][i]!,
      ],
      status: 'verificada',
      revisaoHumana: 'pendente',
      fontes: ['wikipediaPt', 'wikipediaEn', 'liblouisPtPt', 'grafia2018'],
    }),
  ),

  // --- Espaço -----------------------------------------------------------------
  {
    id: 'espaco',
    tinta: ' ',
    nome: 'espaço',
    categoria: 'espaco',
    celas: [[]],
    status: 'verificada',
    revisaoHumana: 'pendente',
    fontes: ['wikipediaPt', 'wikipediaEn', 'grafia2018'],
    observacao: 'Uma janela da reglete deixada em branco.',
  },

  // --- PENDENTES: não usadas pelo conversor ----------------------------------------
  pendente('pontuacao-aspas', '"“”', 'aspas', 'pontuacao',
    'Fontes secundárias citam 236; a tabela liblouis pt-pt usa 236 para " e 56 236 para “ ”. Confirmar o uso no Brasil (Grafia 2018).'),
  pendente('pontuacao-aspas-simples', "‘’", 'aspas simples', 'pontuacao', 'Sem confirmação.'),
  pendente('pontuacao-apostrofo', "'", 'apóstrofo', 'pontuacao',
    'Fontes citam ponto 3, o mesmo do ponto final; confirmar uso e contexto na Grafia 2018.'),
  pendente('pontuacao-parenteses', '()', 'parênteses', 'pontuacao',
    'Intervox e liblouis pt-pt indicam 126 3 (abre) e 6 345 (fecha); a Wikipédia lista variantes. Confirmar na Grafia 2018 antes de habilitar.'),
  pendente('pontuacao-colchetes', '[]', 'colchetes', 'pontuacao', 'Sem confirmação.'),
  pendente('pontuacao-reticencias', '…', 'reticências', 'pontuacao',
    'Wikipédia e Intervox citam 3 3 3; liblouis pt-pt usa 35 26 35 para …. Fontes divergem; confirmar na Grafia 2018.'),
  pendente('pontuacao-travessao', '—–', 'travessão', 'pontuacao', 'Fontes divergem. Confirmar.'),
  pendente('pontuacao-barra', '/', 'barra', 'pontuacao', 'Sem confirmação.'),
  pendente('letra-e-grave', 'è', 'e com acento grave', 'letra-acentuada', 'Não usado no português do Brasil; confirmar.'),
  pendente('letra-i-grave', 'ì', 'i com acento grave', 'letra-acentuada', 'Não usado no português do Brasil; confirmar.'),
  pendente('letra-o-grave', 'ò', 'o com acento grave', 'letra-acentuada', 'Wikipédia e liblouis pt-pt usam 2456, a mesma cela do w; confirmar.'),
  pendente('letra-u-grave', 'ù', 'u com acento grave', 'letra-acentuada', 'Não usado no português do Brasil; confirmar.'),
  pendente('letra-i-trema', 'ï', 'i com trema', 'letra-acentuada', 'Sem confirmação.'),
  pendente('numero-seguido-de-letra', '', 'número seguido de letra', 'numero',
    'Regra de separação entre algarismo e letra de a a j não confirmada.'),
  pendente('numero-separadores', '', 'vírgula decimal e ponto de milhar', 'numero',
    'Dentro de números, vírgula e ponto têm regras próprias; não confirmadas.'),
  pendente('numero-ordinal-fracao', 'ºª%', 'ordinais, porcentagem e frações', 'numero', 'Sem confirmação.'),
  pendente('sinal-caixa-alta-sequencia', '', 'caixa alta em sequência de várias palavras', 'sinal-composicao',
    'Nesta versão aplicamos o sinal de caixa alta palavra a palavra.'),
  pendente('quebra-de-linha-hifenizacao', '', 'translineação (divisão de palavras no fim da linha)', 'sinal-composicao',
    'O app não divide palavras; se a palavra não cabe, avisa a pessoa.'),
];

/** Índice por caractere, somente das regras verificadas de caractere único. */
export const CHAR_RULES: ReadonlyMap<string, BrailleRule> = new Map(
  RULES.filter((r) => r.status === 'verificada' && r.tinta.length === 1).map((r) => [r.tinta, r]),
);

/** Regra pendente que cobre um caractere, para mensagens de aviso mais claras. */
export function pendingRuleFor(ch: string): BrailleRule | undefined {
  return RULES.find((r) => r.status === 'pendente' && r.tinta.includes(ch));
}

export function ruleById(id: string): BrailleRule {
  const rule = RULES.find((r) => r.id === id);
  if (!rule) throw new Error(`Regra inexistente: ${id}`);
  return rule;
}
