/**
 * Teste ponta a ponta: acessibilidade automatizada (axe-core, regras WCAG 2.x A/AA
 * e 2.2), fluxo completo só com teclado e funcionamento offline.
 *
 * Uso:
 *   npm run build
 *   npx playwright install chromium   # uma vez
 *   npm run test:e2e
 * Para usar um Chromium já instalado: CHROMIUM_PATH=/caminho/do/chrome npm run test:e2e
 *
 * Testes automáticos NÃO substituem testes com leitores de tela e com pessoas
 * cegas. Veja docs/ACESSIBILIDADE.md.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const PORTA = 4178;
const URL_BASE = `http://localhost:${PORTA}/`;
let falhas = 0;

function ok(condicao, mensagem) {
  if (condicao) console.log(`  ✓ ${mensagem}`);
  else {
    falhas++;
    console.error(`  ✗ ${mensagem}`);
  }
}

async function esperarServidor() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(URL_BASE);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Servidor de pré-visualização não respondeu');
}

async function auditar(pagina, rotulo) {
  const r = await new AxeBuilder({ page: pagina })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  for (const v of r.violations) {
    console.error(`    [${v.id}] ${v.help} — ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  }
  ok(r.violations.length === 0, `axe sem violações: ${rotulo}`);
}

const anuncio = (p) => p.waitForFunction(() => document.getElementById('anunciador').textContent.length > 0).then(() => p.textContent('#anunciador'));

async function limparAnuncio(p) {
  await p.evaluate(() => (document.getElementById('anunciador').textContent = ''));
}

const servidor = spawn('npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], { stdio: 'ignore' });
try {
  await esperarServidor();
  const navegador = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const contexto = await navegador.newContext({ locale: 'pt-BR' });
  const p = await contexto.newPage();
  const errosJs = [];
  p.on('pageerror', (e) => errosJs.push(e.message));

  console.log('Acessibilidade automatizada');
  for (const rota of ['escrever', 'exercicios', 'visualizacao', 'configuracoes', 'ajuda', 'sobre']) {
    await p.goto(`${URL_BASE}#${rota}`);
    await auditar(p, rota);
  }

  console.log('Fluxo por teclado — Escrever e modo guiado');
  await p.goto(URL_BASE);
  await p.keyboard.press('Tab');
  ok((await p.evaluate(() => document.activeElement.textContent)) === 'Pular para o conteúdo', 'primeiro Tab chega ao link de pular');
  await p.focus('#texto');
  await p.keyboard.type('Oi, tudo bem?');
  // Tab até o botão Converter (passando pelos radios de modalidade)
  for (let i = 0; i < 6; i++) {
    const t = await p.evaluate(() => document.activeElement.textContent?.trim());
    if (t === 'Converter para Braille') break;
    await p.keyboard.press('Tab');
  }
  ok((await p.evaluate(() => document.activeElement.textContent.trim())) === 'Converter para Braille', 'Tab alcança o botão Converter');
  await limparAnuncio(p);
  await p.keyboard.press('Enter');
  ok((await p.evaluate(() => document.activeElement.id)) === 'titulo-resultado', 'foco vai para o título do resultado');
  ok((await anuncio(p)).includes('14 celas'), 'resumo anunciado com número de celas');

  await p.keyboard.press('Tab');
  await limparAnuncio(p);
  await p.keyboard.press('Enter');
  ok((await p.evaluate(() => document.activeElement.id)) === 'btn-proxima', 'modo guiado coloca foco em Próxima');
  const primeiro = await anuncio(p);
  ok(primeiro.includes('Cela 1 de 14') && primeiro.includes('pontos 4 e 6'), 'primeira cela: sinal de maiúscula, pontos 4 e 6');
  ok(primeiro.includes('janela 1 a partir da direita'), 'tradicional começa pela direita');

  await limparAnuncio(p);
  await p.keyboard.press('Enter');
  ok((await anuncio(p)).includes('Cela 2 de 14'), 'Enter em Próxima avança');

  await p.focus('#area-atalhos');
  await limparAnuncio(p);
  await p.keyboard.press('ArrowRight');
  ok((await anuncio(p)).includes('Cela 3 de 14'), 'seta direita na área de atalhos avança');
  await limparAnuncio(p);
  await p.keyboard.press('p');
  ok((await anuncio(p)).includes('Cela 2 de 14'), 'tecla P volta');
  await limparAnuncio(p);
  await p.keyboard.press('d');
  ok((await anuncio(p)).includes('coluna da direita, em cima'), 'tecla D detalha a posição (o = 1 3 5)');
  await limparAnuncio(p);
  await p.keyboard.press('End');
  ok((await anuncio(p)).includes('Cela 14 de 14'), 'End vai para a última cela');
  await auditar(p, 'escrever com resultado e modo guiado abertos');

  console.log('Conferência pelo tato');
  await limparAnuncio(p);
  await p.click('#btn-conferir');
  const conf = await anuncio(p);
  ok(conf.includes('vire-a') && conf.includes('Leitura, cela 1 de 14'), 'conferência pede para virar a folha e começa na cela 1');
  ok((await p.evaluate(() => document.activeElement.id)) === 'btn-proxima', 'foco vai para Próxima ao iniciar a conferência');
  await p.focus('#area-atalhos');
  await p.keyboard.press('ArrowRight');
  await limparAnuncio(p);
  await p.keyboard.press('m');
  ok((await anuncio(p)).includes('Cela 2 marcada com problema'), 'tecla M marca a cela');
  ok((await p.getAttribute('#btn-marcar', 'aria-pressed')) === 'true', 'botão Marcar expõe o estado com aria-pressed');
  await p.keyboard.press('End');
  await limparAnuncio(p);
  await p.keyboard.press('ArrowRight');
  const resumo = await anuncio(p);
  ok(resumo.includes('1 cela marcada com problema') && resumo.includes('letra o'), 'resumo lista a cela marcada');
  await auditar(p, 'conferência pelo tato');
  await p.focus('#btn-reescrever');
  await limparAnuncio(p);
  await p.keyboard.press('Enter');
  const re = await anuncio(p);
  ok(re.includes('Reescrevendo 1 cela marcada') && re.includes('janela 2 a partir da direita'), 'reescrita orienta só a cela marcada');
  ok((await p.evaluate(() => document.activeElement.id)) === 'btn-proxima', 'foco não se perde quando o botão Reescrever some');

  console.log('Conferência por foto');
  await p.goto(URL_BASE);
  await p.fill('#texto', 'bola');
  await p.click('text=Converter para Braille');
  ok(!(await p.isHidden('#btn-resultado-foto')), 'botão Conferir por foto aparece logo após converter');
  await p.click('#btn-resultado-foto');
  ok((await p.evaluate(() => document.activeElement.id)) === 'titulo-foto', 'Conferir por foto leva o foco ao título da seção');
  ok(!(await p.isHidden('#btn-camera')) && !(await p.isHidden('#foto-arquivo')), 'botões de câmera e de escolher foto visíveis');
  // Desenha no navegador uma "foto" da folha (lado do relevo) com o ponto 3 do "o" faltando.
  const dataUrl = await p.evaluate(() => {
    const celas = [[1, 2], [1, 5], [1, 2, 3], [1]]; // b, o (sem o 3), l, a
    const d = 14, rc = 2.5, m = 40;
    const c = document.createElement('canvas');
    c.width = 360; c.height = 120;
    const g = c.getContext('2d');
    g.fillStyle = '#d4d2cc'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1); }
    celas.forEach((dots, k) => dots.forEach((dot) => {
      const x = m + k * rc * d + (dot <= 3 ? 0 : d), y = m + ((dot - 1) % 3) * d;
      g.fillStyle = 'rgba(40,40,40,0.55)'; g.beginPath(); g.arc(x + 1.5, y + 1.5, 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x - 1.5, y - 1.5, 3, 0, 7); g.fill();
    }));
    return c.toDataURL('image/png');
  });
  const pasta = mkdtempSync(join(tmpdir(), 'reglete-'));
  const arquivo = join(pasta, 'folha.png');
  writeFileSync(arquivo, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await p.setInputFiles('#foto-arquivo', arquivo);
  await p.waitForSelector('#foto-resultado:not([hidden])', { timeout: 30000 });
  const resumoFoto = await p.textContent('#foto-resumo');
  const itens = await p.$$eval('#foto-suspeitas li', (li) => li.map((x) => x.textContent));
  ok(resumoFoto.includes('Possíveis diferenças'), 'foto com ponto faltando gera "possíveis diferenças"');
  ok(itens.length === 1 && itens[0].includes('Cela 2') && itens[0].includes('ponto 3'), 'aponta a cela 2 (o) sem o ponto 3');
  ok(!resumoFoto.toLowerCase().includes('correta'), 'nunca afirma que a escrita está correta');
  ok((await p.evaluate(() => document.activeElement.id)) === 'titulo-foto-resultado', 'foco vai para o resultado da foto');
  await limparAnuncio(p);
  await p.click('#btn-foto-marcar');
  ok((await anuncio(p)).includes('1 cela adicionada'), 'celas apontadas entram nas marcadas');
  ok(!(await p.isHidden('#btn-reescrever')), 'Reescrever celas marcadas fica disponível');
  await auditar(p, 'conferência por foto com resultado');

  await limparAnuncio(p);
  await p.click('#btn-camera');
  ok((await anuncio(p)).includes('Câmera aberta'), 'câmera abre e anuncia a orientação');
  await p.waitForFunction(() => {
    const t = document.getElementById('camera-instrucao').textContent;
    return t && !t.startsWith('Câmera aberta');
  }, null, { timeout: 8000 }).catch(() => {});
  const instr = await p.textContent('#camera-instrucao');
  ok(instr.length > 10 && !instr.startsWith('Câmera aberta'), `orientação de enquadramento falada: "${instr}"`);
  await auditar(p, 'câmera aberta');
  await p.click('#btn-fechar-camera');
  ok(await p.isHidden('#camera-bloco'), 'câmera fecha');

  console.log('Visualização');
  await p.goto(`${URL_BASE}#visualizacao`);
  const linhas = await p.$$eval('#vis-tabela tbody tr', (tr) => tr.length);
  ok(linhas === 4, 'tabela equivalente tem uma linha por cela ("bola")');
  ok((await p.getAttribute('#vis-folha', 'role')) === 'img', 'desenho exposto como imagem com texto alternativo');
  await auditar(p, 'visualização com conteúdo');

  console.log('Exercícios');
  await p.goto(`${URL_BASE}#exercicios`);
  await p.selectOption('#ex-nivel', 'letras-a-j');
  await p.click('#btn-novo-exercicio');
  const legenda = await p.textContent('#ex-enunciado');
  const letra = legenda.match(/letra (\w)/)[1];
  const pontos = { a: '1', b: '12', c: '14', d: '145', e: '15', f: '124', g: '1245', h: '125', i: '24', j: '245' }[letra];
  await p.fill('#ex-pontos-digitados', pontos);
  await p.keyboard.press('Enter');
  ok((await p.textContent('#ex-feedback')).includes('Correto'), `exercício da letra ${letra} aceito pela digitação dos pontos`);
  await auditar(p, 'exercício de pontos');

  console.log('Sobre');
  await p.goto(URL_BASE);
  await p.click('nav >> text=Sobre');
  await p.waitForFunction(() => document.activeElement?.id === 'titulo-sobre', null, { timeout: 2000 }).catch(() => {});
  ok((await p.evaluate(() => document.activeElement.id)) === 'titulo-sobre', 'menu Sobre leva o foco ao título');
  ok((await p.title()) === 'Sobre — Reglete Livre', 'título da página muda para Sobre');
  const sobre = await p.textContent('#tela-sobre');
  ok(sobre.includes('Marcos Henrique') && sobre.includes('marcos@marcoshenrique.ai'), 'créditos com autor e e-mail');
  ok((await p.getAttribute('#tela-sobre a[href^="https://"]', 'href')) === 'https://marcoshenrique.ai', 'link do site correto');
  ok((await p.getAttribute('#tela-sobre a[href*="github.com"]', 'href')) === 'https://github.com/marcoshenrique-ai/regletelivre', 'link do GitHub correto');

  console.log('Configurações e alto contraste');
  await p.goto(`${URL_BASE}#configuracoes`);
  await p.check('#cfg-contraste');
  await auditar(p, 'alto contraste');
  await p.check('#cfg-positiva');
  await p.reload();
  ok(await p.isChecked('#cfg-positiva'), 'configuração persiste após recarregar');

  console.log('Retomar escrita');
  await p.goto(`${URL_BASE}#configuracoes`);
  await p.check('#cfg-guardar');
  await p.goto(`${URL_BASE}#escrever`);
  await p.fill('#texto', 'sol');
  await p.click('text=Converter para Braille');
  await p.click('#btn-iniciar-guiado');
  await p.click('#btn-proxima');
  await p.click('#btn-proxima');
  await p.reload();
  ok(!(await p.isHidden('#retomar')), 'ao reabrir, oferece retomar a escrita');
  ok((await p.textContent('#retomar-desc')).includes('cela 3 de 3'), 'mostra onde a pessoa parou');
  await auditar(p, 'aviso de escrita em andamento');
  await limparAnuncio(p);
  await p.click('#btn-retomar');
  const ret = await anuncio(p);
  ok(ret.includes('Escrita retomada') && ret.includes('Cela 3 de 3'), 'retoma na cela certa');
  await p.goto(`${URL_BASE}#configuracoes`);
  await p.uncheck('#cfg-guardar');
  await p.goto(`${URL_BASE}#escrever`);
  await p.reload();
  ok(await p.isHidden('#retomar'), 'desmarcar a opção apaga a escrita guardada');
  ok((await p.evaluate(() => localStorage.getItem('reglete-livre:progresso:v1'))) === null, 'nada fica guardado no aparelho');

  console.log('Offline');
  await p.goto(URL_BASE);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForTimeout(500);
  await contexto.setOffline(true);
  await p.reload();
  ok((await p.textContent('h1')).includes('Escrever'), 'aplicativo carrega sem internet');
  await contexto.setOffline(false);

  ok(errosJs.length === 0, `nenhum erro de JavaScript na página${errosJs.length ? ': ' + errosJs.join('; ') : ''}`);
  await navegador.close();
} finally {
  servidor.kill();
}

if (falhas > 0) {
  console.error(`\n${falhas} verificação(ões) falharam.`);
  process.exit(1);
}
console.log('\nTodas as verificações passaram.');
