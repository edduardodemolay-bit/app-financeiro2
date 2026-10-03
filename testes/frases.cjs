// Testa o entendimento de frases faladas (interpretarTexto)
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const ini = html.indexOf('// ===== LANÇAMENTO RÁPIDO');
const fim = html.indexOf('const CATEGORIAS = [');
const lv = html.match(/const lerValor = [\s\S]*?\n    };/)[0];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(lv + '\n' + html.slice(ini, fim) + '\nglobalThis.f = interpretarTexto; globalThis.n = numerosPorExtenso;', ctx);
const E = ['Salário', 'Vendas', 'Outros'], S = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação', 'Pets', 'Outros'];
const HOJE = '2026-10-03'; // sábado
let falhas = 0;
const caso = (frase, esperado) => {
  const r = ctx.f(frase, E, S, HOJE);
  const erros = !r ? ['não entendeu'] : Object.keys(esperado).filter(k => r[k] !== esperado[k]).map(k => k + '=' + JSON.stringify(r[k]));
  console.log((erros.length ? 'FALHA' : 'OK   ') + ' - "' + frase + '" -> ' + (r ? r.amount + ' | ' + r.type + ' | ' + r.category + ' | ' + r.date + ' | ' + r.description : 'nada') + (erros.length ? '   [' + erros.join(', ') + ']' : ''));
  if (erros.length) falhas++;
};
// já funcionava
caso('gastei 46 na padaria', { amount: 46, type: 'gasto', category: 'Alimentação', description: 'Padaria' });
caso('recebi 3500 de salário', { amount: 3500, type: 'receita', category: 'Salário' });
caso('paguei R$ 120,50 de luz', { amount: 120.5, type: 'despesa', category: 'Moradia' });
caso('2 mil de aluguel', { amount: 2000, type: 'despesa' });
caso('gastei 30 no mercado dia 2', { amount: 30, date: '2026-10-02' });
// números por extenso
caso('gastei trinta reais no mercado', { amount: 30, category: 'Alimentação', description: 'Mercado' });
caso('Gastei trinta e cinco reais no almoço', { amount: 35, description: 'Almoço' });
caso('paguei duzentos e cinquenta de conta de luz', { amount: 250, type: 'despesa', category: 'Moradia' });
caso('recebi dois mil e quinhentos de salário', { amount: 2500, type: 'receita', category: 'Salário' });
caso('recebi 2 mil e 500 de salário', { amount: 2500 });
caso('recebi mil reais de venda', { amount: 1000, category: 'Vendas' });
caso('comprei um lanche de quinze reais', { amount: 15, description: 'Lanche' });
caso('gastei um real de bala', { amount: 1 });
caso('cem reais de gasolina', { amount: 100, category: 'Transporte' });
// centavos
caso('gastei trinta reais e cinquenta centavos na farmácia', { amount: 30.5, category: 'Saúde', description: 'Farmácia' });
caso('gastei 12 reais e 90 na padaria', { amount: 12.9 });
caso('paguei 4 e 50 centavos no pão', { amount: 4.5, category: 'Alimentação' });
caso('R$ 1.500,00 de aluguel', { amount: 1500 });
// vários números
caso('comprei 2 pizzas por 80', { amount: 80, category: 'Alimentação' });
caso('gastei 25 no 99', { amount: 25, category: 'Transporte' });
// datas
caso('gastei 50 no mercado ontem', { date: '2026-10-02', description: 'Mercado' });
caso('gastei 40 de uber na sexta', { date: '2026-10-02', category: 'Transporte' });
caso('gastei 40 de uber na quarta-feira', { date: '2026-09-30' });
caso('gastei 70 no bar sábado passado', { date: '2026-09-26', category: 'Lazer', description: 'Bar' });
caso('gastei 80 de academia semana passada', { date: '2026-09-26', category: 'Saúde' });
caso('paguei 90 de internet dia 5 de setembro', { date: '2026-09-05', type: 'despesa' });
caso('gastei 60 de presente dia 20 de dezembro', { date: '2025-12-20' });
caso('gastei dez reais no dia cinco', { amount: 10, date: '2026-10-05' });
// receitas novas
caso('o João me mandou 200 de pix', { type: 'receita', amount: 200 });
caso('caiu um reembolso de 45', { type: 'receita', amount: 45 });
caso('fiz um freela de 300', { type: 'receita', amount: 300 });
// categorias novas e da pessoa
caso('gastei 18 de açaí', { category: 'Alimentação', description: 'Açaí' });
caso('gastei 150 no psicólogo', { category: 'Saúde' });
caso('gastei 60 de ração pets', { category: 'Pets' });
caso('Gastei 30 no mercado.', { description: 'Mercado', amount: 30 });
// sem valor
const r = ctx.f('comprei pão', E, S, HOJE); console.log((r === null ? 'OK   ' : 'FALHA') + ' - sem valor não inventa'); if (r !== null) falhas++;
console.log(falhas ? falhas + ' FALHA(S)' : 'TUDO OK');
process.exit(falhas ? 1 : 0);
