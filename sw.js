/* Online, the page, script, styles, and saves come from the network.
   Offline, the last copy that was opened is used. */

const CACHE = "recipe-box-v6";

const SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./data/items.json",
  "./manifest.json",
  "./favicon.svg",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./fonts/fraunces-normal-600.woff2",
  "./fonts/fraunces-italic-600.woff2",
  "./fonts/nunito-500.woff2",
  "./fonts/nunito-600.woff2",
  "./fonts/nunito-700.woff2",
  "./fonts/nunito-800.woff2",
  "./fonts/nunito-italic-700.woff2",
  "./images/lemon-herb-roast-chicken.svg",
  "./images/one-pot-mushroom-pasta.svg",
  "./images/blueberry-oat-muffins.svg",
  "./images/houseplants-winter.svg",
  "./images/kingston-old-town.svg",
  "./images/good-nights-sleep.svg",
  "./images/group-chat-quiet.svg",
  "./images/just-sat-down-cat.svg",
  "./images/library-holds.svg",
  "./images/gift-ideas.svg",
];

function wantsNetworkFirst(url) {
  const path = url.pathname;
  return (
    path.endsWith("/") ||
    path.endsWith(".html") ||
    path.endsWith(".js") ||
    path.endsWith(".css") ||
    path.endsWith("/items.json")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = wantsNetworkFirst(url)
        ? await fetch(request.url, { cache: "reload", credentials: "same-origin" })
        : await fetch(request);
      if (response && response.ok && (response.type === "basic" || response.type === "default")) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request) || await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === "navigate") {
        const fallback = await caches.match("./index.html");
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
