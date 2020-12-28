function work() {
  /* class AudioLoader - BEGIN */
  class AudioLoader {
    constructor({ songs, preloadIndex }) {
      this.maxRetryTimes = 3;
      this.retryGap = 3000; // ms
      this.forceLoad = false;
      
      this.songs = songs;
      this.preloadIndex = preloadIndex;
      this.loadAll();
    }

    addAudio(newAudio, isRequest) {
      if (isRequest)
        return newEvent('requestFulfilled', newAudio, [newAudio.arrayBuffer]);
      else if (newAudio.reserve) {
        return newEvent('newSongLoaded', newAudio, [newAudio.arrayBuffer]);
      } else if (newAudio.index && newAudio.index >= this.preloadIndex.min && newAudio.index < this.preloadIndex.max) { // > not >=
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
        }
      })
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

export default work;