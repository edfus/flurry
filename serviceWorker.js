const mode = ["network-first", "offline-first"][0];
const version = "8.2.6--dev";
const cacheName = "cache-" + version;
const cacheResources = [
  `/`, 
  `https://cdn.jsdelivr.net/npm/three@v0.121.0/build/three.module.min.js`
];
const DLC = [

];

self.addEventListener('install', e =>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(cacheName).then(cache =>
      cache.addAll(cacheResources)
        .then(() => {
          if('connection' in navigator && !navigator.connection.saveData && DLC.length){
            cache.addAll(DLC);
          }
        })
    )
  )
})

self.addEventListener('activate', e => {
  console.info('[ServiceWorker] Activate.');
  e.waitUntil(
    caches.keys().then(keyList => 
      Promise.all(keyList.map(key => {
        if (key !== cacheName) {
          console.info('[ServiceWorker] Removing old cache: ', key);
          return caches.delete(key);
        }
      }))
    )
  )
  return self.clients.claim();
});


if(mode === "network-first") {
  self.addEventListener('fetch', e => 
    e.respondWith(
      (async () => {
        let response = await e.preloadResponse;

        if (!response) {
          try {
            response = await fetch(e.request)
          } finally { // in case network error(rejected promise)
            if(!response || response.status !== 200) {
              const cacheResponse = await caches.match(e.request.url)
              if(cacheResponse)
                return cacheResponse;
              else return Response.error();
            }
          }
        }

        // got non-cached ok response
        if(e.request.method === "GET" && ["cors", "basic"].includes(response.type) || /(\.mp3)$/.test(request.url)) {
          const clone = response.clone();
          e.waitUntil(
            caches.open(cacheName).then(cache => cache.put(e.request.url, clone))
          )
          // put() will overwrite any key/value pair previously stored in the cache that matches the request.
        }
        return response;
      })()
    )
  )
} else {
  self.addEventListener('fetch', e => 
    e.respondWith(
      caches.match(e.request.url).then(async response => {
        if (response) {
          return response;
        } else {
          const request = e.request.clone();
          const response = await fetch(request);

          if (response.status !== 200 || !["cors", "basic"].includes(response.type) || /(\.mp3)$/.test(request.url)) {
            return response;
          }
          if(request.method === "GET") {
            const clone = response.clone();
            e.waitUntil(
              caches.open(cacheName).then(cache => cache.put(request.url, clone))
            )
          }
          return response;
        }
      })
    )
  )
}