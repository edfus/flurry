class ButtonHandler {
  constructor(keyCode, domElement) {
    this.keyCode = keyCode;
    this._toListen = domElement;
    if(this.keyCode) {
      this.onkeydown = this.onkeydownPrototype.bind(this, false);
      this.onkeydownOnce = this.onkeydownPrototype.bind(this, true);
    }
  }

  onclick = () => {
    this._callbackArr = this._callbackArr.filter(
      ({callback, once}) => {
        callback.call(this);
        return !once;
    });
  };

  listenOnce = () => {
    this._toListen.addEventListener("click", this.onclick, {passive: true, once: true});
    if(this.keyCode)
      document.addEventListener("keydown", this.onkeydownOnce, {passive: true});
  }
  listen = () => {
    this._toListen.addEventListener("click", this.onclick, {passive: true});
    if(this.keyCode)
      document.addEventListener("keydown", this.onkeydown, {passive: true});
  }
  
  _callbackArr = [];
  addTriggerCallback = (callback, {once: once = false}) => {
    this._callbackArr.push({callback, once})
    return this;
  }
  removeCallback = (callbackToRemove, {once: isOnceEvent = false}) => {
    for(let i = this._callbackArr.length - 1; i >= 0; i--) {
      if(callbackToRemove === this._callbackArr[i].callback
        && isOnceEvent === this._callbackArr[i].once) {
          this._callbackArr.splice(i, 1);
      }
    }
  }

  addTo(obj) {
    Object.entries(this).forEach(([key, value]) => {
      obj[key] = value;
    })
    return obj;
  }
  onkeydownPrototype (once, event) {
    if(event.code === this.keyCode) {
      this._callbackArr = this._callbackArr.filter(
        ({callback, once}) => {
          callback.call(this);
          return !once;
      });
      if(once)
        document.removeEventListener("keydown", this.onkeydown);
    }
  }

  static fadeOut(domElement) {
    if(domElement.classList.contains("fade-out"))
      return Promise.reject("High frequency.");
    domElement.classList.add("fade-out");
    return new Promise(resolve => {
      domElement.addEventListener("animationend", () => {
        domElement.style.display = 'none';
        domElement.classList.remove("fade-out");
        resolve()
      }, {passive: true, once: true})
    })
  }
  static fadeIn(domElement) {
    if(domElement.classList.contains("fade-in"))
      return Promise.reject("High frequency.");
    domElement.style.opacity = 0;
    domElement.style.display = 'block';
    domElement.classList.add("fade-in");
    return new Promise(resolve => {
      domElement.addEventListener("animationend", () => {
        domElement.style.opacity = 1;
        domElement.classList.remove("fade-in");
        resolve();
      }, {passive: true, once: true})
    })
  }
}

class UserInteraction {
  absolutePos = {}; // init in constructor func
  
  isTouchDevice = false;

  #windowHeight = 0;
  #windowWidth  = 0;

  canvas2D = Canvas2D.emptyCanvas; // hacky LOL

  constructor() {
    this.isTouchDevice = this.testTouchDevice();

    this.#windowHeight = window.innerHeight;
    this.#windowWidth = window.innerWidth;

    if(this.isTouchDevice || config.testMode) {
      this.canvas2D = new Canvas2D(this.WIDTH, this.HEIGHT);
      this.addResizeCallback(() => this.canvas2D.setSize(this.WIDTH, this.HEIGHT))
    }
    this.listenResize();
    this.listenUnload();

    let x = this.WIDTH / 2, y = this.HEIGHT / 2;
    // this.addResizeCallback((prHEIGHT, prWIDTH) => {}) 
    Object.defineProperties(this.absolutePos, {
      x: {
        get() {
          return x;
        },
        set: value => {
          if(value < 0)
            x = 0;
          else if(value >= this.WIDTH)
            x = this.WIDTH;
          else x = value;
        }
      },
      y: {
        get() {
          return y;
        },
        set: value => {
          if(value < 0)
            y = 0;
          else if(value >= this.HEIGHT)
            y = this.HEIGHT;
          else y = value;
        }
      }
    })
  }

  initButtons () {
    this.pauseButton = {
      domElement: document.querySelector(".ui-button.pause"),
      hide () {
        return ButtonHandler.fadeOut(this.domElement)
      },
      show () {
        return ButtonHandler.fadeIn(this.domElement);
      }
    };
    this.startButton = {
      broad: document.getElementById("start-button"),
      concise: document.getElementById("start-button--ring"),
      hide () {
        return ButtonHandler.fadeOut(this.broad)
      },
      show () {
        return ButtonHandler.fadeIn(this.broad);
      }
    }

    new ButtonHandler("KeyP", this.pauseButton.domElement).addTo(this.pauseButton);
    new ButtonHandler("Space", this.startButton.concise).addTo(this.startButton);

    this.titleMenuButtons= {
      elements: Array.from(document.querySelectorAll(".ui-button.title-menu")),
      hide () {
        return Promise.allSettled(this.elements.map(e => ButtonHandler.fadeOut(e)))
      },
      show () {
        return Promise.allSettled(this.elements.map(e => ButtonHandler.fadeIn(e)))
      }
    }
    this.refreshButton = {
      domElement: document.querySelector(".ui-button.refresh")
    }
    new ButtonHandler(null, this.refreshButton.domElement)
      .addTo(this.refreshButton)
      .addTriggerCallback(() => {
        const svg = this.refreshButton.domElement.querySelector(".simo")
        if(!svg.classList.contains("show")) {
          svg.classList.add("show");
          this.refreshButton.domElement.addEventListener("animationend", () => {
            location.hash = "#reload"
            location.reload()
          },{passive: true, once: true})
        }
      }, {once: false})
      .listen();
  }

  get relativePos () {
    return this.updateRelativePos();
  }

  get HEIGHT () {
    return this.#windowHeight;
  }

  get WIDTH () {
    return this.#windowWidth;
  }

  #relativePos = { x: 0, y: 0 };
  #frozen = false;
  updateRelativePos (x = this.absolutePos.x, y = this.absolutePos.y) {
    if(this.#frozen)
      return this.#relativePos;
    this.#relativePos.x = -1 + (x / this.WIDTH) * 2;
    this.#relativePos.y = 1 - (y / this.HEIGHT) * 2;
    return this.#relativePos;
  }

  freeze () {
    const frozenAboslutePos = {...this.absolutePos}; // shallow
    // Object.freeze(this.absolutePos);
    this.unfreeze = function () {
      this.absolutePos = frozenAboslutePos;
      this.#frozen = false;
      delete this.unfreeze;
    }
    this.#frozen = true;
  }

  testTouchDevice () {
    if ("ontouchstart" in window) 
      return true;
    else return false;
    // Modernizr's way isn't working (^^;)
  }

  addListeners () {
    if(this.isTouchDevice)
      this._addListeners("touch", ['start', 'move', 'end'])
    else {
      this._addListeners("mouse", ['move', 'leave'])
      if(!this.codeHandler.hasOwnProperty("mapAdded")){
        this.codeHandler.addMapping(this.codeMap);
        this.codeHandler.updateDistance();
        this.addResizeCallback(() => this.codeHandler.updateDistance())
      }
      this._addListeners("key", ['down', 'up'])
    }
  }

  removeListeners () {
    if(this.isTouchDevice)
      this._removeListeners("touch", ['start', 'move', 'end'])
    else {
      this._removeListeners("mouse", ['move', 'leave'])
      this._removeListeners("key", ['down', 'up'])
    }
  }

 /**
  * If the browser fires both touch and mouse events because of a single user input, 
  * the browser must fire a touchstart before any mouse events. 
  * Consequently, if an application does not want mouse events fired on a specific touch target element, 
  * the element's touch event handlers should call preventDefault() and no additional mouse events will be dispatched.
  */

  _addListeners (identifier, namesArray) {
    namesArray.forEach(name => 
      document.addEventListener(identifier.concat(name), this[`${identifier}_${name}Callback`], {passive: true})
    )
  }

  _removeListeners (identifier, namesArray) {
    namesArray.forEach(name => 
      document.removeEventListener(identifier.concat(name), this[`${identifier}_${name}Callback`])
    )
  }

  /* callbacks */
  touch_startCallback = event => {
    for (const touch of event.touches) {
      this.canvas2D.createLine(touch.pageX, touch.pageY, touch.identifier)
    }
  }

  touch_moveCallback  = event => {
    let x = 0, y = 0;
    for (const {pageX, pageY} of event.touches) {
      x += pageX;
      y += pageY;
    }
    this.absolutePos.x = x / event.touches.length;
    this.absolutePos.y = y / event.touches.length;

    for (const touch of event.changedTouches) {
      this.canvas2D.pushPoint(touch.pageX, touch.pageY, touch.identifier)
    } // Is touchmove event fire once in per frame? macrotasks queue necessary?
  }

  touch_endCallback = event => {
    for (const touch of event.changedTouches) {
      this.canvas2D.endLine(touch.identifier)
    }
  }
  // touchcancel is fired whenever it takes ~200 ms to return from a touchmove event handler.

  #mouseMove_triggered = false;
  mouse_moveCallback = event => {
    this.absolutePos.x = event.clientX;
    this.absolutePos.y = event.clientY;

    if(this.#mouseMove_triggered)
      this.canvas2D.pushPoint(event.clientX, event.clientY, 0); // 0 - identifier of this touch
    else {
      this.canvas2D.createLine(event.clientX, event.clientY, 0);
      this.#mouseMove_triggered = true;
    }
  }

  mouse_leaveCallback = () => {
    this.#mouseMove_triggered = false;
    this.canvas2D.endLine(0);
  }
  codeHandler = {
    addMapping (codeMap) {
      Object.entries(codeMap)
            .forEach(([key, arr]) => {
              const func = function () {
                return this[key]();
              }
              for(const code of arr)
                this[code] = func;
            });
    },
    invoke: (ui => {
      return function (func) {
        func.call(this, ui);
      }
    })(this),
    distance: 100,
    updateDistance () {
      this.invoke(ui => {
        this.distance = Math.min(ui.HEIGHT, ui.WIDTH) / 12
      })
    },
    ArrowUp () { 
      this.invoke(ui => {
        ui.absolutePos.y -= this.distance
      })
    },
    ArrowDown () { 
      this.invoke(ui => {
        ui.absolutePos.y += this.distance
      })
    },
    ArrowLeft () { 
      this.invoke(ui => {
        ui.absolutePos.x -= this.distance
      })
    },
    ArrowRight () { 
      this.invoke(ui => {
        ui.absolutePos.x += this.distance
      })
    }
  }

  codeMap = {
    ArrowUp: ['KeyW', 'Numpad5'],
    ArrowDown: ['KeyS', 'Numpad2'],
    ArrowLeft: ['KeyA', 'Numpad1'],
    ArrowRight: ['KeyD', 'Numpad3']
  }

  key_downCallback = event => {
    if(this.codeHandler.hasOwnProperty(event.code))
      this.codeHandler[event.code]();
  }

  key_upCallback = event => {
     ;
  }
  /* callbacks END */

  #resizeCallbackQueue = [
    () => { // default
      this.#windowHeight = window.innerHeight;
      this.#windowWidth = window.innerWidth;
    }
  ];

  addResizeCallback (func) {
    this.#resizeCallbackQueue.push(func);
  }

  listenResize () {
    window.addEventListener('resize', () => this.#resizeCallbackQueue.forEach(e => e()), {passive: true});
  }
  //this.#resizeCallback(); // [Violation] 'load' handler took 156ms
  // return this.#resizeCallback_debounce();  // [Violation] 'setTimeout' handler took 51ms
  // in 2020 debounce on resize event still worthy?

  #unloadCallbackQueue = [];
  addUnloadCallback (func) {
    this.#unloadCallbackQueue.push(func);
  }

  listenUnload () {
    window.addEventListener('beforeunload', () => this.#unloadCallbackQueue.forEach(e => e()), {passive: true, once: true})
  }
}


class Canvas2D {
  #canvas = null;
  #context = null;
  #paths_obj = {};

  fadeOutSpeed = .04;
  initialOpacity = .8;

  constructor (width, height) {
    this.#canvas = document.createElement('canvas');

    this.#canvas.width = width;
    this.#canvas.height = height;

    this.defaultLineWidth = Math.min(width, height) / 100;
    this.narrowDownSpeed = this.defaultLineWidth / this.initialOpacity * this.fadeOutSpeed;

    this.#context = this.#canvas.getContext('2d');

    this.setStyle();

    Object.defineProperty(this.#paths_obj, 'empty', {
      value: true,
      writable: true
    });
  }

  alpha = function (alpha) { // can be changed, not in prototype
    return `rgba(192, 192, 192, ${alpha})`
  }

  setStyle = function () {
    this.#context.shadowColor = this.alpha(.4);
    this.#context.shadowBlur = 6;

    this.#context.lineWidth = this.defaultLineWidth;
    // this.#context.lineJoin = this.#context.lineCap = 'round';
  }

  get domElement () {
    return this.#canvas;
  }

  /**
   * construct a new line object
   * @param {number} identifier
   * @return {TouchPath} new line object
   */
  createNewTouchPath (identifier) {
    let newPath = {
      segments: [],
      last_i: 0,
      path: new Path2D()
    }
    newPath.segments.push(this.newPathSegment(newPath))

    this.#paths_obj[identifier] = newPath;
    this.#paths_obj.empty = false;
    return newPath;
  }
  /**
   * @param {TouchPath} path
   * @return {TouchPathSegment} new line object
   */
  newPathSegment (path_obj) {
    let newSegment = {
      path: new Path2D(),
      opacity: this.initialOpacity,
      lineWidth: this.defaultLineWidth
    }
    
    path_obj.path.addPath(newSegment.path)
    return newSegment;
  } // this[#TouchPathSegment] is not a constructor - can't use class method as a constructor

  createLine (startX, startY, identifier) {
    let path = this.createNewTouchPath(identifier);

    path.segments[0].path.moveTo(startX, startY);
    path.path.moveTo(startX, startY);
  }

  endLine (identifier) {
    Object.defineProperty(this.#paths_obj[identifier], 'end', {
      value: true
    });
  }

  pushPoint (x, y, identifier) {
    let path = this.#paths_obj[identifier];
    let i = path.last_i;

    path.segments[i].path.lineTo(x, y);
    // quadraticCurveTo(x, y, midPoint.x, midPoint.y)
    // http://perfectionkills.com/exploring-canvas-drawing-techniques/
    path.segments.push(this.newPathSegment(path));
    path.segments[i + 1].path.moveTo(x, y);

    path.last_i = i + 1;
  }

  paint () {
    if(this.#paths_obj.empty)
      return ;
    this.clear();
    for(const [identifier, path] of Object.entries(this.#paths_obj)) {
      if(path.last_i === 0) // newly created by touchstart
        continue;

      let i_toRemove = -1;

      for(let i = 0; i < path.last_i; i++) { // last segment will not be processed
        let segment = path.segments[i];
        segment.opacity -= this.fadeOutSpeed;
        segment.lineWidth -= this.narrowDownSpeed;
        this.#context.strokeStyle = this.alpha(segment.opacity);
        this.#context.lineWidth = segment.lineWidth;
        this.#context.stroke(segment.path);

        if(segment.opacity <= this.fadeOutSpeed){
          i_toRemove = i;
        }
      }

      i_toRemove++; // if -1, then 0, no effect

      path.segments.splice(0, i_toRemove);
      path.last_i -= i_toRemove;
      if(path.last_i <= 1 && path.end) {
        delete this.#paths_obj[identifier];
        this.#paths_obj.empty = this.isEmpty(this.#paths_obj);
      }
    }
  }

  isEmpty (obj) {
    for (const whateverEnumerable in obj) {
      return false;
    }
    return true;
  }

  setSize (width, height) {
    this.#canvas.width = width;
    this.#canvas.height = height;
  } // 高宽改变时，画布内容会被清空，需要重新绘制

  clear () {
    this.#context.clearRect(0, 0, this.#canvas.width, this.#canvas.height); // fillRect
    // Another elegant option is to set the 'globalCompositeOperation' to 'xor' and paint you line again....so it will be removed
  }

  static get emptyCanvas () {
    return {
      createLine () {
        ;
      },
      endLine () {
        ;
      },
      pushPoint () {
        ;
      },
      paint () {
        ;
      },
      get domElement () {
        return '';
      }
    }
  }
}

export default UserInteraction;