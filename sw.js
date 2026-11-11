// Service worker do app do iPhone: alertas (push) e tela disponível mesmo sem rede.
const CACHE = "regulamt-tc-v3";
const ARQUIVOS = ["./", "index.html", "estilo.css", "app.js", "manifest.webmanifest", "icones/apple-touch-icon.png", "icones/icone-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Arquivos do app: rede primeiro (sempre a versão nova), cache se estiver sem internet.
// Dados (Supabase) nunca são guardados em cache.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});

self.addEventListener("push", (e) => {
  let d = { titulo: "Regula MT TC", corpo: "Nova atualização na fila de tomografias.", destino: "#/", etiqueta: "regulamt" };
  try {
    d = { ...d, ...e.data.json() };
  } catch {}
  e.waitUntil(
    self.registration.showNotification(d.titulo, {
      body: d.corpo,
      tag: d.etiqueta,
      icon: "icones/icone-192.png",
      badge: "icones/icone-192.png",
      data: { destino: d.destino },
      requireInteraction: true,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.destino) || "#/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) {
          c.postMessage({ tipo: "abrir", destino });
          return c.focus();
        }
      }
      return self.clients.openWindow(new URL("./" + destino, self.registration.scope).href);
    })
  );
});
