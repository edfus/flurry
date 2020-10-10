const noCache = true;
const version = "5.3.9--dev";
const cacheName = "cache-" + version;
const cacheResources = [
  `/`, 
  `https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js`
];
const DLC = [

];

self.addEventListener('install', (event) =>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(cacheName).then(cache =>
      cache.addAll(cacheResources)
      // addAll() will overwrite any key/value pairs previously stored in the cache that match the request
          .then(() => {
            if('connection' in navigator && !navigator.connection.saveData && DLC.length){
              cache.addAll(DLC);
            }
          })
    )
  )
})

self.addEventListener('activate', function (e) {
  console.log('[ServiceWorker] Activate.');
  e.waitUntil(
    caches.keys().then(keyList => 
      Promise.all(keyList.map(function (key) {
        if (key !== cacheName) {
          console.log('[ServiceWorker] Removing old cache:', key);
          return caches.delete(key);
        }
      }))
    )
  )
  return self.clients.claim();
});


self.addEventListener('fetch', e => {
  let hostname = e.request.url.split("//")[1].split('/')[0];
  try {
    // if(/(\.mp3)$/.test(e.request.url)){
    //   e.respondWith(fetch(e.request,{
    //       headers: new Headers()
    //     })
    //   )
    // } else 
    e.respondWith(
      caches.match(e.request).then(async function(response) {
        if (response != null) {
          return response
        } else {
          if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') {
            console.dir(e.request);
            return;
          }
          let request = e.request.clone();
          return await fetch(request).then(async response=>{
            if (!response || response.status !== 200 || response.type !== "basic" ? ( response.type !== "cors" ? true : hostname !== "cdnjs.cloudflare.com" ) : false ) {
              return response;
            }
            if(!noCache && request.method === "GET"){
              const cache = await caches.open(cacheName);
              await cache.put(request.url, response.clone());
            }
            return response;
        })
        }
      })
    )
  } catch(err) {
    console.error(err)
  }
})
 