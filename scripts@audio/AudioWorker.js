import { themes , songs } from './songsList.js'
// AudioBuffer are designed to hold small audio snippets, typically less than 45 s
// created from an audio file using the AudioContext.decodeAudioData()
function work() {
  /* class AudioLoader - BEGIN */
  class AudioLoader {
    maxRetryTimes = 3;
    retryGap = 3000; // ms
    forceLoad = false;
    constructor({ songs, preloadIndex }) {
      //NO\TE: this game has no sound effect
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
            if (response.status === 200)
              resolve(response.arrayBuffer());
            else
              reject({ name: 'responseNotOk', message: response.url });
          });
          /* will only reject on network failure,
           * or if anything prevented the request from completing.
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

    this._fade = new this.constructor._Fade();
  }

  autoPlay () {
    if(this.playTriggered)
      return;

    const playF = () => {
      this.playSong(this.songs.intro, true);
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
              //TODO: allowAutoPlay button
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
            } // indexedDB以name作为非重复的index索引，而此时data已添加入indexedDB，无需保留url。
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
      return Promise.reject('not found');
    return this._play(param.name, param.audioBuffer, this.nodes.songsGain, loop)
  }

  async _play(name, audioBuffer, destination, loop) {
    if(this._fade.isFading) {
      this.cancelFadeOut()
    }
    if(this.songPlaying.source) {
      await this.stop();
    }
    if(this.context.state === 'suspended') {
      await this.resume();
    }
    this.volume = this._user_preferred_volume;

    const source =  this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = loop; 
    source.start(0);
    // source.start( this._startedAt, this._progress + this.offset, this.duration );
    source.connect(destination);

    this.songPlaying.source = source
    this.songPlaying.name = name;
    console.info("AudioPlayer: Playing: " + this.songPlaying.name)
    return new Promise((resolve, reject) => {
      source.onended = isScheduled => {
        console.info("AudioPlayer: Ended: " + this.songPlaying.name)
        this.songPlaying.empty();
        if(isScheduled)
          reject("AudioPlayer: Stopped previous flow, playing songs on the new schedule")
        else resolve();
      }
      source.beforeForceStopped = () => {
        this.songPlaying.source.onended = null; // in case async error
        reject('AudioPlayer: Force stopped: ' + this.songPlaying.name);
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

    if(this.songs.nextsToPlay.length && this.songs.nextsToPlay[0])
      nextSong = this.songs.nextsToPlay.shift();
    else {
      if(this.songPlaying.source) {
        this.songPlaying.source.loop = true;
        return new Promise(resolve => {
          setTimeout(() => resolve(this.playNext(autoPlay)), this.songPlaying.source.buffer.duration * 999.9)
        })
      } else {
        return new Promise(resolve => {
          console.info("AudioPlayer: song not available")
          setTimeout(() => resolve(this.playNext(autoPlay)), 1000)
        })
      }
    }
    this.songs.currentIndex = nextSong.index;
    this.request(nextSong.index + this.preloadLength)
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
        this.#assignWork('loadSongs', [this.sequenceArr[param % this.sequenceArr.length]]) // mod
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

  _schedule = {
    _getSongFunc: (param, loop) => {
      const func = () => this.playSong(param, loop)
      func.toString = () => Function.prototype.toString.call(func).concat(` ${param}-${loop}`)
      return func;
    }
  };

  async scheduleFunc (func, delay) {
    const protoF = async () => {
      await new Promise(resolve => setTimeout(resolve, delay * 1000))
      if(!this._schedule[digestHex].cancel) {
        delete this._schedule[digestHex];
        return func();
      } else {
        delete this._schedule[digestHex];
        return Promise.reject("AudioPlayer: Schedule cancelled")
      }
    }
    const digestHex = await this._digestText(func.toString())
    this._schedule[digestHex] = {}
    this._schedule[digestHex].in = true;
    if(!this.songPlaying.source) {
      return protoF()
    }
    if(this._fade.isFading) {
      await new Promise(resolve => {
        this._fade.finally(resolve);
      })
      await this.stop(0);
      await this.resume();
      return protoF();
    }

    const pr_onended = this.songPlaying.source.onended;
    return new Promise(resolve => {
      this.songPlaying.source.loop = false;
      this.songPlaying.source.onended = () => {
        pr_onended(true);
        resolve(protoF())
      }
    })
  }

  async cancelScheduledFunc (func) {
    const digestHex = await this._digestText(func.toString());
    if(this._schedule[digestHex] && this._schedule[digestHex].in)
      return this._schedule[digestHex].cancel = true;
    else return false;
  }

  /**
   * 
   * @param {string | Object} param 要播放歌曲的role或包含其信息的对象
   * @param {boolean} loop 是否循环
   */
  async scheduleSong (param, loop, delay = 0) {
    return this.scheduleFunc(this._schedule._getSongFunc(param, loop), delay);
  }

  async cancelScheduledSong (param, loop) {
    return this.cancelScheduledFunc(this._schedule._getSongFunc(param, loop));
  }

  async _digestText (text) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
  }

  pause () {
    this.nodes.songsGain.disconnect();
    this.context.suspend();
  }

  async resume () {
    if (this.context.state === 'suspended') {
      return this.context.resume().then(() => 
        this.nodes.songsGain.connect(this.nodes.masterGain)
      )
    }
  }

  async stop (delay = 0) {
    if(this.songPlaying.source) {
      const handleFunc = this.songPlaying.source.beforeForceStopped
      // this.songPlaying.source._promisePtr.catch(reason => console.info(reason))
      //NOTE: console.infoed but still throws an uncaught error, I am comfused.
      if(handleFunc && typeof handleFunc === "function")
        handleFunc();
      this.songPlaying.source.stop(delay);
      this.songPlaying.empty();
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if(this.songPlaying.source)
            reject("AudioPlayer: incomplete stop after delay " + delay)
          else resolve()
        }, delay * 1000);
      })
    }
    // An AudioBufferSourceNode can only be played once;
  }
  _user_preferred_volume = 1;
  static _Fade = class {
    isFading = false;
    timer = 0;
    newPromise (setTimeoutFunc, delay) {
      this.isFading = true;
      return new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
        this.timer = 
          setTimeout(() => {
            if(typeof setTimeoutFunc === "function")
              setTimeoutFunc();
            this.resolve();
          }, delay);
      }).then(() => typeof this._then === "function" && this._then())
        .catch(reason => typeof this._catch === "function" ? this._catch(reason) : (() => {throw reason})())
        .finally(() => {
          typeof this._finally === "function" && this._finally();
          this._finally = this._then = this._catch = null;
        })
    }
    resolve (info) {
      if(this.isFading) {
        this.timer = 0;
        this.isFading = false;
        this._resolve(info);
        this._resolve = null;
        this._reject = null;
      }
    }
    reject (reason) {
      if(this.isFading) {
        clearTimeout(this.timer);
        this.isFading = false;
        this.timer = 0;
        this._reject(reason);
        this._resolve = null;
        this._reject = null;
      }
    }
    then (func) {
      if(!this._then)
        this._then = async () => func();
      else this._then.then(func);
      return this;
    }
    catch (func) {
      this._catch = func;
      return this;
    }
    finally (func) {
      this._finally = func;
      return this;
    }
    _dumpFunc = reason => void 0;
    dump (reason) {
      this.catch(this._dumpFunc)
          .reject(reason)
    }
  }

  _debug () {
    this._fade._dumpFunc = reason => console.log("AudioPlayer: " + reason)
    new ThrottleLog(500).autoLog(() => [this.volume, this.context.currentTime]);
  }
  /**
   * pause the audio, not stop.
   * @param {number} fadeTime seconds to fade
   */
  async fadeOut (fadeTime = 10) {
    const currTime = this.context.currentTime;
    fadeTime = this.volume * fadeTime;

    if(this._fade.isFading) {
      this._fade.dump('Dumped. fadeOut now');
      this.nodes.songsGain.gain.cancelScheduledValues(currTime);
    }

    this.nodes.songsGain.gain.linearRampToValueAtTime(this.volume, currTime);
    this.nodes.songsGain.gain.linearRampToValueAtTime(0, currTime + fadeTime);

    return this._fade.newPromise(() => this.pause(), fadeTime * 1000);
  }

  cancelFadeOut () {
    if(this._fade.isFading) {
      this._fade.dump('Dumped. fadeOut now');
      this.nodes.songsGain.gain.cancelScheduledValues(this.context.currentTime);
      this.volume = this._user_preferred_volume
    }
  }

  /**
   * resume the last paused audio
   * @param {number} fadeTime seconds to fade
   */
  async fadeIn (fadeTime = 10) {
    const currTime = this.context.currentTime;
    if(!this.songPlaying.source)
      return Promise.reject(new Error("!this.songPlaying.source"));
    if(this._fade.isFading) {
      this._fade.dump('Dumped. fadeIn now');
      this.nodes.songsGain.gain.cancelScheduledValues(currTime);
      fadeTime = (this._user_preferred_volume - this.volume) * fadeTime;
      this.nodes.songsGain.gain.linearRampToValueAtTime(this.volume, currTime + .001);
      this.nodes.songsGain.gain.linearRampToValueAtTime(this._user_preferred_volume, currTime + .001 + fadeTime);
      return this._fade.newPromise(void 0, fadeTime * 1000);
    } else {
      this.resume().then(() => {
        fadeTime = this._user_preferred_volume * fadeTime;
        this.nodes.songsGain.gain.linearRampToValueAtTime(0, currTime);
        this.nodes.songsGain.gain.linearRampToValueAtTime(this._user_preferred_volume, currTime + fadeTime);
        return this._fade.newPromise(void 0, fadeTime * 1000);
      })
    }
  }

  get volume() {
    return this.nodes.songsGain.gain.value;
  }

  set volume( value ) {
    this.nodes.songsGain.gain.setTargetAtTime( value, this.context.currentTime, 0.01 );
    this._user_preferred_volume = value;
    //TODO: volume button
  }
}
export default GlobalAudioPlayer;