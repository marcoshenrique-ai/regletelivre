import { describe, expect, it } from 'vitest';
import { RULES } from '../src/braille/rules-pt-br';
import { SOURCES } from '../src/braille/sources';

describe('tabela de regras', () => {
  it('toda fonte citada existe', () => {
    for (const r of RULES) for (const f of r.fontes) expect(SOURCES[f], `${r.id} cita ${f}`).toBeDefined();
  });

  it('ids são únicos', () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('regra verificada tem celas válidas e pelo menos duas fontes secundárias independentes', () => {
    for (const r of RULES.filter((x) => x.status === 'verificada')) {
      expect(r.celas, r.id).not.toBeNull();
      for (const cela of r.celas!) {
        expect(new Set(cela).size, r.id).toBe(cela.length);
        for (const p of cela) expect([1, 2, 3, 4, 5, 6]).toContain(p);
        expect([...cela].sort(), r.id).toEqual(cela);
      }
      const secundarias = r.fontes.filter((f) => SOURCES[f]!.tipo === 'secundaria');
      expect(secundarias.length, `${r.id} precisa de 2 fontes`).toBeGreaterThanOrEqual(2);
    }
  });

  it('regra pendente nunca tem pontos atribuídos', () => {
    for (const r of RULES.filter((x) => x.status === 'pendente')) expect(r.celas, r.id).toBeNull();
  });

  it('nenhuma regra foi marcada como aprovada por revisão humana sem registro', () => {
    // Quando um revisor aprovar uma regra, atualize este teste e docs/REGRAS-BRAILLE.md juntos.
    expect(RULES.filter((r) => r.revisaoHumana === 'aprovada')).toEqual([]);
  });

  it('letras, acentuadas, pontuação e sinais não compartilham a mesma cela', () => {
    const vistos = new Map<string, string>();
    for (const r of RULES) {
      if (r.status !== 'verificada' || r.categoria === 'numero' || r.categoria === 'espaco') continue;
      if (r.id === 'sinal-caixa-alta') continue; // é o sinal de maiúscula repetido
      const chave = r.celas!.map((c) => c.join('')).join('|');
      expect(vistos.get(chave), `${r.id} repete a cela de ${vistos.get(chave)}`).toBeUndefined();
      vistos.set(chave, r.id);
    }
  });

  it('algarismos 1–0 usam as celas das letras a–j', () => {
    const letras = 'abcdefghij'.split('');
    '1234567890'.split('').forEach((dig, i) => {
      const d = RULES.find((r) => r.id === `digito-${dig}`)!;
      const l = RULES.find((r) => r.id === `letra-${letras[i]}`)!;
      expect(d.celas).toEqual(l.celas);
    });
  });
});
