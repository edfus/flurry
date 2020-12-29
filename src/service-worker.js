import FetchHandler from "./service-worker/network-first.js";
import cacheResources from "./service-worker/cache-resources.js";
import DLC from "./service-worker/downloadable.js";

const version = "1.2.4";
const cacheName = "cache-" + version;

self.addEventListener('install', e => {
  self.skipWaiting();
  return e.waitUntil(
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

self.addEventListener('fetch', new FetchHandler(cacheName));