{
  const work = () => {
    const songs = [
      {
        name: "Intro",
        url: `resource/audio/Loner%20Soundtrack/0_Intro.mp3`,
        type: "audio/mpeg",
        role: 'intro',
        index: -1
      }
    ];
    // https://blog.csdn.net/ML01010736/article/details/46422651 IIS6常用的MIME类型[rmvb,mp3,zip,exe等文件]
    const songObejectSample = {
      name: "",
      type: "audio/mpeg",
      arrayBuffer: '',
      role: 'none | intro | ...',
      index: 0
    } 
    const soundEffectObjSample = {
      name: "",
      type: "SE", //TODO: rename type may 
      role: '',
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

    /* class AudioPlayer - BEGIN */
    class AudioPlayer {
      #availableList = {};
      #intro = '';
      #sequenceArr = [];
      #rolesToReserve = ["intro"];
      #audioContext = null; //TODO
      #maxRetryTimes = 3;
      #retryGap = 3000; // ms
      #forceLoad = false;

      //TODO: onend -> postmassage -> set variable --> main thread

      constructor () {
        this.loadAll();
      }

      /**
       * @param {{ role: string; buffer: ArrayBuffer; }} newAudio
       */
      set newLoadedAudio (newAudio) {
        // no check for repeat
        if(newAudio.type === 'SE'){
          //TODO
          return ;
        }

        if(this.#rolesToReserve.includes(newAudio.role)){
          this.#availableList[newAudio.name] = {
            type: newAudio.type,
            role: newAudio.role,
            buffer: newAudio.arrayBuffer
          }
          this[`#${newAudio.role}`] = newAudio.name;
        } else {
          this.#sequenceArr[newAudio.index] = newAudio.name;
        }
      }

      stop_instantly () {
        if (this.#audioContext.state === 'suspended') {
            this.#audioContext.resume();
        }
      }

      stop_fadeOut () {
        
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
      async openDB (DBname, storeName) {
        let request = indexedDB.open(DBname, 1);
        return new Promise((resolve, reject) => {
          request.onsuccess = event => resolve(event.target.result);
          request.onerror = event => reject({name: 'indexDB', message: event.target.error});
          request.onupgradeneeded = e => {
            if(e.oldVersion === 0)
              e.target.result.createObjectStore(storeName, {keyPath: 'name', autoIncrement: false}).createIndex(`${storeName}NameIndex`, 'name', {unique: true});
          }
        });
      }
      getObjectStore (db, storeName, mode) {
        return db.transaction(storeName, mode).objectStore(storeName)
      }

      /**
       * @param {string} url 
       * @return {Promise} resolve: arrayBuffer, reject: err
       */
      async newfetch (url) {
        return new Promise((resolve, reject) => {
          if(this.#forceLoad || navigator.connection && !navigator.connection.saveData){
            fetch(
              new Request(url,
                { method: 'GET',
                  headers: new Headers(),
                  mode: 'cors',
                  redirect: 'follow'
                })
              ).then(response => {
                    if(response.ok)
                      resolve(response.arrayBuffer()); // can be converted to arrayBuffer directly?
                    else reject({name: 'responseNotOk', message: response.url})
                  })
          } else {
            reject({name: 'saveDataModeOn', message: undefined})
          };
        })
      }

      forceLoad () {
        this.#forceLoad = true;
      }
      /**
       * load specific source to or in indexDB
       * @param {Array<Object>} sourceList All stuff to load
       * @param {string} DBname
       * @param {string} storeName 
       * @return {Promise} errors wasn't handled in this func.
       */
      async load(sourceList, DBname, storeName) {
        const db = await this.openDB(DBname, storeName); 
        const store = this.getObjectStore(db, storeName, "readonly");
        return Promise.all(sourceList.map(source => { // 因为有对responseNotOk的retry处理，所以不用allSettled
          let request = store.get(source.name);
          return new Promise((resolve, reject) => {
            request.onsuccess = e => {
              if(e.target.result === undefined){
                const loadSourceWithRetry = (retriedTimes) => { // 避免this丢失
                  this.newfetch(source.url)
                    .then(arrayBuffer => {
                        const store = this.getObjectStore(db, storeName, "readwrite");
                        store.add({
                          name: source.name,
                          type: source.type,
                          arrayBuffer: arrayBuffer
                        });
                        this.newLoadedAudio = source;
                        resolve();
                      })
                    .catch(err => {
                      switch(err.name) {
                        case 'saveDataModeOn': reject(err);
                        case 'responseNotOk': 
                          ++retriedTimes > this.#maxRetryTimes 
                          ? reject(err) 
                          : setTimeout(() => loadSourceWithRetry(retriedTimes), this.#retryGap)
                          break ;
                        default: reject({name: 'exception', message: err.message})
                      }
                    })
                  }
                loadSourceWithRetry(0);
              } else {
                this.newLoadedAudio = source;
                resolve();
              }
            };
            request.onerror = e => reject({name: 'indexDB', message: e.error});
          })
        }))
      }
      async loadAll () {
        return Promise.allSettled(
            [
              this.load(songs, 'songs_Database', 'songs')
            ]
          ).then(results => {
            for (const result of results) {
              if(result.status === "fulfilled")
                continue; // to get value: result.value
              else // rejected
                return Promise.reject(result.reason)
            }
          }).catch(err => 
            postMessage(
              newMessage({
                isError: true,
                name: err.name,
                message: err.message
              })
            )
          )
      }
    }
    /* class AudioPlayer - END */
    const newMessage = message_obj => {
      const defaultMessage = {
        isError: false,
        isEvent: false,
        name: '',
        message: undefined
      }
      return Object.assign(defaultMessage, message_obj);
    }

    onmessage = message => {
      const [functionName, ...vars] = message.data;
      audioPlayer[functionName].apply(audioPlayer, vars);
    }

    const audioPlayer = new AudioPlayer();
  }

  if("indexedDB" in window && "Worker" in window){
    class GlobalAudioPlayer {
      #songPlaying = '';
      #worker = null;
      constructor () {
        this.#worker = this.#newWorker(work);
        this.#worker.onmessage = this.#onmessage;
      }

      #newWorker (workerFunction) {
        return new Worker(URL.createObjectURL(new Blob([`(${workerFunction})()`], {type: 'application/javascript'})), { type: 'module' });
      }

      #onmessage (message) {
        if(message.data.isError){
          switch(message.data.name){
            case 'saveDataModeOn':
              // using default confirm method blocks script execution but setTimeout continues (^^;)
              !existsCookie('rejectedForceLoad=true') && 
                Dialog.newConfirm("Your device is on lite mode", ["Downloading audio is paused to prevent data charges."], "Download anyway", "cancel").then(result => 
                  result === true
                  ? (this.#assignWork("forceLoad"), this.#assignWork("loadAll"))
                  : setCookie("rejectedForceLoad=true", 1)
                ) || console.info('Cookie: rejectedForceLoad=true')
              return ;
            case 'exception':
              return ;
            case 'responseNotOk':
              return Dialog.newError('📶 Network Error', message.data.message, 15000);
            case 'indexDB':
              Dialog.newError('can\' access indexDB😨', message.data.message)
              return ;
          }
        } else if(message.data.isEvent){
          switch(message.data.name){
            case 'newAudioPlaying':
              return;
          }
        }
      }

      #assignWork (functionName, ...vars) {
        this.#worker.postMessage([
          functionName,
          ...vars
        ])
      }

      get songPlaying () {
        return this.#songPlaying;
      }

      // ...

    }
    window.audioPlayer = new GlobalAudioPlayer();
  } else {
    Dialog.newError('can\' access indexDB😨')
  }
}