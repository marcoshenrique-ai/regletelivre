# Testes de usabilidade com pessoas cegas, com baixa visão e educadores

O Reglete Livre só estará pronto quando **quem usa reglete** disser que ele ajuda. Este guia explica como participar
e como conduzir sessões de teste de forma respeitosa e útil.

## Quem queremos ouvir

- Pessoas cegas ou com baixa visão aprendendo ou usando reglete (tradicional ou positiva), de qualquer idade
  (menores de 18 anos só com autorização e presença de responsável).
- Professores de Braille, de AEE (Atendimento Educacional Especializado) e de centros de reabilitação.
- Revisores e transcritores Braille.
- Familiares e voluntários que acompanham o aprendizado.

## Formas de participar

1. **Teste livre, sozinho:** use o app no seu dia a dia e conte o que funcionou e o que atrapalhou, pelo modelo de
   issue “Relato de teste de usabilidade”, por e-mail ou por mensagem de áudio para quem mantém o projeto.
   Não é preciso saber programar nem usar o GitHub.
2. **Sessão guiada (30–45 min),** presencial ou por chamada de vídeo/áudio, com um facilitador.
3. **Revisão de regras Braille** (para revisores e professores): conferir a tabela de `docs/REGRAS-BRAILLE.md`
   contra a *Grafia Braille para a Língua Portuguesa* e apontar erros.

## Roteiro de sessão guiada

**Antes**
- Explique o objetivo, que é o app que está sendo testado (não a pessoa), que ela pode parar quando quiser e o que
  será anotado. Peça consentimento para anotar; grave só se ela autorizar expressamente.
- Pergunte: leitor de tela e navegador usados, aparelho, experiência com Braille e com reglete, qual reglete tem
  (tradicional/positiva, quantas janelas por linha).
- Não configure nada por ela: parte do teste é descobrir as configurações.

**Tarefas** (peça uma de cada vez; não explique onde clicar)
1. Descobrir as telas do aplicativo e dizer para que serve cada uma.
2. Configurar a sua reglete (modalidade e janelas por linha).
3. Escrever o próprio nome com a reglete de verdade, seguindo o modo guiado.
4. Voltar uma cela, repetir uma instrução e pedir o detalhamento da posição.
5. Escrever a frase “Oi, tudo bem?” — depois, usar “Conferir pelo tato”, marcar as celas com problema e
   reescrevê-las com a orientação do app.
6. Fazer três exercícios do nível 1 e um de palavras.
7. (Educadores) Usar a visualização para acompanhar um aluno.
8. (Se quiser) testar o ditado.
9. Conferir a frase da tarefa 5 **por foto**, usando a câmera com orientação por voz; depois, conferir pelo tato
   as celas apontadas. Anote se a pessoa conseguiu enquadrar sozinha, quanto tempo levou e se as celas apontadas
   tinham mesmo problema (acerto) ou não (alarme falso).

**Durante**
- Peça para a pessoa pensar em voz alta. Anote falas literais, onde hesitou e o que esperava que acontecesse.
- Se a pessoa travar por mais de 2 minutos, ofereça ajuda e anote o ponto.
- Na tarefa 3 e 5, confira com a pessoa (tato) se a escrita saiu correta. **Um erro de escrita causado pela
  orientação do app é a falha mais grave que podemos encontrar.**

**Depois** — perguntas abertas
- As instruções estavam na quantidade certa? O que sobrou ou faltou?
- “Janela 3 a partir da direita” e “coluna da direita, em cima” fazem sentido para você? Como você diria?
- A conferência pelo tato ajudou a achar erros? Faltou alguma informação para corrigir?
- (Para o roteiro) Você usaria uma conferência por foto? Em que situação? Lembre que ela nunca substituiria o toque.
- A voz/leitor falou na hora certa? Falou demais ou de menos?
- O que você mudaria primeiro?

## Como registrar

Use o modelo de issue “Relato de teste de usabilidade”. Para cada problema:

| Campo | Exemplo |
|---|---|
| Tarefa | 3 — escrever o nome |
| O que aconteceu | Marcou o ponto 4 no lugar do 1 na primeira cela |
| O que a pessoa esperava | Achou que “coluna da direita” era a direita dela olhando a folha de frente |
| Gravidade | 1 = impede / causa escrita errada; 2 = atrasa muito; 3 = incomoda; 4 = sugestão |
| Ambiente | NVDA 2026.1, Firefox, Windows 11, reglete tradicional 28 janelas |

Nunca publique nome, imagem, voz ou dados de saúde de participantes sem autorização por escrito.

## Como propor correções

- **Sem programar:** abra uma issue (ou envie o relato a quem mantém o projeto) dizendo o que deve mudar
  e, se for regra Braille, a fonte (página/seção da Grafia).
- **Programando:** veja `CONTRIBUTING.md`. Mudanças de texto falado ficam em `src/guide/messages.ts`;
  de regras, em `src/braille/rules-pt-br.ts`; de telas, em `index.html` e `src/main.ts`.
- Correções de problemas de gravidade 1 têm prioridade sobre qualquer nova funcionalidade.
