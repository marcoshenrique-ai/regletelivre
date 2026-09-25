# Acessibilidade

Referência: **WCAG 2.2**, nível AA como mínimo, com alguns critérios AAA quando custam pouco
(contraste 7:1 no texto, foco com contorno reforçado, alvos de 44 px).

## Princípios de projeto

- **Leitor de tela e teclado primeiro.** Todo fluxo foi desenhado para ser concluído sem mouse e sem olhar a tela.
- **Nada depende de cor, animação, câmera ou voz.** Acertos e erros têm texto e símbolo (✓ / ✗); pontos marcados
  no desenho são círculos grandes e cheios, vazios são pequenos e vazados; o ditado é opcional.
- **Anúncios controlados.** Uma única região `aria-live="polite"` recebe as mensagens. A pessoa escolhe se ouve pelo
  leitor de tela, pela voz do aplicativo ou pelos dois (Configurações → “Como as instruções são faladas”).
  O botão “Repetir” limpa e reescreve a região para que a mesma frase seja lida de novo.
- **Sem armadilhas de teclado** e sem atalhos globais de uma letra (WCAG 2.1.4). Os atalhos de letra só funcionam
  dentro da “área de atalhos” do modo guiado; fora dela, tudo tem botão.

## Mapa de critérios WCAG 2.2 relevantes

| Critério | Como é atendido |
|---|---|
| 1.1.1 Conteúdo não textual (foto) | O desenho sobre a foto é decorativo; o resultado completo é uma lista de texto |
| 1.1.1 Conteúdo não textual | Desenho da folha é `role="img"` com rótulo e tabela textual completa logo abaixo; ícones decorativos com `aria-hidden` |
| 1.3.1 Informações e relações | HTML semântico: `header`, `nav`, `main`, títulos hierárquicos, `fieldset/legend`, `label`, tabelas com `caption` e `th scope` |
| 1.3.2 Sequência com significado | As caixas “Ponto 1…6” ficam em ordem 1–6 no código; só o CSS as posiciona conforme a reglete |
| 1.4.1 Uso de cor | Estados indicados por texto, forma e espessura de borda |
| 1.4.3 / 1.4.6 Contraste | Texto ≥ 7:1 nos temas claro, escuro e alto contraste |
| 1.4.4 / 1.4.10 Redimensionamento e reflow | Unidades relativas, três tamanhos de texto, layout em uma coluna a 320 px |
| 1.4.11 Contraste não textual | Bordas de campos e botões com contraste ≥ 3:1 |
| 2.1.1 Teclado | Todas as funções por teclado; testado automaticamente em `tests-e2e/` |
| 2.1.4 Atalhos de uma tecla | Só ativos com foco na área de atalhos |
| 2.4.1 Pular blocos | Link “Pular para o conteúdo” |
| 2.4.2 Título da página | Título muda a cada tela (“Exercícios — Reglete Livre”) |
| 2.4.3 Ordem do foco | Ao trocar de tela o foco vai ao `h1`; após converter, ao título “Resultado”; no modo guiado, ao botão “Próxima” |
| 2.4.7 / 2.4.11 / 2.4.13 Foco visível | Contorno escuro de 3 px + halo amarelo de 7 px |
| 2.5.8 Tamanho do alvo | Botões e links com no mínimo 44 × 44 px |
| 3.1.1 Idioma | `lang="pt-BR"`; a voz sintetizada também usa `pt-BR` |
| 3.3.1 / 3.3.3 Erros | Mensagem de erro em texto, ligada ao campo por `aria-describedby`, com `aria-invalid` e sugestão de correção |
| 4.1.2 Nome, função, valor | Controles nativos; `aria-pressed` no botão de ditado; `aria-current` na navegação |
| 4.1.3 Mensagens de status | Região `aria-live` para resultado da conversão, instruções e retorno dos exercícios |

## Testes automatizados

```bash
npm run build
npx playwright install chromium   # uma vez
npm run test:e2e
```

O script roda o axe-core (regras WCAG 2.0/2.1/2.2 A e AA e boas práticas) em todas as telas, inclusive com o
modo guiado aberto e em alto contraste, percorre o fluxo principal só com teclado, verifica erros de JavaScript e
confirma que o app abre sem internet. **Ferramentas automáticas encontram só parte dos problemas.** Os testes
manuais abaixo são obrigatórios antes de cada versão.

## Como testar com leitores de tela

Use o roteiro em cada combinação: **NVDA + Firefox ou Chrome (Windows)**, **JAWS + Chrome (Windows)**,
**VoiceOver + Safari (macOS e iOS)**, **TalkBack + Chrome (Android)**, **Orca + Firefox (Linux)**.

### Comandos úteis

| Leitor | Próximo título | Lista de marcos/regiões | Alternar modo de foco |
|---|---|---|---|
| NVDA | H | NVDA+F7 | NVDA+Espaço |
| JAWS | H | Insert+Ctrl+R (regiões) | Insert+Z (cursor virtual) |
| VoiceOver macOS | VO+Cmd+H | VO+U (rotor) | — |
| VoiceOver iOS | rotor em “Títulos” e deslizar para baixo | rotor | — |
| TalkBack | menu de leitura em “Títulos” | — | — |
| Orca | H | — | Orca+A |

### Roteiro

1. **Abertura:** ao carregar, o título da página é anunciado; a primeira tecla Tab chega em “Pular para o conteúdo”.
2. **Navegação:** a lista de marcos mostra “banner”, “navegação Principal” e “principal”. Ao ativar um item do menu,
   o foco vai para o título da tela e o leitor o anuncia.
3. **Escrever:** o campo “Texto para escrever” anuncia a dica. Enviar vazio → erro anunciado e foco volta ao campo.
   Digitar “Oi, tudo bem?” e converter → anúncio “Convertido. 14 celas…”, foco em “Resultado”.
4. **Modo guiado:** “Iniciar modo guiado” → anúncio do início e da cela 1; foco em “Próxima”.
   - Enter/Espaço em Próxima, Anterior, Repetir e Detalhar produzem um anúncio cada, sem repetição dupla.
   - Tabule até a “área de atalhos”: o leitor deve entrar em modo de foco sozinho (NVDA/JAWS emitem um som).
     Teste setas, N, P, R, D, Home, End e Esc.
   - Com a saída “Pela voz do aplicativo”, o leitor NÃO deve ler as instruções; com “Pelos dois”, ambos leem.
5. **Conferência pelo tato:** “Conferir pelo tato” → anúncio pedindo para virar a folha (tradicional) e a leitura da
   cela 1; foco em “Próxima”. O botão “Marcar problema nesta cela” anuncia o estado (pressionado ou não); a tecla M faz
   o mesmo na área de atalhos. Ao passar da última cela, o resumo lista as marcadas. “Reescrever celas marcadas”
   percorre só essas celas e o foco não se perde quando o botão desaparece.
6. **Conferência por foto:** “Conferir por foto” → foco no título da seção; o aviso sobre os limites da foto vem antes
   de qualquer controle. “Abrir câmera com orientação por voz” → anúncio de câmera aberta e, a cada poucos segundos,
   uma instrução curta de enquadramento (sem repetir a mesma frase em menos de 5 s). Com a captura automática, a foto
   é tirada sozinha; “Capturar agora” e “Fechar câmera” funcionam por teclado. O resultado leva o foco ao título
   “Resultado da foto” e é anunciado com a lista de celas; o desenho sobre a foto é decorativo (`aria-hidden`) e a
   lista é o equivalente textual. Teste também a opção de escolher um arquivo de imagem.
7. **Escrita em andamento:** ligar “Guardar a escrita em andamento” em Configurações, avançar algumas celas,
   recarregar a página → a região “Escrita em andamento” aparece antes do formulário; “Retomar” volta à cela certa.
8. **Modalidade:** trocar para positiva na tela Escrever → anúncio da direção; reconverter e conferir
   “janela 1 a partir da esquerda”.
9. **Exercícios:** escolher nível pelo combo; “Novo exercício” → enunciado anunciado e foco no primeiro controle.
   As caixas são lidas como “Ponto 1 (coluna da direita, em cima), caixa de seleção, não marcada” e em ordem 1 a 6.
   Conferir → retorno anunciado; em palavras, após acerto o foco volta à caixa “Ponto 1” da próxima cela.
10. **Visualização:** o desenho é lido como uma imagem com rótulo; a tabela “Descrição textual equivalente” é navegável
   com os comandos de tabela (NVDA/JAWS: Ctrl+Alt+setas) e os cabeçalhos são anunciados.
11. **Configurações:** cada grupo de opções anuncia a legenda; mudanças anunciam “Configuração salva”; valor inválido
   em “Janelas por linha” mostra erro ligado ao campo.
12. **Zoom e baixa visão:** zoom de 200% e 400% sem rolagem horizontal da página (exceto o desenho da folha, que tem
   rolagem própria acessível por teclado); tamanhos “Grande” e “Muito grande”; alto contraste; tema escuro do sistema.
13. **Offline:** instalar o app, desligar a internet, reabrir e repetir os passos 3, 4 e 5.

Registre os resultados no modelo de issue “Relato de teste de usabilidade” e anexe versão do leitor, navegador e sistema.

## Problemas conhecidos e decisões em aberto

- `role="application"` na área de atalhos é intencional (força o modo de foco), mas precisa de validação com
  usuários; se atrapalhar, pode ser trocado por um botão com `aria-keyshortcuts`.
- A voz sintetizada depende das vozes instaladas no sistema; sem voz em português, use o leitor de tela.
- O ditado depende do navegador; ver a seção de privacidade no README.
