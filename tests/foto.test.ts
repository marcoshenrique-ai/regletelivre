import { describe, expect, it } from 'vitest';
import { convertText } from '../src/braille/converter';
import { layoutCells } from '../src/reglete/layout';
import { analisarFoto, gerarRelatorio, orientacoesPara } from '../src/foto/analise';
import { avaliarEnquadramento } from '../src/foto/enquadramento';
import { fotoSintetica } from '../src/foto/sintetico';
import { criarImagem } from '../src/foto/imagem';

function passos(texto: string, n = 16) {
  return layoutCells(convertText(texto).cells, { modalidade: 'tradicional', celasPorLinha: n }).steps;
}

describe('conferência por foto (imagens sintéticas)', () => {
  it('foto fiel: localiza a escrita e não aponta diferenças, sem afirmar que está correta', () => {
    const steps = passos('Oi, tudo bem?');
    const a = analisarFoto(fotoSintetica(steps, { semente: 1 }), steps);
    const r = gerarRelatorio(a, steps);
    expect(a.grade.encontrou).toBe(true);
    expect(r.situacao).toBe('sem-diferencas');
    expect(r.resumo).toContain('não comprova');
    expect(r.resumo.toLowerCase()).not.toContain('correta');
  });

  it('aponta ponto esquecido e ponto a mais na cela certa', () => {
    const steps = passos('casa bola');
    // passo 1 = "a" (ponto 1); passo 6 = "o" (1 3 5)
    const img = fotoSintetica(steps, { omitir: ['6:3'], acrescentar: ['1:4'], semente: 3 });
    const r = gerarRelatorio(analisarFoto(img, steps), steps);
    expect(r.situacao).toBe('com-diferencas');
    const porPasso = new Map(r.suspeitas.map((s) => [s.passo, s.mensagem]));
    expect([...porPasso.keys()].sort()).toEqual([1, 6]);
    expect(porPasso.get(6)).toContain('Não vi o ponto 3');
    expect(porPasso.get(1)).toContain('a mais na posição do ponto 4');
  });

  it('funciona com inclinação, outra escala e várias linhas', () => {
    const steps = passos('maçã pão café você', 8);
    const img = fotoSintetica(steps, { passoPonto: 9, angulo: 0.08, semente: 5, omitir: ['0:4'] });
    const a = analisarFoto(img, steps);
    const r = gerarRelatorio(a, steps);
    expect(a.grade.encontrou).toBe(true);
    expect(r.suspeitas.map((s) => s.passo)).toEqual([0]);
  });

  it('reconhece foto do lado onde se escreveu (espelhada) e foto de cabeça para baixo', () => {
    const steps = passos('bola');
    const esp = analisarFoto(fotoSintetica(steps, { espelhar: true, semente: 2 }), steps);
    expect(esp.grade.encontrou).toBe(true);
    expect(esp.grade.orientacao).toBe('espelhada');
    expect(gerarRelatorio(esp, steps).resumo).toContain('lado em que se escreveu');
    const inv = analisarFoto(fotoSintetica(steps, { girar180: true, semente: 4 }), steps);
    expect(inv.grade.encontrou).toBe(true);
    expect(inv.grade.orientacao).toBe('girada-180');
  });

  it('restringe as orientações conforme o lado fotografado e a modalidade', () => {
    expect(orientacoesPara('relevo', 'tradicional')).toEqual(['leitura', 'girada-180']);
    expect(orientacoesPara('escrita', 'tradicional')).toEqual(['espelhada', 'invertida-vertical']);
    expect(orientacoesPara('escrita', 'positiva')).toEqual(['leitura', 'girada-180']);
    expect(orientacoesPara('nao-sei', 'positiva')).toHaveLength(4);
  });

  it('folha em branco ou ruído: não localiza e não aponta nenhuma cela', () => {
    const steps = passos('casa');
    const vazia = fotoSintetica(passos(' '), { largura: 300, altura: 200, ruido: 0.03 });
    const r = gerarRelatorio(analisarFoto(vazia, steps), steps);
    expect(r.situacao).toBe('nao-localizado');
    expect(r.suspeitas).toEqual([]);
    expect(r.resumo).toContain('Confira pelo tato');
  });

  it('texto diferente do fotografado: não localiza com segurança', () => {
    const esperado = passos('amigo escola');
    const outra = fotoSintetica(passos('xyz qvw'), { semente: 9 });
    const r = gerarRelatorio(analisarFoto(outra, esperado), esperado);
    expect(r.situacao).not.toBe('sem-diferencas');
  });
});

describe('orientação de enquadramento', () => {
  const steps = passos('casa bola');
  const img = fotoSintetica(steps, { margem: 60, semente: 11 });

  it('bom quando a escrita está inteira e grande o suficiente', () => {
    expect(avaliarEnquadramento(img, 20).estado).toBe('bom');
  });

  it('escuro', () => {
    expect(avaliarEnquadramento(criarImagem(200, 150, 0.05), 20).estado).toBe('escuro');
  });

  it('sem pontos', () => {
    expect(avaliarEnquadramento(criarImagem(200, 150, 0.8), 20).estado).toBe('sem-pontos');
  });

  it('indica a direção quando a escrita está cortada', () => {
    // recorta a imagem deixando a escrita encostada na borda esquerda
    const w = img.largura;
    const corte = 70;
    const recorte = { largura: w - corte, altura: img.altura, dados: new Float32Array((w - corte) * img.altura) };
    for (let y = 0; y < img.altura; y++) for (let x = corte; x < w; x++) recorte.dados[y * (w - corte) + x - corte] = img.dados[y * w + x]!;
    const r = avaliarEnquadramento(recorte, 20);
    expect(r.estado).toBe('cortado');
    expect(r.mensagem).toContain('esquerda');
  });
});

describe('posições para o desenho', () => {
  it('marca faltando, sobrando e confere nas posições certas', () => {
    const steps = passos('bola');
    const a = analisarFoto(fotoSintetica(steps, { omitir: ['0:2'], acrescentar: ['3:6'], semente: 8 }), steps);
    const estado = (passo: number, dot: number) => a.grade.posicoes.find((p) => p.passo === passo && p.dot === dot)?.estado;
    expect(estado(0, 1)).toBe('confere');
    expect(estado(0, 2)).toBe('faltando');
    expect(estado(3, 6)).toBe('sobrando');
    expect(estado(3, 5)).toBe('vazio');
  });
});
