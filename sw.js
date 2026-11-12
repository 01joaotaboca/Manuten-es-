// Grupo agro - Manutenção · Service Worker
// Para forçar atualização do app em todos os aparelhos, troque o número da versão abaixo.
const VERSAO = 'grupo-agro-manutencao-v1';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSAO)
      .then(c => c.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Dados do Firebase nunca passam pelo cache (o Firestore já guarda offline sozinho)
  if (url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts')) return;
  if (url.hostname.includes('firebasestorage')) return;

  // Página: tenta a internet primeiro (pega versão nova) e cai no cache se estiver offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copia = r.clone();
        caches.open(VERSAO).then(c => c.put('./index.html', copia));
        return r;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Demais arquivos (ícones, fontes, bibliotecas): usa o cache e atualiza em segundo plano
  e.respondWith(
    caches.match(req).then(cacheado => {
      const rede = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) {
          const copia = r.clone();
          caches.open(VERSAO).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() => cacheado);
      return cacheado || rede;
    })
  );
});
