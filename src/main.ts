import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './ui/styles.css';
import { registerSW } from 'virtual:pwa-register';
import { convertText, describeDots, dotsToUnicode } from './braille/converter';
import { RULES } from './braille/rules-pt-br';
import type { ConversionResult, Dot } from './braille/types';
import {
  corrigirEscolha,
  corrigirPontos,
  gerarExercicio,
  lerPontosDigitados,
  NIVEIS,
  type Exercicio,
  type Nivel,
} from './exercises/exercises';
import { anunciarInicio, nomeDaCela } from './guide/messages';
import { GuidedSession } from './guide/session';
import { layoutCells, type LayoutResult } from './reglete/layout';
import {
  descreverPosicao,
  gradeDaJanela,
  MODALIDADES,
  posicaoDeLeitura,
  posicaoNaReglete,
  type Modalidade,
} from './reglete/modality';
import { detectarSuporte, Ditado, type SuporteDitado } from './speech/dictation';
import { Voz } from './speech/tts';
import { Anunciador } from './ui/announcer';
import { desenharJanela } from './ui/cell-svg';
import { iniciarFotoUI } from './ui/foto-ui';
import {
  apagarProgresso,
  carregar,
  carregarProgresso,
  PADRAO,
  salvar,
  salvarProgresso,
  sanitizar,
  type Config,
} from './ui/settings';
import { VERSAO } from './version';

// ---------------------------------------------------------------------------
// Utilitários de DOM
// ---------------------------------------------------------------------------
function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...filhos: (Node | string)[]) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  for (const f of filhos) e.append(f);
  return e;
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
let config: Config = carregar();
const voz = new Voz(() => preencherVozes());
const anunciador = new Anunciador($('anunciador'), voz, config.saida);

interface Conversao {
  texto: string;
  resultado: ConversionResult;
  layout: LayoutResult;
}
let conversao: Conversao | null = null;
let sessao: GuidedSession | null = null;
let fotoUI: ReturnType<typeof iniciarFotoUI> | null = null;

function aplicarConfigNaVoz(): void {
  voz.velocidade = config.velocidade;
  voz.vozPreferida = config.voz;
  anunciador.saida = config.saida;
}

function aplicarAparencia(): void {
  const html = document.documentElement;
  html.dataset.fonte = config.fonte;
  html.classList.toggle('alto-contraste', config.altoContraste);
}

function atualizarConfig(parcial: Partial<Config>, mensagem = 'Configuração salva.'): void {
  const anterior = config;
  config = sanitizar({ ...config, ...parcial });
  salvar(config);
  aplicarConfigNaVoz();
  aplicarAparencia();
  sincronizarControlesDeConfig();
  if (anterior.modalidade !== config.modalidade || anterior.celasPorLinha !== config.celasPorLinha) {
    recalcularLayout();
  }
  sessao?.configurar(config.modalidade, config.verbosidade, config.linhasDaReglete);
  if (anterior.guardarProgresso && !config.guardarProgresso) {
    apagarProgresso();
    $('retomar').hidden = true;
  }
  if (mensagem) anunciador.anunciar(mensagem);
}

// ---------------------------------------------------------------------------
// Rotas (por âncora): cada tela é uma <section>; o foco vai para o título.
// ---------------------------------------------------------------------------
const telas = Array.from(document.querySelectorAll<HTMLElement>('section.tela'));

function irPara(rota: string, moverFoco: boolean): void {
  const tela = telas.find((t) => t.dataset.rota === rota);
  if (!tela) return;
  for (const t of telas) t.hidden = t !== tela;
  document.title = `${tela.dataset.titulo} — Reglete Livre`;
  document.querySelectorAll<HTMLAnchorElement>('nav .menu a').forEach((a) => {
    if (a.getAttribute('href') === `#${rota}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (rota === 'visualizacao') renderizarVisualizacao();
  if (rota === 'exercicios') $('ex-modalidade').textContent = MODALIDADES[config.modalidade].nome.toLowerCase();
  if (moverFoco) tela.querySelector<HTMLElement>('h1')?.focus();
}

function rotaAtual(): string | null {
  const h = location.hash.replace('#', '');
  return telas.some((t) => t.dataset.rota === h) ? h : null;
}

window.addEventListener('hashchange', () => {
  const r = rotaAtual();
  if (r) irPara(r, true);
});

// ---------------------------------------------------------------------------
// Tela Escrever
// ---------------------------------------------------------------------------
const campoTexto = $<HTMLTextAreaElement>('texto');
const erroTexto = $('texto-erro');

function mostrarErroTexto(msg: string | null): void {
  erroTexto.hidden = !msg;
  erroTexto.textContent = msg ?? '';
  if (msg) campoTexto.setAttribute('aria-invalid', 'true');
  else campoTexto.removeAttribute('aria-invalid');
}

function recalcularLayout(): void {
  if (!conversao) return;
  conversao.layout = layoutCells(conversao.resultado.cells, {
    modalidade: config.modalidade,
    celasPorLinha: config.celasPorLinha,
  });
  sessao = null;
  $('guiado').hidden = true;
  fotoUI?.fechar();
  renderizarResumo();
}

function textoDoResumo(c: Conversao): string {
  const celas = c.layout.steps.filter((s) => s.placement).length;
  const avisos = c.resultado.avisos.length + c.layout.avisos.length;
  const partes = [
    `${celas} ${celas === 1 ? 'cela' : 'celas'} em ${c.layout.totalLinhas} ${c.layout.totalLinhas === 1 ? 'linha' : 'linhas'}`,
    `na ${MODALIDADES[config.modalidade].nome.toLowerCase()} com ${config.celasPorLinha} janelas por linha.`,
  ];
  partes.push(avisos === 0 ? 'Nenhum aviso.' : `${avisos} ${avisos === 1 ? 'aviso' : 'avisos'}: veja a lista abaixo.`);
  return partes.join(' ');
}

function renderizarResumo(): void {
  if (!conversao) return;
  $('resumo').textContent = textoDoResumo(conversao);
  const lista = $('avisos');
  lista.replaceChildren();
  for (const a of conversao.resultado.avisos) lista.append(el('li', { textContent: a.mensagem }));
  for (const a of conversao.layout.avisos) lista.append(el('li', { textContent: a }));
  $('avisos-bloco').hidden = lista.childElementCount === 0;
}

$<HTMLFormElement>('form-texto').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const texto = campoTexto.value;
  const resultado = convertText(texto);
  if (resultado.cells.length === 0) {
    mostrarErroTexto('Digite uma palavra ou frase antes de converter.');
    campoTexto.focus();
    return;
  }
  mostrarErroTexto(null);
  conversao = {
    texto,
    resultado,
    layout: layoutCells(resultado.cells, { modalidade: config.modalidade, celasPorLinha: config.celasPorLinha }),
  };
  sessao = null;
  $('guiado').hidden = true;
  fotoUI?.fechar();
  renderizarResumo();
  $('resultado').hidden = false;
  $('titulo-resultado').focus();
  anunciador.anunciar(`Convertido. ${textoDoResumo(conversao)}`);
});

// Modalidade rápida na tela Escrever
document.querySelectorAll<HTMLInputElement>('input[name="modalidade-rapida"]').forEach((r) => {
  r.addEventListener('change', () => {
    if (!r.checked) return;
    const m = r.value as Modalidade;
    atualizarConfig({ modalidade: m }, `${MODALIDADES[m].nome} selecionada. Escreva ${MODALIDADES[m].descricaoDirecao}.`);
  });
});

// ---------------------------------------------------------------------------
// Modo guiado
// ---------------------------------------------------------------------------
function atualizarPainelGuiado(texto: string): void {
  if (!sessao) return;
  const conferindo = sessao.modo === 'conferencia';
  const marcadas = sessao.celasMarcadas.length;
  $('guiado-modo').textContent = conferindo
    ? 'Modo: conferência pelo tato'
    : sessao.emRevisao
      ? 'Modo: reescrita das celas marcadas'
      : 'Modo: escrita';
  $('guiado-progresso').textContent =
    `Cela ${sessao.atual + 1} de ${sessao.total}` +
    (marcadas ? ` · ${marcadas} ${marcadas === 1 ? 'marcada' : 'marcadas'} com problema` : '');
  $('guiado-texto').textContent = texto;
  $('guiado-barra').style.width = `${sessao.total ? ((sessao.atual + 1) / sessao.total) * 100 : 0}%`;

  const marcar = $<HTMLButtonElement>('btn-marcar');
  marcar.hidden = !conferindo;
  marcar.setAttribute('aria-pressed', String(sessao.atualMarcada()));
  $('btn-conferir').textContent = conferindo ? 'Recomeçar conferência' : 'Conferir pelo tato';
  $('btn-reescrever').hidden = marcadas === 0 || (!conferindo && sessao.emRevisao);
  $('btn-voltar-escrita').hidden = !conferindo && !sessao.emRevisao;
}

type ComandoGuiado =
  | 'proxima'
  | 'anterior'
  | 'repetir'
  | 'detalhar'
  | 'primeira'
  | 'ultima'
  | 'parar'
  | 'alternarMarca'
  | 'iniciarConferencia'
  | 'reescreverMarcadas'
  | 'voltarParaEscrita';

function comandoGuiado(acao: ComandoGuiado): void {
  if (!sessao) return;
  if (acao === 'parar') {
    anunciador.pararVoz();
    return;
  }
  const texto = sessao[acao]();
  atualizarPainelGuiado(texto);
  anunciador.anunciar(texto);
  persistirProgresso();
  // Botões que somem ao trocar de modo não podem levar o foco junto.
  if (acao === 'iniciarConferencia' || acao === 'reescreverMarcadas' || acao === 'voltarParaEscrita') {
    const ativo = document.activeElement as HTMLElement | null;
    if (!ativo || ativo.hidden || ativo === document.body || ativo.id !== 'area-atalhos') $('btn-proxima').focus();
  }
}

$('btn-iniciar-guiado').addEventListener('click', () => {
  if (!conversao) return;
  const passos = conversao.layout.steps;
  sessao = new GuidedSession(passos, config.modalidade, config.verbosidade, config.linhasDaReglete);
  $('guiado').hidden = false;
  const inicio = anunciarInicio(sessao.total, conversao.layout.totalLinhas, config.modalidade, config.verbosidade);
  const primeira = sessao.anuncio();
  atualizarPainelGuiado(primeira);
  $('btn-proxima').focus();
  anunciador.anunciar(`${inicio} ${primeira}`);
  persistirProgresso();
});

// ---------------------------------------------------------------------------
// Retomar escrita em andamento (opcional; só neste aparelho)
// ---------------------------------------------------------------------------
function persistirProgresso(): void {
  if (!config.guardarProgresso || !sessao || !conversao) return;
  salvarProgresso({ texto: conversao.texto, ...sessao.exportar(), salvoEm: new Date().toISOString() });
}

function oferecerRetomada(): void {
  const p = config.guardarProgresso ? carregarProgresso() : null;
  const bloco = $('retomar');
  if (!p) {
    bloco.hidden = true;
    return;
  }
  const trecho = p.texto.length > 40 ? `${p.texto.slice(0, 40)}…` : p.texto;
  const total = convertText(p.texto).cells.length;
  $('retomar-desc').textContent =
    `Você parou na cela ${Math.min(p.indice + 1, total)} de ${total}` +
    `${p.modo === 'conferencia' ? ', na conferência pelo tato' : ''}, do texto: "${trecho}".`;
  bloco.hidden = false;
}

$('btn-retomar').addEventListener('click', () => {
  const p = carregarProgresso();
  if (!p) return;
  campoTexto.value = p.texto;
  const resultado = convertText(p.texto);
  conversao = {
    texto: p.texto,
    resultado,
    layout: layoutCells(resultado.cells, { modalidade: config.modalidade, celasPorLinha: config.celasPorLinha }),
  };
  renderizarResumo();
  $('resultado').hidden = false;
  sessao = new GuidedSession(conversao.layout.steps, config.modalidade, config.verbosidade, config.linhasDaReglete);
  sessao.restaurar(p);
  $('guiado').hidden = false;
  $('retomar').hidden = true;
  const texto = sessao.anuncio();
  atualizarPainelGuiado(texto);
  $('btn-proxima').focus();
  anunciador.anunciar(`Escrita retomada. ${texto}`);
});

$('btn-descartar').addEventListener('click', () => {
  apagarProgresso();
  $('retomar').hidden = true;
  campoTexto.focus();
  anunciador.anunciar('Escrita guardada descartada.');
});

$('btn-proxima').addEventListener('click', () => comandoGuiado('proxima'));
$('btn-anterior').addEventListener('click', () => comandoGuiado('anterior'));
$('btn-repetir').addEventListener('click', () => comandoGuiado('repetir'));
$('btn-detalhar').addEventListener('click', () => comandoGuiado('detalhar'));
$('btn-parar-voz').addEventListener('click', () => comandoGuiado('parar'));
$('btn-conferir').addEventListener('click', () => comandoGuiado('iniciarConferencia'));
$('btn-marcar').addEventListener('click', () => comandoGuiado('alternarMarca'));
$('btn-reescrever').addEventListener('click', () => comandoGuiado('reescreverMarcadas'));
$('btn-voltar-escrita').addEventListener('click', () => comandoGuiado('voltarParaEscrita'));

fotoUI = iniciarFotoUI({
  passos: () => (conversao ? conversao.layout.steps : null),
  sessao: () => sessao,
  garantirSessao: () => garantirSessao(),
  modalidade: () => config.modalidade,
  anunciador,
  aoMarcar: (mensagem) => {
    garantirSessao();
    if (sessao) atualizarPainelGuiado(sessao.anuncio());
    anunciador.anunciar(mensagem);
    persistirProgresso();
  },
});
$('btn-abrir-foto').addEventListener('click', () => fotoUI?.abrir());

/** Garante uma sessão guiada (sem anunciar) para a foto poder marcar celas e orientar a reescrita. */
function garantirSessao(): void {
  if (sessao || !conversao) return;
  sessao = new GuidedSession(conversao.layout.steps, config.modalidade, config.verbosidade, config.linhasDaReglete);
  $('guiado').hidden = false;
  atualizarPainelGuiado(sessao.anuncio());
}

$('btn-resultado-foto').addEventListener('click', () => {
  if (!conversao) return;
  garantirSessao();
  fotoUI?.abrir();
});

$('area-atalhos').addEventListener('keydown', (ev) => {
  if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
  const mapa: Record<string, ComandoGuiado> = {
    m: 'alternarMarca',
    M: 'alternarMarca',
    ArrowRight: 'proxima',
    n: 'proxima',
    N: 'proxima',
    ' ': 'proxima',
    ArrowLeft: 'anterior',
    p: 'anterior',
    P: 'anterior',
    r: 'repetir',
    R: 'repetir',
    d: 'detalhar',
    D: 'detalhar',
    Home: 'primeira',
    End: 'ultima',
    Escape: 'parar',
  };
  const acao = mapa[ev.key];
  if (!acao) return;
  ev.preventDefault();
  comandoGuiado(acao);
});

// ---------------------------------------------------------------------------
// Ditado
// ---------------------------------------------------------------------------
let suporteDitado: SuporteDitado = 'indisponivel';
let ditado: Ditado | null = null;

function atualizarBlocoDitado(): void {
  const estado = $('cfg-ditado-estado');
  const blocoRemoto = $('cfg-ditado-remoto-bloco');
  const bloco = $('bloco-ditado');
  const aviso = $('ditado-aviso');
  if (suporteDitado === 'indisponivel') {
    estado.textContent = 'Este navegador não oferece ditado por voz. Digite o texto normalmente.';
    blocoRemoto.hidden = true;
    bloco.hidden = true;
    return;
  }
  if (suporteDitado === 'local') {
    estado.textContent = 'Este navegador reconhece a voz no próprio aparelho. O ditado está disponível na tela Escrever.';
    blocoRemoto.hidden = true;
    bloco.hidden = false;
    aviso.textContent = 'O reconhecimento é feito no aparelho; o áudio não é enviado.';
    return;
  }
  estado.textContent =
    'Este navegador oferece ditado, mas pode processar a voz em servidores externos. Por isso ele fica desligado até você permitir.';
  blocoRemoto.hidden = false;
  bloco.hidden = !config.permitirDitadoRemoto;
  aviso.textContent = 'Atenção: neste navegador o áudio pode ser enviado ao serviço de reconhecimento do navegador.';
}

$('btn-ditar').addEventListener('click', () => {
  const botao = $<HTMLButtonElement>('btn-ditar');
  if (ditado?.ativo) {
    ditado.parar();
    return;
  }
  ditado = new Ditado(suporteDitado);
  botao.textContent = 'Parar ditado';
  botao.setAttribute('aria-pressed', 'true');
  anunciador.anunciar('Ditado iniciado. Fale agora.');
  ditado.iniciar({
    aoReconhecer: (texto) => {
      campoTexto.value = campoTexto.value ? `${campoTexto.value.trimEnd()} ${texto}` : texto;
      anunciador.anunciar(`Texto ditado: ${texto}`);
    },
    aoErro: (msg) => anunciador.anunciar(msg),
    aoTerminar: () => {
      botao.textContent = 'Ditar texto';
      botao.removeAttribute('aria-pressed');
    },
  });
});

// ---------------------------------------------------------------------------
// Visualização
// ---------------------------------------------------------------------------
function ladoVisualizacao(): 'escrita' | 'leitura' {
  return document.querySelector<HTMLInputElement>('input[name="vis-lado"]:checked')?.value === 'leitura' ? 'leitura' : 'escrita';
}

function renderizarVisualizacao(): void {
  const vazio = $('vis-vazio');
  const conteudo = $('vis-conteudo');
  if (!conversao) {
    vazio.hidden = false;
    conteudo.hidden = true;
    return;
  }
  vazio.hidden = true;
  conteudo.hidden = false;

  const lado = ladoVisualizacao();
  const m = config.modalidade;
  const n = config.celasPorLinha;
  const info = MODALIDADES[m];
  $('vis-legenda').textContent =
    lado === 'escrita'
      ? `${info.nome}, lado de quem escreve: escrita ${info.descricaoDirecao}. Círculos grandes e cheios são pontos a marcar; círculos pequenos são posições vazias.`
      : `Folha pronta, lado da leitura, da esquerda para a direita. ${m === 'tradicional' ? 'Na reglete tradicional, isto é o que se sente depois de virar a folha.' : ''}`;

  // Desenho
  const folha = $('vis-folha');
  folha.replaceChildren();
  folha.setAttribute('role', 'img');
  folha.setAttribute(
    'aria-label',
    `Desenho da folha com ${conversao.layout.totalLinhas} ${conversao.layout.totalLinhas === 1 ? 'linha' : 'linhas'}. A descrição completa está na tabela a seguir.`,
  );
  for (let linha = 1; linha <= conversao.layout.totalLinhas; linha++) {
    const janelas: (Dot[] | null)[] = Array.from({ length: n }, () => null);
    for (const s of conversao.layout.steps) {
      if (!s.placement || s.placement.linha !== linha) continue;
      const pos = lado === 'escrita' ? s.placement.janelaDaEsquerda : s.placement.ordemNaLinha;
      janelas[pos - 1] = s.cell.dots;
    }
    const div = el('div', { className: 'linha-folha' });
    div.append(el('span', { className: 'rotulo-linha', textContent: `Linha ${linha}` }));
    const fila = el('div', { className: 'fila-janelas' });
    for (const dots of janelas) {
      const geo: Modalidade = lado === 'escrita' ? m : 'positiva';
      fila.append(desenharJanela(gradeDaJanela(geo, dots ?? []), { vazia: dots === null }));
    }
    div.append(fila);
    folha.append(div);
  }

  // Tabela equivalente
  const tbody = $<HTMLTableElement>('vis-tabela').tBodies[0]!;
  tbody.replaceChildren();
  conversao.layout.steps.forEach((s, i) => {
    const p = s.placement;
    let janela = '—';
    if (p) {
      janela =
        lado === 'escrita'
          ? m === 'tradicional'
            ? `${p.janelaDaDireita}ª a partir da direita`
            : `${p.janelaDaEsquerda}ª a partir da esquerda`
          : `${p.ordemNaLinha}ª a partir da esquerda`;
    }
    const posicoes =
      s.cell.dots.length === 0
        ? '—'
        : [...s.cell.dots]
            .sort((a, b) => a - b)
            .map((d) => `${d}: ${descreverPosicao(lado === 'escrita' ? posicaoNaReglete(m, d) : posicaoDeLeitura(d))}`)
            .join('; ');
    const representa = el('td');
    representa.append(nomeDaCela(s.cell));
    const braille = el('span', { className: 'braille-unicode', textContent: ` ${dotsToUnicode(s.cell.dots)}` });
    braille.setAttribute('aria-hidden', 'true');
    representa.append(braille);
    const tr = el(
      'tr',
      {},
      el('td', { textContent: String(i + 1) }),
      el('td', { textContent: p ? String(p.linha) : '—' }),
      el('td', { textContent: p ? janela : 'fim da linha' }),
      representa,
      el('td', { textContent: s.cell.role === 'nao-suportado' ? 'sem regra validada' : describeDots(s.cell.dots) }),
      el('td', { textContent: posicoes }),
    );
    tbody.append(tr);
  });
}

document.querySelectorAll<HTMLInputElement>('input[name="vis-lado"]').forEach((r) =>
  r.addEventListener('change', () => {
    renderizarVisualizacao();
    anunciador.anunciar(r.value === 'leitura' ? 'Mostrando a folha pronta, lado da leitura.' : 'Mostrando o lado de quem escreve.');
  }),
);
$('btn-imprimir').addEventListener('click', () => window.print());

// ---------------------------------------------------------------------------
// Exercícios
// ---------------------------------------------------------------------------
const selNivel = $<HTMLSelectElement>('ex-nivel');
for (const n of NIVEIS) selNivel.append(el('option', { value: n.id, textContent: n.titulo }));
const descNivel = () => {
  $('ex-nivel-desc').textContent = NIVEIS.find((n) => n.id === selNivel.value)?.descricao ?? '';
};
selNivel.addEventListener('change', descNivel);
descNivel();

let exercicio: Exercicio | null = null;
let celaDaPalavra = 0;
let acertos = 0;
let tentativas = 0;

function enunciadoAtual(): string {
  if (!exercicio) return '';
  if (exercicio.tipo !== 'palavra') return exercicio.enunciado;
  const c = exercicio.celas[celaDaPalavra]!;
  return `Cela ${celaDaPalavra + 1} de ${exercicio.celas.length} da palavra "${exercicio.palavra}": ${nomeDaCela(c)}.`;
}

function montarCaixasDePontos(): void {
  const grade = $('ex-pontos-grade');
  grade.replaceChildren();
  grade.setAttribute('data-modalidade', config.modalidade);
  for (const d of [1, 2, 3, 4, 5, 6] as Dot[]) {
    const pos = posicaoNaReglete(config.modalidade, d);
    const id = `ex-ponto-${d}`;
    const caixa = el('input', { type: 'checkbox', id, value: String(d) });
    const rotulo = el('label', { htmlFor: id, textContent: `Ponto ${d}` });
    const desc = el('span', { className: 'dica', textContent: ` (${descreverPosicao(pos)})` });
    rotulo.append(desc);
    const item = el('div', { className: `ponto-item col-${pos.coluna} alt-${pos.altura}` }, caixa, rotulo);
    grade.append(item);
  }
  $<HTMLInputElement>('ex-pontos-digitados').value = '';
}

function renderizarExercicio(): void {
  if (!exercicio) return;
  $('form-exercicio').hidden = false;
  $('ex-enunciado').textContent = exercicio.tipo === 'palavra' ? exercicio.enunciado : exercicio.enunciado;
  $('ex-subtitulo').textContent = exercicio.tipo === 'palavra' ? enunciadoAtual() : '';
  const opcoes = $('ex-opcoes');
  opcoes.replaceChildren();
  if (exercicio.tipo === 'escolha') {
    $('ex-pontos').hidden = true;
    exercicio.opcoes.forEach((o, i) => {
      const id = `ex-op-${i}`;
      opcoes.append(
        el('div', { className: 'opcao' }, el('input', { type: 'radio', name: 'ex-escolha', id, value: o.valor }), el('label', { htmlFor: id, textContent: o.rotulo })),
      );
    });
  } else {
    $('ex-pontos').hidden = false;
    montarCaixasDePontos();
  }
}

$('btn-novo-exercicio').addEventListener('click', () => {
  exercicio = gerarExercicio(selNivel.value as Nivel, config.modalidade);
  celaDaPalavra = 0;
  $('ex-feedback').hidden = true;
  renderizarExercicio();
  $('ex-fieldset').querySelector<HTMLInputElement>('input')?.focus();
  anunciador.anunciar(exercicio.tipo === 'palavra' ? `${exercicio.enunciado} ${enunciadoAtual()}` : exercicio.enunciado);
});

$('btn-ex-repetir').addEventListener('click', () => {
  if (!exercicio) return;
  anunciador.anunciar(exercicio.tipo === 'palavra' ? `${exercicio.enunciado} ${enunciadoAtual()}` : exercicio.enunciado);
});

function pontosMarcados(): Dot[] | null {
  const digitado = $<HTMLInputElement>('ex-pontos-digitados').value;
  if (digitado.trim() !== '') return lerPontosDigitados(digitado);
  return Array.from(document.querySelectorAll<HTMLInputElement>('#ex-pontos-grade input:checked')).map((c) => Number(c.value) as Dot);
}

function mostrarFeedback(msg: string, correto: boolean): void {
  const fb = $('ex-feedback');
  fb.hidden = false;
  fb.textContent = `${correto ? '✓ ' : '✗ '}${msg}`;
  fb.dataset.correto = String(correto);
  $('ex-placar').textContent = `Acertos: ${acertos} de ${tentativas} tentativas.`;
}

$<HTMLFormElement>('form-exercicio').addEventListener('submit', (ev) => {
  ev.preventDefault();
  if (!exercicio) return;
  if (exercicio.tipo === 'escolha') {
    const marcado = document.querySelector<HTMLInputElement>('input[name="ex-escolha"]:checked')?.value ?? null;
    const r = corrigirEscolha(exercicio, marcado);
    if (marcado) {
      tentativas++;
      if (r.correto) acertos++;
    }
    mostrarFeedback(r.mensagem, r.correto);
    anunciador.anunciar(r.correto ? `${r.mensagem} Ative Novo exercício para continuar.` : r.mensagem);
    return;
  }

  const marcados = pontosMarcados();
  if (marcados === null) {
    const msg = 'Use apenas números de 1 a 6 no campo de pontos. Exemplo: 1 2 5.';
    mostrarFeedback(msg, false);
    anunciador.anunciar(msg);
    $('ex-pontos-digitados').focus();
    return;
  }

  tentativas++;
  if (exercicio.tipo === 'pontos') {
    const r = corrigirPontos(exercicio.resposta, marcados, `letra ${exercicio.alvo}`);
    if (r.correto) acertos++;
    mostrarFeedback(r.mensagem, r.correto);
    anunciador.anunciar(r.correto ? `${r.mensagem} Ative Novo exercício para continuar.` : r.mensagem);
    return;
  }

  // Palavra: cela por cela
  const cela = exercicio.celas[celaDaPalavra]!;
  const r = corrigirPontos(cela.dots, marcados, nomeDaCela(cela));
  if (!r.correto) {
    mostrarFeedback(`${r.mensagem} Tente esta cela de novo.`, false);
    anunciador.anunciar(`${r.mensagem} Tente esta cela de novo.`);
    return;
  }
  acertos++;
  celaDaPalavra++;
  if (celaDaPalavra >= exercicio.celas.length) {
    const msg = `${r.mensagem} Palavra "${exercicio.palavra}" completa! Ative Novo exercício para continuar.`;
    mostrarFeedback(msg, true);
    anunciador.anunciar(msg);
    celaDaPalavra = exercicio.celas.length - 1;
    return;
  }
  montarCaixasDePontos();
  $('ex-subtitulo').textContent = enunciadoAtual();
  const msg = `${r.mensagem} Próxima: ${enunciadoAtual()}`;
  mostrarFeedback(msg, true);
  anunciador.anunciar(msg);
  $<HTMLInputElement>('ex-ponto-1').focus();
});

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------
function marcarRadio(nome: string, valor: string): void {
  document.querySelectorAll<HTMLInputElement>(`input[name="${nome}"]`).forEach((r) => (r.checked = r.value === valor));
}

function sincronizarControlesDeConfig(): void {
  marcarRadio('modalidade', config.modalidade);
  marcarRadio('modalidade-rapida', config.modalidade);
  marcarRadio('verbosidade', config.verbosidade);
  marcarRadio('saida', config.saida);
  marcarRadio('fonte', config.fonte);
  const celas = $<HTMLInputElement>('cfg-celas');
  if (document.activeElement !== celas) celas.value = String(config.celasPorLinha);
  $<HTMLInputElement>('cfg-velocidade').value = String(config.velocidade);
  $('cfg-velocidade-valor').textContent = `${config.velocidade.toFixed(1).replace('.', ',')} vezes`;
  $<HTMLInputElement>('cfg-velocidade').setAttribute('aria-valuetext', `${config.velocidade.toFixed(1).replace('.', ',')} vezes`);
  $<HTMLInputElement>('cfg-ditado-remoto').checked = config.permitirDitadoRemoto;
  $<HTMLInputElement>('cfg-contraste').checked = config.altoContraste;
  $<HTMLInputElement>('cfg-guardar').checked = config.guardarProgresso;
  const linhas = $<HTMLInputElement>('cfg-linhas');
  if (document.activeElement !== linhas) linhas.value = String(config.linhasDaReglete);
  $<HTMLSelectElement>('cfg-voz').value = config.voz;
  atualizarBlocoDitado();
}

function preencherVozes(): void {
  const sel = $<HTMLSelectElement>('cfg-voz');
  const vozes = voz.vozesPortugues();
  sel.replaceChildren(el('option', { value: '', textContent: 'Automática (português)' }));
  for (const v of vozes) sel.append(el('option', { value: v.voiceURI, textContent: `${v.name} (${v.lang})` }));
  sel.value = config.voz;
}

for (const nome of ['modalidade', 'verbosidade', 'saida', 'fonte']) {
  document.querySelectorAll<HTMLInputElement>(`input[name="${nome}"]`).forEach((r) =>
    r.addEventListener('change', () => {
      if (r.checked) atualizarConfig({ [nome]: r.value } as Partial<Config>);
    }),
  );
}

$<HTMLInputElement>('cfg-celas').addEventListener('change', (ev) => {
  const input = ev.currentTarget as HTMLInputElement;
  const n = Number(input.value);
  const erro = $('cfg-celas-erro');
  if (!Number.isInteger(n) || n < 4 || n > 42) {
    erro.hidden = false;
    erro.textContent = 'Informe um número inteiro entre 4 e 42.';
    input.setAttribute('aria-invalid', 'true');
    return;
  }
  erro.hidden = true;
  input.removeAttribute('aria-invalid');
  atualizarConfig({ celasPorLinha: n });
});

$<HTMLInputElement>('cfg-linhas').addEventListener('change', (ev) => {
  const input = ev.currentTarget as HTMLInputElement;
  const n = Number(input.value);
  const erro = $('cfg-linhas-erro');
  if (!Number.isInteger(n) || n < 0 || n > 40) {
    erro.hidden = false;
    erro.textContent = 'Informe um número inteiro entre 0 e 40.';
    input.setAttribute('aria-invalid', 'true');
    return;
  }
  erro.hidden = true;
  input.removeAttribute('aria-invalid');
  atualizarConfig({ linhasDaReglete: n });
});
$<HTMLInputElement>('cfg-guardar').addEventListener('change', (ev) => {
  const marcado = (ev.currentTarget as HTMLInputElement).checked;
  atualizarConfig(
    { guardarProgresso: marcado },
    marcado ? 'A escrita em andamento será guardada neste aparelho.' : 'Escrita guardada apagada; nada mais será guardado.',
  );
  if (marcado) persistirProgresso();
});
$<HTMLInputElement>('cfg-velocidade').addEventListener('change', (ev) => {
  atualizarConfig({ velocidade: Number((ev.currentTarget as HTMLInputElement).value) });
});
$<HTMLSelectElement>('cfg-voz').addEventListener('change', (ev) => atualizarConfig({ voz: (ev.currentTarget as HTMLSelectElement).value }));
$<HTMLInputElement>('cfg-ditado-remoto').addEventListener('change', (ev) =>
  atualizarConfig({ permitirDitadoRemoto: (ev.currentTarget as HTMLInputElement).checked }),
);
$<HTMLInputElement>('cfg-contraste').addEventListener('change', (ev) =>
  atualizarConfig({ altoContraste: (ev.currentTarget as HTMLInputElement).checked }),
);
$('btn-testar-voz').addEventListener('click', () => voz.falar('Marque os pontos 1, 2 e 5. Esta é a voz do Reglete Livre.'));
$('btn-restaurar').addEventListener('click', () => atualizarConfig({ ...PADRAO }, 'Configurações restauradas para o padrão.'));

if (!Voz.disponivel()) {
  $('voz-indisponivel').hidden = false;
  $<HTMLButtonElement>('btn-testar-voz').disabled = true;
  $<HTMLInputElement>('cfg-saida-voz').disabled = true;
  $<HTMLInputElement>('cfg-saida-ambos').disabled = true;
}

// ---------------------------------------------------------------------------
// Ajuda: tabela de regras gerada da própria fonte de dados
// ---------------------------------------------------------------------------
function renderizarTabelaDeRegras(): void {
  const tbody = $<HTMLTableElement>('tabela-regras').tBodies[0]!;
  for (const r of RULES) {
    const pontos = r.celas ? r.celas.map((c) => (c.length ? c.join('') : 'cela vazia')).join(' + ') : 'não definido';
    const sinal = r.tinta.trim() === '' ? (r.categoria === 'espaco' ? 'espaço' : '—') : r.tinta.split('').join(' ');
    tbody.append(
      el(
        'tr',
        {},
        el('td', { textContent: sinal }),
        el('td', { textContent: r.nome }),
        el('td', { textContent: pontos }),
        el('td', { textContent: r.status === 'verificada' ? 'verificada em fontes secundárias' : 'pendente (não usada)' }),
        el('td', { textContent: r.revisaoHumana }),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
aplicarConfigNaVoz();
aplicarAparencia();
preencherVozes();
sincronizarControlesDeConfig();
renderizarTabelaDeRegras();
$('versao').textContent = `Versão ${VERSAO}.`;
irPara(rotaAtual() ?? 'escrever', false);
oferecerRetomada();

detectarSuporte().then((s) => {
  suporteDitado = s;
  atualizarBlocoDitado();
});

registerSW({
  immediate: true,
  onOfflineReady() {
    anunciador.anunciar('O Reglete Livre está pronto para funcionar sem internet.');
  },
});
