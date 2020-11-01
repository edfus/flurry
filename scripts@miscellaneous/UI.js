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

  #windowHeight = 0;
  #windowWidth  = 0;

  canvas2D = Canvas2D.emptyCanvas;

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
    // tempPtr.addListener("newEvent", log)

    let _log1 = new ThrottleLog(300),
        _log2 = new ThrottleLog(300),
        _log3 = new ThrottleLog(300);
        _log1 = _log1.log.bind(_log1);
        _log2 = _log2.log.bind(_log2);
        _log3 = _log3.log.bind(_log3);
    const log = console.log.bind(console);
    new ThrottleLog(500).autoLog(() => `(rotate: ${this.data.rotate_force}, up: ${this.data.up_force})\n fingersPos now: (${this.fingersPos[0].x_now}, ${this.fingersPos[0].y_now}), (${this.fingersPos[1].x_now}, ${this.fingersPos[1].y_now})`)
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

  get HEIGHT () {
    return this.#windowHeight;
  }

  get WIDTH () {
    return this.#windowWidth;
  }

  #frozen = false; //TODO

  freeze () { //TODO
    this.fingersPos.clear()
    // Object.freeze(this.fingersPos);
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

  fingersPos = {
    0: {
      x_now: 0, y_now: 0,
      x_initial: 0, y_initial: 0
    },
    1: {
      x_now: 0, y_now: 0,
      x_initial: 0, y_initial: 0
    },
    clear () {
      this[0].x_now = this[0].y_now = this[0].x_initial = this[0].y_initial = 0;
      this[1].x_now = this[1].y_now = this[1].x_initial = this[1].y_initial = 0;
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
      this[index].x_initial = this[index].x_now = this.updateX(pageX)
      this[index].y_initial = this[index].y_now = this.updateX(pageY)
    },
    updateX: x => {
      return x - this.WIDTH / 2;
    },
    updateY: y => {
      return y - this.HEIGHT / 2;
    },
    update (ptr, x, y) {
      ptr.x_now = this.updateX(x)
      ptr.y_now = this.updateX(y)
    }
  }

  data =  {
    rotate_force: 0, // -1 ~ 1
    up_force: 0 // -1 ~ 1
  }

  updateData () { //TODO
    if(this.#frozen)
      return this.data;
    // 数据：this.fingersPos[0]，this.fingersPos[1]分别都具有x_now、y_now，x_initial，y_initial属性
    // 他们的范围都在：x( -屏幕宽度 / 2, +屏幕宽度 / 2) y( -屏幕高度 / 2, +屏幕高度 / 2)之间
    const relative_x0 = this.fingersPos[0].x_now / this.WIDTH
    const relative_x1 = this.fingersPos[1].x_now / this.WIDTH
    const relative_y0 = this.fingersPos[0].y_now / this.HEIGHT
    const relative_y1 = this.fingersPos[1].y_now / this.HEIGHT

    const relativeD_x = Math.abs(relative_x0 - relative_x1); // abs：绝对值
    const relativeD_y = Math.abs(relative_y0 - relative_y1);
    let length = Math.hypot(relativeD_x, relativeD_y) // hypot：参数的平方和再开根，即直角边斜边
    // if(length < .15)
    //   length = 0

    const totalD_y0 = this.fingersPos[0].y_now - this.fingersPos[0].y_initial
    const totalD_y1 = this.fingersPos[1].y_now - this.fingersPos[1].y_initial

    const r = -(relative_x0 - relative_x1) * (relative_y0 - relative_y1)
    console.log(relative_x0);
    console.log(relative_x1);
    console.log(relative_y0);
    console.log(relative_y1);
    this.data.rotate_force = r * Math.abs(totalD_y0 - totalD_y1) * relativeD_y
    this.data.up_force = -(totalD_y0 + totalD_y1) / this.HEIGHT;

    return this.data;
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
          this.updateData()
        }
      }
    })

    this.event.addListener("touchend", event => {
      if(event.touches.length !== 2) {
        this.fingersPos.clear();
        this.updateData()
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
    position0: new Proxy(this.fingersPos[0], {
      set: (target, prop, value) => {
        const halfY = this.HEIGHT / 2
        
        value < 0
        ? value < -halfY ? value = -halfY : 0
        : value > halfY ? value = halfY : 0

        return Reflect.set(target, prop, value);
      }
    }),
    position1: new Proxy(this.fingersPos[1], {
      set: (target, prop, value) => {
        const halfY = this.HEIGHT / 2
        
        value < 0
        ? value < -halfY ? value = -halfY : 0
        : value > halfY ? value = halfY : 0

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
        this.distance = Math.min(ui.HEIGHT, ui.WIDTH) / 12;
        ui.fingersPos[0].x_initial = -this.distance * 2;
        ui.fingersPos[1].x_initial = this.distance * 2;
        ui.fingersPos[0].y_initial = 0;
        ui.fingersPos[1].y_initial = 0;
      })
    },
    updateData () {
      this.invoke(ui => {
        const delta = this.distance * 2
        ui.fingersPos[0].x_initial = -delta;
        ui.fingersPos[1].x_initial = delta;
        ui.fingersPos[0].x_now = -delta;
        ui.fingersPos[1].x_now = delta;
        ui.fingersPos[0].y_initial = 0;
        ui.fingersPos[1].y_initial = 0;
        ui.updateData();
      })
    },
    ArrowUp () {
      this.position0.y_now = -this.distance;
      this.position1.y_now = -this.distance;
      this.updateData();
    },
    ArrowDown () {
      this.position0.y_now = this.distance;
      this.position1.y_now = this.distance;
      this.updateData()
    },
    ArrowLeft () {
      this.position0.y_now = -this.distance
      this.position1.y_now = this.distance
      this.updateData()
    },
    ArrowRight () {
      this.position0.y_now = this.distance
      this.position1.y_now = -this.distance
      this.updateData()
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