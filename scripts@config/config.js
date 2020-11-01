"use strict";
{
  // inner
  const fadeOutSpeedLevel = 4;

  // exposed
  const TestMode = /test=1|debug/.test(location.search) ? true : false,

  InApp = /app=1/.test(location.search) ? true : false,

  ThemeColor = '#000', // used in , webmanifest

  BackgroundColor = '#f7d9aa', // used in index.html/meta-themeColor, style-background


  Version = '8.6.6' + '--dev', 

  PerspectiveCameraSetting = {
      fieldOfView: 60, 
      // Unity中Camera的FOV（默认的垂直方向）设置为多少比较合理呢，怎样做产生的透视失真更小？ - zd304的回答 - 知乎
      // https://www.zhihu.com/question/395044805/answer/1233585414
      aspectRatio: window.innerWidth / window.innerHeight,
      nearPlane: 1, // 可以看作近端裁剪
      farPlane: 10000 // 可以看作远端裁剪
  },

  GetContainer = () => {
    return document.getElementById('main')
  },

  GetUIContainer = () => {
    return document.getElementById('ui')
  },

  GetScoreContainer = () => {
    return document.getElementById('score')
  },

  GameLoadedCallback = async () => { // asynchronous 异步的，非同时的
    /**
     * 渐隐目标对象
     * @param {*} currentOpacity 初始透明度
     * @param {*} reduction_num 每次执行改变的幅度
     * @param {*} per_ms 每隔多少毫秒执行一次。单位：毫秒
     * @param {*} reference 指向的对象
     */
    const fadeOut = (currentOpacity, reduction_num, reference) => () => { 
      (reference.style.opacity = currentOpacity) < 0
      ? (reference.hidden = true) && (reference.style.willChange = 'auto')
      : requestAnimationFrame(fadeOut(currentOpacity - reduction_num, reduction_num, reference))
    }

    const loadSection = document.getElementById('loading-section');
    const loader = document.getElementById('loader');

    setTimeout(()=>{
      if(loadSection.hidden !== true){
        loadSection.style.willChange = "opacity";
        fadeOut(1, .002 * fadeOutSpeedLevel, loadSection)();
      }
      if(loader.hidden !== true){
        loader.style.willChange = "opacity";
        fadeOut(1, .003 * fadeOutSpeedLevel, loader)();
      }
    }, config?.loading_timeOut ?? 400)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_Coalescing_Operator
    // fallback: window.config && config.loading_timeOut ? config.loading_timeOut : 400
  };

  scoreIncreasingSpeed = 150; // m / s (700 km/h ≈ 200m/s)

  // export default {
  window.config = {
    testMode: TestMode,
    inApp: InApp,
    version: Version,
    cameraSetting: PerspectiveCameraSetting,
    getContainer: GetContainer,
    getUIContainer:  GetUIContainer,
    getScoreContainer: GetScoreContainer,
    gameLoadedCallback: GameLoadedCallback,
    speed_score: scoreIncreasingSpeed,
  }
}

{
  window.Dialog = class Dialog extends HTMLElement {
    #title = null;
    #paragraphs = null;
    #shadowTree = null;

    constructor() {
      super();
      this.#title = document.createElement('H3');
      this.#title.part = 'title';

      this.#paragraphs = document.createElement('ARTICLE'); 
      this.#paragraphs.part = 'paragraphs';
      // The result must not have attributes
    }

    /**
     * @param {string} str
     */
    set title (str) {
      this.#title.textContent = str
    }

    /**
     * @param {Array<string>} arr
     */
    set paragraphs (arr) {
      if(!Array.isArray(arr)){
        if(typeof arr === "string")
          arr = [arr];
        else if(arr.length || arr[Symbol.iterator])
          arr = Array.from(arr);
          // arrayLike: with length or [Symbol.iterator]
        else arr = [arr];
      }
      this.#paragraphs.innerHTML = arr.reduce((accumulator, newP) => 
        accumulator += `<p part="paragraph">${newP}</p>`
      , '') // The second parameter is for initial value.
      // Failed to set the 'outerHTML' property on 'Element': This element's parent is of type '#document-fragment', which is not an element node.
    }

    get paragraphs () {
      return Array.from(this.#paragraphs.children).map(e => e.textContent).join("\n");
    }

    show () {
      this.classList.add('dialog')
      this.#shadowTree = this.attachShadow({mode: 'closed'});
      this.append(this.#title, this.#paragraphs)
      this.classList.add('active')
      Dialog.newEvent("dialogShow")
    }

    hide () {
      this.classList.add('hide');
      Dialog.newEvent("dialogHide")
      this.addEventListener("animationend", () => {
        this.remove()
      }, {passive: true, once: true})
    }

    connectedCallback() {
      Dialog.#busy = true; // okay, just need to be in the same enclosing class declaration
      Dialog.newEvent("dialogAdd")
      this.show() // in prototype  may or may not 
    }

    disconnectedCallback() {
      Dialog.#busy = false;
      Dialog.newEvent("dialogRemove")
    }
    
    append(...HTMLElements) {
      HTMLElements.forEach(e => this.#shadowTree.append(e))
    }

    newEvent (name) {
      this.dispatchEvent(new CustomEvent(name))
    }

    addOnceListener (eventName, callback) {
      this.addEventListener(eventName, callback, {passive: true, once: true})
    }

    static #busy = false;

    static get isBusy () {
      return this.#busy;
    }

    static #callbackQueue = {}

    static newEvent (name) {
      // Dialog.#observer.dispatchEvent(new CustomEvent(name))
      if(this.#callbackQueue[name])
        this.#callbackQueue[name] = this.#callbackQueue[name].filter(
          ({callback, once}) => {
            callback.call(this);
            return !once;
        });
    }

    static addOnceListener (eventName, callback) {
      eventName in this.#callbackQueue ? void 0 : (this.#callbackQueue[eventName] = new Array)
      this.#callbackQueue[eventName].push({callback, once: true}) // shorthand
    }

    static addEventListener (eventName, callback) {
      eventName in this.#callbackQueue ? void 0 : (this.#callbackQueue[eventName] = new Array)
      this.#callbackQueue[eventName].push({callback, once: false}) // shorthand
    }

    static removeEventListener (eventName, callbackToRemove, isOnceEvent = false) {
      for(let i = this.#callbackQueue[eventName].length - 1; i >= 0; i--) {
        if(callbackToRemove === this.#callbackQueue[eventName][i].callback
          && isOnceEvent === this.#callbackQueue[eventName][i].once) {
            this.#callbackQueue[eventName].splice(i, 1);
        }
      } // 不shallow copy数组，提高效率
    }
    // this.#observer.dataset.queue = [];
      // Note that the HTMLElement.dataset property is a DOMStringMap
    static #dialogQueue;
    static append (newDialog) {
      if(this.#dialogQueue === undefined){ // init
        this.#dialogQueue = [];
        this.addEventListener('dialogRemove', () => {
          if(this.#dialogQueue.length)
            document.body.append(this.#dialogQueue.shift())
        })
      }
      if(this.isBusy)
        this.#dialogQueue.push(newDialog)
      else document.body.append(newDialog)
    }
  }

  class MyConfirm extends Dialog {
    #confirmButton = null;
    #rejectButton = null;
    constructor() {
      super();
      this.#confirmButton = document.createElement('BUTTON');
      this.#confirmButton.part = 'confirm-button button';
      this.#confirmButton.type = "button"

      this.#rejectButton = document.createElement('BUTTON');
      this.#rejectButton.part = 'reject-button button';
      this.#rejectButton.type = "button"
    }
    show () {
      // this.showBasic();
      // this.constructor.prototype.__proto__.show.call(this)
      // this.__proto__.__proto__.show.call(this)
      // Dialog.prototype.show.call(this)
      // super - available in all shorthand methods (ES6)
      super.show();
      this.append(this.#confirmButton, this.#rejectButton)
  
      this.#confirmButton.addEventListener('click', event => {
          console.info('Confirm: ' + this.#confirmButton.innerText)
          this.newEvent("confirm");
          this.hide();
        }, {passive: true, once: true})
      this.#rejectButton.addEventListener('click', event => {
          console.info('Confirm: rejected');
          this.newEvent("reject");
          this.hide();
        }, {passive: true, once: true})
    }
    /**
     * @param {string} str
     */
    set confirmText (str) {
      this.#confirmButton.textContent = str
    }
    /**
     * @param {string} str
     */
    set rejectText (str) {
      this.#rejectButton.textContent = str
    }
  }


  class MyError extends Dialog {
    #okButton = null;
    #msToHide = -1;
    
    constructor() {
      super();
      this.#okButton = document.createElement('BUTTON');
      this.#okButton.part = 'error-button button';
      this.#okButton.innerText = 'OK';
      this.title = 'Oops, an error occurred.';
      // this.prototype.#title: Private field '#title' must be declared in an enclosing class 
    }
    show () {
      super.show();
      this.append(this.#okButton)
      this.#okButton.addEventListener('click', event => {
        this.hide();
        }, {passive: true, once: true})
      
      if(this.#msToHide > 0) {
        setTimeout(() => this.hide(), this.#msToHide);
      }
    }
    /**
     * @param {number} num
     */
    set msToHide (num) {
      this.#msToHide = num;
    }
  }
  window.customElements.define('confirm-dialog', MyConfirm);
  window.customElements.define('error-dialog', MyError);
  /**
   * display a self defined confirm dialog other than browser's default
   * @param {string} title 
   * @param {string | Array<string>} paragraphs
   * @param {string} confirmText
   * @param {string} rejectText
   * @return {Promise<boolean>} 
   */
  Dialog.newConfirm = async function (title = "", paragraphs = [""], confirmText = "Yes", rejectText = "cancel") {
    let confirmDialog = document.createElement('confirm-dialog');
    confirmDialog.title = title;
    confirmDialog.paragraphs = paragraphs;
    confirmDialog.confirmText = confirmText;
    confirmDialog.rejectText = rejectText;

    return new Promise(resolve => {
      confirmDialog.addOnceListener('confirm', ()=>resolve(true));
      confirmDialog.addOnceListener('reject', ()=>resolve(false));

      Dialog.append(confirmDialog);
    })
  }
  /**
   * throw an error to user
   * @param {*} args 
   */
  Dialog.newError = function(...args) { // rest parameters cannot have a default initialiser
    let errorDialog = document.createElement('error-dialog')

    const { [args.length - 1]: lastParam, length: len } = args; // es6 shorthand syntax

    if(typeof lastParam === 'number'){
      if(!config.testMode)
        errorDialog.msToHide = lastParam;
      errorDialog.paragraphs = args.slice(0, len - 1)
    } else {
      errorDialog.paragraphs = args // when no param passed args will just be an empty array, without undefined in it
    }
    
    Dialog.append(errorDialog);
    console.warn.call(this, "NewError: ", errorDialog.paragraphs);
  };

  Dialog.addEventListener('dialogShow', () => {
    Array.from(document.querySelectorAll('button')).forEach(e => e.setAttribute("tabindex", "-1"))
  }) // 暂时如此

  Dialog.addEventListener('dialogHide', () => {
    Array.from(document.querySelectorAll('button')).forEach(e => e.removeAttribute("tabindex"))
  }) //FIX: the tabindex error of shadow root

  window.existsCookie = value => document.cookie.includes(value)
  /**
   * 设置cookie
   * @param {string} value no semicolon
   * @param {number} expireDays
   * @return {undefined} 
   */
  window.setCookie = (value, expireDays) => {
    const date = new Date();
    date.setTime(date.getTime() + Number(expireDays) * 86400000);
    if(location.protocol !== 'https:' && config.testMode)
      document.cookie = `${value}; expires=${date.toUTCString()}; HostOnly=true; path=/; SameSite=Strict;`;
    else 
      document.cookie = `${value}; expires=${date.toUTCString()}; HostOnly=true; Secure=true; path=/; SameSite=Strict;`;
  }
  window.toggleFullScreen = e => {
    if (!document.fullscreenElement) {
      e.requestFullscreen().catch(err => {
        Dialog.newError(`Error attempting to enable full-screen mode`, `${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  window.ThrottleLog = class {
    constructor (gap = 2000) {
      this.gap = gap;
    }
    log () {
      if(this.inQueue)
        return;
      else {
        const thisLog = Array.from(arguments).toString();
        if(thisLog === this.prLog) {
          if(!this.silent) {
            console.log("%cSame as previous log, staying slient.", "color: lightSkyBlue")
            this.silent = true;
          }
        } else {
          console.log.apply(window, arguments);
          this.silent = false;
          this.prLog = thisLog;
        }
        setTimeout(() => {
          this.inQueue = false;
        }, this.gap)
        this.inQueue = true;
      }
    }

    autoLog (func) {
      this.timer = setInterval(() => this.log(func()), this.gap + 1);
      return this;
    }

    stopAutoLog () {
      clearInterval(this.timer);
      return this;
    }
  }
}