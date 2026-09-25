# Regras Braille adotadas e situação de validação

Este documento é a referência humana da tabela em `src/braille/rules-pt-br.ts`. **Os dois precisam mudar juntos.**
A própria aplicação mostra a mesma tabela na tela “Ajuda e regras”, gerada a partir do código.

## Política

1. **Nunca inventar correspondências.** Se uma regra não está confirmada, o caractere é recusado com aviso
   e a pessoa é orientada a procurar um revisor ou professor de Braille.
2. **`verificada`** = encontrada igual em pelo menos **duas fontes secundárias independentes** e coberta por teste
   automatizado. Só essas regras são usadas pelo conversor.
3. **`pendente`** = não confirmada ou com fontes divergentes. Fica com `celas: null` e o conversor não a usa.
4. **Revisão humana**: toda regra começa com `revisaoHumana: 'pendente'`. Passa a `aprovada` apenas quando uma
   pessoa qualificada (revisor(a) Braille, professor(a) de AEE/Braille, transcritor(a) de centro especializado)
   conferir a regra na *Grafia Braille para a Língua Portuguesa* e registrar isso num pull request.

> **Limitação conhecida da versão 0.1.0:** a fonte normativa, a *Grafia Braille para a Língua Portuguesa*
> (MEC/SEESP, aprovada pela Portaria MEC nº 2.678/2002; 3ª edição, 2018), **não pôde ser consultada
> diretamente** durante a criação do projeto: os servidores do MEC e do IBC recusaram a conexão da ferramenta
> usada. As regras “verificadas” foram cruzadas em fontes secundárias. A primeira tarefa aberta para
> colaboradores é conferir cada linha abaixo na Grafia.

## Fontes

| Chave | Fonte | Tipo |
|---|---|---|
| `grafia2018` | *Grafia Braille para a Língua Portuguesa*, MEC/SEESP, 3ª ed., 2018 — [PDF no portal do IBC](https://www.gov.br/ibc/pt-br/pesquisa-e-tecnologia/materiais-especializados-1/livros-em-braille-1/o-sistema-braille-arquivos/grafia-braille-para-a-lingua-portuguesa-pdf.pdf) | normativa (**não conferida ainda**) |
| `wikipediaPt` | [Wikipédia (pt): Braille](https://pt.wikipedia.org/wiki/Braille), consultada em 25/09/2026 | secundária |
| `wikipediaEn` | [Wikipedia (en): Portuguese Braille](https://en.wikipedia.org/wiki/Portuguese_Braille), consultada em 25/09/2026 | secundária |
| `megapontes` | [Megapontes: Braille — alfabeto português](https://megapontes.pt/braille/braille-alfabeto-portugues/), consultada em 25/09/2026 | secundária |
| `intervox` | [Intervox/NCE-UFRJ: alterações da Grafia Braille (2002)](https://intervox.nce.ufrj.br/~josevan/braille.html), consultada em 25/09/2026 | secundária |
| `liblouisPtPt` | [liblouis — `tables/pt-pt-g1.utb`](https://github.com/liblouis/liblouis/blob/master/tables/pt-pt-g1.utb) (Braille integral, Portugal), versão 3.2.0 lida do pacote npm `liblouis-build` em 25/09/2026 | secundária (legível por máquina) |

A Grafia Braille para a Língua Portuguesa é comum ao Brasil e a Portugal desde 2002; por isso uma fonte portuguesa
(Megapontes) foi aceita como fonte secundária.

## Regras verificadas (usadas pelo conversor)

Braille integral (sem abreviaturas), cela de seis pontos. Numeração padrão: 1-2-3 na coluna esquerda e 4-5-6 na
coluna direita **da cela de leitura**.

### Letras a–z — fontes: `wikipediaPt`, `wikipediaEn`, `liblouisPtPt`

| a | b | c | d | e | f | g | h | i | j |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 12 | 14 | 145 | 15 | 124 | 1245 | 125 | 24 | 245 |

| k | l | m | n | o | p | q | r | s | t |
|---|---|---|---|---|---|---|---|---|---|
| 13 | 123 | 134 | 1345 | 135 | 1234 | 12345 | 1235 | 234 | 2345 |

| u | v | w | x | y | z |
|---|---|---|---|---|---|
| 136 | 1236 | 2456 | 1346 | 13456 | 1356 |

### Letras com diacríticos — fontes: `wikipediaPt`, `megapontes`, `liblouisPtPt`

| á | é | í | ó | ú | à | â | ê | ô | ã | õ | ç | ü |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 12356 | 123456 | 34 | 346 | 23456 | 1246 | 16 | 126 | 1456 | 345 | 246 | 12346 | 1256 |

### Pontuação — fontes: `wikipediaPt`, `megapontes`, `intervox`, `liblouisPtPt` (ponto final: `wikipediaPt`, `megapontes`, `wikipediaEn`, `liblouisPtPt`)

| Sinal | Nome | Pontos |
|---|---|---|
| , | vírgula | 2 |
| ; | ponto e vírgula | 23 |
| : | dois-pontos | 25 |
| . | ponto final | 3 |
| ? | interrogação | 26 |
| ! | exclamação | 235 |
| - | hífen | 36 |

Observação: no Braille em português o ponto final é o **ponto 3** (e não 256, como no Braille inglês).
Esse é um exemplo de por que o projeto não reaproveita tabelas de outros idiomas.

### Sinais de composição

| Sinal | Pontos | Uso nesta versão | Fontes |
|---|---|---|---|
| maiúscula | 46 | antes de cada letra maiúscula isolada | todas as secundárias |
| palavra em caixa alta | 46 46 | antes de palavra inteira em maiúsculas (2+ letras), uma vez por palavra | `wikipediaPt`, `intervox`, `liblouisPtPt` |
| número | 3456 | antes de um número inteiro; algarismos 1–9 e 0 usam as celas de a–j | todas as secundárias |

### Espaço

Uma janela deixada em branco. Espaços repetidos, tabulações e quebras de linha do texto digitado viram um único espaço.

## Regras pendentes (bloqueadas — o conversor avisa e não marca pontos)

| Id | O quê | Motivo |
|---|---|---|
| `pontuacao-aspas` | aspas " “ ” | fontes citam 236; liblouis pt-pt usa 236 para " e 56 236 para “ ”; confirmar o uso no Brasil |
| `pontuacao-aspas-simples` | ‘ ’ | sem confirmação |
| `pontuacao-apostrofo` | ' | fontes citam 3, igual ao ponto final; confirmar contexto |
| `pontuacao-parenteses` | ( ) | Intervox e liblouis indicam 126 3 / 6 345; Wikipédia lista variantes (inclusive para números); confirmar |
| `pontuacao-colchetes` | [ ] | sem confirmação |
| `pontuacao-reticencias` | … e "..." | Wikipédia e Intervox: 3 3 3; liblouis pt-pt: 35 26 35 — divergência |
| `pontuacao-travessao` | — – | fontes divergem |
| `pontuacao-barra` | / | sem confirmação |
| `letra-e-grave`, `letra-i-grave`, `letra-u-grave`, `letra-i-trema` | è ì ù ï | fora do português do Brasil; confirmar |
| `letra-o-grave` | ò | Wikipédia e liblouis usam 2456, igual ao w; confirmar |
| `numero-seguido-de-letra` | "3a", "5.", "A4", "(2" | regra de separação entre algarismo e letra/sinal não confirmada — só aceitamos número cercado por espaço ou início/fim do texto |
| `numero-separadores` | "1,5", "1.000" | vírgula decimal e ponto de milhar têm regras próprias |
| `numero-ordinal-fracao` | º ª % e frações | sem confirmação |
| `sinal-caixa-alta-sequencia` | várias palavras seguidas em maiúsculas | nesta versão o sinal 46 46 é aplicado palavra a palavra |
| `quebra-de-linha-hifenizacao` | divisão de palavra no fim da linha | o app não divide palavras; palavra maior que a linha gera aviso |

Qualquer outro caractere (@, #, $, ñ, emoji etc.) também é recusado com aviso.

## Modelo da reglete (a validar com usuários)

Premissas codificadas em `src/reglete/modality.ts` e `src/reglete/layout.ts`, testadas em `tests/reglete.test.ts`:

**Reglete tradicional**
- A punção empurra o papel; o relevo aparece do outro lado. Para ler, vira-se a folha.
- Escreve-se da **direita para a esquerda**, começando pela janela mais à direita de cada linha.
- A **ordem das letras não é invertida**: a 1ª letra do texto vai na 1ª janela à direita.
- Cada cela é **espelhada**: pontos 1-2-3 na coluna **direita** da janela; 4-5-6 na **esquerda**; as alturas se mantêm.
- Teste-chave: virar a folha escrita (inverter a ordem das janelas **e** espelhar cada cela) produz exatamente a
  leitura; e “só inverter as letras” produz um resultado diferente (teste `apenas inverter a sequência das letras NÃO…`).

**Reglete positiva**
- A punção de ponta côncava forma o relevo do lado em que se escreve.
- Escreve-se da **esquerda para a direita**, com a cela na mesma orientação da leitura.

**Distribuição em linhas**
- Janelas por linha configuráveis (4 a 42; padrão 28 — conte as da sua reglete).
- Palavras não são divididas; o espaço que coincide com a mudança de linha não ocupa janela.
- Sinais de composição (maiúscula, número) ficam na mesma linha da palavra.
- Não modelamos ainda: número de linhas por página/prancheta, margem inicial, recuo de parágrafo.

Pontos que precisam de validação com pessoas que usam reglete: se a contagem de janelas “a partir da direita” é a
forma mais natural de orientar; se a descrição “coluna da direita, em cima” é compreendida; se a reglete positiva
de uso corrente no Brasil segue de fato a orientação descrita.

## Como propor correção de regra

1. Abra uma issue “Correção de regra Braille” citando a página/seção da Grafia (ou outra fonte normativa).
2. No pull request, altere **juntos**: `src/braille/rules-pt-br.ts`, os testes em `tests/` e este documento.
3. Para marcar `revisaoHumana: 'aprovada'`, informe nome (ou pseudônimo) e qualificação de quem revisou,
   e ajuste o teste `nenhuma regra foi marcada como aprovada por revisão humana sem registro`.
