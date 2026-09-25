# Como contribuir com o Reglete Livre

Obrigado por querer ajudar! Toda contribuição é bem-vinda — e **a mais valiosa não exige programar**:
testar com a sua reglete e contar o que aconteceu.

## Formas de contribuir

| Você é… | Como ajudar |
|---|---|
| Pessoa cega ou com baixa visão | Use o app e relate problemas (modelo “Relato de teste de usabilidade”). Veja [docs/TESTES-DE-USABILIDADE.md](docs/TESTES-DE-USABILIDADE.md). |
| Professor(a) de Braille, AEE ou revisor(a) | Confira as regras em [docs/REGRAS-BRAILLE.md](docs/REGRAS-BRAILLE.md) contra a Grafia e abra “Correção de regra Braille”. Sugira exercícios e frases de orientação. |
| Familiar ou voluntário(a) | Teste a visualização e diga se ajuda a acompanhar. |
| Pessoa desenvolvedora | Corrija issues, melhore testes, traduza mensagens com clareza. |
| Designer/redator(a) | Revise textos falados (`src/guide/messages.ts`) para ficarem curtos e claros. |

Se não usa GitHub, envie o relato por e-mail ou áudio para quem mantém o projeto; alguém abre a issue por você.

## Regras de ouro

1. **Nunca invente uma correspondência Braille.** Toda regra nova precisa citar fonte (de preferência a página/seção
   da *Grafia Braille para a Língua Portuguesa*) e ter teste. Na dúvida, deixe `pendente`.
2. **Tabela, testes e documentação mudam juntos:** `src/braille/rules-pt-br.ts`, `tests/*.test.ts` e
   `docs/REGRAS-BRAILLE.md`.
3. **Acessibilidade não é opcional.** Toda tela nova deve ser usável só com teclado e leitor de tela, sem depender de
   cor, animação, câmera ou voz. Rode `npm run test:e2e` e faça o roteiro manual de `docs/ACESSIBILIDADE.md`
   com pelo menos um leitor de tela.
4. **Privacidade:** nada de contas, novos rastreadores ou chamadas de rede com o texto, as fotos ou as configurações da pessoa. A única medição permitida é a tag de visitas do site oficial (Google Analytics), já presente no `index.html`.
5. **Português do Brasil** em interface, mensagens, documentação e nomes de commits.

## Preparando o ambiente

```bash
git clone <url-do-repositório>
cd reglete-livre
npm install
npm run dev
```

## Antes de abrir um pull request

```bash
npm run typecheck
npm test
npm run build && npm run test:e2e
```

- Descreva **o que** mudou e **por quê**; para regras Braille, cite a fonte.
- Diga como testou (leitor de tela, navegador, sistema).
- Mantenha o motor (`src/braille`, `src/reglete`, `src/guide`, `src/exercises`) livre de DOM.
- Mensagens faladas: frases curtas, informação mais importante primeiro, números por extenso só quando ajudarem.

## Revisão por especialistas

Uma regra só passa a `revisaoHumana: 'aprovada'` com registro de quem revisou (nome ou pseudônimo e qualificação)
no pull request. Veja “Como propor correção de regra” em `docs/REGRAS-BRAILLE.md`.

## Conduta

Este projeto segue o [Código de conduta](CODE_OF_CONDUCT.md). Trate cada pessoa, e especialmente cada pessoa com
deficiência que testa o app, como especialista na própria experiência.
