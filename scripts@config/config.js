{
  // inner
  const fadeOutSpeedLevel = 4;

  // export
  const UseNewBasejs = false,
  
  TestMode = true,

  themeColor = '#000', // used in , webmanifest

  BackgroundColor = '#f7d9aa', // used in index.html/meta-themeColor, style-background


  Version = '1.2.0' + '--dev', //NOTE: 添加功能后记得更改这个

  PerspectiveCameraSetting = {
      fieldOfView: 60,
      aspectRatio: window.innerWidth / window.innerHeight,
      nearPlane: 1,
      farPlane: 10000
  },

  GetContainer = () => {
    return document.getElementById('canvas')
  },

  GameStartCallback = async () => { // asynchronous 异步的，非同时的
    /**
     * 渐隐目标对象
     * @param {*} currentOpacity 初始透明度
     * @param {*} reduction_num 每次执行改变的幅度
     * @param {*} per_ms 每隔多少毫秒执行一次。单位：毫秒
     * @param {*} reference 指向的对象
     */
    const fadeOut = (currentOpacity, reduction_num, per_ms, reference) => { 
      (reference.style.opacity = currentOpacity) < .1
      ? (reference.hidden = true) && (reference.style.willChange = 'auto')
      : setTimeout(() => fadeOut(currentOpacity - reduction_num, reduction_num, per_ms, reference), per_ms)
    }

    const loadSection = document.getElementById('loading-section');
    const loader = document.getElementById('loader');

    setTimeout(()=>{
      if(loadSection.hidden !== true){
        loadSection.style.willChange = "opacity";
        fadeOut(1, .02 * fadeOutSpeedLevel, 25 * fadeOutSpeedLevel, loadSection);
      }
      if(loader.hidden !== true){
        loader.style.willChange = "opacity";
        fadeOut(1, .03 * fadeOutSpeedLevel, 25 * fadeOutSpeedLevel, loader);
      }
    }, config?.loading_timeOut ?? 400)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_Coalescing_Operator
    // fallback: window.config && config.loading_timeOut ? config.loading_timeOut : 400
  },

  RotationSpeed_Sea = .005,
  RotationSpeed_Sky = .01

  ;

  // export default {
  window.config = {
      useNewBasejs: UseNewBasejs,
      testMode: TestMode,
      version: Version,
      cameraSetting: PerspectiveCameraSetting,
      getContainer: GetContainer,
      gameStartCallback: GameStartCallback,
      speed_sea: RotationSpeed_Sea,
      speed_sky: RotationSpeed_Sky
  }
}
/**
 * throw an error to user
 * @param {*} args 
 */
window.throwError = function(...args) {
  if(args[args.length - 1] === true)
    ; //TODO: errorlog's variable duration
  document.getElementById('show-error').removeAttribute('hidden')
  document.getElementById('errorLog').innerText = args.join('\n');
  console.error.apply(this, arguments);
};

{
  class MyConfirm extends HTMLElement {
    #confirmButton = null;
    #rejectButtom = null;
    #title = null;
    #paragraphs = null;
    // not allowed to pass in any arguments into the constructor.
    constructor() {
      super();
      this.#confirmButton = document.createElement('BUTTON');
      this.#confirmButton.classList.add('confirm-true-button');

      this.#rejectButtom = document.createElement('BUTTON');
      this.#rejectButtom.classList.add('confirm-false-button');

      this.#title = document.createElement('H3');
      this.#title.classList.add('confirm-title');

      this.#paragraphs = document.createElement('ARTICLE'); 
      this.#paragraphs.classList.add('confirm-body');
    }
    show () {
      this.attachShadow({mode: 'closed'}).append(this.#title, this.#paragraphs, this.#confirmButton, this.#rejectButtom)
      this.classList.add('active')

      this.#confirmButton.addEventListener('click', (event) => {
          console.info('Confirm: ' + this.#confirmButton.innerText)
          this.dispatchEvent(new CustomEvent("confirm", {}));
          this.hide();
        }, {passive: true, once: true})
      this.#rejectButtom.addEventListener('click', (event) => {
          console.info('Confirm: rejected')
          this.dispatchEvent(new CustomEvent("reject", {}));
          this.hide();
        }, {passive: true, once: true})
    }
    hide () {
      this.classList.remove('active');
      setTimeout(()=>this.remove(), 500);
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
      this.#rejectButtom.textContent = str
    }
    /**
     * @param {string} str
     */
    set title (str) {
      this.#title.textContent = str
    }
    /**
     * @param {Array<string} arr
     */
    set paragraphs (arr) {
      this.#paragraphs.innerHTML = arr.reduce((accumulator, newP) => {
        accumulator += `<p class="confirm-paragraphs">${newP}</p>`
      })
      // Failed to set the 'outerHTML' property on 'Element': This element's parent is of type '#document-fragment', which is not an element node.
    }   
    connectedCallback() {
      this.show();
    }
    disconnectedCallback() {
      this.dispatchEvent(new CustomEvent("hide", {}))
    }
  }
  window.customElements.define('confirm-dialog', MyConfirm);

  /**
   * display a self defined confirm dialog other than browser's default
   * @param {string} title 
   * @param {Array<string>} paragraphs
   * @param {string} confirmText
   * @param {string} rejectText
   * @return {Promise<boolean>} 
   */
  window.newConfirm = async function (title, paragraphs, confirmText, rejectText) {
    let confirm = document.getElementsByTagName('confirm-dialog')[0]; //检查是否已存在

    let newConfirm = document.createElement('confirm-dialog');
    newConfirm.title = title;
    newConfirm.paragraphs = paragraphs;
    newConfirm.confirmText = confirmText;
    newConfirm.rejectText = rejectText;

    return new Promise(resolve => {
      newConfirm.addEventListener('confirm', ()=>resolve(true), {passive: true, once: true});
      newConfirm.addEventListener('reject', ()=>resolve(false), {passive: true, once: true});

      if(confirm) // 已存在
        confirm.addEventListener('hide', () => {
          confirm = null;
          document.body.append(newConfirm);
        })
      else document.body.append(newConfirm);
    })
  }
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
    document.cookie = `${value}; expires=${date.toUTCString()}; HostOnly=true; path=/; SameSite=Strict;`;
    // ' Secure=true;
  }
}