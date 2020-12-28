import fetchHandler from "./service-worker/network-first.js";

const version = "1.2.4";
const cacheName = "cache-" + version;
const cacheResources = [
  `/`,
  "/dist/config.min.js",
  `/dist/main@${version}.min.js`,
  "/dist/style.css"
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

self.addEventListener('fetch', fetchHandler);