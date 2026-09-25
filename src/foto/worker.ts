/// <reference lib="webworker" />
import type { LayoutStep } from '../reglete/layout';
import { analisarFoto, gerarRelatorio, type RelatorioFoto } from './analise';
import type { Orientacao, PosicaoVista } from './grade';
import type { ImagemCinza } from './imagem';

/** Análise em segundo plano para a interface continuar respondendo. Nada sai do aparelho. */
export interface PedidoAnalise {
  img: ImagemCinza;
  steps: LayoutStep[];
  orientacoes: Orientacao[];
}

export interface RespostaAnalise {
  relatorio: RelatorioFoto;
  posicoes: PosicaoVista[];
  largura: number;
  altura: number;
}

export function executarAnalise(p: PedidoAnalise): RespostaAnalise {
  const a = analisarFoto(p.img, p.steps, p.orientacoes);
  return {
    relatorio: gerarRelatorio(a, p.steps),
    posicoes: a.grade.encontrou ? a.grade.posicoes : [],
    largura: p.img.largura,
    altura: p.img.altura,
  };
}

const escopo = self as unknown as DedicatedWorkerGlobalScope;
if (typeof escopo.postMessage === 'function' && typeof (escopo as { document?: unknown }).document === 'undefined') {
  escopo.onmessage = (ev: MessageEvent<PedidoAnalise>) => {
    escopo.postMessage(executarAnalise(ev.data));
  };
}
