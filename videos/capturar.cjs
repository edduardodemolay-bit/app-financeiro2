// Tira fotos das telas reais do EddFin (com dados de exemplo) para usar nos vídeos.
// Uso: node ferramentas/capturar.cjs   (com o servidor de prévia rodando em http://localhost:5178)
const path = require('path'), fs = require('fs');
const NPX = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx');
const pasta = fs.readdirSync(NPX).map(d => path.join(NPX, d, 'node_modules', 'puppeteer-core')).find(p => fs.existsSync(p));
const puppeteer = require(pasta);
const CHROME = path.join(process.env.USERPROFILE, '.cache', 'hyperframes', 'chrome', 'chrome-headless-shell', 'win64-152.0.7977.30', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
const SAIDA = path.join(__dirname, '..', 'assets', 'telas');
fs.mkdirSync(SAIDA, { recursive: true });

const iso = (n) => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const hoje = iso(0), mes = hoje.slice(0, 7);
const noMes = (dia) => mes + '-' + String(dia).padStart(2, '0');
const mesAnt = (n, dia) => { const d = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1 - n, dia, 12); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let id = 1000;
const t = (description, amount, category, type, date, extra = {}) => ({ id: id++, description, amount, category, type, date, ...extra });
const transacoes = [
  t('Salário', 4200, 'Salário', 'receita', noMes(5), { aConfirmar: false, confirmadoEm: noMes(5) }),
  t('Venda de bolos', 680, 'Vendas', 'receita', noMes(3)),
  t('Aluguel', 1300, 'Moradia', 'despesa', noMes(1), { aConfirmar: false }),
  t('Internet', 99.9, 'Moradia', 'despesa', hoje, { aConfirmar: true }),
  t('Conta de luz', 184.3, 'Moradia', 'despesa', iso(4), { aConfirmar: true }),
  t('Mercado', 312.4, 'Alimentação', 'gasto', noMes(4)),
  t('Padaria', 28.5, 'Alimentação', 'gasto', hoje),
  t('Uber', 34.9, 'Transporte', 'gasto', noMes(2)),
  t('Farmácia', 56, 'Saúde', 'gasto', noMes(3)),
  t('Cinema', 48, 'Lazer', 'gasto', noMes(5)),
  t('Aporte: Viagem de férias', 400, 'Metas', 'gasto', noMes(5), { metaId: 1, metaMov: 'aporte' }),
  // Quem me deve
  t('Empréstimo do pneu', 150, 'Outros', 'receita', iso(-4), { aConfirmar: true, devedor: 'João Silva', telefone: '11988887777' }),
  t('Almoço', 40, 'Outros', 'receita', hoje, { aConfirmar: true, devedor: 'João Silva', telefone: '11988887777' }),
  t('Bolo de aniversário', 85, 'Vendas', 'receita', iso(5), { aConfirmar: true, devedor: 'Maria' }),
  t('Encomenda de doces', 210, 'Vendas', 'receita', iso(9), { aConfirmar: true, devedor: 'Carla' }),
  // Meses anteriores (gráfico de evolução)
  ...[1, 2, 3, 4, 5].flatMap(n => [
    t('Salário', 4200, 'Salário', 'receita', mesAnt(n, 5)),
    t('Vendas', 300 + n * 70, 'Vendas', 'receita', mesAnt(n, 12)),
    t('Aluguel', 1300, 'Moradia', 'despesa', mesAnt(n, 1)),
    t('Mercado', 900 + n * 60, 'Alimentação', 'gasto', mesAnt(n, 8)),
    t('Transporte', 250 + n * 20, 'Transporte', 'gasto', mesAnt(n, 15)),
    t('Lazer', 300 - n * 25, 'Lazer', 'gasto', mesAnt(n, 20))
  ])
].sort((a, b) => b.date.localeCompare(a.date));
const metas = [
  { id: 1, nome: 'Viagem de férias', objetivo: 5000, inicial: 1800, aportes: [{ id: 1010, valor: 400, data: noMes(5), transacaoId: 1010, tipo: 'aporte', descricao: 'Aporte: Viagem de férias' }] },
  { id: 2, nome: 'Reserva de emergência', objetivo: 12000, inicial: 7400, aportes: [] },
  { id: 3, nome: 'Comprar carro', objetivo: 30000, inicial: 6500, aportes: [] }
];
// o aporte aponta para o id real do lançamento de aporte
const aporte = transacoes.find(x => x.metaMov === 'aporte'); metas[0].aportes[0].id = metas[0].aportes[0].transacaoId = aporte.id;
const limites = { 'Alimentação': 1100, 'Transporte': 350, 'Moradia': 1700, 'Lazer': 300, 'Saúde': 200, 'Educação': 300, 'Outros': 200, 'prev:Salário': 4200, 'prev:Vendas': 900 };
const DADOS = {
  '@finapp_transacoes': JSON.stringify(transacoes), '@finapp_metas': JSON.stringify(metas), '@finapp_metas_zeradas': '1',
  '@finapp_limitesCategorias': JSON.stringify(limites), '@finapp_nome': 'Eduardo', '@finapp_cor': 'verde', '@finapp_modoTema': 'escuro'
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--lang=pt-BR'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.emulateTimezone('America/Sao_Paulo');
  await page.evaluateOnNewDocument((d) => { if (!sessionStorage.getItem('semeado')) { localStorage.clear(); Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, v)); sessionStorage.setItem('semeado', '1'); } }, DADOS);
  const espera = (ms) => new Promise(r => setTimeout(r, ms));
  const abrir = async () => { await page.goto('http://localhost:5178/', { waitUntil: 'networkidle0', timeout: 120000 }); await page.waitForFunction(() => document.body.innerText.includes('Lançamento rápido'), { timeout: 60000 }); await espera(800); };
  const foto = async (nome) => { await espera(500); await page.screenshot({ path: path.join(SAIDA, nome + '.png') }); console.log('foto', nome); };
  // rola a área principal até um texto
  const rolarAte = (texto, folga = 90) => page.evaluate((texto, folga) => {
    const el = [...document.querySelectorAll('h1,h2,h3,h4,p,span,strong,label,button')].find(e => e.textContent.trim().startsWith(texto));
    const main = document.querySelector('main') || [...document.querySelectorAll('div')].find(d => getComputedStyle(d).overflowY === 'auto' && d.scrollHeight > d.clientHeight + 50 && !d.classList.contains('menu-lateral'));
    if (el && main) main.scrollTop += el.getBoundingClientRect().top - folga;
  }, texto, folga);
  const topo = () => page.evaluate(() => { document.querySelectorAll('*').forEach(d => { if (d.scrollTop) d.scrollTop = 0; }); });
  const aba = (nome) => page.evaluate((nome) => { const b = [...document.querySelectorAll('aside button')].find(b => b.textContent.trim() === nome); b && b.click(); }, nome);
  const clicarTexto = (txt) => page.evaluate((txt) => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === txt || b.getAttribute('aria-label') === txt || b.title === txt); if (b) b.click(); return !!b; }, txt);

  await abrir();
  await foto('01-dashboard-topo');
  await rolarAte('Saldo do Mês', 120); await foto('02-dashboard-saldo');
  await rolarAte('Para onde foi o dinheiro'); await foto('03-dashboard-grafico');
  await rolarAte('Evolução dos últimos', 110); await foto('04-dashboard-evolucao');
  await topo();

  // Lançamento rápido: escreve e o app entende
  await page.click('#texto-rapido'); await page.type('#texto-rapido', 'gastei 30 no mercado', { delay: 40 });
  await espera(1700); await foto('05-rapido-entendeu');
  await clicarTexto('Salvar'); await espera(300); await foto('06-rapido-salvo');
  await espera(3500);

  // Para confirmar: "Paguei"
  await topo(); await rolarAte('Para confirmar', 100); await foto('07-para-confirmar');

  // Formulário completo
  await topo();
  const abriu = await page.evaluate(() => { const b = [...document.querySelectorAll('header button, button')].find(b => /novo lan/i.test(b.getAttribute('aria-label') || b.title || b.textContent)); if (b) b.click(); return !!b; });
  console.log('modal', abriu); await espera(600); await foto('08-novo-vazio');
  await page.evaluate(() => {
    const sel = [...document.querySelectorAll('form select')][0];
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(sel, 'receita'); sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await espera(300);
  await page.type('form input[placeholder^="Ex: Salário"]', 'Salário', { delay: 30 });
  await page.type('form input[placeholder="0,00"]', '4200', { delay: 30 });
  await page.evaluate((d) => { const i = document.querySelector('form input[type="date"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, d); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-05'; })());
  await espera(400); await foto('09-novo-preenchido');
  await page.evaluate(() => { const f = document.querySelector('form select') && document.querySelector('form select').closest('form'); const b = f && [...f.querySelectorAll('button[type="submit"]')].pop(); b && b.click(); });
  await espera(3600);
  // se o formulário ficou aberto por algum motivo, fecha
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /^(cancelar|fechar)$/i.test(b.textContent.trim()) || /fechar/i.test(b.getAttribute('aria-label') || '')); b && b.click(); });
  await espera(400);

  // Quem me deve
  await topo(); await aba('Quem me deve'); await espera(600); await foto('10-devedores-topo');
  await page.type('input[list="lista-devedores"]', 'Pedro', { delay: 30 });
  const camposDiv = await page.$$('form input');
  await page.type('input[placeholder="Ex: 150,00"]', '120', { delay: 30 });
  await page.type('input[placeholder="Ex: almoço, venda do bolo"]', 'Ingresso do show', { delay: 30 });
  await page.type('input[placeholder="Ex: (11) 98888-7777"]', '11977776666', { delay: 20 });
  await rolarAte('Anotar quem', 70); await foto('11-devedores-form');
  await rolarAte('👤 João', 90); await foto('12-devedores-joao');
  await clicarTexto('Recebi parte'); await espera(300);
  await page.type('input[placeholder="Quanto recebeu? Ex: 50"]', '50', { delay: 40 });
  await foto('13-devedores-parte');

  // Metas, Planejamento, Calendário, Extrato
  await topo(); await aba('Metas'); await espera(600); await foto('14-metas');
  await topo(); await aba('Planejamento'); await espera(600); await foto('15-planejamento');
  await rolarAte('Planejamento de gastos', 90).catch(() => {}); await foto('16-planejamento-gastos');
  await topo(); await aba('Calendário'); await espera(600); await foto('17-calendario');
  await topo(); await aba('Extrato'); await espera(600); await foto('18-extrato');
  await topo(); await aba('Histórico'); await espera(600); await foto('19-historico');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
