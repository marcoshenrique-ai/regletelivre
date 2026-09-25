/**
 * Fontes consultadas para cada regra. Ver docs/REGRAS-BRAILLE.md.
 *
 * IMPORTANTE: a fonte normativa é a "Grafia Braille para a Língua Portuguesa"
 * (MEC/SEESP, aprovada pela Portaria MEC nº 2.678/2002; 3ª edição, 2018).
 * Na primeira versão do projeto o documento oficial não pôde ser consultado
 * diretamente (os servidores do MEC/IBC recusaram a conexão da ferramenta usada),
 * então as regras habilitadas foram cruzadas em fontes secundárias concordantes.
 * Toda regra continua com `revisaoHumana: 'pendente'` até conferência na Grafia.
 */
export interface Source {
  chave: string;
  titulo: string;
  url?: string;
  tipo: 'normativa' | 'secundaria';
  consultadaEm?: string;
  observacao?: string;
}

export const SOURCES: Record<string, Source> = {
  grafia2018: {
    chave: 'grafia2018',
    titulo:
      'Grafia Braille para a Língua Portuguesa. MEC/SEESP, 3ª ed., 2018 (Portaria MEC nº 2.678/2002)',
    url: 'https://www.gov.br/ibc/pt-br/pesquisa-e-tecnologia/materiais-especializados-1/livros-em-braille-1/o-sistema-braille-arquivos/grafia-braille-para-a-lingua-portuguesa-pdf.pdf',
    tipo: 'normativa',
    observacao:
      'Fonte de referência obrigatória. AINDA NÃO CONFERIDA regra a regra neste projeto — tarefa aberta para revisores.',
  },
  wikipediaPt: {
    chave: 'wikipediaPt',
    titulo: 'Wikipédia (pt): Braille — tabelas do Braille em português',
    url: 'https://pt.wikipedia.org/wiki/Braille',
    tipo: 'secundaria',
    consultadaEm: '2026-09-25',
    observacao: 'Cita a Portaria nº 2.678/2002 e a Grafia (2ª ed., 2006).',
  },
  megapontes: {
    chave: 'megapontes',
    titulo: 'Megapontes: Braille — alfabeto português (Grafia Braille para a Língua Portuguesa)',
    url: 'https://megapontes.pt/braille/braille-alfabeto-portugues/',
    tipo: 'secundaria',
    consultadaEm: '2026-09-25',
    observacao: 'A Grafia é comum a Brasil e Portugal desde 2002.',
  },
  intervox: {
    chave: 'intervox',
    titulo: 'Intervox/NCE-UFRJ: Alterações da Grafia Braille para a Língua Portuguesa (2002)',
    url: 'https://intervox.nce.ufrj.br/~josevan/braille.html',
    tipo: 'secundaria',
    consultadaEm: '2026-09-25',
  },
  liblouisPtPt: {
    chave: 'liblouisPtPt',
    titulo: 'liblouis — tabela pt-pt-g1.utb (Braille integral português), versão 3.2.0, pacote npm liblouis-build',
    url: 'https://github.com/liblouis/liblouis/blob/master/tables/pt-pt-g1.utb',
    tipo: 'secundaria',
    consultadaEm: '2026-09-25',
    observacao:
      'Tabela de tradução usada por leitores de tela e linhas Braille. É de Portugal; a Grafia é comum, mas diferenças de uso no Brasil precisam de revisão.',
  },
  wikipediaEn: {
    chave: 'wikipediaEn',
    titulo: 'Wikipedia (en): Portuguese Braille',
    url: 'https://en.wikipedia.org/wiki/Portuguese_Braille',
    tipo: 'secundaria',
    consultadaEm: '2026-09-25',
  },
};
