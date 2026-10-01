// Service worker: deixa o app abrir offline depois da primeira visita.
// Para forçar atualização depois de mudar o site, troque o número da versão abaixo.
const VERSAO = 'edd-financas-v7';
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

// Mostra o que está no cache e atualiza em segundo plano (vale também para React/Tailwind dos CDNs).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
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
