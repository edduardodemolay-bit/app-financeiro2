// Testa "Recebi/Paguei" (lançamentos a confirmar) e a aba "Quem me deve"
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = __dirname;
const html = fs.readFileSync(process.argv[2], 'utf8');
const src = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/)[1];
const ctx = { console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, Number, String, Array, Object, Set, Map, Promise, isNaN, Blob: function () {}, URL: {}, MessageChannel };
ctx.navigator = { userAgent: 'node', platform: 'x', maxTouchPoints: 0 }; ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; ctx.innerWidth = 1300;
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const desloca = (dias) => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() + dias); return iso(d); };
const HOJE = desloca(0), AMANHA = desloca(1), DAQUI10 = desloca(10), ONTEM = desloca(-1), MES_PASSADO = desloca(-35);
const mesAtual = HOJE.slice(0, 7);
// Dados que já existiam: conta fixa de salário (dia 28) começando no mês passado, e uma conta de luz antiga ainda a confirmar
const inicio = MES_PASSADO.slice(0, 7);
ctx.localStorage = { _d: {
  '@finapp_metas_zeradas': '1',
  '@finapp_recorrentes': JSON.stringify([{ id: 500, description: 'Salário fixo', amount: 3000, category: 'Salário', type: 'receita', dia: 28, inicio, gerados: [], ativo: true }]),
  '@finapp_transacoes': JSON.stringify([{ id: 700, description: 'Conta de luz antiga', amount: 120, category: 'Moradia', type: 'despesa', date: MES_PASSADO, aConfirmar: true }])
}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
ctx.document = { addEventListener() {}, removeEventListener() {}, querySelector: () => null, visibilityState: 'visible', documentElement: { setAttribute() {}, style: { setProperty() {} } }, getElementById: () => null };
ctx.matchMedia = () => ({ matches: false });
ctx.lucide = { icons: {} };
let resposta = true; const perguntas = [];
ctx.confirm = (m) => { perguntas.push(m); return resposta; };
ctx.IS_REACT_ACT_ENVIRONMENT = true;
vm.createContext(ctx);
for (const f of ['babel.js', 'react.js', 'scheduler.js', 'rtr.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx);
vm.runInContext(ctx.Babel.transform(src.replace(/const container = document[\s\S]*$/, ''), { presets: ['react'] }).code + '\n;globalThis.App = App;', ctx);
const TR = ctx.ReactTestRenderer;
const act = (fn) => TR.act(() => { fn(); });
let root;
act(() => { root = TR.create(ctx.React.createElement(ctx.App)); });

const txt = (n) => (n == null ? '' : typeof n === 'string' ? n : (n.children || []).map(txt).join(''));
const tela = () => txt({ children: [].concat(root.toJSON()) }).replace(/\s/g, ' ');
const textoEl = (c) => (c == null || c === false ? '' : typeof c === 'string' || typeof c === 'number' ? String(c) : Array.isArray(c) ? c.map(textoEl).join('') : c.props ? textoEl(c.props.children) : '');
const botoes = (t) => root.root.findAll(n => n.type === 'button').filter(b => textoEl(b.props.children).includes(t));
const clicar = (t, i = 0) => { const b = botoes(t)[i]; if (!b) throw new Error('Botão não achado: ' + t); act(() => b.props.onClick({ preventDefault() {} })); };
const lsTrans = () => JSON.parse(ctx.localStorage.getItem('@finapp_transacoes') || '[]');
const check = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALHA') + ' - ' + msg); if (!cond) process.exitCode = 1; };
const card = (titulo) => { const m = tela().match(new RegExp(titulo + '(-?)R\\$ (-?[\\d.,]+)')); return m && (m[1] + m[2]); };
const dash = () => clicar('Dashboard');
// botão de confirmar que está na mesma linha do texto
const confirmarDe = (texto) => { const bs = root.root.findAll(n => n.type === 'button' && /^Confirmar que/.test(n.props.title || '')); const b = bs.find(b => { let p = b; for (let i = 0; i < 4 && p.parent; i++) p = p.parent; return textoEl(p.props.children).includes(texto); }); if (!b) throw new Error('Sem botão para ' + texto); act(() => b.props.onClick()); };

// 1) Conta fixa do mês atual chega "a confirmar"
const salarioMes = lsTrans().find(t => t.recorrenteId === 500 && t.date.startsWith(mesAtual));
const salarioAntigo = lsTrans().find(t => t.recorrenteId === 500 && t.date.startsWith(inicio));
check(salarioMes && salarioMes.aConfirmar === true, 'Salário fixo deste mês fica "a confirmar"');
check(salarioAntigo && salarioAntigo.aConfirmar === undefined, 'Salário do mês passado (gerado agora) já conta como recebido');
dash();
check(card('Receitas') === '0,00', 'Salário deste mês ainda não entra nas Receitas (' + card('Receitas') + ')');

// 2) Conta antiga a confirmar aparece em "Para confirmar" e o "Paguei" funciona
check(tela().includes('Para confirmar') && tela().includes('Conta de luz antiga'), 'Conta de luz do mês passado aparece em "Para confirmar"');
clicar('Paguei');
const luz = lsTrans().find(t => t.id === 700);
check(luz.aConfirmar === false && luz.date === MES_PASSADO && luz.confirmadoEm === HOJE, 'Paguei: confirmada, mantém a data dela');
check(!tela().includes('Conta de luz antiga'), 'Some da lista "Para confirmar"');

// 3) Receita com data futura pelo formulário: espera "Recebi"; confirmando antes, vale a data de hoje
clicar('Novo Lançamento');
const formModal = () => root.root.findAll(n => n.type === 'form').find(f => f.findAll(n => n.type === 'select').length);
let form = formModal();
act(() => form.findAll(n => n.type === 'select')[0].props.onChange({ target: { value: 'receita' } }));
form = formModal();
const ins = form.findAll(n => n.type === 'input' && n.props.type === 'text');
act(() => ins[0].props.onChange({ target: { value: 'Freela do site' } }));
act(() => ins[1].props.onChange({ target: { value: '800' } }));
act(() => form.findAll(n => n.type === 'input' && n.props.type === 'date')[0].props.onChange({ target: { value: DAQUI10 } }));
act(() => form.props.onSubmit({ preventDefault() {} }));
const freela = lsTrans().find(t => t.description === 'Freela do site');
check(freela && freela.aConfirmar === true, 'Receita com data futura fica "a confirmar"');
dash();
const receitasAntes = card('Receitas');
if (DAQUI10.slice(0, 7) === mesAtual) {
  check(tela().includes('Agendados e a confirmar') && tela().includes('Freela do site'), 'Aparece em "Agendados e a confirmar"');
  confirmarDe('Freela do site');
} else {
  clicar('Extrato');
  act(() => root.root.findAll(n => n.type === 'button' && n.props.title === 'Confirmar que recebeu')[0].props.onClick());
  dash();
}
const freela2 = lsTrans().find(t => t.description === 'Freela do site');
check(freela2.aConfirmar === false && freela2.date === HOJE, 'Recebi antes do dia: confirmado com a data de hoje');
check(perguntas.some(p => p.startsWith('Deu certo? Confirmar que você RECEBEU R$') && p.includes('Freela do site')), 'Antes de confirmar, pergunta "Deu certo?" com o valor');
check(freela2.dataPrevista === DAQUI10, 'Guarda a data combinada (para poder desfazer)');
dash();
check(tela().includes('✓ Recebido em ' + HOJE.slice(8, 10) + '/' + HOJE.slice(5, 7)), 'Mostra o selo "✓ Recebido em dd/mm"');
check(card('Receitas') !== receitasAntes && /800/.test(card('Receitas') || ''), 'Agora entra nas Receitas (' + card('Receitas') + ')');

// 4) Lançamento com data de hoje continua contando direto
// (o lançamento rápido de hoje não pede confirmação)
const qtdAntes = lsTrans().length;

// 5) Quem me deve
clicar('Quem me deve');
check(tela().includes('Anotar quem está devendo'), 'Aba "Quem me deve" abre');
const preencher = (dados) => {
  const f = root.root.findAll(n => n.type === 'form').find(x => textoEl(x.props.children).includes('Anotar quem'));
  const campos = f.findAll(n => n.type === 'input' || n.type === 'select');
  const porPlaceholder = (p) => campos.find(c => c.props.placeholder && c.props.placeholder.startsWith(p));
  if (dados.nome != null) act(() => porPlaceholder('Ex: João').props.onChange({ target: { value: dados.nome } }));
  if (dados.valor != null) act(() => porPlaceholder('Ex: 150').props.onChange({ target: { value: dados.valor } }));
  if (dados.desc != null) act(() => porPlaceholder('Ex: almoço').props.onChange({ target: { value: dados.desc } }));
  if (dados.tel != null) act(() => porPlaceholder('Ex: (11)').props.onChange({ target: { value: dados.tel } }));
  if (dados.data != null) act(() => campos.find(c => c.props.type === 'date').props.onChange({ target: { value: dados.data } }));
  if (dados.emprestei !== undefined) act(() => campos.find(c => c.props.type === 'checkbox').props.onChange({ target: { checked: dados.emprestei } }));
  const f2 = root.root.findAll(n => n.type === 'form').find(x => textoEl(x.props.children).includes('Anotar quem'));
  act(() => f2.props.onSubmit({ preventDefault() {} }));
};
preencher({ nome: '', valor: '10' });
check(tela().includes('Escreva o nome'), 'Sem nome, pede o nome');
dash(); const saldoAntesEmprestimo = card('Saldo do Mês'); clicar('Quem me deve');
preencher({ nome: 'João Silva', valor: '150', desc: 'Empréstimo do pneu', tel: '(11) 98888-7777', emprestei: true });
preencher({ nome: 'joão silva', valor: '40', desc: 'Almoço', data: ONTEM, emprestei: false });
preencher({ nome: 'Maria', valor: '25,50', desc: 'Bolo', emprestei: false });
// Já vem marcado: sem mexer na caixinha, o dinheiro sai do saldo
preencher({ nome: 'Pedro', valor: '60', desc: 'Pix emprestado' });
let t = lsTrans();
const dividaJoao = t.find(x => x.devedor === 'João Silva' && x.amount === 150);
check(dividaJoao && dividaJoao.aConfirmar === true && dividaJoao.type === 'receita' && dividaJoao.telefone === '11988887777', 'Dívida do João anotada (a receber, com WhatsApp)');
check(t.some(x => x.emprestimoPara === 'João Silva' && x.type === 'gasto' && x.amount === 150), '"Emprestei": saiu 150 da conta hoje');
check(t.filter(x => x.devedor === 'João Silva').length === 2, '"joão silva" foi juntado com "João Silva"');
check(t.some(x => x.emprestimoPara === 'Pedro' && x.amount === 60) && !t.some(x => x.emprestimoPara === 'Maria'), '"Saiu dinheiro do meu saldo" vem marcado; desmarcado (venda fiado) não tira do saldo');
check(tela().includes('Total a receber') && /Total a receberR\$ 275,50/.test(tela()), 'Total a receber: R$ 275,50');
check(tela().includes('Atrasada desde'), 'Dívida com data passada aparece como atrasada');
const link = root.root.findAll(n => n.type === 'a' && String(n.props.href).includes('wa.me'))[0];
check(link && link.props.href.startsWith('https://wa.me/5511988887777?text=') && decodeURIComponent(link.props.href).includes('R$') , 'Botão Cobrar abre o WhatsApp do João com a mensagem');
dash();
check(tela().includes('3 pessoas te devem'), 'Dashboard mostra "3 pessoas te devem"');
check(!tela().includes('Almoço'), 'Dívidas não poluem "Agendados" / "Para confirmar"');

// Recebi parte (50 dos 150)
clicar('Quem me deve');
clicar('Recebi parte', 1);
const inParte = root.root.findAll(n => n.type === 'input' && n.props.placeholder === 'Quanto recebeu? Ex: 50')[0];
act(() => inParte.props.onChange({ target: { value: '50' } }));
const fParte = root.root.findAll(n => n.type === 'form').find(x => x.findAll(n => n === inParte).length);
act(() => fParte.props.onSubmit({ preventDefault() {} }));
t = lsTrans();
check(t.find(x => x.id === dividaJoao.id).amount === 100, 'Recebi parte: a dívida fica com 100');
check(t.some(x => x.devedor === 'João Silva' && x.amount === 50 && x.aConfirmar === false && x.date === HOJE), 'Os 50 recebidos entram como receita de hoje');
check(/Total a receberR\$ 225,50/.test(tela()), 'Total a receber cai para R$ 225,50');
check(tela().includes('Já recebidos'), 'Aparece em "Já recebidos"');

// Maria paga tudo
confirmarDe('Bolo');
check(lsTrans().find(x => x.devedor === 'Maria').aConfirmar === false, 'Recebi: Maria quitou');
check(!tela().includes('👤 Maria') || tela().includes('Já recebidos'), 'Maria sai da lista de quem deve');

// Saldo: -150 do empréstimo + 50 + 25,50 recebidos
dash();
const num = (s) => Number(String(s).replace(/\./g, '').replace(',', '.'));
check(Math.abs(num(card('Saldo do Mês')) - (num(saldoAntesEmprestimo) - 150 - 60 + 50 + 25.5)) < 0.01, 'Saldo do mês confere: ' + saldoAntesEmprestimo + ' - 150 - 60 + 50 + 25,50 = ' + card('Saldo do Mês'));
// Cancelar a pergunta não muda nada
resposta = false;
const antesCancelar = JSON.stringify(lsTrans());
clicar('Quem me deve');
confirmarDe('Almoço');
check(JSON.stringify(lsTrans()) === antesCancelar, 'Se responder "Cancelar" na pergunta, nada muda');
resposta = true;

// Desfazer: o freela volta a esperar, com a data combinada, e sai do saldo
clicar('Extrato');
const bDesfazer = root.root.findAll(n => n.type === 'button' && textoEl(n.props.children) === 'desfazer').find(b => { let p = b; for (let i = 0; i < 4 && p.parent; i++) p = p.parent; return textoEl(p.props.children).startsWith('Freela do site'); });
const antesDesfazer = lsTrans();
act(() => bDesfazer.props.onClick());
const mudou = lsTrans().filter(x => JSON.stringify(x) !== JSON.stringify(antesDesfazer.find(y => y.id === x.id)));
console.log('desfeito:', mudou.map(x => x.description + ' ' + x.amount).join(', '));
const freela3 = lsTrans().find(t => t.description === 'Freela do site');
check(freela3.aConfirmar === true && freela3.date === DAQUI10 && !freela3.confirmadoEm, 'Desfazer: volta a esperar o Recebi, na data combinada');
dash();
check(Math.abs(num(card('Saldo do Mês')) - (num(saldoAntesEmprestimo) - 150 - 60 + 50 + 25.5 - 800)) < 0.01, 'Desfazer tira o valor do saldo de novo (' + card('Saldo do Mês') + ')');
process.exit(process.exitCode || 0);