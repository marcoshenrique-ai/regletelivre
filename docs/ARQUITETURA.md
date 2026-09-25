# Arquitetura

PWA estática em TypeScript, sem framework de interface, sem servidor de aplicação e sem conta de usuário.

```
src/
├── braille/        MOTOR (puro, sem DOM)
│   ├── types.ts        tipos: Dot, BrailleRule, BrailleCell, ConversionResult
│   ├── sources.ts      fontes bibliográficas de cada regra
│   ├── rules-pt-br.ts  tabela de regras (verificadas e pendentes)
│   └── converter.ts    texto → celas; maiúsculas, números, avisos; utilitários
├── reglete/        MODELO FÍSICO (puro)
│   ├── modality.ts     geometria dos pontos e direção por modalidade
│   └── layout.ts       distribuição das celas em linhas e janelas
├── guide/          MODO GUIADO (puro)
│   ├── messages.ts     frases por nível de verbosidade
│   └── session.ts      cursor: próxima / anterior / repetir / detalhar;
│                       modos "escrita" e "conferencia" (pelo tato), marcas e reescrita
├── exercises/      EXERCÍCIOS (puro)
│   └── exercises.ts    níveis, geração, correção, leitura de pontos digitados
├── foto/           CONFERÊNCIA POR FOTO (puro, exceto o worker)
│   ├── imagem.ts       tons de cinza, redução, imagem integral
│   ├── deteccao.ts     manchas de relevo por contraste local (sombra, brilho ou ambos)
│   ├── grade.ts        inclinação, escala e encaixe da grade esperada; diferenças por cela
│   ├── analise.ts      várias escalas, escolha do melhor encaixe, relatório em texto
│   ├── enquadramento.ts instrução falada de enquadramento a partir de um quadro da câmera
│   ├── sintetico.ts    gerador de fotos sintéticas para testes e métricas
│   └── worker.ts       análise em segundo plano (Web Worker)
├── speech/         INTEGRAÇÃO COM O NAVEGADOR
│   ├── tts.ts          síntese de voz (opcional)
│   └── dictation.ts    ditado (opcional, com verificação de privacidade)
├── ui/             INTERFACE
│   ├── announcer.ts    região aria-live + voz, sem duplicar fala
│   ├── settings.ts     configurações validadas, guardadas em localStorage
│   ├── cell-svg.ts     desenho decorativo das janelas
│   ├── foto-ui.ts      câmera, orientação por voz, escolha de foto, resultado e desenho
│   └── styles.css
└── main.ts         liga telas, rotas por âncora e eventos
```

## Fluxo de dados

```
texto digitado/ditado
   │ normalize (NFC, espaços)
   ▼
convertText ──► BrailleCell[] + avisos        (somente regras "verificadas")
   │
   ▼
layoutCells(modalidade, janelasPorLinha) ──► LayoutStep[] (linha, ordem, janela física)
   │
   ├──► GuidedSession ──► anunciarPasso(verbosidade) ──► Anunciador (leitor e/ou voz)
   ├──► Visualização (desenho + tabela textual)
   └──► (exercícios usam convertText e a geometria diretamente)
```

## Decisões

- **Motor separado da interface.** `braille/`, `reglete/`, `guide/` e `exercises/` não importam nada do DOM e são
  100% cobertos por testes em Node. Podem ser reaproveitados em outro app (por exemplo, um app nativo ou um bot).
- **Ordem × geometria.** A sequência das celas é idêntica nas duas modalidades; o que muda é a janela física (a partir
  da direita ou da esquerda) e o espelhamento da cela. Isso é testado explicitamente, incluindo a prova de que
  inverter as letras não equivale à escrita na reglete tradicional.
- **Regras como dados.** Cada regra tem id, fontes, status e revisão humana. A tela de ajuda é gerada da mesma tabela.
- **Sem framework.** Menos dependências, menos JavaScript, HTML semântico escrito à mão e fácil de auditar.
- **Offline.** `vite-plugin-pwa` (Workbox) gera o service worker que pré-armazena todos os arquivos.
- **Privacidade.** O texto, as fotos e as configurações nunca saem do aparelho. A única requisição externa é a tag do Google Analytics (medição de visitas), que falha sem prejuízo quando não há internet. Configurações ficam em `localStorage`; o texto
  digitado não é salvo.

## Estendendo

- **Nova regra:** ver `docs/REGRAS-BRAILLE.md` → “Como propor correção de regra”.
- **Novo nível de exercício:** acrescente em `NIVEIS` e no gerador em `exercises.ts`, com teste.
- **Novo idioma/grafia:** crie outro `rules-xx.ts` e parametrize o conversor; não misture tabelas.
