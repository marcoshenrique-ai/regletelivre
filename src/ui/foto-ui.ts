import { contarPontosEsperados, orientacoesPara, type LadoFotografado } from '../foto/analise';
import { avaliarEnquadramento, type EstadoEnquadramento } from '../foto/enquadramento';
import { deRGBA } from '../foto/imagem';
import { executarAnalise, type PedidoAnalise, type RespostaAnalise } from '../foto/worker';
import type { GuidedSession } from '../guide/session';
import type { LayoutStep } from '../reglete/layout';
import type { Modalidade } from '../reglete/modality';
import type { Anunciador } from './announcer';

/**
 * Interface da conferência por foto. A câmera e a foto são sempre opcionais;
 * nenhuma tarefa do app depende delas.
 */
export interface DependenciasFoto {
  passos: () => LayoutStep[] | null;
  sessao: () => GuidedSession | null;
  /** Cria a sessão guiada se ainda não existir (a foto pode ser aberta direto do resultado). */
  garantirSessao: () => void;
  modalidade: () => Modalidade;
  anunciador: Anunciador;
  aoMarcar: (mensagem: string) => void;
}

const LARGURA_ANALISE = 1000;
const LARGURA_ENQUADRAMENTO = 320;

function $<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function iniciarFotoUI(dep: DependenciasFoto): { abrir: () => void; fechar: () => void } {
  const secao = $('foto');
  const video = $<HTMLVideoElement>('camera-video');
  const blocoCamera = $('camera-bloco');
  const instrucao = $('camera-instrucao');
  const status = $('foto-status');
  let fluxo: MediaStream | null = null;
  let timer: number | undefined;
  let ultimaFala = '';
  let ultimaFalaEm = 0;
  let bonsSeguidos = 0;
  let analisando = false;
  let ultimasSuspeitas: number[] = [];

  let trabalhador: Worker | null = null;
  try {
    trabalhador = new Worker(new URL('../foto/worker.ts', import.meta.url), { type: 'module' });
  } catch {
    trabalhador = null; // sem Worker: analisa na própria página
  }

  const lado = (): LadoFotografado =>
    (document.querySelector<HTMLInputElement>('input[name="foto-lado"]:checked')?.value as LadoFotografado) ?? 'relevo';

  function falar(msg: string, forcar = false) {
    const agora = Date.now();
    if (!forcar && msg === ultimaFala && agora - ultimaFalaEm < 5000) return;
    ultimaFala = msg;
    ultimaFalaEm = agora;
    instrucao.textContent = msg;
    dep.anunciador.anunciar(msg);
  }

  function setStatus(msg: string) {
    status.textContent = msg;
    dep.anunciador.anunciar(msg);
  }

  // ------------------------------------------------------------------ análise
  function analisar(img: ReturnType<typeof deRGBA>, fonte: CanvasImageSource, largura: number, altura: number) {
    const passos = dep.passos();
    if (!passos) {
      setStatus('Converta um texto na tela Escrever antes de conferir por foto.');
      return;
    }
    analisando = true;
    setStatus('Analisando a foto no aparelho. Isso pode levar alguns segundos.');
    const pedido: PedidoAnalise = {
      img,
      steps: passos,
      orientacoes: orientacoesPara(lado(), dep.modalidade()),
    };
    const concluir = (r: RespostaAnalise) => {
      analisando = false;
      mostrarResultado(r, fonte, largura, altura);
    };
    if (trabalhador) {
      trabalhador.onmessage = (ev: MessageEvent<RespostaAnalise>) => concluir(ev.data);
      trabalhador.onerror = () => {
        trabalhador = null;
        concluir(executarAnalise(pedido));
      };
      trabalhador.postMessage(pedido);
    } else {
      window.setTimeout(() => concluir(executarAnalise(pedido)), 30);
    }
  }

  function mostrarResultado(r: RespostaAnalise, fonte: CanvasImageSource, largura: number, altura: number) {
    const bloco = $('foto-resultado');
    bloco.hidden = false;
    status.textContent = '';
    $('foto-resumo').textContent = r.relatorio.resumo;
    const lista = $('foto-suspeitas');
    lista.replaceChildren();
    for (const s of r.relatorio.suspeitas) {
      const li = document.createElement('li');
      li.textContent = s.mensagem;
      lista.append(li);
    }
    ultimasSuspeitas = r.relatorio.suspeitas.map((s) => s.passo);
    $<HTMLButtonElement>('btn-foto-marcar').hidden = ultimasSuspeitas.length === 0;
    desenhar(r, fonte, largura, altura);
    $('titulo-foto-resultado').focus();
    const lidas = r.relatorio.suspeitas.map((s) => s.mensagem).join(' ');
    dep.anunciador.anunciar(`${r.relatorio.resumo} ${lidas}`.trim());
  }

  function desenhar(r: RespostaAnalise, fonte: CanvasImageSource, largura: number, altura: number) {
    const canvas = $<HTMLCanvasElement>('foto-canvas');
    canvas.width = r.largura;
    canvas.height = r.altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(fonte, 0, 0, largura, altura, 0, 0, r.largura, r.altura);
    const raio = Math.max(3, r.largura / 180);
    ctx.lineWidth = Math.max(2, raio / 2);
    for (const p of r.posicoes) {
      if (p.estado === 'vazio') continue;
      ctx.strokeStyle = p.estado === 'confere' ? '#0b6b2f' : p.estado === 'faltando' ? '#b00020' : '#6a1b9a';
      ctx.beginPath();
      if (p.estado === 'confere') {
        ctx.arc(p.x, p.y, raio, 0, Math.PI * 2);
      } else if (p.estado === 'faltando') {
        ctx.moveTo(p.x - raio, p.y - raio);
        ctx.lineTo(p.x + raio, p.y + raio);
        ctx.moveTo(p.x + raio, p.y - raio);
        ctx.lineTo(p.x - raio, p.y + raio);
      } else {
        ctx.rect(p.x - raio, p.y - raio, raio * 2, raio * 2);
      }
      ctx.stroke();
    }
  }

  function cinzaDe(fonte: CanvasImageSource, largura: number, altura: number, maxLargura: number) {
    const escala = Math.min(1, maxLargura / largura);
    const w = Math.max(1, Math.round(largura * escala));
    const h = Math.max(1, Math.round(altura * escala));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(fonte, 0, 0, w, h);
    return deRGBA(ctx.getImageData(0, 0, w, h).data, w, h, maxLargura);
  }

  // ------------------------------------------------------------------ arquivo
  $<HTMLInputElement>('foto-arquivo').addEventListener('change', async (ev) => {
    const input = ev.currentTarget as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    try {
      const bitmap = await createImageBitmap(arquivo);
      analisar(cinzaDe(bitmap, bitmap.width, bitmap.height, LARGURA_ANALISE), bitmap, bitmap.width, bitmap.height);
    } catch {
      setStatus('Não foi possível abrir esta imagem. Tente outra foto.');
    } finally {
      input.value = '';
    }
  });

  // ------------------------------------------------------------------ câmera
  async function abrirCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Este navegador não oferece acesso à câmera. Use a opção de escolher uma foto.');
      return;
    }
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
    } catch (e) {
      const nome = (e as DOMException).name;
      setStatus(
        nome === 'NotAllowedError'
          ? 'O acesso à câmera não foi permitido. Você pode permitir nas configurações do navegador ou escolher uma foto.'
          : nome === 'NotFoundError'
            ? 'Nenhuma câmera encontrada. Use a opção de escolher uma foto.'
            : 'Não foi possível abrir a câmera. Use a opção de escolher uma foto.',
      );
      return;
    }
    video.srcObject = fluxo;
    await video.play().catch(() => undefined);
    blocoCamera.hidden = false;
    bonsSeguidos = 0;
    falar('Câmera aberta. Aponte para a escrita, com luz vinda de um lado. Vou orientar o enquadramento.', true);
    $('btn-capturar').focus();
    timer = window.setInterval(avaliarQuadro, 800);
  }

  function fecharCamera(anunciar = true) {
    window.clearInterval(timer);
    timer = undefined;
    fluxo?.getTracks().forEach((t) => t.stop());
    fluxo = null;
    video.srcObject = null;
    const tinhaFoco = blocoCamera.contains(document.activeElement);
    blocoCamera.hidden = true;
    if (tinhaFoco) $('btn-camera').focus();
    if (anunciar) dep.anunciador.anunciar('Câmera fechada.');
  }

  function avaliarQuadro() {
    if (!fluxo || analisando || !video.videoWidth) return;
    const passos = dep.passos();
    const esperados = passos ? contarPontosEsperados(passos) : 20;
    const img = cinzaDe(video, video.videoWidth, video.videoHeight, LARGURA_ENQUADRAMENTO);
    const av = avaliarEnquadramento(img, esperados);
    const estado: EstadoEnquadramento = av.estado;
    if (estado === 'bom') {
      bonsSeguidos++;
      if ($<HTMLInputElement>('camera-auto').checked && bonsSeguidos >= 2) {
        capturar();
        return;
      }
    } else {
      bonsSeguidos = 0;
    }
    falar(av.mensagem);
  }

  function capturar() {
    if (!fluxo || !video.videoWidth) {
      setStatus('A câmera ainda não está pronta.');
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    const copia = document.createElement('canvas');
    copia.width = w;
    copia.height = h;
    copia.getContext('2d')!.drawImage(video, 0, 0, w, h);
    fecharCamera(false);
    dep.anunciador.anunciar('Foto capturada.');
    analisar(cinzaDe(copia, w, h, LARGURA_ANALISE), copia, w, h);
  }

  $('btn-camera').addEventListener('click', () => void abrirCamera());
  $('btn-capturar').addEventListener('click', capturar);
  $('btn-fechar-camera').addEventListener('click', () => fecharCamera());

  $('btn-foto-marcar').addEventListener('click', () => {
    dep.garantirSessao();
    const s = dep.sessao();
    if (!s) return;
    const novas = s.marcarCelas(ultimasSuspeitas);
    dep.aoMarcar(
      novas === 0
        ? 'Essas celas já estavam marcadas.'
        : `${novas} ${novas === 1 ? 'cela adicionada' : 'celas adicionadas'} às marcadas com problema. Confira pelo tato e use Reescrever celas marcadas.`,
    );
  });

  return {
    abrir() {
      secao.hidden = false;
      $('titulo-foto').focus();
    },
    fechar() {
      fecharCamera(false);
      secao.hidden = true;
      $('foto-resultado').hidden = true;
    },
  };
}
