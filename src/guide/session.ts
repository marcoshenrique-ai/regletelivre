import type { LayoutStep } from '../reglete/layout';
import type { Modalidade } from '../reglete/modality';
import {
  anunciarFim,
  anunciarInicioConferencia,
  anunciarPasso,
  anunciarPassoConferencia,
  resumoConferencia,
  type Verbosidade,
} from './messages';

/**
 * - `escrita`: orienta onde e quais pontos marcar, na orientação da reglete escolhida;
 * - `conferencia`: depois de pronta, orienta a leitura pelo tato (orientação de leitura),
 *   para a própria pessoa conferir e marcar as celas com problema.
 */
export type ModoGuiado = 'escrita' | 'conferencia';

/** Estado mínimo para retomar uma escrita (sem o texto, que fica com quem chama). */
export interface EstadoSessao {
  indice: number;
  modo: ModoGuiado;
  marcadas: number[];
  revisao: number[] | null;
}

/**
 * Sessão do modo guiado: um cursor sobre os passos de escrita.
 * Não tem dependência de DOM nem de áudio; só devolve o texto a anunciar.
 */
export class GuidedSession {
  private indice = 0;
  private _modo: ModoGuiado = 'escrita';
  private readonly marcadas = new Set<number>();
  /** Na escrita de revisão, percorre só as celas marcadas. */
  private revisao: number[] | null = null;

  constructor(
    private readonly steps: readonly LayoutStep[],
    private modalidade: Modalidade,
    private verbosidade: Verbosidade,
    private linhasDaReglete = 0,
  ) {}

  get atual(): number {
    return this.indice;
  }

  get total(): number {
    return this.steps.length;
  }

  get modo(): ModoGuiado {
    return this._modo;
  }

  get passoAtual(): LayoutStep | undefined {
    return this.steps[this.indice];
  }

  get celasMarcadas(): number[] {
    return [...this.marcadas].sort((a, b) => a - b);
  }

  get emRevisao(): boolean {
    return this.revisao !== null;
  }

  atualMarcada(): boolean {
    return this.marcadas.has(this.indice);
  }

  configurar(modalidade: Modalidade, verbosidade: Verbosidade, linhasDaReglete = this.linhasDaReglete): void {
    this.modalidade = modalidade;
    this.verbosidade = verbosidade;
    this.linhasDaReglete = linhasDaReglete;
  }

  exportar(): EstadoSessao {
    return { indice: this.indice, modo: this._modo, marcadas: this.celasMarcadas, revisao: this.revisao ? [...this.revisao] : null };
  }

  /** Restaura um estado salvo, ignorando índices que não existem neste texto. */
  restaurar(e: EstadoSessao): void {
    const valido = (i: number) => Number.isInteger(i) && i >= 0 && i < this.steps.length;
    this.indice = valido(e.indice) ? e.indice : 0;
    this._modo = e.modo === 'conferencia' ? 'conferencia' : 'escrita';
    this.marcadas.clear();
    for (const i of e.marcadas ?? []) if (valido(i)) this.marcadas.add(i);
    const rev = (e.revisao ?? []).filter(valido);
    this.revisao = this._modo === 'escrita' && rev.length ? rev : null;
    if (this.revisao && !this.revisao.includes(this.indice)) this.indice = this.revisao[0]!;
  }

  anuncio(verbosidade: Verbosidade = this.verbosidade): string {
    if (this._modo === 'conferencia') {
      return anunciarPassoConferencia(this.steps, this.indice, verbosidade, this.atualMarcada());
    }
    const base = anunciarPasso(this.steps, this.indice, this.modalidade, verbosidade, this.linhasDaReglete);
    if (this.revisao) {
      const pos = this.revisao.indexOf(this.indice);
      return `Reescrita ${pos + 1} de ${this.revisao.length}. ${base}`;
    }
    return base;
  }

  repetir(): string {
    return this.anuncio();
  }

  detalhar(): string {
    return this.anuncio('detalhada');
  }

  proxima(): string {
    if (this.revisao) {
      const pos = this.revisao.indexOf(this.indice);
      if (pos >= this.revisao.length - 1) {
        return 'Fim das celas marcadas. Depois de reescrever, use Conferir pelo tato de novo.';
      }
      this.indice = this.revisao[pos + 1]!;
      return this.anuncio();
    }
    if (this.indice >= this.steps.length - 1) {
      return this._modo === 'conferencia' ? resumoConferencia(this.steps, this.celasMarcadas) : anunciarFim(this.modalidade);
    }
    this.indice++;
    return this.anuncio();
  }

  anterior(): string {
    if (this.revisao) {
      const pos = this.revisao.indexOf(this.indice);
      if (pos <= 0) return `Esta é a primeira cela marcada. ${this.anuncio()}`;
      this.indice = this.revisao[pos - 1]!;
      return this.anuncio();
    }
    if (this.indice === 0) return `Você já está na primeira cela. ${this.anuncio()}`;
    this.indice--;
    return this.anuncio();
  }

  primeira(): string {
    this.indice = this.revisao ? this.revisao[0]! : 0;
    return this.anuncio();
  }

  ultima(): string {
    this.indice = this.revisao ? this.revisao[this.revisao.length - 1]! : Math.max(0, this.steps.length - 1);
    return this.anuncio();
  }

  irPara(indice: number): string {
    this.indice = Math.min(Math.max(0, indice), Math.max(0, this.steps.length - 1));
    return this.anuncio();
  }

  /** Começa a conferência pelo tato a partir da primeira cela. As marcas anteriores são mantidas. */
  iniciarConferencia(): string {
    this._modo = 'conferencia';
    this.revisao = null;
    this.indice = 0;
    return `${anunciarInicioConferencia(this.modalidade, this.verbosidade)} ${this.anuncio()}`;
  }

  /** Marca ou desmarca a cela atual como “com problema” (só na conferência). */
  alternarMarca(): string {
    if (this._modo !== 'conferencia') {
      return 'Marcar problema só funciona durante a conferência pelo tato.';
    }
    if (this.marcadas.has(this.indice)) {
      this.marcadas.delete(this.indice);
      return `Cela ${this.indice + 1} desmarcada.`;
    }
    this.marcadas.add(this.indice);
    return `Cela ${this.indice + 1} marcada com problema.`;
  }

  /** Acrescenta celas às marcadas (por exemplo, as apontadas pela conferência por foto). */
  marcarCelas(indices: readonly number[]): number {
    let novas = 0;
    for (const i of indices) {
      if (i < 0 || i >= this.steps.length || this.marcadas.has(i)) continue;
      this.marcadas.add(i);
      novas++;
    }
    return novas;
  }

  resumo(): string {
    return resumoConferencia(this.steps, this.celasMarcadas);
  }

  /** Volta à escrita percorrendo apenas as celas marcadas. */
  reescreverMarcadas(): string {
    const lista = this.celasMarcadas;
    if (lista.length === 0) return 'Nenhuma cela marcada com problema.';
    this._modo = 'escrita';
    this.revisao = lista;
    this.indice = lista[0]!;
    const n = lista.length;
    return (
      `Reescrevendo ${n} ${n === 1 ? 'cela marcada' : 'celas marcadas'}. ` +
      'Recoloque a folha na reglete na mesma posição de antes. Pontos que faltaram podem ser acrescentados; ' +
      'um ponto a mais em geral não se desfaz, então combine com quem acompanha se vale reescrever a palavra. ' +
      this.anuncio()
    );
  }

  /** Volta à escrita normal, na primeira cela. */
  voltarParaEscrita(): string {
    this._modo = 'escrita';
    this.revisao = null;
    this.indice = 0;
    return `Modo de escrita. ${this.anuncio()}`;
  }
}
