// AudioBuffer are designed to hold small audio snippets, typically less than 45 s
// created from an audio file using the AudioContext.decodeAudioData()
function work() {
  /* class AudioLoader - BEGIN */
  class AudioLoader {
    maxRetryTimes = 3;
    retryGap = 3000; // ms
    forceLoad = false;
    constructor({ songs, preloadIndex }) {
      //NOTE: this game has no sound effect
      this.songs = songs;
      this.preloadIndex = preloadIndex;
      this.loadAll();
    }

    addAudio(newAudio, isRequest) {
      if (isRequest)
        return newEvent('requestFulfilled', newAudio, [newAudio.arrayBuffer]);
      else if (newAudio.reserve) {
        return newEvent('newSongLoaded', newAudio, [newAudio.arrayBuffer]);
      } else if (newAudio.index >= 0 && this.preloadIndex > newAudio.index) {
        return newEvent('newSongLoaded', newAudio, [newAudio.arrayBuffer]);
      } else {
        delete newAudio.arrayBuffer;
        newEvent('newSongLoaded', newAudio);
      }
    }

    ///////// indexedDB related methods
    async openDB(DBname, storeName) {
      let request = indexedDB.open(DBname, 1);
      return new Promise((resolve, reject) => {
        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject({ name: 'indexedDB', message: event.target.error });
        request.onupgradeneeded = e => {
          if (e.oldVersion === 0)
            e.target.result.createObjectStore(storeName, { keyPath: 'name', autoIncrement: false }).createIndex(`${storeName}NameIndex`, 'name', { unique: true });
        };
      });
    }

    getObjectStore(db, storeName, mode) {
      return db.transaction(storeName, mode).objectStore(storeName);
    }

    /**
     * @param {string} url
     * @return {Promise} resolve: arrayBuffer, reject: err
     */
    async newfetch(url) {
      return new Promise((resolve, reject) => {
        if (this.forceLoad || (navigator.connection && !navigator.connection.saveData)) {
          fetch(
            new Request(url,
              {
                method: 'GET',
                headers: new Headers(),
                mode: 'cors',
                redirect: 'follow'
              })
          ).then(response => {
            if (response.ok)
              resolve(response.arrayBuffer());
            else
              reject({ name: 'responseNotOk', message: response.url });
          });
          /*
          The Promise returned from fetch() won’t reject on HTTP error status even if the response is an HTTP 404 or 500.
          Instead, it will resolve normally (with ok status set to false),
          and it will only reject on network failure or if anything prevented the request from completing.
          */
        } else {
          reject({ name: 'saveDataModeOn', message: undefined });
        };
      });
    }

    enableForceLoad() {
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
      return Promise.all(sourceList.map(source => {
        let request = store.get(source.name);
        return new Promise((resolve, reject) => {
          request.onsuccess = e => {
            if (e.target.result === undefined) {
              const loadSourceWithRetry = retriedTimes => {
                this.newfetch(source.url)
                  .then(arrayBuffer => {
                    const store = this.getObjectStore(db, storeName, "readwrite");
                    store.add({
                      name: source.name,
                      arrayBuffer: arrayBuffer
                    });
                    this.addAudio({ ...source, arrayBuffer }, isRequest);
                    resolve();
                  })
                  .catch(err => {
                    switch (err.name) {
                      case 'saveDataModeOn': return reject(err);
                      case 'responseNotOk':
                        return ++retriedTimes > this.maxRetryTimes
                          ? reject(err)
                          : setTimeout(() => loadSourceWithRetry(retriedTimes), this.retryGap);
                      default: reject({ name: 'exception', message: err.message });
                    }
                  });
              };
              loadSourceWithRetry(0);
            } else {
              this.addAudio({ ...source, ...e.target.result }, isRequest);
              resolve();
            }
          };
          request.onerror = e => reject({ name: 'indexedDB', message: e.error });
        });
      }));
    }
    async loadAll() {
      return Promise.allSettled(
        [
          this.load(this.songs, 'songs_Database', 'songs')
          // this.load(this.soundEffects, 'SE_Database', 'SE')
        ]
      ).then(results => {
        for (const result of results) {
          if (result.status === "fulfilled")
            continue; // to get value: result.value
          else // rejected
            return Promise.reject(result.reason);
        }
        newEvent("allLoaded");
      }).catch(err => newError(err.name, err.message)
      );
    }
    async loadSongs(list) {
      this.load(list, 'songs_Database', 'songs', true).catch(err => newError(err.name, err.message)
      );
    }
  }
  /* class AudioLoader - END */
  function newError(name, message) {
    postMessage({
      isError: true,
      name: name,
      message: message
    }
    );
  }
  function newEvent(eventName, message_obj, transferableArray) {
    const messageToSend = {
      isEvent: true,
      eventName: eventName,
      ...message_obj
    };
    if (transferableArray) {
      postMessage(
        messageToSend,
        transferableArray
      );
    } else {
      postMessage(
        messageToSend
      );
    }
  }

  let audioLoader = null;
  self.onmessage = ({ data }) => {
    if (data.initLoader === true) {
      audioLoader = new AudioLoader(data);
      return;
    }
    const [functionName, ...vars] = data;
    // console.log(functionName, vars)
    audioLoader[functionName].apply(audioLoader, vars);
  };
}
  /* worker function - END */

const host = config.testMode ? `//${location.host}/` : `https://flurry.ml/`;
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
    currentIndex: 0,
    shuffle: false
  };
  sequenceArr = [];
  songPlaying = {name: '', source: null};
  

  context = null;
  #worker = null;
  constructor () {
    this.#worker = this.#newWorker(work);
    this.#worker.onmessage = this.#onmessage.bind(this);
    this.#worker.postMessage({
      initLoader: true, 
      songs: [...songs, ...themes],
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

    Object.defineProperty(this.songPlaying, 'empty', {
      value() {
        this.name = '';
        this.source = null;
      }
    })
  }

  autoPlay () {
    if(this.playTriggered)
      return;

    const playF = () => {
      this.playSong(this.songs.intro).then(() => this.playNext(true));
      this.playTriggered = true;
    }
    const callback = () => {
      this.context.resume();
      if(!this.playTriggered)
        playF();
      ["click", "mousemove", "touchstart", "keydown"].forEach(name => 
          document.removeEventListener(name, callback, {once: true})
        )
    }

    if(config.inApp || config.testMode){
      playF();
    } else {
      if(localStorage.allowAutoPlay === 'true') {
        if (this.context.state === 'suspended') {
          ["click", "mousemove", "touchstart", "keydown"].forEach(name => 
            document.addEventListener(name, callback, {passive: true, once: true})
          )
        } else playF();
      } else if(!localStorage.hasOwnProperty('allowAutoPlay'))
        Dialog.newConfirm('Hello!', ["can we autoplay audio once you arrived at this site?", "you can change this in setting whenever you want"], "Sure", "no.")
          .then(result => {
            if(result === true) {
              callback();
              localStorage.allowAutoPlay = 'true';
            } else {
              localStorage.allowAutoPlay = 'false';
              //TODO: volume button
            }
          })
      else ; // localStorage.allowAutoPlay = false;
    }
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

  async #onmessage ({data}) {
    if(data.isError){
      switch(data.name){
        case 'saveDataModeOn':
          // using default confirm method blocks script execution but setTimeout continues (^^;)
          !existsCookie('rejectedForceLoad=true') && 
            Dialog.newConfirm("Your device is on lite mode", ["Downloading audio is paused to prevent data charges."], "Download anyway", "cancel").then(result => 
              result === true
              ? (this.#assignWork("enableForceLoad"), this.#assignWork("loadAll"))
              : setCookie("rejectedForceLoad=true", 1)
            ) || console.info('Cookie: rejectedForceLoad=true')
          return ;
        case 'responseNotOk':
          return Dialog.newError('📶 Network Error', data.message, 15000);
        case 'indexedDB':
          return Dialog.newError('can\' access indexedDB😨', data.message);
        default:
          return Dialog.newError(data.name, data.message, 15000);
      }
    } else if(data.isEvent){
      switch(data.eventName){
        case 'newSongLoaded': 
          if(data.reserve === true) {
            this.songs[data.role] = {
              audioBuffer: await this.context.decodeAudioData(data.arrayBuffer),
              name: data.name
            } // 直接在song中保留
            if(data.role === 'intro') //
              this.autoPlay()
          }
          else {
            // preload的非themes
            if(data.arrayBuffer) 
              this.songs.nextsToPlay[data.index] = {
                audioBuffer: await this.context.decodeAudioData(data.arrayBuffer),
                name: data.name,
                index: data.index
              }
            this.sequenceArr[data.index] = {
              name: data.name,
              index: data.index
            } //NOTE: indexedDB以name作为非重复的index索引，而此时data已添加入indexedDB，无需保留url。
          }
          return ;
        case 'requestFulfilled': 
          this.songs.nextsToPlay.push({
            audioBuffer: await this.context.decodeAudioData(data.arrayBuffer), // only takes arrayBuffer as input param
            name: data.name,
            index: data.index
          })
          return ; 
        case 'allLoaded': 
          return this.allLoaded = true; 
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

  /**
   * 播放歌曲。
   * @param {string | Object} param 要播放歌曲的role或包含其信息的对象
   * @param {boolean} loop 是否循环
   */
  async playSong (param, loop = false) {
    if(typeof param === "string")
      param = this.songs[param]
    if(!param)
      return false;      
    return this._play(param.name, param.audioBuffer, this.nodes.songsGain, loop)
  }

  async _play(name, audioBuffer, destination, loop) {
    if(this.songPlaying.source) {
      this.stop();
    }
    const source =  this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = loop; 
    source.start(0);
    // source.start( this._startedAt, this._progress + this.offset, this.duration );
    source.connect(destination);

    this.songPlaying.source = source
    this.songPlaying.name = name;
    console.info("Playing: " + this.songPlaying.name)
    return new Promise((resolve, reject) => {
        source.onended = () => {
          console.info("Ended: " + this.songPlaying.name)
          this.songPlaying.empty();
          resolve();
        }
        source.beforeForceStopped = () => {
          this.songPlaying.source.onended = null; // in case async error
          reject('Force stopped: ' + this.songPlaying.name);
        }
      })
  }
  /**
   * 播放按顺序的下一首歌
   * 注意，当autoPlay为true时，playNext会不断递归执行
   * 即playNext(true).then中的语句永远不会被执行。
   * audioPlayer.stop()可终止其自动顺序循环播放。终止后playNext(true)返回reject的promise，注意catch。
   * @param {undefined | boolean} autoPlay 默认false。若为true，则自动顺序循环播放
   * @return {Promise} 
   */
  async playNext (autoPlay = false) {
    let nextSong;
    if(this.songs.nextsToPlay.length)
      nextSong = this.songs.nextsToPlay.shift();
    else {
      return this._play(this.songPlaying.name, this.songPlaying.audioBuffer, this.nodes.songsGain, false).then(() => this.playNext(autoPlay));
    }
    this.songs.currentIndex = nextSong.index;
    this.request(nextSong.index)
    if(autoPlay)
      return this._play(nextSong.name, nextSong.audioBuffer, this.nodes.songsGain, false).then(() => this.playNext(true));
    else 
      return this._play(nextSong.name, nextSong.audioBuffer, this.nodes.songsGain, false);
  }
  /**
   * 加载对应音乐到内存
   * @param {number | string | Object | Array<Object>} param 播放的index（会求余），或包含信息的对象（对象数组），或要播放的role名
   */
  request(param) {
    switch(typeof param) {
      case 'number': 
        this.#assignWork('loadSongs', [this.sequenceArr[(param + this.preloadLength) % this.sequenceArr.length]]) // mod
        break;
      case 'string':
        const arr = [...songs, ...themes];
        for(let i = arr.length - 1; i >= 0; i--) {
          if(arr[i].name === param) {
            this.#assignWork('loadSongs', [arr[i]])
            break;
          }
        }
        break;
      case 'object':
        if(Array.isArray(param))
          this.#assignWork('loadSongs', param)
        else this.#assignWork('loadSongs', [param])
        break;
      default: console.warn("GlobalAudioPlayer: in function request: wrong parameter. ", param);
    }
  }

  pause () {
    this.nodes.songsGain.disconnect();
  }

  resume () {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    this.nodes.songsGain.connect(this.nodes.masterGain);
  }

  stop (delay = 0) {
    if(this.songPlaying.source) {
      const handleFunc = this.songPlaying.source.beforeForceStopped
      if(handleFunc && typeof handleFunc === "function")
        handleFunc();
      this.songPlaying.source.stop(delay);
      this.songPlaying.empty();
    }
    // An AudioBufferSourceNode can only be played once;
  }
  #volume = 1
  /**
   * pause the audio, not stop.
   * @param {number} fadeTime seconds to fade
   */
  fadeOut (fadeTime = 10) {
    const currTime = this.context.currentTime;
    // const duration = this.songPlaying.buffer.duration
    this.nodes.songsGain.gain.linearRampToValueAtTime(1, currTime);
    this.nodes.songsGain.gain.linearRampToValueAtTime(0, currTime + fadeTime);
    setTimeout(() => this.pause(), fadeTime * 1000);
  }

  /**
   * resume the last paused audio
   * @param {number} fadeTime seconds to fade
   */
  fadeIn (fadeTime = 10) {
    const currTime = this.context.currentTime;
    this.nodes.songsGain.gain.linearRampToValueAtTime(0, currTime);
    this.resume();
    this.nodes.songsGain.gain.linearRampToValueAtTime(1, currTime + fadeTime);
  }

  get volume() {
    return this.nodes.songsGain.gain.value;
  }

  set volume( value ) {
    this.nodes.songsGain.gain.setTargetAtTime( value, this.context.currentTime, 0.01 );
    this.#volume = value;
  }
}
export default new GlobalAudioPlayer();