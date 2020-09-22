{
  const work = () => {
    const songs = [
      {
        name: "",
        url: ``,
        type: ""
      }
    ];
    
    const songObejectSample = {
      name: "",
      type: "",
      arrayBuffer: ''
    }
    const openSongDB = ()=>{
      let request = indexedDB.open('songs_Database', 1);
      return new Promise((resolve, reject) => {
        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject(Error('woah', event.target.error));
        request.onupgradeneeded = e => {
          if(e.oldVersion === 0)
            e.target.result.createObjectStore('songs', {keyPath: 'name', autoIncrement: false}).createIndex('songNameIndex','name',{unique: true});
        }
      });
    }
    
    const blobToArrayBuffer = blob => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('loadend', (e) => {
          resolve(reader.result);
        });
        reader.addEventListener('error', reject);
        reader.readAsArrayBuffer(blob);
      });
    }
    const arrayBufferToBlob = (buffer, type) => {
      return new Blob([buffer], {type: type});
    }
    
    openSongDB().then(db => {
      const store = db.transaction("songs", "readonly").objectStore("songs");
      songs.forEach(song => {
        let request = store.get(song.name);
        request.onsuccess = e => {
          let songData = e.target.result;
          if(songData !== undefined)
            postMessage({
              name: songData.name, 
              url: URL.createObjectURL(arrayBufferToBlob(songData.arrayBuffer, songData.type)), 
            });
          else {
            if('connection' in navigator && !navigator.connection.saveData){
              fetch(
                new Request(song.url, 
                  { method: 'GET',
                    headers: new Headers(),
                    mode: 'cors',
                    referrer: 'no-referrer',
                    redirect: 'follow' 
                  })
                ).then(response => {
                      if(response.ok)
                        return response.blob();
                      else console.dir(response)
                    })
                    // 使用blob()从response中读取一个Blob对象
                    .then(songBlob => {
                      postMessage({name: song.name, url: URL.createObjectURL(songBlob)});
                      blobToArrayBuffer(songBlob).then(arrayBuffer => {
                        const store = db.transaction("songs", "readwrite").objectStore("songs");
                        store.add({
                          name: song.name,
                          type: song.type,
                          arrayBuffer: arrayBuffer
                        });
                      })
                    })
                    .catch(error => console.error(error));
            } else {
              console.info("[Metered Network?] Download " + song.name + " cancelled.");
            };
          };
          //URL.revokeObjectURL();
        };
        request.onerror = e => Error(e.error);
      })
    })
    /*
     // https://github.com/GoogleChromeLabs/sw-toolbox/issues/49
      // https://jakearchibald.com/2018/i-discovered-a-browser-bug/
      // Access to fetch at 'https://cdn.jsdelivr.net/gh/edfus/storage/music/ShibayanRecords%20-%20%E8%BF%B7%E5%AD%90%E3%81%AE%E3%82%A8%E3%82%B3%E3%83%BC.mp3' from origin 'https://edfus.xyz' has been blocked by CORS policy: Request header field range is not allowed by Access-Control-Allow-Headers in preflight response.
      if(/\.mp3|\.mp4/.test(e.request.url)){
        //console.log(e.request.url);
        e.respondWith(fetch(e.request,{
            headers: new Headers()
          })
        )
      // The FetchEvent for "https://cdn.jsdelivr.net/gh/edfus/storage/music/ShibayanRecords%20-%20%E8%BF%B7%E5%AD%90%E3%81%AE%E3%82%A8%E3%82%B3%E3%83%BC.mp3" resulted in a network error response: an "opaque" response was used for a request whose type is not no-cors
      }else 
      // you can't call respondWith asynchronously ( then(()=> e.respondWith(...)) )
      // https://googlechrome.github.io/samples/service-worker/prefetch-video/
      */
  }
  window.songPlayer = {
    loopMode: true,
    shuffleMode: false,
    getSongPlaying: ()=>{},
    playNext: ()=>{},
    playIntro: ()=>{},
    playTheme: ()=>{},
    playSoundEffect: soundEffectName => {},
    playDeadSound: ()=>{},
    stop_instantly: ()=>{},
    stop_fadeOut: ()=>{}
  }

  if("indexedDB" in window && "Worker" in window){
    const worker = new Worker(URL.createObjectURL(new Blob([`(${work})()`], {type: 'application/javascript'})), { type: 'module' });

    worker.onmessage = songLoadedEvent => {
      ((name = songLoadedEvent.data.name, url = songLoadedEvent.data.url) => {
        
      })()
    }
    postMessage({}) 
  } else {
    // TO\DO:
  }
}