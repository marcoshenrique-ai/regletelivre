const NS = 'http://www.w3.org/2000/svg';

/**
 * Desenha uma janela da reglete (grade 3×2). Pontos marcados são círculos cheios e
 * grandes; posições vazias são círculos pequenos vazados — a diferença é de forma e
 * tamanho, não só de cor. O desenho é decorativo: a informação completa está sempre
 * em texto (tabela de descrição equivalente).
 */
export function desenharJanela(grade: boolean[][], opcoes: { vazia?: boolean } = {}): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 60');
  svg.setAttribute('class', `janela${opcoes.vazia ? ' janela-vazia' : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const moldura = document.createElementNS(NS, 'rect');
  moldura.setAttribute('x', '1');
  moldura.setAttribute('y', '1');
  moldura.setAttribute('width', '38');
  moldura.setAttribute('height', '58');
  moldura.setAttribute('rx', '6');
  moldura.setAttribute('class', 'janela-moldura');
  svg.appendChild(moldura);

  grade.forEach((linha, r) => {
    linha.forEach((marcado, c) => {
      const circ = document.createElementNS(NS, 'circle');
      circ.setAttribute('cx', String(c === 0 ? 12 : 28));
      circ.setAttribute('cy', String(12 + r * 18));
      circ.setAttribute('r', marcado ? '6.5' : '2.5');
      circ.setAttribute('class', marcado ? 'ponto-marcado' : 'ponto-vazio');
      svg.appendChild(circ);
    });
  });
  return svg;
}
