// Monta apresentacao.html e tutorial.html (composições HyperFrames 1080x1920) a partir de
// roteiros.json (textos e telas) e duracoes.json (tempo de cada narração).
// Uso: node ferramentas/gerar.cjs
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const roteiros = JSON.parse(fs.readFileSync(path.join(__dirname, 'roteiros.json'), 'utf8'));
const duracoes = JSON.parse(fs.readFileSync(path.join(__dirname, 'duracoes.json'), 'utf8').replace(/^\uFEFF/, ''));

const W = 1080, H = 1920;
const FOTO_L = 1170, FOTO_A = 2532;           // tamanho das fotos das telas
const TELA_L = 640, TELA_A = Math.round(TELA_L * FOTO_A / FOTO_L); // tela do celular no vídeo
const K = TELA_L / FOTO_L;                     // foto -> vídeo
const VERDE = '#10b981';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r2 = (n) => Math.round(n * 100) / 100;

function montar(nome) {
  const cenas = roteiros[nome];
  let t = 0;
  const partes = [], audios = [], anim = [];
  cenas.forEach((c, i) => {
    const voz = duracoes[nome + '/' + c.id];
    if (!voz) throw new Error('Sem narração para ' + nome + '/' + c.id);
    const ponta = i === 0 || i === cenas.length - 1;
    // a fala começa logo depois da cena entrar; a apresentação tem respiros menores para caber em ~60 s
    const tutorial = nome === 'tutorial';
    const atrasoVoz = tutorial ? (ponta ? 0.5 : 0.3) : (ponta ? 0.4 : 0.15);
    const d = r2(atrasoVoz + voz + (tutorial ? (ponta ? 1.1 : 0.4) : (ponta ? 0.8 : 0.2)));
    const id = 'c' + i;
    audios.push(`<audio id="a${i}" class="clip" src="assets/voz/${nome}/${c.id}.wav" data-start="${r2(t + atrasoVoz)}" data-duration="${r2(voz)}" data-track-index="5"></audio>`);
    const passo = c.passo ? `<div class="passo">Passo ${esc(c.passo)}</div>` : '';
    if (!c.tela) {
      // Abertura / fim: logo grande
      partes.push(`
      <div id="${id}" class="clip cena cena-logo" data-start="${r2(t)}" data-duration="${d}" data-track-index="1">
        <img class="logo" src="assets/logo.png" alt="" />
        <h1 class="marca">${esc(c.titulo)}</h1>
        <p class="frase">${esc(c.legenda)}</p>
        <div class="selos">
          <span>💬 Lançar falando</span><span>✅ Recebi / Paguei</span><span>🤝 Quem me deve</span><span>🎯 Metas</span>
        </div>
      </div>`);
      anim.push(`tl.fromTo("#${id} .logo", { opacity: 0, scale: 0.6, y: 40 }, { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "back.out(1.6)" }, ${r2(t + 0.05)});`);
      anim.push(`tl.fromTo("#${id} .marca", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${r2(t + 0.35)});`);
      anim.push(`tl.fromTo("#${id} .frase", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${r2(t + 0.6)});`);
      anim.push(`tl.fromTo("#${id} .selos span", { opacity: 0, y: 30, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.18, ease: "back.out(1.4)" }, ${r2(t + 1.0)});`);
    } else {
      // Zoom leve e centrado na largura: mais que ~14% cortava o começo dos textos na esquerda.
      // Quem aponta o botão é o contorno verde (destaque).
      const cy = (c.foco || [0, FOTO_A / 2])[1], cx = FOTO_L / 2;
      const s = Math.min(c.escala || 1, 1.14);
      // deixa o ponto de foco no meio da tela, sem mostrar borda vazia
      const lim = (v, min) => Math.min(0, Math.max(min, v));
      const tx = r2(lim(TELA_L / 2 - cx * K * s, TELA_L - TELA_L * s));
      const ty = r2(lim(TELA_A / 2 - cy * K * s, TELA_A - TELA_A * s));
      const realce = c.destaque ? (() => {
        const [x1, y1, x2, y2] = c.destaque, m = 10;
        return `<div class="realce" style="left:${r2(x1 * K - m)}px;top:${r2(y1 * K - m)}px;width:${r2((x2 - x1) * K + 2 * m)}px;height:${r2((y2 - y1) * K + 2 * m)}px"></div>`;
      })() : '';
      partes.push(`
      <div id="${id}" class="clip cena" data-start="${r2(t)}" data-duration="${d}" data-track-index="1">
        <div class="topo">${passo}<h2 class="titulo">${esc(c.titulo)}</h2><p class="legenda">${esc(c.legenda)}</p></div>
        <div class="celular"><div class="tela"><div class="zoom"><img src="assets/telas/${c.tela}.png" alt="" />${realce}</div></div></div>
      </div>`);
      anim.push(`tl.fromTo("#${id} .topo", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, ${r2(t)});`);
      anim.push(`tl.fromTo("#${id} .celular", { opacity: 0, y: 140, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" }, ${r2(t + 0.08)});`);
      anim.push(`tl.fromTo("#${id} .zoom", { x: 0, y: 0, scale: 1 }, { x: ${tx}, y: ${ty}, scale: ${s}, duration: ${r2(Math.max(1, d - 1.4))}, ease: "power2.inOut" }, ${r2(t + 0.8)});`);
      if (realce) {
        const tr = r2(t + Math.min(d * 0.55, d - 1.2));
        anim.push(`tl.fromTo("#${id} .realce", { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, ${tr});`);
        anim.push(`tl.fromTo("#${id} .realce", { boxShadow: "0 0 0 0 rgba(16,185,129,0.7)" }, { boxShadow: "0 0 0 26px rgba(16,185,129,0)", duration: 0.9, repeat: 1, ease: "power1.out" }, ${r2(tr + 0.45)});`);
      }
    }
    t = r2(t + d);
  });
  const total = t;
  const html = `<!doctype html>
<html lang="pt-BR" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #070b14; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; font-family: "Segoe UI", system-ui, sans-serif; color: #f1f5f9; }
      .fundo { position: absolute; inset: 0; background:
          radial-gradient(900px 700px at 85% 8%, rgba(16,185,129,0.22), transparent 60%),
          radial-gradient(800px 800px at 0% 100%, rgba(59,130,246,0.18), transparent 60%),
          linear-gradient(180deg, #0b1220 0%, #070b14 100%); }
      .marca-dagua { position: absolute; top: 56px; left: 64px; display: flex; align-items: center; gap: 14px; font-size: 30px; font-weight: 800; letter-spacing: -0.01em; color: #e2e8f0; }
      .marca-dagua img { width: 52px; height: 52px; border-radius: 14px; }
      .marca-dagua span { color: ${VERDE}; font-weight: 700; font-size: 22px; letter-spacing: 0.08em; text-transform: uppercase; margin-left: 6px; }
      .cena { position: absolute; inset: 0; }
      .topo { position: absolute; top: 150px; left: 70px; right: 70px; text-align: center; }
      .passo { display: inline-block; background: ${VERDE}; color: #04130d; font-weight: 800; font-size: 28px; padding: 6px 22px; border-radius: 999px; margin-bottom: 14px; letter-spacing: 0.04em; text-transform: uppercase; }
      .titulo { font-size: 74px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff; }
      .legenda { margin-top: 16px; font-size: 38px; line-height: 1.25; color: #b6c2d4; font-weight: 500; }
      .celular { position: absolute; left: ${(W - TELA_L - 36) / 2}px; top: 470px; width: ${TELA_L + 36}px; height: ${TELA_A + 36}px; border-radius: 64px; background: #1e293b; padding: 18px;
                 box-shadow: 0 0 0 3px #334155, 0 40px 90px rgba(0,0,0,0.6), 0 0 120px rgba(16,185,129,0.18); }
      .tela { position: relative; width: ${TELA_L}px; height: ${TELA_A}px; border-radius: 48px; overflow: hidden; background: #0f172a; }
      .zoom { position: absolute; left: 0; top: 0; width: ${TELA_L}px; height: ${TELA_A}px; transform-origin: 0 0; }
      .zoom img { display: block; width: ${TELA_L}px; height: ${TELA_A}px; }
      .realce { position: absolute; border: 6px solid ${VERDE}; border-radius: 18px; }
      .cena-logo { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 80px; }
      .cena-logo .logo { width: 260px; height: 260px; border-radius: 64px; box-shadow: 0 30px 80px rgba(16,185,129,0.35); }
      .cena-logo .marca { margin-top: 56px; font-size: 120px; font-weight: 900; letter-spacing: -0.03em; color: #ffffff; }
      .cena-logo .frase { margin-top: 18px; font-size: 46px; color: #cbd5e1; font-weight: 600; line-height: 1.25; }
      .selos { margin-top: 70px; display: flex; flex-wrap: wrap; gap: 18px; justify-content: center; }
      .selos span { background: rgba(255,255,255,0.07); border: 2px solid rgba(16,185,129,0.45); color: #e2e8f0; font-size: 34px; font-weight: 700; padding: 14px 26px; border-radius: 999px; }
      .barra { position: absolute; left: 0; bottom: 0; height: 10px; width: ${W}px; background: ${VERDE}; transform-origin: 0 50%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${nome}" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
      <div class="fundo clip" data-start="0" data-duration="${total}" data-track-index="0"></div>
      <div class="marca-dagua clip" data-start="0" data-duration="${total}" data-track-index="2"><img src="assets/logo.png" alt="" />EddFin<span>${nome === 'tutorial' ? 'Tutorial' : ''}</span></div>
      ${partes.join('\n')}
      <div class="barra clip" data-start="0" data-duration="${total}" data-track-index="3"></div>
      ${audios.join('\n      ')}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${anim.join('\n      ')}
      tl.fromTo(".barra", { scaleX: 0 }, { scaleX: 1, duration: ${total}, ease: "none" }, 0);
      window.__timelines["${nome}"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  // cada vídeo é um projeto HyperFrames próprio (uma composição raiz por pasta)
  const pasta = path.join(RAIZ, nome);
  fs.mkdirSync(pasta, { recursive: true });
  fs.cpSync(path.join(RAIZ, 'assets'), path.join(pasta, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(RAIZ, 'hyperframes.json'), path.join(pasta, 'hyperframes.json'));
  fs.writeFileSync(path.join(pasta, 'meta.json'), JSON.stringify({ id: 'eddfin-' + nome, name: 'EddFin ' + nome }, null, 2));
  fs.writeFileSync(path.join(pasta, 'index.html'), html);
  console.log(nome + '.html: ' + cenas.length + ' cenas, ' + total + ' s');
}
montar('apresentacao');
montar('tutorial');
