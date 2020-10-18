"use strict";
// AudioBuffer are designed to hold small audio snippets, typically less than 45 s
// created from an audio file using the AudioContext.decodeAudioData()
{
  const work = () => {
    /* class AudioLoader - BEGIN */
    class AudioLoader {
      maxRetryTimes = 3;
      retryGap = 3000; // ms
      forceLoad = false;
      constructor ({songs, preloadIndex}) {
        //NOTE: this game has no sound effect
        this.songs = songs;
        this.preloadIndex = preloadIndex;
        this.loadAll();
      }

      addAudio (newAudio, isRequest) {
        if(isRequest)
          return newEvent('requestFulfilled', newAudio, [newAudio.arrayBuffer]);
        else if(newAudio.reserve) {
          return newEvent('newSongLoaded', newAudio, [newAudio.arrayBuffer]);
        } else if(newAudio.index >= 0 && this.preloadIndex > newAudio.index) {
          return newEvent('newSongLoaded', newAudio, [newAudio.arrayBuffer]);
        } else {
          delete newAudio.arrayBuffer;
          newEvent('newSongLoaded', newAudio)
        }
      }

      ///////// indexedDB related methods
      async openDB (DBname, storeName) {
        let request = indexedDB.open(DBname, 1);
        return new Promise((resolve, reject) => {
          request.onsuccess = event => resolve(event.target.result);
          request.onerror = event => reject({name: 'indexedDB', message: event.target.error});
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
          if(this.forceLoad || (navigator.connection && !navigator.connection.saveData)){
            fetch(
              new Request(url,
                { method: 'GET',
                  headers: new Headers(),
                  mode: 'cors',
                  redirect: 'follow'
                })
              ).then(response => {
                    if(response.ok)
                      resolve(response.arrayBuffer());
                    else reject({name: 'responseNotOk', message: response.url})
                  })
            /*
            The Promise returned from fetch() won’t reject on HTTP error status even if the response is an HTTP 404 or 500. 
            Instead, it will resolve normally (with ok status set to false),
            and it will only reject on network failure or if anything prevented the request from completing.
            */
          } else {
            reject({name: 'saveDataModeOn', message: undefined})
          };
        })
      }

      forceLoad () {
        this.forceLoad = true;
      }

      /**
       * load specific source to or in indexedDB
       * @param {Array<Object>} sourceList All stuff to load
       * @param {string} DBname
       * @param {string} storeName 
       * @return {Promise} errors wasn't handled in this func.
       */
      async load(sourceList, DBname, storeName, isRequest = false) {
        const db = await this.openDB(DBname, storeName); 
        const store = this.getObjectStore(db, storeName, "readonly");
        return Promise.all(sourceList.map(source => { // 因为有对responseNotOk的retry处理，所以不用allSettled
          let request = store.get(source.name);
          return new Promise((resolve, reject) => {
            request.onsuccess = e => {
              if(e.target.result === undefined) {
                const loadSourceWithRetry = retriedTimes => { // 避免this丢失
                  this.newfetch(source.url)
                    .then(arrayBuffer => {
                        const store = this.getObjectStore(db, storeName, "readwrite");
                        store.add({
                          name: source.name,
                          arrayBuffer: arrayBuffer
                        });
                        this.addAudio({...source, arrayBuffer}, isRequest);
                        resolve();
                      })
                    .catch(err => {
                      switch(err.name) {
                        case 'saveDataModeOn': return reject(err);                           
                        case 'responseNotOk': 
                          return ++retriedTimes > this.maxRetryTimes 
                          ? reject(err)
                          : setTimeout(() => loadSourceWithRetry(retriedTimes), this.retryGap)
                        default: reject({name: 'exception', message: err.message})
                      }
                    })
                  }
                loadSourceWithRetry(0);
              } else {
                this.addAudio({...source, ...e.target.result}, isRequest);
                resolve();
              }
            };
            request.onerror = e => reject({name: 'indexedDB', message: e.error});
          })
        }))
      }
      async loadAll () {
        return Promise.allSettled(
            [
              this.load(this.songs, 'songs_Database', 'songs')
              // this.load(this.soundEffects, 'SE_Database', 'SE')
            ]
          ).then(results => {
            for (const result of results) {
              if(result.status === "fulfilled")
                continue; // to get value: result.value
              else // rejected
                return Promise.reject(result.reason)
            }
            newEvent("allLoaded");
          }).catch(err => 
            newError(err.name, err.message)
          )
      }
      async loadSongs(list) {
        load(list, 'songs_Database', 'songs', true).catch(err => 
          newError(err.name, err.message)
        )
      }
    }
    /* class AudioLoader - END */
    function newError (name, message) {
      postMessage({
          isError: true,
          isEvent: false,
          name: name,
          message: message
        }
      )
    }
    function newEvent (eventName, message_obj, transferableArray) {
      const messageToSend =  {
        isError: false,
        isEvent: true,
        eventName: eventName,
        ...message_obj
      };
      if(transferableArray) {
        postMessage(
          messageToSend, 
          transferableArray
        )
      } else {
        postMessage(
          messageToSend
        )
      }
    }

    let audioLoader = null;
    self.onmessage = ({data}) => {
      if(data.initLoader === true) {
        audioLoader = new AudioLoader(data);
        return ;
      }
      const [functionName, ...vars] = data;
      console.log(functionName, vars)
      audioPlayer[functionName].apply(audioPlayer, vars);
    }
  }
  /* worker function - END */
  const host = `https://flurry.ml/`;
  // type: "audio/mpeg",
  const themes = [
    {
      name: "Intro",
      url: `${host}resource/audio/Loner%20Soundtrack/0_Intro.mp3`,
      role: 'intro'
    }
  ]; // 无index属性
  themes.forEach(e => e.reserve = true);
  const songs = [
    {
      name: "Voices",
      url: `${host}resource/audio/Loner%20Soundtrack/1_Voices.mp3`,
      index: 0
    },
    {
      name: "Void",
      url: `${host}resource/audio/Loner%20Soundtrack/2_Void.mp3`,
      index: 1
    },
    {
      name: "Rain",
      url: `${host}resource/audio/Loner%20Soundtrack/3_Rain.mp3`,
      index: 2
    },
    {
      name: "Tunnel",
      url: `${host}resource/audio/Loner%20Soundtrack/4_Tunnel.mp3`,
      index: 3
    },
    {
      name: "Time",
      url: `${host}resource/audio/Loner%20Soundtrack/5_Time.mp3`,
      index: 4
    },
    {
      name: "DeepSea",
      url: `${host}resource/audio/Loner%20Soundtrack/6_DeepSea.mp3`,
      index: 5
    },
    {
      name: "SeaSand",
      url: `${host}resource/audio/Loner%20Soundtrack/7_SeaSand.mp3`,
      index: 6
    },
    {
      name: "Rainyday",
      url: `${host}resource/audio/Loner%20Soundtrack/8_Rainyday.mp3`,
      index: 7
    },
  ];//.forEach(e => {e.usage = "songs"; e.role = 'none'});

  class GlobalAudioPlayer {
    preloadLength = 2
    songs = {
      nextsToPlay: new Array(this.preloadLength), // for next two songs to play, reserve their array buffer 
      currentIndex: 0
    };
    sequenceArr = [];
    songPlaying = '';
    playTriggered = false;

    context = null;
    #worker = null;
    constructor () {
      this.#worker = this.#newWorker(work);
      this.#worker.onmessage = this.#onmessage.bind(this);
      this.#worker.postMessage({
        initLoader: true, 
        songs: {...songs, ...themes},
        preloadIndex: this.preloadLength
      })
      this.context = new AudioContext();
      this.nodes = {
        destination: this.context.destination,
        masterGain: this.context.createGain(),
        songsGain: this.context.createGain()
      };
      this.nodes.masterGain.connect(this.nodes.destination);
      this.nodes.songsGain.connect(this.nodes.masterGain);
    }

    autoPlay () {
      if(!this.playTriggered)
        if(localStorage.interacted) // autoplay rules.
          this.play(this.songs.intro);
        else {
          if(config.inApp){
            localStorage.interacted = true;
            this.play(this.songs.intro);
          }
          document.addEventListener("click", () => {
            localStorage.interacted = true;
            if(!this.playTriggered) //
              this.play(this.songs.intro);
          }, {passive: true, once: true}) 
        }
    }

    #newWorker (workerFunction) {
      return new Worker(URL.createObjectURL(new Blob([`(${workerFunction})()`], {type: 'application/javascript'})), { type: 'module' });
    }

    #onmessage ({data}) {
      if(data.isError){
        switch(data.name){
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
            return  Dialog.newError(data.name, data.message, 15000);
          case 'responseNotOk':
            return Dialog.newError('📶 Network Error', data.message, 15000);
          case 'indexedDB':
            return Dialog.newError('can\' access indexedDB😨', data.message);
        }
      } else if(data.isEvent){
        switch(data.eventName){
          case 'newSongLoaded': 
            console.log(data);
            if(data.reserve === true) {
              this.songs[data.role] = {
                arrayBuffer: data.arrayBuffer,
                name: data.name
              } // 直接在song中保留
              if(data.role === 'intro') //
                this.autoPlay()
            }
            else {
              // preload的非themes
              if(data.arrayBuffer) 
                this.songs.nextsToPlay[data.index] = {
                  arrayBuffer: data.arrayBuffer,
                  name: data.name,
                  index: data.index
                }
              this.sequenceArr[data.index] = {
                name: data.name
              } //NOTE: indexedDB以name作为非重复的index索引，而此时data已添加入indexedDB，无需保留url。
            }
            return ;
          case 'requestFulfilled': 
            console.log(data);
            if(this.currentIndex >= data.index) {
              console.log(data, this.sequenceArr[this.currentIndex])
              return ;
            }
            this.songs.nextsToPlay[data.requestIndex] = {
              arrayBuffer: data.arrayBuffer,
              name: data.name,
              index: data.index
            }
            return ; 
          case 'allLoaded': 
            return console.log(data) || (this.allLoaded = true); 
          default:  Dialog.newError(data.eventName, data);
        }
      } else {
        Dialog.newError(data.name, data);
      }
    }

    #assignWork (functionName, ...vars) {
      this.#worker.postMessage([
        functionName,
        ...vars
      ])
    }

    play () {
      this._play(this.SEsource, this.SEList[role].arrayBuffer, () => void (this.isSEPlaying = true), () => void (this.isSEPlaying = false))

    }

    async _play(source, arrayBuffer, callback, onEnded) {
      source.buffer = await this.context.decodeAudioData(arrayBuffer);
      source.loop = true;
      // source.loopStart = 0;
      // source.loopEnd = Infinity;
      source.onended = onEnded.bind(this);
      // source.start( this._startedAt, this._progress + this.offset, this.duration );
      source.start(0);
      source.connect(this.context.destination);
      callback();
    }

    playNext (delay = 0) {
      const _startedAt = this.context.currentTime + delay;
      if (this.context.state === 'suspended') {
        this.context.resume();
      }
    }

    
    setBGMVolume (newVolume) {
      this.nodes.songsGain.gain.value = newVolume;
    }

    crossFade (track1, track2) {
      // https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime
      track1.gain.linearRampToValueAtTime( 0, 1 );
      track2.gain.linearRampToValueAtTime( 1, 1 );
    }

    pause () {
      this.nodes.songsGain.disconnect();
    }

    resume () {
      this.nodes.songsGain.connect(this.nodes.masterGain);
    }

    stop () {
      this.source.stop();
    }

    timeupdateCallback() {
      if (this.currentTime > stopTime) {
          this.pause();
        }
    }

    // get volume() {
    //   return this.gain.gain.value;
    // }
  
    // set volume( value ) {
    //   this.gain.gain.setTargetAtTime( value, this.context.currentTime, 0.01 );
    //   return this;
    // }
    // ...
  }
  window.audioPlayer = new GlobalAudioPlayer();
}