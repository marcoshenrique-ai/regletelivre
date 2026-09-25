import { convertText, describeDots } from '../braille/converter';
import { ruleById } from '../braille/rules-pt-br';
import type { BrailleCell, Dot } from '../braille/types';
import { descreverPosicao, pontoNaPosicao, posicaoNaReglete, type Altura, type Coluna, type Modalidade } from '../reglete/modality';

export type Nivel =
  | 'pontos'
  | 'letras-a-j'
  | 'letras-k-t'
  | 'letras-u-z'
  | 'acentuadas'
  | 'palavras'
  | 'palavras-acentuadas'
  | 'palavras-maiusculas';

export interface NivelInfo {
  id: Nivel;
  titulo: string;
  descricao: string;
}

export const NIVEIS: NivelInfo[] = [
  { id: 'pontos', titulo: '1. Reconhecer os pontos', descricao: 'Onde fica cada ponto na janela da sua reglete.' },
  { id: 'letras-a-j', titulo: '2. Letras de a até j', descricao: 'Usam só os pontos 1, 2, 4 e 5.' },
  { id: 'letras-k-t', titulo: '3. Letras de k até t', descricao: 'São as letras de a até j com o ponto 3.' },
  { id: 'letras-u-z', titulo: '4. Letras u, v, w, x, y, z', descricao: 'Em geral, letras de a até e com os pontos 3 e 6; o w é exceção.' },
  { id: 'acentuadas', titulo: '5. Letras acentuadas e ç', descricao: 'á, é, í, ó, ú, à, â, ê, ô, ã, õ, ç, ü.' },
  { id: 'palavras', titulo: '6. Palavras curtas', descricao: 'Palavras sem acento, cela por cela.' },
  { id: 'palavras-acentuadas', titulo: '7. Palavras com acento', descricao: 'Palavras com acentos e ç.' },
  { id: 'palavras-maiusculas', titulo: '8. Nomes com maiúscula', descricao: 'Palavras que começam com letra maiúscula.' },
];

const LETRAS: Record<'letras-a-j' | 'letras-k-t' | 'letras-u-z' | 'acentuadas', string[]> = {
  'letras-a-j': 'abcdefghij'.split(''),
  'letras-k-t': 'klmnopqrst'.split(''),
  'letras-u-z': 'uvwxyz'.split(''),
  acentuadas: ['á', 'é', 'í', 'ó', 'ú', 'à', 'â', 'ê', 'ô', 'ã', 'õ', 'ç', 'ü'],
};

const PALAVRAS: Record<'palavras' | 'palavras-acentuadas' | 'palavras-maiusculas', string[]> = {
  palavras: ['sol', 'mar', 'casa', 'bola', 'gato', 'livro', 'amigo', 'escola', 'janela', 'ponto'],
  'palavras-acentuadas': ['café', 'pão', 'você', 'avó', 'maçã', 'três', 'água', 'lápis', 'irmã', 'ônibus'],
  'palavras-maiusculas': ['Ana', 'Brasil', 'Recife', 'Maria', 'Pedro', 'Bahia', 'João', 'Belém'],
};

export type Rng = () => number;

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length) % arr.length]!;
}

export interface Opcao {
  valor: string;
  rotulo: string;
}

export type Exercicio =
  | {
      tipo: 'escolha';
      nivel: Nivel;
      enunciado: string;
      opcoes: Opcao[];
      resposta: string;
      explicacao: string;
    }
  | {
      tipo: 'pontos';
      nivel: Nivel;
      enunciado: string;
      alvo: string;
      resposta: Dot[];
    }
  | {
      tipo: 'palavra';
      nivel: Nivel;
      enunciado: string;
      palavra: string;
      celas: BrailleCell[];
    };

const ALTURAS: Altura[] = ['superior', 'meio', 'inferior'];
const COLUNAS: Coluna[] = ['esquerda', 'direita'];

export function gerarExercicio(nivel: Nivel, modalidade: Modalidade, rng: Rng = Math.random): Exercicio {
  if (nivel === 'pontos') return gerarExercicioDePontos(modalidade, rng);
  if (nivel in LETRAS) {
    const letra = pick(LETRAS[nivel as keyof typeof LETRAS], rng);
    const rule = ruleById(`letra-${letra}`);
    return {
      tipo: 'pontos',
      nivel,
      enunciado: `Marque os pontos da ${rule.nome === `letra ${letra}` ? `letra ${letra}` : `letra ${letra}, ${rule.nome}`}.`,
      alvo: letra,
      resposta: [...rule.celas![0]!],
    };
  }
  const palavra = pick(PALAVRAS[nivel as keyof typeof PALAVRAS], rng);
  const { cells, temPendencias } = convertText(palavra);
  if (temPendencias) throw new Error(`Palavra de exercício sem regra validada: ${palavra}`);
  return {
    tipo: 'palavra',
    nivel,
    enunciado: `Escreva a palavra "${palavra}" cela por cela. Ela tem ${cells.length} ${cells.length === 1 ? 'cela' : 'celas'}.`,
    palavra,
    celas: cells,
  };
}

function gerarExercicioDePontos(modalidade: Modalidade, rng: Rng): Exercicio {
  const nomeMod = modalidade === 'tradicional' ? 'reglete tradicional' : 'reglete positiva';
  if (rng() < 0.5) {
    const dot = pick([1, 2, 3, 4, 5, 6] as Dot[], rng);
    const correta = posicaoNaReglete(modalidade, dot);
    const opcoes: Opcao[] = [];
    for (const coluna of COLUNAS) {
      for (const altura of ALTURAS) {
        opcoes.push({ valor: `${coluna}-${altura}`, rotulo: descreverPosicao({ coluna, altura }) });
      }
    }
    return {
      tipo: 'escolha',
      nivel: 'pontos',
      enunciado: `Na ${nomeMod}, em que posição da janela você marca o ponto ${dot}?`,
      opcoes,
      resposta: `${correta.coluna}-${correta.altura}`,
      explicacao: `Na ${nomeMod}, o ponto ${dot} fica na ${descreverPosicao(correta)}.`,
    };
  }
  const coluna = pick(COLUNAS, rng);
  const altura = pick(ALTURAS, rng);
  const dot = pontoNaPosicao(modalidade, { coluna, altura });
  return {
    tipo: 'escolha',
    nivel: 'pontos',
    enunciado: `Na ${nomeMod}, qual ponto você marca na ${descreverPosicao({ coluna, altura })} da janela?`,
    opcoes: [1, 2, 3, 4, 5, 6].map((n) => ({ valor: String(n), rotulo: `Ponto ${n}` })),
    resposta: String(dot),
    explicacao: `Na ${nomeMod}, a ${descreverPosicao({ coluna, altura })} corresponde ao ponto ${dot}.`,
  };
}

export interface Correcao {
  correto: boolean;
  mensagem: string;
}

export function corrigirEscolha(ex: Extract<Exercicio, { tipo: 'escolha' }>, valor: string | null): Correcao {
  if (!valor) return { correto: false, mensagem: 'Escolha uma opção antes de conferir.' };
  if (valor === ex.resposta) return { correto: true, mensagem: `Correto! ${ex.explicacao}` };
  return { correto: false, mensagem: `Ainda não. ${ex.explicacao}` };
}

export function corrigirPontos(esperado: readonly Dot[], marcado: readonly Dot[], nome: string): Correcao {
  const e = new Set(esperado);
  const m = new Set(marcado);
  const faltando = [...e].filter((x) => !m.has(x)).sort();
  const sobrando = [...m].filter((x) => !e.has(x)).sort();
  if (faltando.length === 0 && sobrando.length === 0) {
    return { correto: true, mensagem: `Correto! ${capitalizar(nome)}: ${describeDots(esperado)}.` };
  }
  if (m.size === 0) {
    return { correto: false, mensagem: `Nenhum ponto marcado. ${capitalizar(nome)} tem ${describeDots(esperado)}.` };
  }
  const partes = [`Ainda não. Você marcou ${describeDots([...m])}.`];
  if (faltando.length) partes.push(`Faltou ${describeDots(faltando)}.`);
  if (sobrando.length) partes.push(`Sobrou ${describeDots(sobrando)}.`);
  partes.push(`${capitalizar(nome)} tem ${describeDots(esperado)}.`);
  return { correto: false, mensagem: partes.join(' ') };
}

/** Converte a digitação de pontos ("125", "1 2 5", "1,2,5") em lista de pontos. */
export function lerPontosDigitados(texto: string): Dot[] | null {
  const limpo = texto.replace(/[\s,;.e]+/g, '');
  if (limpo === '') return [];
  if (!/^[1-6]+$/.test(limpo)) return null;
  return [...new Set(limpo.split('').map((c) => Number(c) as Dot))].sort((a, b) => a - b);
}

function capitalizar(s: string): string {
  return s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1);
}
