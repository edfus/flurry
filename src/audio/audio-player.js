import { themes , songs } from "../config/songs-list.js";
import work from "./audio-worker.js";

class AudioPlayer {
  preloadLength = 2 // preload the next two songs waiting to be played
  songs = {
    nextsToPlay: [], // items with array buffer 
    currentIndex: 0,
    shuffle: true
    // theme songs are stored as keys of "songs" obj. (e.g. this.songs.intro)
  };
  sequenceArr = [];  // non-theme songs that are available

  songPlaying = {name: '', source: null, destination: null, listener: []};
  /**
   * songPlaying will only be set by _play method
   * be emptied by stop method or source.onended event,
   */
  context = null;
  #worker = null;

  constructor () {
    /* call audio-loader */
    this.#worker = this.#newWorker(work);
    this.#worker.onmessage = this.#onmessage.bind(this);

    let min, preloadIndex;
    if(this.songs.shuffle === true && localStorage.songsAllLoaded) {
      min = Math.floor((songs.length - this.preloadLength) / 2 * Math.random()) // 0, 1, 2
      preloadIndex = {
        min: min,
        max: min + this.preloadLength
      } // the initial songs to be played are based on the min and max index
    } else {
      preloadIndex = {
        min: 0,  // non-shuffle mode, starts from 0
        max: this.preloadLength
      }
    }

    this.#worker.postMessage({
      initLoader: true, 
      songs: [...songs, ...themes],
      preloadIndex: preloadIndex
    })

    /* context & gain */
    this.context = new AudioContext();
    this.nodes = {
      destination: this.context.destination,
      masterGain: this.context.createGain(),
      songsGain: this.context.createGain()
    };
    this.nodes.masterGain.connect(this.nodes.destination);
    this.nodes.songsGain.connect(this.nodes.masterGain);

    Object.defineProperty(this.songPlaying, 'empty', {
      value () {
        this.name = '';
        this.source = null;
      }
    })

    /* fade */
    this._fade = new this.constructor._Fade();
  }

  #newWorker (workerFunction) {
    return new Worker(URL.createObjectURL(new Blob([`(${workerFunction})()`], {type: 'application/javascript'})), { /* type: 'module' */ });
  }

  /**
   * @param {Object} param0 the message.
   * Read the data part of the message from audio-worker,
   * which must have either isError or isEvent flag set.
   * If it is an error, data.name & data.message is taken.
   * If it is an event, according actions will be done based on data.eventName.
   */
  async #onmessage ({ data }) {
    if (data.isError) {
      switch (data.name) {
        case 'saveDataModeOn':
          if(existsCookie('rejectedForceLoad=true')) {
            console.info('Cookie: rejectedForceLoad=true')
          } else {
            Dialog.newConfirm(
              "Your device is on lite mode",
              ["Downloading audio is paused to prevent data charges."],
              "Download anyway",
              "cancel"
            ).then(downloadAnyWay => 
              downloadAnyWay
              ? (this.#assignWork("enableForceLoad"), this.#assignWork("loadAll"))
              : setCookie("rejectedForceLoad=true", 1)
            )
          }
          return ;
        case 'responseNotOk':
          return Dialog.newError('📶 Network Error', data.message, 15000);
        case 'indexedDB':
          return Dialog.newError('can\' access indexedDB😨', data.message);
        default:
          return Dialog.newError(data.name, data.message, 15000);
      }
    } else if(data.isEvent) {
      switch(data.eventName){
        case 'newSongLoaded': 
          if(data.reserve === true) {
             // store reserved one's arrayBuffer in memory
            this.songs[data.role] = {
              audioBuffer: await this.context.decodeAudioData(data.arrayBuffer),
              name: data.name
            }
            if(data.role === 'intro')
              this.autoPlay() // intro is loaded, it's time to play!
          } else {
            if(data.arrayBuffer) {
              // initial preload (e.g. that song to be played when game starts) 
              this.songs.nextsToPlay[data.index] = {
                audioBuffer: await this.context.decodeAudioData(data.arrayBuffer),
                name: data.name,
                index: data.index
              } 
              /**
               * In shuffle mode,
               * this may cause many empty items in nextsToPlay array
               * But we will splice them in playNext functoin
               */
            }

            this.sequenceArr[data.index] = {
              name: data.name,
              index: data.index
            } // store it in sequenceArr to mark it as available
          }
          return ;
        case 'allLoaded': 
          localStorage.songsAllLoaded = true;
          return this.allLoaded = true; 
        case 'requestFulfilled':
          // when game started, songs to be preloaded would be "requested" explicitly.
          // and here comes the result.
          this.songs.nextsToPlay.push({
            audioBuffer: await this.context.decodeAudioData(data.arrayBuffer),
            name: data.name,
            index: data.index
          })
          return ;
        default:  Dialog.newError(data.eventName, data);  // should never be reached
      }
    } else { // should never be reached
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
   * Handle auto play policy.
   * Will trigger a prompt asking for user's permission of auto play.
   * Will set & get localStorage.allowAutoPlay.
   * Note that the _play will try this.context.resume() if suspended (autop play rejected)
   * 
   * TODO: handle the circumstance when localStorage.allowAutoPlay is false;
   * TODO: add a toggle AutoPlay button in the setting page.
   * @return {void}
   */
  autoPlay () {
    if(this.playTriggered)
      return;

    const playIntro = () => {
      this.playSong(this.songs.intro, true).catch(() => void 0);
      this.playTriggered = true;
    }

    const callback = () => {
      this.context.resume();
      if(!this.playTriggered)
        playIntro();
      ["click", "mousemove", "touchstart", "keydown"].forEach(name => 
          document.removeEventListener(name, callback, {once: true})
        )
    }

    if(config.inApp){
      playIntro();
    } else {
      if(localStorage.allowAutoPlay === 'true') {
        if (this.context.state === 'suspended') {
          ["click", "mousemove", "touchstart", "keydown"].forEach(name => 
            document.addEventListener(name, callback, {passive: true, once: true})
          )
        } else playIntro();
      } else if(!localStorage.hasOwnProperty('allowAutoPlay'))
        Dialog.newConfirm('Hello!', ["can we autoplay audio once you arrived at this site?", "you can change this in setting whenever you want"], "Sure", "no.")
          .then(result => {
            if(result === true) {
              callback();
              localStorage.allowAutoPlay = 'true';
            } else {
              localStorage.allowAutoPlay = 'false';
            }
          })
      else ;
    }
  }

  /**
   * playSong
   * @param {string | Object} param If a string is passed in, it's the role of the song.
   * Otherwise, it should be an object containing necessary info of the song to play
   * @param {boolean} loop false by default
   * @return {Promise<void>}
   */
  async playSong (param, loop = false) {
    if(typeof param === "string")
      param = this.songs[param];
    if(!param)
      return Promise.reject('not found');
    return this._play(param.name, param.audioBuffer, this.nodes.songsGain, loop)
  }

  /**
   * will cancelFadeOut & stop songPlaying.source & resume context & set volume
   * @param {string} name 
   * @param {AudioBuffer} audioBuffer 
   * @param {GainNode} destination 
   * @param {Boolean} loop
   * @return {Promise<void>}
   */
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

    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = loop; 
    source.start(0);
    source.connect(destination);

    this.songPlaying.source = source;
    this.songPlaying.name = name;
    this.songPlaying.destination = destination;

    for (const func of this.songPlaying.listener) {
      await func();
    } // not first come, first served now. LOL.

    this.songPlaying.listener = [];
    console.info("AudioPlayer: Playing: " + this.songPlaying.name);

    return new Promise((resolve, reject) => {
      source.onended = isScheduled => {
        console.info("AudioPlayer: Ended: " + this.songPlaying.name)
        this.songPlaying.empty();
        if(isScheduled)
          reject("AudioPlayer: Stopped previous flow, playing songs on the new schedule")
        else resolve();
      }
      source.beforeForceStopped = () => {
        this.songPlaying.source.onended = null;
        reject('AudioPlayer: Force stopped: ' + this.songPlaying.name);
      }
    })
  }

  /**
   * Get the first available song in this.songs.nextsToPlay
   * will splice the emptys as well as the song gotten.
   */
  getNextSong () {
    for(let i = 0; i < this.songs.nextsToPlay.length; i++) {
      if(this.songs.nextsToPlay[i]) {
        return this.songs.nextsToPlay.splice(0, i + 1)[i];
      }
    }
    return false;
  }

  /**
   * Play the next song in sequence
   * Note that when you set the autoPlay flag to true,
   * this functon will execute a recursion
   * — that means, if you chained this function like playNext(true).then,
   * the "then" part will never be reached.
   * Calling AudioPlayer.prototype.stop() can stop the autoPlay of this function
   * and result in a rejected promise.
   * @param {undefined | boolean} autoPlay false by default
   * @return {Promise<void>} 
   */
  async playNext (autoPlay = false) {
    let songToPlay = this.getNextSong();

    if(!songToPlay.audioBuffer) {
      if(this.songPlaying.source) {
        console.warn("AudioPlayer: new song is yet not available, executing fallback.");

        this.songPlaying.listener.push(() => this.playNext(autoPlay));
        // this.songPlaying.source.loop = true;
        // return new Promise(resolve => {
        //   setTimeout(() => resolve(this.playNext(autoPlay)), this.songPlaying.source.buffer.duration * 999.9);
        // });
      } else {
        return new Promise(resolve => {
          console.warn("AudioPlayer: no song available .");
          resolve();
          // setTimeout(() => resolve(this.playNext(autoPlay)), 1000); // retry after one second.
        });
      }
    }

    let pr_nextSong = songToPlay;

    while (this.songs.currentIndex === songToPlay.index) { // in case duplication
      songToPlay = getNextSong();
      this.request(this.songs.currentIndex); // request new as we have spliced one.

      if(songToPlay === false) { // no other songs available
        songToPlay = pr_nextSong;
        break;
      } else {
        pr_nextSong = songToPlay;
        continue;
      }
    }
    this.songs.currentIndex = songToPlay.index;
    this.request(this.songs.currentIndex);

    if(autoPlay)
      return this._play(songToPlay.name, songToPlay.audioBuffer, this.nodes.songsGain, false).then(() => this.playNext(true));
    else 
      return this._play(songToPlay.name, songToPlay.audioBuffer, this.nodes.songsGain, false);
  }

  /**
   * request songs to preload.
   * @param {number | string | Object | Array<Object>} param 
   * number: the index.
   * string: the role.
   * Object: the object containing song-info
   * Array<Object>: an array of objects containing song-info
   * @return {void}
   */
  request(param) {
    switch(typeof param) {
      case 'number':
        if(this.songs.shuffle) {
          param = Math.floor(param * 3 * Math.random());
        } else {
          param = param + this.preloadLength;
        }
        this.#assignWork('loadSongs', [this.sequenceArr[param % this.sequenceArr.length]]) // modulus
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
      default: console.warn("AudioPlayer: in function request: wrong parameter. ", param);
    }
  }

  _schedule = {
    _getSongFunc: (param, loop) => {
      const func = () => this.playSong(param, loop)
      func.toString = () => Function.prototype.toString.call(func).concat(` ${param}-${loop}`)
      return func;
    }
  };


  /**
   * @param {Function} func
   * @param {number} delay play after delay
   * @return {Promise<any>} resolves with whatever func returned
   */
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
    this._schedule[digestHex] = {};
    this._schedule[digestHex].in = true;

    if(!this.songPlaying.source) {
      return protoF()
    }

    if(this._fade.isFading) {
      if("_hasSchedule" in this._fade) {
        const prDelay = this._fade._hasSchedule;
        await new Promise(resolve => {
          this._fade.finally(resolve);
        });
        await new Promise(resolve => setTimeout(resolve, prDelay * 1001))
        
        return new Promise(resolve => {
          this.songPlaying.listener.push(() => 
            resolve(this.scheduleFunc(...arguments))
          )
        }) 
      } else {
        this._fade._hasSchedule = delay;
        await new Promise(resolve => {
          this._fade.finally(resolve);
        })
        await this.stop(0);
        await this.resume();
        return protoF();
      } 
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

  /**
   * @return {Promise<boolean>} successful or not
   */
  async cancelScheduledFunc (func) {
    const digestHex = await this._digestText(func.toString());
    if(this._schedule[digestHex] && this._schedule[digestHex].in)
      return this._schedule[digestHex].cancel = true;
    else return false;
  }

  /**
   * 
   * @param {string | Object} param If a string is passed in, it's the role of the song.
   * Otherwise, it should be an object containing necessary info of the song to play
   * @param {boolean} loop false by default
   * @param {number} delay play after delay
   * @return {Promise<void>} 
   */
  async scheduleSong (param, loop, delay = 0) {
    return this.scheduleFunc(this._schedule._getSongFunc(param, loop), delay);
  }

  /**
   * 
   * @param {string | Object} param If a string is passed in, it's the role of the song.
   * Otherwise, it should be an object containing necessary info of the song to play
   * @param {boolean} loop false by default
   * @return {Promise<boolean>} successful or not
   */
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

  /**
   * @return {Promise} resolves when context resumed.
   */
  async resume () {
    if (this.context.state === 'suspended') {
      return this.context.resume().then(() => 
        this.nodes.songsGain.connect(this.nodes.masterGain)
      )
    }
  }

  /**
   * @param {number} delay in seconds
   * @return {Promise} resolves after delay seconds
   */
  async stop (delay = 0) {
    if(this.songPlaying.source) {
      // this.songPlaying.source._promisePtr.catch(reason => console.info(reason))
      // console.infoed but still throws an uncaught error, I am comfused.
      if(typeof this.songPlaying.source.beforeForceStopped === "function")
        this.songPlaying.source.beforeForceStopped();
      
      this.songPlaying.source.stop(delay);
      this.songPlaying.empty();
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if(this.songPlaying.source)
            ; // reject("AudioPlayer: incomplete stop after delay " + delay)
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
          this._finally && this._finally.forEach(f => f());
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
        delete this._hasSchedule;
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
        delete this._hasSchedule;
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
      if(!this._finally)
        this._finally = []
      this._finally.push(func);
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
   * pause the audio, not stopping it.
   * @param {number} fadeTime seconds to fade
   * @return {Promise<void>}
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
   * fade in the last paused audio
   * @param {number} fadeTime seconds to fade
   * @return {Promise<void>}
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

  /**
   * I forgot why I had chosen setTargetAtTime instead of setValueAtTime. 😂
   * TODO: volume button
   */
  set volume( value ) {
    this.nodes.songsGain.gain.setTargetAtTime( value, this.context.currentTime, 0.01 );
    // setTargetAtTime -- value: target, startTime: currentTime, timeConstant: 0.01
    this._user_preferred_volume = value;
  }
}

export default AudioPlayer;