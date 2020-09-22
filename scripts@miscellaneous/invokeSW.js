if("caches" in window && "serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register('serviceWorker.js', { scope: '/' }).then(reg => {
      if(reg.installing){
        console.log('[ServiceWorker] installing');
      }
    }).catch(error => {
      console.log('Registration failed with ' + error);
    })
  }, {passive: true, once: true});
}
