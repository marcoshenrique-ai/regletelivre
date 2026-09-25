# Roteiro

## Versão 1.0.0 — o que está implementado

- **Modo guiado de escrita** — o centro do app, funciona sem câmera nem equipamento especial: orientação cela por
  cela, com linha, janela e pontos, nas duas modalidades de reglete; três níveis de orientação verbal.
- **Conferência pelo tato** — o app diz o que cada cela deveria ter, na orientação de leitura; a pessoa confere com os
  dedos, marca as celas com problema e recebe a orientação para reescrever só essas celas.
- **Conferência por foto** — ver a seção abaixo.
- **Aviso para deslocar a reglete ou trocar a folha** quando as linhas da reglete acabam (Configurações → “Linhas da
  sua reglete”; 0 desliga o aviso).
- **Retomar de onde parou** — opcional e desligado por padrão; guarda texto e posição só no navegador do aparelho.

## Conferência por foto

Implementada em `src/foto/` (motor, sem DOM) e `src/ui/foto-ui.ts` (interface).

Como funciona:

1. A pessoa escolhe o lado fotografado (relevo, lado da escrita ou “não sei”).
2. **Câmera com orientação por voz:** a cada 0,8 s um quadro reduzido é analisado e o app fala uma instrução curta
   (“está escuro”, “a escrita está cortada à esquerda, mova o aparelho para a esquerda”, “aproxime”…). Com o
   enquadramento bom em dois quadros seguidos, captura sozinho (pode ser desligado). Também é possível escolher uma
   foto já tirada.
3. A análise roda num *Web Worker*, no aparelho: detecção de manchas de relevo em várias escalas (sombras, brilhos
   ou ambos), estimativa de inclinação e escala, e **encaixe da grade esperada** — o app sabe o que deveria estar
   escrito e procura o encaixe (orientação, espaçamento entre celas e linhas, deslocamento) que melhor explica a foto.
4. Compara posição a posição e lista **possíveis diferenças** (ponto não visto, marca a mais). As celas podem ser
   acrescentadas às marcadas e reescritas pelo modo guiado.

### Princípios (continuam valendo como requisitos)

1. **Uma foto não é prova de que o relevo ficou legível ao toque.** O app nunca diz “está correto”; no máximo
   “não encontrei diferenças na foto”, sempre seguido de “confira pelo tato”.
2. **Validação humana obrigatória.** A foto só sugere onde conferir; quem decide é a pessoa, pelo tato.
3. **Nunca obrigatória.** Nenhuma tarefa depende de câmera.
4. **Processamento no aparelho.** A imagem não é enviada nem guardada.
5. **Acessível para quem não enxerga:** orientação sonora de enquadramento e captura automática.
6. **Medir e publicar.** Ver abaixo.

### Medições

| Conjunto | Escrita localizada | Ponto esquecido apontado | Alarmes falsos por folha |
|---|---|---|---|
| 120 imagens **sintéticas** (`npm run metricas:foto`), com inclinação, ruído, escalas variadas e 25% espelhadas | 100% | 96,7% | 0,00 |
| Fotos **reais** de regletes tradicionais e positivas | **não medido** | **não medido** | **não medido** |

As imagens sintéticas são mais limpas do que fotos reais (papel com textura, sombras, luz irregular, pontos fracos
ou amassados). **Até existir a linha “fotos reais”, trate o resultado da foto como pista, não como diagnóstico.**

### Próximos passos da foto

- Montar um conjunto aberto de fotos reais (com consentimento), anotado por profissionais de Braille, e publicar as
  métricas na tabela acima.
- Testar a orientação de enquadramento com pessoas cegas e ajustar as frases e os limites.
- Avaliar se vale detectar a folha inteira (bordas) para orientar o enquadramento antes de achar os pontos.

## Outros próximos passos

- Validar com usuários a forma de indicar a janela (“janela 3 a partir da direita”) e as posições dos pontos.
- Regras hoje pendentes (aspas, parênteses, números com vírgula etc.), **somente** depois de validadas na Grafia
  Braille para a Língua Portuguesa — o projeto não habilita regra sem fonte e teste.
