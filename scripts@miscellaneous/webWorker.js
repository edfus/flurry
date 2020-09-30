{
  const work = () => {
    const cdnName = 'https://cdn.jsdelivr.net/gh/FML-MLS/Flurry';
    const songs = [
      {
        name: "Intro",
        url: `${cdnName}/resource/audio/Loner%20Soundtrack/0_Intro.mp3`,
        type: "audio/mpeg"
      }
    ];
    // https://blog.csdn.net/ML01010736/article/details/46422651 IIS6常用的MIME类型[rmvb,mp3,zip,exe等文件]
    const songObejectSample = {
      name: "",
      type: "",
      arrayBuffer: ''
    } 
    const soundEffectObjSample = {
      name: "",
      type: "",
      audioBuffer: ''
    } // AudioBuffer are designed to hold small audio snippets, typically less than 45 s
      // created from an audio file using the AudioContext.decodeAudioData()
      // audioContext.decodeAudioData(response, buffer => {
      //   let source = audioContext.createBufferSource();
      //   // 将解码后得到的值赋给buffer
      //   source.buffer = buffer;
      //   // 完成。将source绑定到audioContext。也可以连接AnalyserNode
      //   source.connect(audioContext.destination);
      // });
      // setTimeout(() => audio.play())
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
  
    const audioPlayer = new AudioPlayer();
    openSongDB().then(async db => {
      const store = db.transaction("songs", "readonly").objectStore("songs"); 
      // immediately returns
      const availableSongList = await Promise.all(songs.map(song => {
        let request = store.get(song.name);
        return new Promise((resolve, reject) => {
          request.onsuccess = e => {
            if(e.target.result === undefined){
              if(navigator.connection && !navigator.connection.saveData){
                fetch(
                  new Request(song.url,
                    { method: 'GET',
                      headers: new Headers(),
                      mode: 'cors',
                      redirect: 'follow'
                    })
                  ).then(response => {
                        if(response.ok)
                          return response.arrayBuffer(); // can be converted to arrayBuffer directly?
                        else console.warn(response)
                      })
                      .then(arrayBuffer => {
                          const store = db.transaction("songs", "readwrite").objectStore("songs");
                          store.add({
                            name: song.name,
                            type: song.type,
                            arrayBuffer: arrayBuffer
                          });
                          resolve(song.name);
                        })
                      .catch(error => console.error(error));
              } else {
                postMessage({
                  isError: true,
                  type: 'Metered Network',
                  content: song.name
                })
              };
            }
            else resolve(song.name);
          };
          request.onerror = e => reject(e.error);
        })
      }))
    })
    onmessage = (functionName, ...vars) => {
      try {
        availableSongList
      } catch(err) {
        postMessage({
          isError: true,
          type: 'database unsuccess', //TODO: no need for waiting for a whole datebase loaded 
          content: functionName + vars.toString()
        })
      }
    }
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
      // check if context is in suspended state (autoplay policy)
    class AudioPlayer {
        stop_instantly () {
          if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // play or pause track depending on state
        if (this.dataset.playing === 'false') {
              audioElement.play();
              this.dataset.playing = 'true';
          } else if (this.dataset.playing === 'true') {
              audioElement.pause();
              this.dataset.playing = 'false';
        }
      }
      stop_fadeOut () {
        
      }
      getSongPlaying () {

      }
      playNext () {
        
      }
      // https://developers.google.com/web/updates/2018/11/web-audio-autoplay
      /*
      We detect when users regularly let audio play for more than 7 seconds during most of their visits to a website, 
      and enable autoplay for that website.
      chrome://media-engagement/
      */
      playIntro () {
        let startPlayPromise = videoElem.play();

        /* In the Web Audio API, a web site or app can start playing audio using the start() method on a source node linked to the AudioContext. Doing so outside the context of handling a user input event is subject to autoplay rules.
        */
        if (startPlayPromise !== undefined) { // in earlier versions of the HTML specification, play() didn't return a value.
          startPlayPromise.then(() => { 
            // Start whatever you need to do only after playback 
            // has begun. 
          }).catch(error => {
            if (error.name === "NotAllowedError") {
              showPlayButton(videoElem);
            } else {
              // Handle a load or playback error
            }
          });
        }
      }
      playTheme () {
        
      }
      playSoundEffect () {
        
      }
      playDeadSound () {
        
      }
    }
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

    worker.onmessage = message => {
      if(message.data.isError){
        switch(message.data.type){
          case 'Metered Network': 
            return ;
          
        }
      } else {

      }
    }
    postMessage({

    }) 
  } else {
    // TO\DO:
  }
}