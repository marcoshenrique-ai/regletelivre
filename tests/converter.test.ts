import { describe, expect, it } from 'vitest';
import { convertText, describeDots, dotsToUnicode } from '../src/braille/converter';

const dots = (texto: string) => convertText(texto).cells.map((c) => c.dots.join(''));

describe('alfabeto', () => {
  it('a–z na ordem', () => {
    expect(dots('abcdefghijklmnopqrstuvwxyz')).toEqual([
      '1', '12', '14', '145', '15', '124', '1245', '125', '24', '245',
      '13', '123', '134', '1345', '135', '1234', '12345', '1235', '234', '2345',
      '136', '1236', '2456', '1346', '13456', '1356',
    ]);
  });

  it('letras acentuadas do português', () => {
    expect(dots('áéíóúàâêôãõçü')).toEqual([
      '12356', '123456', '34', '346', '23456', '1246', '16', '126', '1456', '345', '246', '12346', '1256',
    ]);
  });

  it('normaliza acento decomposto (NFD) para a forma composta', () => {
    expect(dots('café')).toEqual(dots('café'));
  });
});

describe('ordem das celas', () => {
  it('mantém a ordem do texto e marca a origem de cada cela', () => {
    const r = convertText('casa');
    expect(r.cells.map((c) => c.origem)).toEqual(['c', 'a', 's', 'a']);
    expect(r.cells.map((c) => c.indiceTexto)).toEqual([0, 1, 2, 3]);
  });

  it('espaço vira cela vazia e espaços repetidos são reduzidos', () => {
    const r = convertText('  sol   mar ');
    expect(r.cells.map((c) => c.role)).toEqual(['letra', 'letra', 'letra', 'espaco', 'letra', 'letra', 'letra']);
  });
});

describe('maiúsculas', () => {
  it('sinal 46 antes da letra maiúscula', () => {
    expect(dots('Ana')).toEqual(['46', '1', '1345', '1']);
    expect(convertText('Ana').cells[0]!.role).toBe('sinal-maiuscula');
  });

  it('maiúscula acentuada', () => {
    expect(dots('É')).toEqual(['46', '123456']);
  });

  it('palavra inteira em maiúsculas usa 46 46 uma única vez', () => {
    expect(dots('ONU')).toEqual(['46', '46', '135', '1345', '136']);
  });

  it('caixa alta com pontuação no fim', () => {
    expect(dots('SOL!')).toEqual(['46', '46', '234', '135', '123', '235']);
  });

  it('maiúsculas no meio da palavra recebem sinal individual', () => {
    expect(dots('McD')).toEqual(['46', '134', '14', '46', '145']);
  });
});

describe('pontuação validada', () => {
  it('vírgula, ponto e vírgula, dois-pontos, ponto, interrogação, exclamação, hífen', () => {
    expect(dots(',;:.?!-')).toEqual(['2', '23', '25', '3', '26', '235', '36']);
  });

  it('frase completa', () => {
    const r = convertText('Oi, tudo bem?');
    expect(r.temPendencias).toBe(false);
    expect(r.cells.map((c) => c.dots.join(''))).toEqual([
      '46', '135', '24', '2', '', '2345', '136', '145', '135', '', '12', '15', '134', '26',
    ]);
  });
});

describe('números', () => {
  it('inteiro isolado: sinal de número seguido das celas a–j', () => {
    expect(dots('tenho 25 anos')).toEqual([
      '2345', '15', '1345', '125', '135', '', '3456', '12', '15', '', '1', '1345', '135', '234',
    ]);
  });

  it('número no fim do texto', () => {
    expect(dots('1990')).toEqual(['3456', '1', '24', '24', '245']);
  });

  it.each(['3a', '5.', '1,5', '1.000', 'A4', '2x'])('"%s" fica bloqueado por regra pendente', (t) => {
    const r = convertText(t);
    expect(r.temPendencias).toBe(true);
    expect(r.cells.some((c) => c.role === 'digito' || c.role === 'sinal-numero')).toBe(false);
  });
});

describe('caracteres sem regra validada', () => {
  it.each(['"', '(', ')', "'", '…', '...', '@', '%', '/', 'è', 'ñ', '—'])('"%s" gera aviso e nenhuma cela com pontos', (t) => {
    const r = convertText(`a${t}b`);
    expect(r.temPendencias).toBe(true);
    const nao = r.cells.filter((c) => c.role === 'nao-suportado');
    expect(nao.length).toBeGreaterThan(0);
    for (const c of nao) expect(c.dots).toEqual([]);
    expect(r.avisos[0]!.mensagem.length).toBeGreaterThan(10);
  });

  it('não confunde reticências com três pontos finais', () => {
    const r = convertText('fim...');
    expect(r.cells.filter((c) => c.role === 'pontuacao')).toEqual([]);
  });
});

describe('utilitários', () => {
  it('Unicode Braille', () => {
    expect(dotsToUnicode([1])).toBe('⠁');
    expect(dotsToUnicode([1, 2, 3, 4, 5, 6])).toBe('⠿');
    expect(dotsToUnicode([])).toBe('⠀');
  });
  it('descrição dos pontos', () => {
    expect(describeDots([])).toBe('nenhum ponto');
    expect(describeDots([3])).toBe('ponto 3');
    expect(describeDots([5, 1, 2])).toBe('pontos 1, 2 e 5');
  });
});
