class Options {
  constructor () {
    return Object.assign(this, {
      once: false,
      toBeClearedWhenReset: true
    })
  }
  static isEqual (optionA, optionB) {
    for(const [key, value] of Object.entries(optionA)) {
      if(optionB[key] !== value)
        return false
    }
    return true;
  }
  static defaultPropertyNames = Object.keys(new Options());
  static from (options) {
    const newOptions = new Options();
    this.defaultPropertyNames.forEach(name => name in options ? newOptions[name] = options[name] : void 0)
    return newOptions;
  }
}

const weakMap = new WeakMap();
if(config.testMode)
  window.allEvents = weakMap;
class Event {
  constructor () {
    weakMap.set(this, {maps: {}})
  }
  dispatch (eventName, ...params) {
    const callbackMaps = weakMap.get(this).maps;
    if(callbackMaps[eventName])
      callbackMaps[eventName].forEach((options, callback) => {
        if(Array.isArray(options)) {
          options = options.filter(({once}) => {
            callback.apply(void 0, params);
            return !once;
          })
          switch(options.length) {
            case 0: return callbackMaps[eventName].delete(callback);
            case 1: return callbackMaps[eventName].set(callback, options[0]);
            default: callbackMaps[eventName].set(callback, options)
          }
        } else {
          callback.apply(void 0, params);
          options.once ? callbackMaps[eventName].delete(callback) : void 0;
        }
      })
    if(eventName !== "newEvent")
      this.dispatch("newEvent", eventName);
  }

  addListener (eventName, callback, options = {}) {
    const callbackMaps = weakMap.get(this).maps;
    eventName in callbackMaps ? void 0 : callbackMaps[eventName] = new Map;

    options = Options.from(options);
    const getResult = callbackMaps[eventName].get(callback)

    if(getResult !== undefined) {
      Array.isArray(getResult)
      ? getResult.push(options)
      : callbackMaps[eventName].set(callback, [getResult, options])
    } else {
      callbackMaps[eventName].set(callback, options)
    }
  }

  removeListener (eventName, callbackToRemove, options = {}) {
    const callbackMaps = weakMap.get(this).maps;
    if(!callbackMaps.hasOwnProperty(eventName))
      return ;
    const getResult = callbackMaps[eventName].get(callbackToRemove);
    if(getResult !== undefined) {
      options = Options.from(options)
      if(Array.isArray(getResult)) {
        for(let i = getResult.length - 1; i >= 0; i--) {
          if(Options.isEqual(getResult[i], options)) {
              getResult.splice(i, 1);
          }
        }
        switch(getResult.length) {
          case 0: callbackMaps[eventName].delete(callbackToRemove);
            break;
          case 1: callbackMaps[eventName].set(callbackToRemove, getResult[0]);
           break;
          default: callbackMaps[eventName].set(callbackToRemove, getResult)
        }
      } else if(Options.isEqual(getResult, options)) {
        callbackMaps[eventName].delete(callbackToRemove);
      }
    }
  }
  /**
   * clear listeners those who have the same options as specified
   * @param {string} eventName 
   * @param {{name: string, value: any}} options 
   */
  clearListeners (eventName, optionToRemove = {name: 'once', value: true}) {
    const callbackMaps = weakMap.get(this).maps;
    if(!callbackMaps.hasOwnProperty(eventName))
      return ;
    const {name, value} = optionToRemove;
    callbackMaps[eventName].forEach((options, callback) => {
      if(Array.isArray(options)) {
        options = options.filter(newOption2Test => {
          return newOption2Test[name] !== value;
        })
        switch(options.length) {
          case 0: return callbackMaps[eventName].delete(callback);
          case 1: return callbackMaps[eventName].set(callback, options[0]);
          default: callbackMaps[eventName].set(callback, options)
        }
      } else {
        options[name] === value ? callbackMaps[eventName].delete(callback) : void 0;
      }
    })
  }
}

class CallbackHandler extends Event {
  constructor() {
    super();
  }
  addCallback (callback, options) {
    super.addListener("placeholderEvent", callback, options);
  }
  removeCallback (callback, options) {
    super.removeListener("placeholderEvent", callback, options);
  }
  trigger () {
    super.dispatch("placeholderEvent")
  }
  reset () {
    super.clearListeners("placeholderEvent", {name: 'toBeClearedWhenReset', value: true})
  }
}

export default Event;
export { Event , CallbackHandler };