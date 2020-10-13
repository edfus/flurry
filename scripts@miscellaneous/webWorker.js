"use strict";
{
  const work = () => {
    const host = `https://flurry.ml/`;
    const songs = [
      {
        name: "Intro",
        url: `${host}resource/audio/Loner%20Soundtrack/0_Intro.mp3`,
        type: "audio/mpeg",
        role: 'intro'
        // index: -1
      }
    ];
    // https://blog.csdn.net/ML01010736/article/details/46422651 IIS6常用的MIME类型[rmvb,mp3,zip,exe等文件]
    const songObejectSample = {
      type: "audio/mpeg",
      arrayBuffer: '',
      usage: 'song',
      role: 'none | intro | ...',
      name: "", 
      index: 0
    } 
    const soundEffectObjSample = {
      type: "audio/mpeg",
      arrayBuffer: '',
      usage: "se",
      role: ''
      // name: ''
    } 
    // AudioBuffer are designed to hold small audio snippets, typically less than 45 s
    // created from an audio file using the AudioContext.decodeAudioData()

    /* class AudioPlayer - BEGIN */
    class AudioPlayer {
      rolesToReserve = ["intro"];

      songs = {
        intro: null,
        nextsToPlay: new Array(2), // for next two songs to play, reserve their array buffer 
        currentIndex: 0,
        theme: null
      };
      sequenceArr = [];
      isSongPlaying = false;

      SEList = {

      } //TODO: use map instead of normal object
      isSEPlaying = false;
      
      context = null;
      SEsource = null;

      maxRetryTimes = 3;
      retryGap = 3000; // ms
      forceLoad = false;

      constructor () {
        this.loadAll();
        // this.context = new AudioContext();
        // this.SEsource = this.context.createBufferSource();
        // this.nodes = {
        //   destination: this.context.destination,
        //   masterGain: this.context.createGain(),
        //   songsGain: this.context.createGain(),
        //   effectsGain: this.context.createGain()
        // };
        // this.nodes.masterGain.connect(this.nodes.destination);
        // this.nodes.songsGain.connect(this.nodes.masterGain);
        // this.nodes.effectsGain.connect(this.nodes.masterGain);
        // // this.play(this.context.createBufferSource(), )
      }

      setVolume (newVolume) {
        this.nodes.masterGain.gain.value = newVolume;
      }

      setBGMVolume (newVolume) {
        this.nodes.songsGain.gain.value = newVolume;
      }

      setSEVolume (newVolume) {
        this.nodes.effectsGain.gain.value = newVolume;
      }

      crossFade (track1, track2) {
        // https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime
        track1.gain.linearRampToValueAtTime( 0, 1 );
        track2.gain.linearRampToValueAtTime( 1, 1 );
      }

      pauseSE () {
        this.nodes.effectsGain.disconnect();
      }

      resumeSE () {
        this.nodes.effectsGain.connect(this.nodes.masterGain);
      }

      pauseBGM () {
        this.nodes.songsGain.disconnect();
      }

      resumeBGM () {
        this.nodes.songsGain.connect(this.nodes.masterGain);
      }

      pause () {
        this.nodes.masterGain.disconnect();
      }

      resume () {
        this.nodes.masterGain.connect(this.nodes.destination);
      }

      /**
       * @param {{ name?: string; index?: number; type: string; role: string; buffer?: ArrayBuffer; }} newAudio
       */
      set newLoadedAudio (newAudio) {
        // has check for repeat
        if(newAudio.usage === 'se'){
          this.SEList[newAudio.role] 
          ?? (this.SEList[newAudio.role] = {
            arrayBuffer: ''
          }) // one role one se
          return ;
        }

        if(this.rolesToReserve.includes(newAudio.role)){
          this.songs[newAudio.role]
          ?? (this.songs[newAudio.role] = {
            name: newAudio.name,
            type: newAudio.type,
            arrayBuffer: newAudio.arrayBuffer
          })
        } else {
          if(this.sequenceArr[newAudio.index] != undefined) // undefined or null
            return ;
          this.sequenceArr[newAudio.index] = newAudio.name;
          if(currentIndex <= newAudio.index && newAudio.index - currentIndex <= this.songs.nextsToPlay.length)
            this.songs.nextsToPlay[newAudio.index - currentIndex] = {
              name: newAudio.name,
              type: newAudio.type,
              arrayBuffer: newAudio.arrayBuffer,
              index: newAudio.index
            }
        }
      }

      stop () {
        this.source.stop();
      }

      pause_fadeOut () {
        this.context.resume();
      }

      async play (source, arrayBuffer, callback, onEnded) {
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

      playSoundEffect (role) {
        if(this.SEList[role])
          this.play(this.SEsource, this.SEList[role].arrayBuffer, () => void (this.isSEPlaying = true), () => void (this.isSEPlaying = false))
        else newError('audioNotFound', 'SE: ' + role);
      }

      // get volume() {
      //   return this.gain.gain.value;
      // }
    
      // set volume( value ) {
      //   this.gain.gain.setTargetAtTime( value, this.context.currentTime, 0.01 );
      //   return this;
      // }

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
      async newfetch (url, type) {
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
                      resolve(response.arrayBuffer()); //TODO: to audio buffer directly
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
      async load(sourceList, DBname, storeName) {
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
                          type: source.type,
                          arrayBuffer: arrayBuffer
                        });
                        this.newLoadedAudio = source;
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
                this.newLoadedAudio = source;
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
            newError(err.name, err.message)
          )
      }
    }
    const audioPlayer = new AudioPlayer();
    /* class AudioPlayer - END */
    function newError (name, message) {
      postMessage(
        newMessage({
          isError: true,
          name: name,
          message: message
        })
      )
    }
    function newEvent (name, message) {
      postMessage(
        newMessage({
          isEvent: true,
          name: name,
          message: message
        })
      )
    }
    function newMessage (message_obj) {
      const defaultMessage = {
        isError: false,
        isEvent: false,
        name: '',
        message: undefined
      }
      return Object.assign(defaultMessage, message_obj);
    }

    self.onmessage = message => {
      const [functionName, ...vars] = message.data;
      console.log(functionName, vars)
      audioPlayer[functionName].apply(audioPlayer, vars);
    }
  }

  if("indexedDB" in window && "Worker" in window){
    class GlobalAudioPlayer {
      #songPlaying = '';
      #worker = null;
      constructor () {
        this.#worker = this.#newWorker(work);
        this.#worker.onmessage = this.#onmessage.bind(this);

        if(localStorage.interacted) // autoplay rules.
          ;// this.#assignWork("playTheme");
        else {
          if(config.inApp){
            localStorage.interacted = true;
            // this.#assignWork("playTheme");
          }
          document.addEventListener("click", () => {
            localStorage.interacted = true;
            if(this.#songPlaying === '') //
              ;// this.#assignWork("playTheme");
          }, {passive: true, once: true}) 
        }
        // document.addEventListener("visibilitychange", () => {
        //   switch(document.visibilityState) {
        //     case 'visible' : this.resume();
        //       break;
        //     case 'hidden' : // this.pause(); 
        //       break;
        //     default: ; 
        //   }
        // }, {passive: true});
       /**
        * https://developers.google.com/web/updates/2018/11/web-audio-autoplay
        * We detect when users regularly let audio play for more than 7 seconds during most of their visits to a website, 
        * and enable autoplay for that website.
        * chrome://media-engagement/
        */
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
                  ? (that.#assignWork("forceLoad"), that.#assignWork("loadAll"))
                  : setCookie("rejectedForceLoad=true", 1)
                ) || console.info('Cookie: rejectedForceLoad=true')
              return ;
            case 'exception':
              return  Dialog.newError(data.name, data.message, 15000);;
            case 'responseNotOk':
              return Dialog.newError('📶 Network Error', data.message, 15000);
            case 'indexedDB':
              Dialog.newError('can\' access indexedDB😨', data.message)
              return ;
          }
        } else if(data.isEvent){
          switch(data.name){
            case 'newSongPlaying':
              this.#songPlaying = data.message;
              return ;
            case 'songEnded':
              return this.#songPlaying = '';
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

      resume () {
        this.#assignWork('resume')
      }

      pause () {
        this.#assignWork('pause')
      }

      // ...

    }
    window.audioPlayer = new GlobalAudioPlayer();
  } else {
    Dialog.newError('can\' access indexedDB😨')
  }
}