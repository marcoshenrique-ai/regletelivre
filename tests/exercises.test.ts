import { describe, expect, it } from 'vitest';
import { corrigirEscolha, corrigirPontos, gerarExercicio, lerPontosDigitados, NIVEIS } from '../src/exercises/exercises';

function rngFixo(valores: number[]) {
  let i = 0;
  return () => valores[i++ % valores.length]!;
}

describe('exercícios', () => {
  it('todos os níveis geram exercícios válidos nas duas modalidades', () => {
    for (const nivel of NIVEIS) {
      for (const m of ['tradicional', 'positiva'] as const) {
        for (let k = 0; k < 30; k++) {
          const ex = gerarExercicio(nivel.id, m, rngFixo([k / 30, (k * 7 % 30) / 30, 0.99]));
          expect(ex.enunciado.length).toBeGreaterThan(5);
        }
      }
    }
  });

  it('pergunta de posição respeita a modalidade', () => {
    // rng < 0.5 -> "onde fica o ponto N"; 0 -> ponto 1
    const t = gerarExercicio('pontos', 'tradicional', rngFixo([0.1, 0]));
    const p = gerarExercicio('pontos', 'positiva', rngFixo([0.1, 0]));
    if (t.tipo !== 'escolha' || p.tipo !== 'escolha') throw new Error();
    expect(t.resposta).toBe('direita-superior');
    expect(p.resposta).toBe('esquerda-superior');
    expect(corrigirEscolha(t, 'direita-superior').correto).toBe(true);
    expect(corrigirEscolha(t, 'esquerda-superior').correto).toBe(false);
    expect(corrigirEscolha(t, null).correto).toBe(false);
  });

  it('correção de pontos explica o que faltou e o que sobrou', () => {
    expect(corrigirPontos([1, 2], [2, 1], 'letra b').correto).toBe(true);
    const r = corrigirPontos([1, 2, 5], [1, 4], 'letra h');
    expect(r.correto).toBe(false);
    expect(r.mensagem).toContain('Faltou pontos 2 e 5');
    expect(r.mensagem).toContain('Sobrou ponto 4');
    expect(corrigirPontos([1], [], 'letra a').mensagem).toContain('Nenhum ponto marcado');
  });

  it('lê pontos digitados em formatos comuns', () => {
    expect(lerPontosDigitados('125')).toEqual([1, 2, 5]);
    expect(lerPontosDigitados('1 2 5')).toEqual([1, 2, 5]);
    expect(lerPontosDigitados('5, 2 e 1')).toEqual([1, 2, 5]);
    expect(lerPontosDigitados('')).toEqual([]);
    expect(lerPontosDigitados('17')).toBeNull();
    expect(lerPontosDigitados('abc')).toBeNull();
  });
});
