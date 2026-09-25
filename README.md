# Reglete Livre

Aplicativo livre e de código aberto que ajuda pessoas cegas ou com baixa visão a escrever em **Braille com reglete e
punção**, em **português do Brasil**. Também serve a professores, familiares e voluntários que acompanham o aprendizado.

Você digita (ou dita) uma palavra ou frase e o Reglete Livre orienta **cela por cela**: em qual linha e janela
escrever e quais pontos marcar, na **reglete tradicional** ou na **reglete positiva**.

> **Versão 1.1.0.** Importante: as regras Braille habilitadas foram conferidas em fontes secundárias,
> mas **ainda não foram revisadas por especialista** com base na *Grafia Braille para a Língua Portuguesa*.
> Use com acompanhamento de um professor de Braille e ajude a validar — veja
> [docs/REGRAS-BRAILLE.md](docs/REGRAS-BRAILLE.md).

## O que já faz

- Campo de texto com **ditado opcional** (quando o navegador oferece).
- Conversão para Braille de seis pontos: letras, acentos do português (á é í ó ú à â ê ô ã õ ç ü), maiúsculas,
  palavras em caixa alta, números inteiros, espaço, vírgula, ponto e vírgula, dois-pontos, ponto final,
  interrogação, exclamação e hífen. **O que não tem regra validada é recusado com aviso — nada é inventado.**
- **Modo guiado** — o centro do app, e funciona sem câmera nem equipamento especial: anuncia uma cela por vez;
  botões e teclas para avançar, voltar, repetir e detalhar a posição.
- **Conferência pelo tato**: depois de escrever, o app diz o que cada cela deveria ter (na orientação de leitura);
  você confere com os dedos, marca as celas com problema e recebe a orientação para reescrever só essas.
- **Conferência por foto** (opcional): câmera com **orientação por voz para enquadrar** e captura automática, ou uma
  foto já tirada. A análise é feita **no aparelho**; o app aponta celas com **possíveis diferenças** para você conferir
  pelo tato e pode acrescentá-las às celas marcadas. Ele nunca afirma que a escrita está correta.
- **Aviso para deslocar a reglete** ou trocar a folha quando as linhas dela acabam (informe quantas linhas ela tem).
- **Retomar de onde parou** (opcional, desligado por padrão): guarda a escrita em andamento só neste aparelho.
- Duas modalidades modeladas separadamente:
  - **tradicional** — da direita para a esquerda, cela espelhada (1-2-3 à direita), mantendo a ordem das letras;
  - **positiva** — da esquerda para a direita, cela como na leitura.
- Configuração de modalidade, **janelas por linha**, velocidade e voz da fala, quantidade de orientação verbal,
  tamanho do texto e alto contraste.
- **Exercícios progressivos** (8 níveis): posição dos pontos → letras → acentuadas → palavras → nomes com maiúscula.
- **Visualização** da folha para quem acompanha, como se escreve e como se lê, sempre com **tabela textual equivalente**.
- **Funciona offline** depois de aberto uma vez, sem conta e **sem enviar o texto a nenhum servidor**.

> **Sobre a conferência por foto:** uma foto não prova que o relevo ficou legível ao toque. O resultado só indica onde
> conferir; quem valida é sempre a pessoa, pelo tato. Nos testes com imagens **sintéticas** o app localizou a escrita
> em 100% das folhas e apontou 96,7% dos pontos esquecidos, sem alarmes falsos (`npm run metricas:foto`). **Esses números
> não valem para fotos reais**, que ainda precisam ser medidas — veja [docs/ROADMAP.md](docs/ROADMAP.md).

## Visual

Tema claro com cartões, alto contraste opcional e três tamanhos de texto. A fonte é a
[Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) (Braille Institute, licença OFL), criada para
leitura por pessoas com baixa visão; ela vai junto com o app e funciona offline.

## Executar no seu computador

Requisitos: [Node.js](https://nodejs.org/) 20 ou mais recente.

```bash
npm install          # instala as dependências
npm run dev          # abre em http://localhost:5173 (modo desenvolvimento)
```

Versão de produção (com funcionamento offline):

```bash
npm run build        # gera a pasta dist/
npm run preview      # serve dist/ em http://localhost:4173
```

Abra o endereço no navegador; para instalar como aplicativo use “Instalar app” / “Adicionar à tela inicial”.
A pasta `dist/` pode ser publicada em qualquer hospedagem estática (GitHub Pages, Netlify, servidor da escola).
O service worker exige HTTPS, exceto em `localhost`.

## Testes

```bash
npm test             # testes unitários: regras, conversão, ordem das celas, duas modalidades, modo guiado, exercícios, foto
npm run metricas:foto   # métricas da conferência por foto em imagens sintéticas (leva cerca de 1 minuto)
npm run typecheck    # verificação de tipos
npm run build && npm run test:e2e   # acessibilidade (axe), fluxo por teclado e modo offline no Chromium
```

Na primeira vez, `npx playwright install chromium` baixa o navegador de teste.

## Privacidade

- O texto digitado fica só na memória da página; não é salvo nem enviado. Se você ligar “Guardar a escrita em andamento”,
  o texto e a posição ficam apenas no navegador deste aparelho; desligar apaga.
- **Medição de acessos:** o site publicado usa o Google Analytics (tag `G-FXQJ3EK2VB`, no `index.html`) para contar
  visitas de forma estatística. O texto, as fotos e as configurações nunca são enviados. Quem publicar uma cópia
  própria deve trocar ou remover essa tag.
- **Fotos e câmera:** a imagem é analisada no próprio aparelho e descartada; nada é enviado nem guardado.
- As configurações ficam no `localStorage` do navegador, neste aparelho.
- **Ditado:** em alguns navegadores o reconhecimento de voz é feito nos servidores da empresa do navegador. O Reglete
  Livre usa reconhecimento no próprio aparelho quando o navegador oferece; se não oferece, o ditado fica **desligado**
  até você marcar a permissão em Configurações. Digitar sempre funciona.

## Documentação

- [Regras Braille, fontes e situação de validação](docs/REGRAS-BRAILLE.md)
- [Acessibilidade e como testar com leitores de tela](docs/ACESSIBILIDADE.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [Testes de usabilidade com pessoas cegas e educadores](docs/TESTES-DE-USABILIDADE.md)
- [Roteiro (inclui os princípios para uma futura conferência por foto)](docs/ROADMAP.md)
- [Como contribuir](CONTRIBUTING.md) · [Código de conduta](CODE_OF_CONDUCT.md)

## Autor

Criado por **Marcos Henrique** — [marcos@marcoshenrique.ai](mailto:marcos@marcoshenrique.ai) · [marcoshenrique.ai](https://marcoshenrique.ai) · [GitHub](https://github.com/marcoshenrique-ai/regletelivre)

## Licença

[MIT](LICENSE). Você pode usar, modificar e distribuir, inclusive em escolas, ONGs e projetos comerciais,
mantendo o aviso de copyright.
