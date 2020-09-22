{
  const work = () => {
      const noCache = true;
      const version = "1.1.2--dev";
      const cacheName = "cache-" + version;
      const cacheResources = [
        `/`, 
        `https://cdn.jsdelivr.net/gh/FML-MLS/Flurry/lib/three.min.js`
      ];
      const DLC = [

      ];

      self.addEventListener('install', (event) =>{
        self.skipWaiting();
        event.waitUntil(
          caches.open(cacheName).then(cache =>{
            return cache.addAll(cacheResources)
            // addAll() will overwrite any key/value pairs previously stored in the cache that match the request
                .then(() => {
                  if('connection' in navigator && !navigator.connection.saveData && DLC.length){
                    cache.addAll(DLC);
                  }
                });
          })
        )
      })

      self.addEventListener('activate', function (e) {
        console.log('[ServiceWorker] Activate.');
        e.waitUntil(
          caches.keys().then(function (keyList) {
            return Promise.all(keyList.map(function (key) {
              if (key !== cacheName) {
                console.log('[ServiceWorker] Removing old cache:', key);
                return caches.delete(key);
              }
            }));
          })
        )
        return self.clients.claim();
      });


      self.addEventListener('fetch', function(e) {
        let hostname = e.request.url.split("//")[1].split('/')[0];
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
                if (!response || response.status !== 200 || response.type !== "basic" ? ( response.type !== "cors" ? true : hostname !== "cdn.jsdelivr.net" ) : false ) {
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
      })
  }
  if("caches" in window && "serviceWorker" in navigator){
    window.addEventListener("load", ()=>{
      navigator.serviceWorker.register(URL.createObjectURL(new Blob([`(${work})()`])), { scope: '/' }).then(reg => {
        if(reg.installing){
          console.log('[ServiceWorker] installing');
        }
      }).catch(error => {
        console.log('Registration failed with ' + error);
      })
    }, {passive: true, once: true});
  }
}