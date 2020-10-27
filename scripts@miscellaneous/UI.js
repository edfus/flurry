import { Event , CallbackHandler } from './EventDispatcher.js'
class ButtonHandler {
  constructor(keyCode, domElement) {
    this.keyCode = keyCode;
    this._toListen = domElement;
    if(this.keyCode) {
      this.onkeydown = this.onkeydownPrototype.bind(this, false);
      this.onkeydownOnce = this.onkeydownPrototype.bind(this, true);
    }
    this.onclick = this.onclickPrototype.bind(this, false);
    this.onclickOnce = this.onclickPrototype.bind(this, true);

    this._listener = new CallbackHandler();
  }

  listenOnce = () => {
    this._toListen.addEventListener("click", this.onclickOnce, {passive: true, once: true});
    if(this.keyCode)
      document.addEventListener("keydown", this.onkeydownOnce, {passive: true});
    return this;
  }

  addTriggerCallback = (callback, options) => {
    this._listener.addCallback(callback, options)
    return this;
  }

  removeCallback = (callback, options) => {
    this._listener.removeCallback(callback, options);
    return this;
  }

  addTo(obj) {
    Object.entries(this).forEach(([key, value]) => {
      obj[key] = value;
    })
    return obj;
  }

  onclickPrototype (once) {
    this._listener.trigger();
    if(once) {
      document.removeEventListener("keydown", this.onkeydownOnce);
    }
  }

  onkeydownPrototype (once, event) {
    if(event.code === this.keyCode) {
      this._listener.trigger();
      if(once) {
        document.removeEventListener("keydown", this.onkeydownOnce);
        document.removeEventListener("click", this.onclickOnce, {once: true});
      }
    }
  }
  /**
   * @param {HTMLElement} domElement 
   * @param {Boolean | undefined} reflow should DOM reflow or not
   * @return {Promise}
   */
  static fadeOut(domElement, reflow = true) {
    if(domElement.classList.contains("fade-out"))
      return Promise.reject("High frequency.");
    domElement.classList.add("fade-out");
    return new Promise(resolve => {
      domElement.addEventListener("animationend", () => {
        if(reflow)
          domElement.style.display = 'none';
        domElement.style.opacity = 0;
        domElement.classList.remove("fade-out");
        resolve()
      }, {passive: true, once: true})
    })
  }
  /**
   * @param {HTMLElement} domElement 
   * @param {number | undefined} seconds seconds to fade out
   * @return {Promise}
   */
  static fadeIn(domElement, seconds) {
    if(domElement.classList.contains("fade-in"))
      return Promise.reject("High frequency.");
    domElement.style.opacity = 0;
    domElement.style.display = 'block';
    if(seconds)
      domElement.style.animation = `fade-in ${seconds}s ease 1`
    else domElement.classList.add("fade-in");
    return new Promise(resolve => {
      domElement.addEventListener("animationend", () => {
        domElement.style.opacity = 1;
        if(seconds)
          domElement.style.removeProperty('animation');
        else domElement.classList.remove("fade-in");
        resolve();
      }, {passive: true, once: true})
    })
  }
}
const eventWeakMap = new WeakMap();
class UserInteraction {
  absolutePos = {
    x: 0,
    y: 0
  };
  
  isTouchDevice = false;

  #windowHeight = 0;
  #windowWidth  = 0;

  canvas2D = Canvas2D.emptyCanvas; // hacky LOL

  constructor() {
    this.isTouchDevice = this.testTouchDevice();

    this.event = new Event();
    eventWeakMap.set(this.event, event => this.event.dispatch(event.type, event));

    this.#windowHeight = window.innerHeight;
    this.#windowWidth = window.innerWidth;

    this.event.addListener("resize", () => {
      this.#windowHeight = window.innerHeight;
      this.#windowWidth = window.innerWidth;
    })

    if(this.isTouchDevice || config.testMode) {
      this.canvas2D = new Canvas2D(this.WIDTH, this.HEIGHT);
      this.event.addListener("resize", () => this.canvas2D.setSize(this.WIDTH, this.HEIGHT))
    }
    this.bindCallbacks();
    this.listenResize();
    this.listenUnload();
  }

  _debugEvents () {
    const excludedEvents = ["mousemove"]
    const excludedFuncs = []

    const tempPtr = this.event;
    // tempPtr.addListener("newEvent", log)

    let _log1 = new ThrottleLog(300),
        _log2 = new ThrottleLog(300),
        _log3 = new ThrottleLog(300);
        _log1 = _log1.log.bind(_log1);
        _log2 = _log2.log.bind(_log2);
        _log3 = _log3.log.bind(_log3);
    const log = console.log.bind(console);
     
    const funcTrap = {
      apply (target, thisArg, argsList) {
        if(!excludedEvents.includes(argsList[0]))
          log(argsList)
        return Reflect.apply(target, tempPtr, argsList)
      }
    }

    this.event = new Proxy(tempPtr, {
      get (target, prop) {
        const targetProp = Reflect.get(target, prop);
        if(typeof targetProp === "function")
          if(excludedFuncs.includes(targetProp.name))
            return targetProp.bind(target)
          else return new Proxy(targetProp, funcTrap)
          // return log(targetProp.name) || new Proxy(targetProp, funcTrap)
        else return targetProp;
      }
    });

    eventWeakMap.set(this.event, event => this.event.dispatch(event.type, event))
  }

  initButtons () {
    this.homeButton = {
      domElement: document.querySelector(".ui-button.home"),
      hide () {
        this.hidden = true;
        return ButtonHandler.fadeOut(this.domElement)
      },
      show () {
        this.hidden = false;
        return ButtonHandler.fadeIn(this.domElement);
      },
      hidden: true
    };
    this.pauseButton = {
      domElement: document.querySelector(".ui-button.pause"),
      repel: this.homeButton,
      hide (reflow = false) {
        this.repel.show()
        return ButtonHandler.fadeOut(this.domElement, reflow)
      },
      show () {
        if(this.repel.hidden === false) {
          this.repel.hide();
        }
        return ButtonHandler.fadeIn(this.domElement); 
      }
    };

    this.startButton = {
      broad: document.getElementById("start-button"),
      concise: document.getElementById("start-button--ring"),
      async hide () {
        return ButtonHandler.fadeOut(this.broad)
      },
      async show () {
        return ButtonHandler.fadeIn(this.broad, .6);
      }
    }

    new ButtonHandler("KeyH", this.homeButton.domElement).addTo(this.homeButton);
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
      .listenOnce();
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
        this.codeHandler.updateDistanceConstant();
        this.event.addListener("resize", () => this.codeHandler.updateDistanceConstant())
      }
      this._addListeners("key", ['down'])
    }
  }

  removeListeners () {
    if(this.isTouchDevice)
      this._removeListeners("touch", ['start', 'move', 'end'])
    else {
      this._removeListeners("mouse", ['move', 'leave'])
      this._removeListeners("key", ['down'])
    }
  }

 /**
  * If the browser fires both touch and mouse events because of a single user input, 
  * the browser must fire a touchstart before any mouse events. 
  * Consequently, if an application does not want mouse events fired on a specific touch target element, 
  * the element's touch event handlers should call preventDefault() and no additional mouse events will be dispatched.
  */

  _addListeners (identifier, namesArray) {
    const callback = eventWeakMap.get(this.event);
    namesArray.forEach(name => 
      document.addEventListener(identifier.concat(name), callback, {passive: true})
    )
  }

  _removeListeners (identifier, namesArray) {
    const callback = eventWeakMap.get(this.event);
    namesArray.forEach(name => 
      document.removeEventListener(identifier.concat(name), callback)
    )
  }
  
  /* callbacks */
  bindCallbacks () {
    this.event.addListener("touchstart", event => {
      for (const touch of event.touches) {
        this.canvas2D.createLine(touch.pageX, touch.pageY, touch.identifier)
      }
    })

    this.event.addListener("touchmove", event => {
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
    })

    this.event.addListener("touchend", event => {
      for (const touch of event.changedTouches) {
        this.canvas2D.endLine(touch.identifier)
      }
    })
    // touchcancel is fired whenever it takes ~200 ms to return from a touchmove event handler.

    let mouseMove_triggered = false;
    this.event.addListener("mousemove", event => {
      this.absolutePos.x = event.clientX;
      this.absolutePos.y = event.clientY;
  
      if(mouseMove_triggered)
        this.canvas2D.pushPoint(event.clientX, event.clientY, 0); // 0 - identifier of this touch
      else {
        this.canvas2D.createLine(event.clientX, event.clientY, 0);
        mouseMove_triggered = true;
      }
    })

    this.event.addListener("mouseleave", () => {
      mouseMove_triggered = false;
      this.canvas2D.endLine(0);
    })

    this.event.addListener("keydown", event => {
      if(this.codeHandler.hasOwnProperty(event.code))
        this.codeHandler[event.code]();
    })
  }

  codeMap = {
    ArrowUp: ['KeyW', 'Numpad5'],
    ArrowDown: ['KeyS', 'Numpad2'],
    ArrowLeft: ['KeyA', 'Numpad1'],
    ArrowRight: ['KeyD', 'Numpad3']
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
    position: new Proxy(this.absolutePos, {
      set: (target, prop, value) => {
        value < 0 
        ? value = 0
        : prop === "x"
          ? value > this.WIDTH && (value = this.WIDTH) // x
          : value > this.HEIGHT && (value = this.HEIGHT) // y

        return Reflect.set(target, prop, value);
      }
    }),
    invoke: (ui => {
      return function (func) {
        func.call(this, ui);
      }
    })(this),
    distance: 100,
    updateDistanceConstant () {
      this.invoke(ui => {
        this.distance = Math.min(ui.HEIGHT, ui.WIDTH) / 12
      })
    },
    ArrowUp () { 
      this.position.y -= this.distance
    },
    ArrowDown () { 
      this.position.y += this.distance
    },
    ArrowLeft () { 
      this.position.x -= this.distance
    },
    ArrowRight () { 
      this.position.x += this.distance
    }
  }
  /* callbacks END */

  listenResize () {
    const callback = eventWeakMap.get(this.event)
    window.addEventListener('resize', callback, {passive: true});
  }
  //this.#resizeCallback(); // [Violation] 'load' handler took 156ms
  // return this.#resizeCallback_debounce();  // [Violation] 'setTimeout' handler took 51ms
  // in 2020 debounce on resize event still worthy?

  listenUnload () {
    const callback = eventWeakMap.get(this.event)
    window.addEventListener('beforeunload', callback, {passive: true, once: true})
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