// Service worker: deixa o app abrir offline depois da primeira visita.
// Para forçar atualização depois de mudar o site, troque o número da versão abaixo.
const VERSAO = 'edd-financas-v14';
const BASE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Login e banco na nuvem nunca passam pelo cache.
  // (Os arquivos do Firebase em gstatic.com/firebasejs têm versão fixa e podem ficar guardados,
  //  assim quem já entrou consegue abrir o app sem internet.)
  if (/googleapis\.com|firebaseapp\.com/.test(e.request.url)) return;

  // A página do app busca primeiro na internet (assim a versão nova aparece na hora)
  // e só usa a cópia guardada quando estiver sem conexão.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); return r; })
        .catch(() => caches.match(e.request).then((emCache) => emCache || caches.match('./index.html')))
    );
    return;
  }

  // O resto (ícones, React, Tailwind) mostra o que está no cache e atualiza em segundo plano.
  e.respondWith(
    caches.open(VERSAO).then((cache) =>
      cache.match(e.request).then((emCache) => {
        const rede = fetch(e.request)
          .then((r) => { if (r && (r.ok || r.type === 'opaque')) cache.put(e.request, r.clone()); return r; })
          .catch(() => emCache);
        return emCache || rede;
      })
    )
  );
});
