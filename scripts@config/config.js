{
  // inner
  const fadeOutSpeedLevel = 4;

  // export
  const UseNewBasejs = false,
  
  TestMode = /test=1|debug/.test(location.search) ? true : false,

  ThemeColor = '#000', // used in , webmanifest

  BackgroundColor = '#f7d9aa', // used in index.html/meta-themeColor, style-background


  Version = '5.3.5' + '--dev', //NOTE: 添加功能后记得更改这个

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

  GameStartCallback = async () => { // asynchronous 异步的，非同时的
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
        fadeOut(1, .0013 * fadeOutSpeedLevel, loadSection)();
      }
      if(loader.hidden !== true){
        loader.style.willChange = "opacity";
        fadeOut(1, .0020 * fadeOutSpeedLevel, loader)();
      }
    }, config?.loading_timeOut ?? 400)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_Coalescing_Operator
    // fallback: window.config && config.loading_timeOut ? config.loading_timeOut : 400
  },

  RotationSpeed_Sea = .005,
  RotationSpeed_Sky = .01,
  NumOfCloudsInSky = 20,
  RotationSpeed_Propeller = .4

  ;

  // export default {
  window.config = {
      useNewBasejs: UseNewBasejs,
      testMode: TestMode,
      version: Version,
      cameraSetting: PerspectiveCameraSetting,
      getContainer: GetContainer,
      getUIContainer:  GetUIContainer,
      gameStartCallback: GameStartCallback,
      speed_sea: RotationSpeed_Sea,
      speed_sky: RotationSpeed_Sky,
      defaultPropellerSpeed: RotationSpeed_Propeller,
      numOfCloudsInSky: NumOfCloudsInSky,
      colors: {
        red: 0xf25346,
        white: 0xd8d0d1,
        brown: 0x59332e,
        pink: 0xF5986E,
        brownDark: 0x23190f,
        blue: 0x68c3c0,
      }
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
    set title (str = '') {
      this.#title.textContent = str
    }

    /**
     * @param {Array<string} arr
     */
    set paragraphs (arr = ['']) {
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
      Dialog.#busy = true;
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

    static #observer = document.createElement('i');

    static #busy = false;

    static get isBusy () {
      return Dialog.#busy;
    }

    static newEvent (name) {
      Dialog.#observer.dispatchEvent(new CustomEvent(name))
    }

    static addOnceListener (eventName, callback) {
      Dialog.#observer.addEventListener(eventName, callback, {passive: true, once: true})
    }

    static addEventListener (eventName, callback) {
      Dialog.#observer.addEventListener(eventName, callback, {passive: true})
    }

    static removeEventListener (eventName, callback) {
      Dialog.#observer.removeEventListener(eventName, callback)
    }
    /**
     * 向document添加dialog
     * @static
     * @param {Dialog} newDialog
     */
    // this.#observer.dataset.queue = [];
    // Note that the HTMLElement.dataset property is a DOMStringMap
    static #queue;
    static append (newDialog) {
      if(this.#queue === undefined){ // init
        this.#queue = [];
        this.addEventListener('dialogRemove', () => {
          if(this.#queue.length)
            document.body.append(this.#queue.shift())
        })
      }
      if(this.isBusy)
        this.#queue.push(newDialog)
      else document.body.append(newDialog)
    }
  }

  class MyConfirm extends Dialog {
    #confirmButton = null;
    #rejectButton = null;
    // not allowed to pass in any arguments into the constructor.
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
      // Dialog.prototype.show.call(this)
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
    set confirmText (str = 'Yes') {
      this.#confirmButton.textContent = str
    }
    /**
     * @param {string} str
     */
    set rejectText (str = 'cancel') {
      this.#rejectButton.textContent = str
    }
  }


  class MyError extends Dialog {
    #okButton = null;
    #msToHide = -1;
    
    // not allowed to pass in any arguments into the constructor.
    constructor() {
      super();
      this.#okButton = document.createElement('BUTTON');
      this.#okButton.part = 'error-button button';
      this.#okButton.innerText = 'OK';
      this.title = 'Oops, an error occurred.';
      // this.prototype.#title: Private field '#title' must be declared in an enclosing class 
    }
    show () {
      // console.assert(this.constructor.prototype.show !== this.show) // failed

      // this.constructor.prototype.__proto__.show.call(this)
      // Dialog.prototype.show.call(this)
      super.show();
      this.append(this.#okButton)
      this.#okButton.addEventListener('click', event => {
        this.hide();
        }, {passive: true, once: true})
      
      if(this.#msToHide > 0) {
        setTimeout(() => this.hide(), this.#msToHide);
        // setTimeout(this.hide, this.#msToHide); -- `this` will become the window obj
      }
    }
    /**
     * @param {number} num
     */
    set msToHide (num = 200) {
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
  Dialog.newConfirm = async function (title, paragraphs, confirmText, rejectText) {
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
  Dialog.newError = function(...args) {
    let errorDialog = document.createElement('error-dialog')

    let { [args.length - 1]: lastParam, length: len } = args; // reminder

    if(typeof lastParam === 'number'){
      if(!config.testMode)
        errorDialog.msToHide = lastParam;
      errorDialog.paragraphs = args.slice(0, len - 1)
    } else {
      errorDialog.paragraphs = args
    }
    
    Dialog.append(errorDialog);
    console.error.apply(this, arguments);
  };

  Dialog.addEventListener('dialogShow', () => {
    window.paused = true;
  })

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
}