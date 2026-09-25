/**
 * Métricas da conferência por foto em imagens SINTÉTICAS.
 * Execute com: npm run metricas:foto
 * Estes números NÃO valem para fotos reais; servem para detectar regressões.
 */
import { describe, expect, it } from 'vitest';
import { convertText } from '../src/braille/converter';
import { layoutCells } from '../src/reglete/layout';
import { analisarFoto, gerarRelatorio } from '../src/foto/analise';
import { fotoSintetica } from '../src/foto/sintetico';

const TEXTOS = ['casa', 'Oi, tudo bem?', 'maçã e pão', 'escola amigo', 'Brasil 2026', 'você está bem?', 'janela livro sol', 'ONU'];
const ATIVO = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.METRICAS === '1';

function rnd(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

describe.skipIf(!ATIVO)('métricas sintéticas da conferência por foto', () => {
  it('mede localização, erros achados e alarmes falsos', () => {
    const r = rnd(42);
    let total = 0, localizadas = 0, errosInjetados = 0, errosAchados = 0, folhasLimpas = 0, alarmesFalsos = 0;
    for (let t = 0; t < 120; t++) {
      const texto = TEXTOS[t % TEXTOS.length]!;
      const steps = layoutCells(convertText(texto).cells, { modalidade: 'tradicional', celasPorLinha: 12 }).steps;
      const comDots = steps.map((s, i) => [i, s] as const).filter(([, s]) => s.placement && s.cell.dots.length);
      const omitir: string[] = [];
      const acrescentar: string[] = [];
      const alvo = new Set<number>();
      if (t % 2 === 1) {
        const [i, s] = comDots[Math.floor(r() * comDots.length)]!;
        omitir.push(`${i}:${s.cell.dots[0]}`);
        alvo.add(i);
      }
      const img = fotoSintetica(steps, {
        passoPonto: 8 + Math.floor(r() * 10),
        angulo: (r() - 0.5) * 0.2,
        ruido: 0.01 + r() * 0.04,
        relevo: 0.15 + r() * 0.2,
        espelhar: r() < 0.25,
        semente: t + 1,
        omitir,
        acrescentar,
      });
      const rel = gerarRelatorio(analisarFoto(img, steps), steps);
      total++;
      if (rel.situacao !== 'nao-localizado') localizadas++;
      const apontadas = new Set(rel.suspeitas.map((s) => s.passo));
      if (alvo.size) {
        errosInjetados++;
        if ([...alvo].every((i) => apontadas.has(i))) errosAchados++;
        alarmesFalsos += [...apontadas].filter((i) => !alvo.has(i)).length;
      } else {
        folhasLimpas++;
        alarmesFalsos += apontadas.size;
      }
    }
    const pct = (a: number, b: number) => `${((100 * a) / b).toFixed(1)}%`;
    console.log(`Folhas sintéticas: ${total}`);
    console.log(`Escrita localizada: ${pct(localizadas, total)}`);
    console.log(`Ponto esquecido apontado na cela certa: ${pct(errosAchados, errosInjetados)}`);
    console.log(`Celas apontadas sem erro (alarmes falsos) por folha: ${(alarmesFalsos / total).toFixed(2)}`);
    expect(localizadas).toBeGreaterThan(0);
  }, 300_000);
});
