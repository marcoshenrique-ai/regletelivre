import { describe, expect, it } from 'vitest';
import { convertText } from '../src/braille/converter';
import { GuidedSession } from '../src/guide/session';
import { anunciarPasso } from '../src/guide/messages';
import { layoutCells } from '../src/reglete/layout';

function sessao(texto: string, modalidade: 'tradicional' | 'positiva' = 'tradicional', n = 28) {
  const { cells } = convertText(texto);
  const { steps } = layoutCells(cells, { modalidade, celasPorLinha: n });
  return { steps, s: new GuidedSession(steps, modalidade, 'padrao') };
}

describe('sessão guiada', () => {
  it('avança, volta e repete sem sair dos limites', () => {
    const { s } = sessao('ab');
    expect(s.atual).toBe(0);
    expect(s.anterior()).toMatch(/já está na primeira cela/);
    s.proxima();
    expect(s.atual).toBe(1);
    expect(s.proxima()).toMatch(/Fim do texto/);
    expect(s.atual).toBe(1);
    expect(s.repetir()).toBe(s.anuncio());
    s.anterior();
    expect(s.atual).toBe(0);
    s.ultima();
    expect(s.atual).toBe(1);
    s.primeira();
    expect(s.atual).toBe(0);
  });

  it('mensagem padrão na tradicional conta janelas a partir da direita', () => {
    const { s } = sessao('b');
    expect(s.anuncio()).toBe('Cela 1 de 1. Linha 1, janela 1 a partir da direita. Letra b. Marque os pontos 1 e 2.');
  });

  it('mensagem padrão na positiva conta janelas a partir da esquerda', () => {
    const { s } = sessao('b', 'positiva');
    expect(s.anuncio()).toContain('janela 1 a partir da esquerda');
  });

  it('modo detalhado descreve a posição física de cada ponto conforme a modalidade', () => {
    const { s: t } = sessao('b', 'tradicional');
    expect(t.detalhar()).toContain('ponto 1: coluna da direita, em cima; ponto 2: coluna da direita, no meio');
    const { s: p } = sessao('b', 'positiva');
    expect(p.detalhar()).toContain('ponto 1: coluna da esquerda, em cima; ponto 2: coluna da esquerda, no meio');
  });

  it('modo breve é curto', () => {
    const { steps } = sessao('b');
    expect(anunciarPasso(steps, 0, 'tradicional', 'breve')).toBe('Cela 1 de 1. Letra b. Marque os pontos 1 e 2.');
  });

  it('explica sinais de composição e mudança de linha', () => {
    const { s } = sessao('casa Ana', 'tradicional', 8);
    s.irPara(5);
    const msg = s.anuncio();
    expect(msg).toContain('Mude para a linha 2 e comece pela janela mais à direita');
    expect(msg).toContain('Sinal de maiúscula');
    expect(msg).toContain('pontos 4 e 6');
  });

  it('caractere sem regra orienta a não marcar nada', () => {
    const { s } = sessao('@');
    expect(s.anuncio()).toContain('Não marque nada');
  });
});

describe('conferência pelo tato', () => {
  it('na tradicional pede para virar a folha; na positiva não', () => {
    expect(sessao('b', 'tradicional').s.iniciarConferencia()).toContain('vire-a');
    expect(sessao('b', 'positiva').s.iniciarConferencia()).toContain('Não é preciso virar a folha');
  });

  it('usa a orientação de LEITURA nas duas modalidades (1-2-3 à esquerda) e conta da esquerda', () => {
    for (const m of ['tradicional', 'positiva'] as const) {
      const { s } = sessao('ab', m);
      s.iniciarConferencia();
      s.proxima();
      const msg = s.detalhar();
      expect(msg).toContain('Leitura, cela 2 de 2');
      expect(msg).toContain('cela 2 a partir da esquerda');
      expect(msg).toContain('letra b, pontos 1 e 2');
      expect(msg).toContain('ponto 1: coluna da esquerda, em cima; ponto 2: coluna da esquerda, no meio');
    }
  });

  it('segue a mesma ordem do texto na escrita e na leitura', () => {
    const { s, steps } = sessao('bola', 'tradicional');
    s.iniciarConferencia();
    const lidas = [s.passoAtual!.cell.origem];
    for (let i = 1; i < steps.length; i++) {
      s.proxima();
      lidas.push(s.passoAtual!.cell.origem);
    }
    expect(lidas).toEqual(['b', 'o', 'l', 'a']);
  });

  it('marca e desmarca celas; o resumo lista as marcadas', () => {
    const { s } = sessao('sol');
    expect(s.alternarMarca()).toContain('só funciona durante a conferência');
    s.iniciarConferencia();
    s.proxima();
    expect(s.alternarMarca()).toBe('Cela 2 marcada com problema.');
    expect(s.repetir()).toContain('marcada com problema');
    s.proxima();
    s.alternarMarca();
    s.alternarMarca();
    expect(s.celasMarcadas).toEqual([1]);
    const fim = s.proxima();
    expect(fim).toContain('1 cela marcada com problema');
    expect(fim).toContain('cela 2, linha 1: letra o');
  });

  it('sem marcas, o resumo lembra que só o toque confirma a legibilidade', () => {
    const { s } = sessao('a');
    s.iniciarConferencia();
    expect(s.proxima()).toContain('só o toque confirma');
  });

  it('reescrever percorre apenas as celas marcadas, com a orientação de escrita da modalidade', () => {
    const { s } = sessao('casa', 'tradicional');
    expect(s.reescreverMarcadas()).toBe('Nenhuma cela marcada com problema.');
    s.iniciarConferencia();
    s.proxima();
    s.alternarMarca(); // a (índice 1)
    s.proxima();
    s.proxima();
    s.alternarMarca(); // a (índice 3)
    const inicio = s.reescreverMarcadas();
    expect(s.modo).toBe('escrita');
    expect(inicio).toContain('Reescrevendo 2 celas marcadas');
    expect(inicio).toContain('Recoloque a folha');
    expect(inicio).toContain('Reescrita 1 de 2');
    expect(inicio).toContain('janela 2 a partir da direita');
    expect(s.proxima()).toContain('janela 4 a partir da direita');
    expect(s.atual).toBe(3);
    expect(s.proxima()).toContain('Fim das celas marcadas');
    expect(s.anterior()).toContain('janela 2 a partir da direita');
    expect(s.anterior()).toContain('primeira cela marcada');
  });

  it('as marcas continuam ao conferir de novo, e voltar à escrita recomeça do início', () => {
    const { s } = sessao('sol');
    s.iniciarConferencia();
    s.alternarMarca();
    s.reescreverMarcadas();
    s.iniciarConferencia();
    expect(s.celasMarcadas).toEqual([0]);
    expect(s.voltarParaEscrita()).toContain('Modo de escrita. Cela 1 de 3');
    expect(s.emRevisao).toBe(false);
  });
});

describe('marcar celas vindas da foto', () => {
  it('acrescenta sem duplicar e ignora índices inválidos', () => {
    const { s } = sessao('casa');
    expect(s.marcarCelas([1, 3, 3, 99, -1])).toBe(2);
    expect(s.marcarCelas([1])).toBe(0);
    expect(s.celasMarcadas).toEqual([1, 3]);
  });
});

describe('linhas da reglete', () => {
  it('avisa para deslocar a reglete quando as linhas acabam', () => {
    const { steps } = sessao('sol mar luz', 'tradicional', 4); // uma palavra por linha
    const s = new GuidedSession(steps, 'tradicional', 'padrao', 2);
    s.irPara(4); // "m" — linha 2
    expect(s.anuncio()).toContain('Mude para a linha 2');
    s.irPara(8); // "l" — linha 3 = primeira linha após deslocar
    const msg = s.anuncio();
    expect(msg).toContain('A reglete está cheia (2 linhas)');
    expect(msg).toContain('Desloque a reglete para baixo');
    expect(msg).toContain('Linha 3 (linha 1 da reglete)');
  });

  it('sem configuração (0), nunca pede para deslocar', () => {
    const { s } = sessao('sol mar luz', 'tradicional', 4);
    s.irPara(8);
    expect(s.anuncio()).not.toContain('reglete está cheia');
  });
});

describe('retomar escrita', () => {
  it('exporta e restaura posição, modo, marcas e reescrita', () => {
    const { s, steps } = sessao('casa bola');
    s.iniciarConferencia();
    s.irPara(2);
    s.alternarMarca();
    s.irPara(6);
    s.alternarMarca();
    s.reescreverMarcadas();
    s.proxima();
    const estado = s.exportar();
    const outra = new GuidedSession(steps, 'tradicional', 'padrao');
    outra.restaurar(estado);
    expect(outra.exportar()).toEqual(estado);
    expect(outra.anuncio()).toBe(s.anuncio());
  });

  it('ignora índices que não existem no texto', () => {
    const { steps } = sessao('sol');
    const g = new GuidedSession(steps, 'tradicional', 'padrao');
    g.restaurar({ indice: 50, modo: 'escrita', marcadas: [1, 99, -3], revisao: null });
    expect(g.atual).toBe(0);
    expect(g.celasMarcadas).toEqual([1]);
  });
});
