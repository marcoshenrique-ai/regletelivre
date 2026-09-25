import { describe, expect, it } from 'vitest';
import { PADRAO, sanitizar } from '../src/ui/settings';

describe('configurações', () => {
  it('valores inválidos voltam ao padrão', () => {
    const c = sanitizar({ linhasDaReglete: 99, celasPorLinha: 2, velocidade: 9, modalidade: 'x' as never, guardarProgresso: 'sim' as never });
    expect(c.linhasDaReglete).toBe(0);
    expect(c.celasPorLinha).toBe(PADRAO.celasPorLinha);
    expect(c.velocidade).toBe(1);
    expect(c.modalidade).toBe('tradicional');
    expect(c.guardarProgresso).toBe(false);
  });
  it('guardar progresso vem desligado por padrão', () => {
    expect(PADRAO.guardarProgresso).toBe(false);
    expect(sanitizar({}).guardarProgresso).toBe(false);
  });
});
