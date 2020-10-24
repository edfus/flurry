export default class {
  #stateTochange = null
  constructor (state) {
    this.#stateTochange = state
  }
  #callbackQueue = {};
  dispatch (eventName) {
    this.#stateTochange.now = eventName;
    if(this.#callbackQueue[eventName])
      this.#callbackQueue[eventName] = this.#callbackQueue[eventName].filter(
        ({callback, once}) => {
          callback();
          return !once; // true (not once) to reserve
      });
  }

  addListener (eventName, callback, {once: once = false} = {}) {
    this.#callbackQueue[eventName] ?? (this.#callbackQueue[eventName] = new Array)
    this.#callbackQueue[eventName].push({callback, once}) // shorthand
  }

  removeListener (eventName, callbackToRemove, {once: isOnceEvent = false} = {}) {
    for(let i = this.#callbackQueue[eventName].length - 1; i >= 0; i--) {
      if(callbackToRemove === this.#callbackQueue[eventName][i].callback
        && isOnceEvent === this.#callbackQueue[eventName][i].once) {
          this.#callbackQueue[eventName].splice(i, 1);
      }
    }
  }
}