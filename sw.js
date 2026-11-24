// 任務森林 Service Worker（支援 GitHub Pages 子路徑與離線快取）
const CACHE_NAME = "task-forest-pwa-v1";
const PRECACHE = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;
  const url = new URL(req.url);

  // Google Fonts：快取優先（離線時若已快取過字體可直接載入）
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("gstatic.com")) {
    e.respondWith(
      caches.match(req).then(cached =>
        cached ||
        fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  // 本機與 GitHub Pages 檔案：網路優先（有網路抓最新版，離線時自動讀取快取）
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match("./index.html") || caches.match("./"))
      )
    );
  }
});
