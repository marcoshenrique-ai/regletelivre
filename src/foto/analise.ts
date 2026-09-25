import { describeDots } from '../braille/converter';
import { nomeDaCela } from '../guide/messages';
import type { LayoutStep } from '../reglete/layout';
import { detectarManchas, type Mancha } from './deteccao';
import { ajustarGrade, ORIENTACOES, type Orientacao, type ResultadoGrade } from './grade';
import { brilhoMedio, type ImagemCinza } from './imagem';

/**
 * Conferência por foto.
 *
 * PRINCÍPIOS (docs/ROADMAP.md, requisitos do projeto):
 *  - a foto NUNCA prova que o relevo ficou legível ao toque;
 *  - o resultado só aponta "possíveis diferenças" para a pessoa conferir pelo tato;
 *  - o app nunca afirma que a escrita está correta;
 *  - tudo é processado no aparelho; a imagem não é enviada nem guardada.
 */

const RAIOS = [1.5, 2, 2.5, 3.5, 5, 7, 9.5, 13];

export type LadoFotografado = 'relevo' | 'escrita' | 'nao-sei';

export interface AnaliseFoto {
  grade: ResultadoGrade;
  manchas: Mancha[];
  raio: number;
  brilho: number;
}

export function contarPontosEsperados(steps: readonly LayoutStep[]): number {
  return steps.reduce((t, s) => t + (s.placement ? s.cell.dots.length : 0), 0);
}

/**
 * Orientações a testar conforme o lado fotografado.
 * Lado do relevo = orientação de leitura (nas duas regletes). Lado onde se escreveu,
 * na tradicional, é o espelho da leitura; na positiva, é o próprio lado do relevo.
 * A foto de cabeça para baixo também é aceita.
 */
export function orientacoesPara(lado: LadoFotografado, modalidade: 'tradicional' | 'positiva'): Orientacao[] {
  if (lado === 'nao-sei') return ORIENTACOES;
  const espelhada = lado === 'escrita' && modalidade === 'tradicional';
  return espelhada ? ['espelhada', 'invertida-vertical'] : ['leitura', 'girada-180'];
}

export function analisarFoto(
  img: ImagemCinza,
  steps: readonly LayoutStep[],
  orientacoes: readonly Orientacao[] = ORIENTACOES,
): AnaliseFoto {
  const esperados = Math.max(1, contarPontosEsperados(steps));
  const porEscala = RAIOS.flatMap((raio) =>
    (['escura', 'clara', 'ambas'] as const).map((pol) => ({ raio, manchas: detectarManchas(img, raio, pol) })),
  );
  // Escalas cujo número de manchas é mais próximo do esperado são as mais promissoras.
  const candidatas = porEscala
    .filter((c) => c.manchas.length >= 2)
    .sort((a, b) => Math.abs(Math.log(a.manchas.length / esperados)) - Math.abs(Math.log(b.manchas.length / esperados)))
    .slice(0, 6);

  let melhor: AnaliseFoto | null = null;
  for (const c of candidatas) {
    const grade = ajustarGrade(c.manchas, steps, orientacoes);
    const nota = (grade.encontrou ? 1000 : 0) + grade.pontuacao;
    const notaMelhor = melhor ? (melhor.grade.encontrou ? 1000 : 0) + melhor.grade.pontuacao : -Infinity;
    if (nota > notaMelhor) melhor = { grade, manchas: c.manchas, raio: c.raio, brilho: 0 };
  }
  const brilho = brilhoMedio(img);
  if (!melhor) {
    return { grade: ajustarGrade([], steps), manchas: [], raio: 0, brilho };
  }
  melhor.brilho = brilho;
  return melhor;
}

export interface CelaSuspeita {
  passo: number;
  mensagem: string;
}

export interface RelatorioFoto {
  situacao: 'nao-localizado' | 'com-diferencas' | 'sem-diferencas';
  resumo: string;
  suspeitas: CelaSuspeita[];
}

export function gerarRelatorio(analise: AnaliseFoto, steps: readonly LayoutStep[]): RelatorioFoto {
  const g = analise.grade;
  const pct = Math.round(g.fracaoEncontrada * 100);
  if (!g.encontrou) {
    const dicas = [
      analise.brilho < 0.25 ? 'a foto está escura; use mais luz' : null,
      'ilumine a folha de lado (uma lanterna rente ao papel realça o relevo)',
      'mantenha o aparelho paralelo à folha, a um palmo de distância',
      'inclua toda a escrita na foto',
    ].filter(Boolean);
    return {
      situacao: 'nao-localizado',
      resumo:
        `Não consegui localizar a escrita na foto com segurança` +
        (g.pontosEsperados ? ` (localizei ${pct}% dos pontos esperados)` : '') +
        `. Nenhuma cela foi apontada. Dicas: ${dicas.join('; ')}. Confira pelo tato.`,
      suspeitas: [],
    };
  }

  const suspeitas: CelaSuspeita[] = [...g.diferencas.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([passo, dif]) => {
      const s = steps[passo]!;
      const partes = [`Cela ${passo + 1}, linha ${s.placement!.linha}: ${nomeDaCela(s.cell)}.`];
      if (dif.faltando.length) partes.push(`Não vi ${dif.faltando.length === 1 ? 'o' : 'os'} ${describeDots(dif.faltando)}.`);
      if (dif.sobrando.length) {
        partes.push(`Vi marca a mais na posição do ${describeDots(dif.sobrando)}.`);
      }
      return { passo, mensagem: partes.join(' ') };
    });

  const orientacao =
    g.orientacao === 'espelhada' || g.orientacao === 'invertida-vertical'
      ? ' A foto parece ter sido tirada do lado em que se escreveu.'
      : '';
  const confianca =
    g.fracaoEncontrada < 0.8
      ? ' Parte dos pontos não ficou nítida na foto; algumas diferenças podem ser da foto, e não da escrita.'
      : '';

  if (suspeitas.length === 0) {
    return {
      situacao: 'sem-diferencas',
      resumo:
        `Não encontrei diferenças na foto: localizei ${g.pontosEncontrados} de ${g.pontosEsperados} pontos esperados.${orientacao}${confianca} ` +
        'A foto não comprova que o relevo está legível: confira pelo tato.',
      suspeitas,
    };
  }
  const n = suspeitas.length;
  return {
    situacao: 'com-diferencas',
    resumo:
      `Possíveis diferenças em ${n} ${n === 1 ? 'cela' : 'celas'}. Localizei ${g.pontosEncontrados} de ${g.pontosEsperados} pontos esperados.${orientacao}${confianca} ` +
      'Confira essas celas pelo tato antes de corrigir.',
    suspeitas,
  };
}
