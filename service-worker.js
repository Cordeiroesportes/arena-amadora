/* =========================================================
   ARENA AMADORA — service-worker.js
   Estratégia network-first para os HTML (evita o problema
   clássico do Safari servir versão antiga em cache depois
   de um deploy novo), com fallback pro cache quando offline.
   ========================================================= */

const CACHE_NAME = "arena-amadora-v4";

const ARQUIVOS_ESSENCIAIS = [
  "./index.html",
  "./torneios.html",
  "./auth.html",
  "./perfil.html",
  "./ranking.html",
  "./times.html",
  "./style.css",
  "./firebase-config.js",
  "./auth.js",
  "./perfil.js",
  "./torneios.js",
  "./home.js",
  "./times.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ARQUIVOS_ESSENCIAIS);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(
        nomes
          .filter(function (nome) { return nome !== CACHE_NAME; })
          .map(function (nome) { return caches.delete(nome); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const requisicao = event.request;

  if (requisicao.method !== "GET") return;

  // Network-first para navegação/HTML: sempre tenta buscar a versão
  // mais nova primeiro, só cai pro cache se estiver offline.
  const ehNavegacao = requisicao.mode === "navigate" ||
    (requisicao.headers.get("accept") || "").indexOf("text/html") !== -1;

  if (ehNavegacao) {
    event.respondWith(
      fetch(requisicao)
        .then(function (resposta) {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(requisicao, copia); });
          return resposta;
        })
        .catch(function () { return caches.match(requisicao); })
    );
    return;
  }

  // Demais recursos: cache-first com atualização em segundo plano.
  event.respondWith(
    caches.match(requisicao).then(function (respostaCache) {
      const buscaRede = fetch(requisicao).then(function (respostaRede) {
        const copia = respostaRede.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(requisicao, copia); });
        return respostaRede;
      }).catch(function () { return respostaCache; });

      return respostaCache || buscaRede;
    })
  );
});
