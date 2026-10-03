# Notas do projeto EddFinança (leia antes de mexer)

Este arquivo existe para que qualquer computador ou sessão do Claude saiba em que pé o app está.
**Sempre atualize este arquivo quando publicar algo.** Última atualização: 03/10/2026.

## O que é
- App de finanças pessoais em **um único arquivo** `index.html` (React 18 + Babel no navegador, Tailwind e Lucide por CDN).
- Funciona como app instalável (PWA): `sw.js` guarda o cache. **A cada publicação, aumente a versão em `sw.js`** (`edd-financas-vNN`), senão os celulares continuam com a versão antiga.
- Site no ar: **https://eddfin.com.br** (GitHub Pages, arquivo `CNAME`). O domínio está no Registro.br, com DNS no modo avançado.
- Os dados ficam no aparelho (`localStorage`, chaves `@finapp_*`). Quem faz login também tem os dados no Firebase (projeto `eddfinanca`).

## Login e nuvem (Firebase)
- O login é por Google ou por e-mail e senha. Cada conta tem o seu espaço individual em `usuarios/{uid}`.
- O cadastro e os acessos de cada pessoa ficam em `acessos/{uid}`. O administrador vê esses registros e pode bloquear pessoas. Os administradores ficam em `admins/{uid}` e só se criam pelo console.
- Gestões compartilhadas usam `espacos/{id}` com convites por código (`convites/`).
- **Regras de segurança:** o arquivo `firestore.rules` precisa ser colado no console do Firebase (Firestore > Regras > Publicar). O que está no console já é igual ao do GitHub, conferido em 03/10/2026.
- Os domínios autorizados no Firebase Auth já incluem `eddfin.com.br` e `www.eddfin.com.br`.

## Como publicar
1. Antes de editar, **baixe a versão mais nova do GitHub** e veja o último commit, porque outra sessão pode ter publicado algo.
2. Teste.
3. Envie os arquivos pelo GitHub com "Add file > Upload files" na branch `main`.
4. Confira se o https://eddfin.com.br já mostra a mudança (leva de 1 a 2 minutos).

## Regras combinadas com o dono (Eduardo)
- Nunca digitar as senhas dele nem fazer login por ele. Ele mesmo faz o login.
- Nunca criar contas, colocar CPF ou documentos, nem fazer pagamentos por ele. Sempre confirmar antes de comprar ou de fazer algo que não dá para desfazer.
- Ele não é programador: explique em português simples.

## Histórico recente
- **03/10:** o app passou a entender melhor as frases faladas no lançamento rápido (função `interpretarTexto` e a nova `numerosPorExtenso`):
  - números por extenso ("trinta e cinco reais", "dois mil e quinhentos") e centavos ("30 reais e 50 centavos", "12 reais e 90");
  - "2 mil e 500";
  - escolhe o maior número da frase ("2 pizzas por 80" vira 80) e ignora o "99" do aplicativo de corrida;
  - datas: "na sexta", "sábado passado", "semana passada", "dia 5 de setembro";
  - mais palavras de receita (me mandou, reembolso, freela…), muitas palavras novas de categoria e plural ("pizzas").
  - Teste: `node testes/frases.cjs index.html`.
- **03/10:** trocar de conta no mesmo aparelho, ou sair sem internet, agora salva um arquivo de backup antes de apagar dados que ainda não foram para a nuvem.
- **03/10:** regras do WhatsApp adicionadas em `firestore.rules` e publicadas no console.
- **02/10:** barra de rolagem no menu lateral; domínio eddfin.com.br ligado.

## Pendências (aguardando o Eduardo)
1. **Voz:** hoje o botão 🎤 usa o reconhecimento de voz do navegador, que **pede permissão do microfone**. O Eduardo já pediu "sem pergunta de permissão". Ele precisa escolher:
   - (a) só o 🎤 do teclado, que nunca pede permissão;
   - (b) deixar como está;
   - (c) o teclado como padrão e um botão "Transcrever" à parte.
2. **Login com Google no app instalado** (ícone na tela inicial do celular): falta testar. O `authDomain` é `eddfinanca.firebaseapp.com` e, em app instalado, o redirecionamento pode falhar.
3. **WhatsApp:** está desligado (`WHATSAPP_NUMERO = null`) até existir um servidor para receber as mensagens.
