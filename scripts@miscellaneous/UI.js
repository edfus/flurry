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

  reset = () => {
    this._listener.reset();
    this._listener.removeListener();
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
  
  removeListener = () => {
    document.removeEventListener("keydown", this.onkeydownOnce);
    document.removeEventListener("click", this.onclickOnce, {once: true});
  }

  onclickPrototype (once) {
    this._listener.trigger();
    once ? this.removeListener() : void 0;
  }

  onkeydownPrototype (once, event) {
    if(event.code === this.keyCode) {
      this._listener.trigger();
      once ? this.removeListener() : void 0;
    }
  }
  static _newPromiseListener (domElement, func, measureNeeded = false) {
    return new Promise(resolve => {
      let listenerTriggered = false;
      const callback = () => (listenerTriggered = true) && resolve(func()) 
      domElement.addEventListener("animationend", callback, {passive: true, once: true});
      if(measureNeeded)
      setTimeout(() => {
        if(!listenerTriggered) {
          domElement.removeEventListener("animationend", callback, {once: true});
          callback();
        } //TODO
      }, 1000)

    })
  }
  /**
   * @param {HTMLElement} domElement 
   * @param {Boolean | undefined} reflow should DOM reflow or not
   * @return {Promise}
   */
  static fadeOut(domElement, reflow = true) {
    const exec = () => {
      domElement.classList.add("fade-out");
      return this._newPromiseListener(domElement, () => {
        if(!domElement.dataset.cancelNextReset) { 
          if(reflow)
            domElement.style.display = 'none';
          domElement.style.opacity = 0;
        } else {
          domElement.dataset.cancelNextReset = ''
        }
        domElement.classList.remove("fade-out");
      })
    }

    if(domElement.classList.contains("fade-out"))
      return Promise.reject("High frequency.");
    else if(domElement.classList.contains("fade-in") || domElement.style.animation.includes("fade-in")) {
      return this._newPromiseListener(domElement, () => exec())
    } else {
      return exec();
    }
  }
  /**
   * @param {HTMLElement} domElement 
   * @param {number | undefined} seconds seconds to fade out
   * @return {Promise}
   */
  static fadeIn(domElement, seconds) {
    const exec = () => {
      domElement.style.opacity = 0;
      domElement.style.display = 'block';
      if(seconds)
        domElement.style.animation = `fade-in ${seconds}s ease 1`
      else domElement.classList.add("fade-in");
      return this._newPromiseListener(domElement, () => {
        domElement.style.opacity = 1;
        domElement.style.display = 'block';
        if(seconds)
          domElement.style.removeProperty('animation');
        else domElement.classList.remove("fade-in");
      })
    }

    if(domElement.classList.contains("fade-in"))
      return Promise.reject("High frequency.");
    else if (domElement.classList.contains("fade-out")) {
      domElement.dataset.cancelNextReset = "true"; 
      return this._newPromiseListener(domElement, () => exec(), true);
    } else {
      return exec();
    }
  }
}
const eventWeakMap = new WeakMap();
class UserInteraction {
  isTouchDevice = false;

  canvas2D = Canvas2D.emptyCanvas;

  constructor() {
    this.isTouchDevice = this.testTouchDevice();

    this.event = new Event();
    eventWeakMap.set(this.event, event => this.event.dispatch(event.type, event));

    this.HEIGHT = window.innerHeight;
    this.WIDTH = window.innerWidth;
    this.half_H = this.HEIGHT / 2;
    this.half_W = this.WIDTH / 2;
    this.target.init();

    this.event.addListener("resize", () => {
      this.HEIGHT = window.innerHeight;
      this.WIDTH = window.innerWidth;
      this.half_H = this.HEIGHT / 2;
      this.half_W = this.WIDTH / 2;
      this.target.init();
    })

    if(this.isTouchDevice) {
      this.canvas2D = new Canvas2D(this.WIDTH, this.HEIGHT);
      this.event.addListener("resize", () => this.canvas2D.setSize(this.WIDTH, this.HEIGHT))
    }
    this.bindCallbacks();
    this.listenResize();
    this.listenUnload();
  }

  _debugEvents () {
    const excludedEvents = ["mousemove", "mouseleave", "keydown"]
    const excludedFuncs = []

    const tempPtr = this.event;
    
    let _log1 = new ThrottleLog(300),
        _log2 = new ThrottleLog(300),
        _log3 = new ThrottleLog(300);
        _log1 = _log1.log.bind(_log1);
        _log2 = _log2.log.bind(_log2);
        _log3 = _log3.log.bind(_log3);
    const log = console.log.bind(console);
    new ThrottleLog(500).autoLog(() => `target.raw: (x: ${this.target.raw[0].x}, y: ${this.target.raw[0].y})\n(x: ${this.target.raw[1].x}, y: ${this.target.raw[1].y})
    fingesPos: (x: ${this.fingersPos[0].x}, y: ${this.fingersPos[0].y})\n(x: ${this.fingersPos[1].x}, y: ${this.fingersPos[1].y})`)
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

    this.titleMenuButtons = {
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

  resetButtonListeners () {
    this.homeButton.reset();
    this.pauseButton.reset();
    this.startButton.reset();
  }

  #frozen = false; //TODO

  freeze () { //TODO
    this.fingersPos.clear();
    this.target.clear()

    this.unfreeze = function () {
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
        this.codeHandler.init();
        this.event.addListener("resize", () => {
          this.codeHandler.init();
        })
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

  fingersPos = {
    ui: this,
    0: {
      x: 0, y: 0,
    },
    1: {
      x: 0, y: 0
    },
    reset () {
      this[0].x = this[1].x = this[0].y = this[1].y = 0;
    },
    clear () {
      this[0].y = this[1].y = (this[0].y + this[1].y) / 2;
      this.ui.target.update();
      this._identifierMap = {};
    },
    _identifierMap: {},
    hasId(id) {
      return id in this._identifierMap
    },
    getId (id) {
      return this[this._identifierMap[id]];
    },
    create (index, {identifier, pageX, pageY}) {
      this._identifierMap[identifier] = index;
      this[index].x = this.updateX(pageX)
      this[index].y = this.updateX(pageY)
    },
    updateX: x => {
      return 1 - x / this.half_W;
    },
    updateY: y => {
      return -1 + y / this.half_H;
    },
    update (ptr, x, y) {
      ptr.x = this.updateX(x)
      ptr.y = this.updateX(y)
    }
  }

  target = {
    ui: this,
    raw: [
      {x: 0, y: 0},
      {x: 0, y: 0}
    ],
    average: {
      x: 0,
      y: 0
    },
    sum: {
      x: 0,
      y: 0
    },
    origin: {
      x: 0,
      y: 0
    },
    update () {
      if(this.ui.#frozen)
       return ; //TODO 把position_min, position_max改为与屏幕宽高相关
      this.raw[0].x = this.normalize(this.ui.fingersPos[0].x, -1, 1, this.X_MIN, this.X_MAX);
      this.raw[0].y = this.normalize(this.ui.fingersPos[0].y, -1, 1, this.Y_MIN, this.Y_MAX);
      this.raw[1].x = this.normalize(this.ui.fingersPos[1].x, -1, 1, this.X_MIN, this.X_MAX);
      this.raw[1].y = this.normalize(this.ui.fingersPos[1].y, -1, 1, this.Y_MIN, this.Y_MAX);
      this.sum.x = this.raw[0].x + this.raw[1].x;
      this.sum.y = this.raw[0].y + this.raw[1].y;
      this.average.x = this.sum.x / 2;
      this.average.y = this.sum.y / 2;
    },
    normalize (mouseRP, mouseRP_min, mouseRP_max, position_min, position_max) {
      let mouseRPinBox = Math.max(Math.min(mouseRP, mouseRP_max), mouseRP_min);
      let mouseRPrange = mouseRP_max - mouseRP_min;
      let ratio = (mouseRPinBox - mouseRP_min) / mouseRPrange;
      let positionRange = position_max - position_min;
      return position_min + (ratio * positionRange);
    },
    setOrigin ({x, y}) {
      this.origin.x = x;
      this.origin.y = y;
      this.clear();
    },
    clear () {
      this.average.x = this.raw[0].x = this.raw[1].x = this.raw[0].x = this.raw[1].x = this.origin.x;
      this.average.y = this.raw[0].y = this.raw[1].y = this.raw[0].y = this.raw[1].y = this.origin.y;
      this.sum.x = this.average.x * 2;
      this.sum.y = this.average.y * 2;
    },
    init () {
      if(Math.min(this.ui.HEIGHT, this.ui.WIDTH) < 450) {
        this.Y_MIN = -this.ui.HEIGHT
        this.Y_MAX = this.ui.HEIGHT / 2
        this.X_MAX = this.ui.WIDTH / 2
        this.X_MIN = -this.ui.WIDTH / 2
      } else {
        this.Y_MIN = -this.ui.HEIGHT / 5
        this.Y_MAX = this.ui.HEIGHT / 4
        this.X_MAX = this.ui.WIDTH / 6
        this.X_MIN = -this.ui.WIDTH / 6
      }
    }
  }
  
  /* callbacks */
  bindCallbacks () {
    // new ThrottleLog(300).autoLog(() => `(${this.fingersPos[0].x}, ${this.fingersPos[0].y}) (${this.fingersPos[1].x}, ${this.fingersPos[1].y})`)
    this.event.addListener("touchstart", ({touches}) => {
      switch(touches.length) {
        case 2:
          this.fingersPos.create(0, touches[0]);
          this.fingersPos.create(1, touches[1]);
          break;
        default: this.fingersPos.clear(); break;
      }
      if(this.canvas2D.enabled) {
        for (const touch of touches) {
          this.canvas2D.createLine(touch.pageX, touch.pageY, touch.identifier)
        }
      }
    })

    this.event.addListener("touchmove", ({changedTouches}) => {
      for (const touch of changedTouches) {
        if(this.canvas2D.enabled)
          this.canvas2D.pushPoint(touch.pageX, touch.pageY, touch.identifier);
        if(this.fingersPos.hasId(touch.identifier)) {
          this.fingersPos.update(this.fingersPos.getId(touch.identifier), touch.pageX, touch.pageY)
          this.target.update();
        }
      }
    })

    this.event.addListener("touchend", event => {
      if(event.touches.length !== 2) {
        this.fingersPos.clear();
        this.target.update();
      }
      if(this.canvas2D.enabled) {
        for (const touch of event.changedTouches) {
          this.canvas2D.endLine(touch.identifier)
        }
      }
    })
    // touchcancel is fired whenever it takes ~200 ms to return from a touchmove event handler.

    let mouseMove_triggered = false;
    this.event.addListener("mousemove", event => {
      if(this.canvas2D.enabled) {
        if(mouseMove_triggered)
          this.canvas2D.pushPoint(event.clientX, event.clientY, 0); // 0 - identifier of this touch
        else {
          this.canvas2D.createLine(event.clientX, event.clientY, 0);
          mouseMove_triggered = true;
        }
      }
    })

    this.event.addListener("mouseleave", () => {
      if(this.canvas2D.enabled) {
        mouseMove_triggered = false;
        this.canvas2D.endLine(0);
      }
    })

    this.event.addListener("keydown", event => {
      if(this.codeHandler.hasOwnProperty(event.code))
        this.codeHandler[event.code]("keydown");
    })

    this.event.addListener("keyup", event => {
      if(this.codeHandler.hasOwnProperty(event.code))
        this.codeHandler[event.code]("keyup");
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
    pos0: this.fingersPos[0],
    pos1: this.fingersPos[1],
    _pos0: {
      _x: 0,
      _y: 0,
      ui: this,
      set x(value) {
        value < 0 
        ? (value = 0)
        : value > this.ui.WIDTH && (value = this.ui.WIDTH)
        this._x = value;
      },
      get x() {
        return this._x;
      },
      set y(value) {
        value < 0 
        ? (value = 0)
        : value > this.ui.HEIGHT && (value = this.ui.HEIGHT)
        this._y = value;
      },
      get y() {
        return this._y;
      }
    },
    _pos1: {
      _x: 0,
      _y: 0,
      ui: this,
      set x(value) {
        value < 0 
        ? (value = 0)
        : value > this.ui.WIDTH && (value = this.ui.WIDTH)
        this._x = value;
      },
      get x() {
        return this._x;
      },
      set y(value) {
        value < 0 
        ? (value = 0)
        : value > this.ui.HEIGHT && (value = this.ui.HEIGHT)
        this._y = value;
      },
      get y() {
        return this._y;
      }
    },
    reset () {
      this.init();
    },
    init () {
      const ui = this._pos0.ui;
      this._pos0._x = ui.half_W; //TODO: calculate origin
      this._pos1._x = ui.half_W;
      this._pos0._y = ui.half_H;
      this._pos1._y = ui.half_H;
    },
    update: this.target.update.bind(this.target),
    normalizeX: this.fingersPos.updateX,
    normalizeY: this.fingersPos.updateY,
    distance: 20,
    invoke: (ui => {
      return function (func) {
        func.call(this, ui);
      }
    })(this),
    ArrowUp (event) {
      this._pos0.y += this.distance;
      this._pos1.y += this.distance;
      this.pos0.y = this.normalizeY(this._pos0.y);
      this.pos1.y = this.normalizeY(this._pos1.y);
      this.update();
    },
    ArrowDown (event) {
      this._pos0.y -= this.distance;
      this._pos1.y -= this.distance;
      this.pos0.y = this.normalizeY(this._pos0.y);
      this.pos1.y = this.normalizeY(this._pos1.y); 
      this.update();
    },
    ArrowLeft (event) {
      this._pos0.x -= this.distance;
      this._pos1.x -= this.distance;
      this.pos0.x = this.normalizeX(this._pos0.x);
      this.pos1.x = this.normalizeX(this._pos1.x);  
      this.update();
    },
    ArrowRight (event) {
      this._pos0.x += this.distance;
      this._pos1.x += this.distance;
      this.pos0.x = this.normalizeX(this._pos0.x);
      this.pos1.x = this.normalizeX(this._pos1.x);
      this.update();
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
    if(identifier in this.#paths_obj)
      Object.defineProperty(this.#paths_obj[identifier], 'end', {
        value: true
      });
  }

  pushPoint (x, y, identifier) {
    if(!this.#paths_obj.hasOwnProperty(identifier))
      return ;
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
      paint () {;},
      get domElement () {
        return '';
      },
      enabled: false,
      enable () {;},
      disable () {;}
    }
  }

  enable () {
    this.enabled = true;
  }

  disable () {
    this.enabled = false;
    this.clear();
    for(const prop in this.#paths_obj) {
      delete this.#paths_obj[prop];
    }
  }
}

export default UserInteraction;