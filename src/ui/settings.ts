import type { Verbosidade } from '../guide/messages';
import { CELAS_POR_LINHA_MAX, CELAS_POR_LINHA_MIN, CELAS_POR_LINHA_PADRAO } from '../reglete/layout';
import type { Modalidade } from '../reglete/modality';

export type Saida = 'leitor' | 'voz' | 'ambos';
export type TamanhoFonte = 'normal' | 'grande' | 'muito-grande';

export interface Config {
  modalidade: Modalidade;
  celasPorLinha: number;
  verbosidade: Verbosidade;
  saida: Saida;
  velocidade: number;
  voz: string;
  permitirDitadoRemoto: boolean;
  fonte: TamanhoFonte;
  altoContraste: boolean;
  /** Linhas da reglete antes de precisar deslocá-la ou trocar a folha; 0 = não avisar. */
  linhasDaReglete: number;
  /** Guardar neste aparelho a escrita em andamento para retomar depois. */
  guardarProgresso: boolean;
}

export const PADRAO: Config = {
  modalidade: 'tradicional',
  celasPorLinha: CELAS_POR_LINHA_PADRAO,
  verbosidade: 'padrao',
  saida: 'leitor',
  velocidade: 1,
  voz: '',
  permitirDitadoRemoto: false,
  fonte: 'normal',
  altoContraste: false,
  linhasDaReglete: 0,
  guardarProgresso: false,
};

const CHAVE = 'reglete-livre:config:v1';

/** Lê as configurações salvas neste aparelho, validando cada campo. */
export function carregar(): Config {
  let bruto: Partial<Config> = {};
  try {
    const s = localStorage.getItem(CHAVE);
    if (s) bruto = JSON.parse(s) as Partial<Config>;
  } catch {
    // Armazenamento indisponível (modo privado, bloqueio): usa o padrão.
  }
  return sanitizar(bruto);
}

export function salvar(cfg: Config): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(cfg));
  } catch {
    // Sem armazenamento: a configuração vale só nesta sessão.
  }
}

export function sanitizar(b: Partial<Config>): Config {
  const um = <T extends string>(v: unknown, ok: readonly T[], def: T): T => (ok.includes(v as T) ? (v as T) : def);
  const celas = Number(b.celasPorLinha);
  const vel = Number(b.velocidade);
  const linhas = Number(b.linhasDaReglete);
  return {
    modalidade: um(b.modalidade, ['tradicional', 'positiva'] as const, PADRAO.modalidade),
    celasPorLinha:
      Number.isInteger(celas) && celas >= CELAS_POR_LINHA_MIN && celas <= CELAS_POR_LINHA_MAX ? celas : PADRAO.celasPorLinha,
    verbosidade: um(b.verbosidade, ['breve', 'padrao', 'detalhada'] as const, PADRAO.verbosidade),
    saida: um(b.saida, ['leitor', 'voz', 'ambos'] as const, PADRAO.saida),
    velocidade: Number.isFinite(vel) && vel >= 0.5 && vel <= 2 ? vel : PADRAO.velocidade,
    voz: typeof b.voz === 'string' ? b.voz : '',
    permitirDitadoRemoto: b.permitirDitadoRemoto === true,
    fonte: um(b.fonte, ['normal', 'grande', 'muito-grande'] as const, PADRAO.fonte),
    altoContraste: b.altoContraste === true,
    linhasDaReglete: Number.isInteger(linhas) && linhas >= 0 && linhas <= 40 ? linhas : 0,
    guardarProgresso: b.guardarProgresso === true,
  };
}

// ---------------------------------------------------------------------------
// Escrita em andamento (opcional, desligado por padrão)
// ---------------------------------------------------------------------------
export interface Progresso {
  texto: string;
  indice: number;
  modo: 'escrita' | 'conferencia';
  marcadas: number[];
  revisao: number[] | null;
  salvoEm: string;
}

const CHAVE_PROGRESSO = 'reglete-livre:progresso:v1';

export function salvarProgresso(p: Progresso): void {
  try {
    localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(p));
  } catch {
    // sem armazenamento: nada a fazer
  }
}

export function carregarProgresso(): Progresso | null {
  try {
    const s = localStorage.getItem(CHAVE_PROGRESSO);
    if (!s) return null;
    const p = JSON.parse(s) as Partial<Progresso>;
    if (typeof p.texto !== 'string' || !p.texto.trim()) return null;
    return {
      texto: p.texto,
      indice: Number.isInteger(p.indice) ? p.indice! : 0,
      modo: p.modo === 'conferencia' ? 'conferencia' : 'escrita',
      marcadas: Array.isArray(p.marcadas) ? p.marcadas.filter((n) => Number.isInteger(n)) : [],
      revisao: Array.isArray(p.revisao) ? p.revisao.filter((n) => Number.isInteger(n)) : null,
      salvoEm: typeof p.salvoEm === 'string' ? p.salvoEm : '',
    };
  } catch {
    return null;
  }
}

export function apagarProgresso(): void {
  try {
    localStorage.removeItem(CHAVE_PROGRESSO);
  } catch {
    // ignora
  }
}
