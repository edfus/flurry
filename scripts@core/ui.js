class UserInteraction {
  #relativePos = { x: 0, y: 0 };
  #absolutePos = { x: 0, y: 0 };

  #isTouchDevice = false;
  #identifier = "mouse_";

  #windowHeight = 0;
  #windowWidth =  0;

  canvas2D = Canvas2D.emptyCanvas; // hacky LOL
  #mouseMove_triggered = false;

  constructor() {
    this.#isTouchDevice = this.#testTouchDevice();
    this.#identifier = ["mouse_","touch_"][Number(this.#isTouchDevice)];

    this.#windowHeight = window.innerHeight;
    this.#windowWidth = window.innerWidth;

    if(this.#isTouchDevice || config.testMode) {
      this.canvas2D = new Canvas2D(this.WIDTH, this.HEIGHT);
      this.addResizeCallback(() => this.canvas2D.setSize(this.WIDTH, this.HEIGHT))
    }
    this.listenResize();
    this.listenUnload();
  }

  get isTouchDevice () {
    return this.#isTouchDevice;
  }

  get relativePos () {
    return this.#relativePos;
  }

  get absolutePos () {
    return this.#absolutePos;
  }

  get HEIGHT () {
    return this.#windowHeight;
  }

  get WIDTH () {
    return this.#windowWidth;
  }

  #updateRelativePos (x = this.#absolutePos.x, y = this.#absolutePos.y) {
    this.#relativePos.x = -1 + (x / this.WIDTH) * 2,
    this.#relativePos.y = 1 - (y / this.HEIGHT) * 2
  }

  #testTouchDevice () {
    if ("ontouchstart" in window) 
      return true;
    else return false;
    // Modernizr's way isn't working (^^;)
  }

  addListeners () {
    // this['#mouse_addListeners'] - undefined
    this[`${this.#identifier}addListeners`]();
    // 不能动态访问private field
  }

  removeListeners () {
    this[`${this.#identifier}removeListeners`]();
  }

 /**
  * If the browser fires both touch and mouse events because of a single user input, 
  * the browser must fire a touchstart before any mouse events. 
  * Consequently, if an application does not want mouse events fired on a specific touch target element, 
  * the element's touch event handlers should call preventDefault() and no additional mouse events will be dispatched.
  */

  touch_addListeners = function () {
    document.addEventListener('touchstart', this.#touch_startCallback, {passive: true});
    document.addEventListener('touchmove', this.#touch_moveCallback, {passive: true});
    document.addEventListener('touchend', this.#touch_endCallback, {passive: true});
    // touchcancel is fired whenever it takes ~200 ms to return from a touchmove event handler.
  }

  touch_removeListeners = function () {
    document.removeEventListener('touchstart', this.#touch_startCallback);
    document.removeEventListener('touchmove', this.#touch_moveCallback);
    document.removeEventListener('touchend', this.#touch_endCallback);
  }

  // 为了能够removeEventListenerr，此处不使用箭头函数而使用闭包（或bind）
  #touch_startCallback = (that => {
    return event => {
      for (const touch of event.touches) {
        that.canvas2D.createLine(touch.pageX, touch.pageY, touch.identifier)
      }
    }
  })(this)

  #touch_moveCallback  = (that => {
    return event => {
      let x = 0, y = 0;
      for (const touch of event.touches) {
        x += touch.pageX;
        y += touch.pageY;
      }
      that.#updateRelativePos(x / event.touches.length, y / event.touches.length);
      for (const touch of event.changedTouches) {
        that.canvas2D.pushPoint(touch.pageX, touch.pageY, touch.identifier)
      } // Is touchmove event fire once in per frame? macrotasks queue necessary?
    }
  })(this)

  #touch_endCallback = (that => {
    return event => {
      for (const touch of event.changedTouches) {
        that.canvas2D.endLine(touch.identifier)
      }
    }
  })(this)

  mouse_addListeners = function () {
    document.addEventListener('mousemove', this.#mouse_moveCallback, {passive: true});
    document.addEventListener('mouseleave', this.#mouse_leaveCallback, {passive: true});
  }

  mouse_removeListeners = function () {
    document.removeEventListener('mousemove', this.#mouse_moveCallback);
    document.removeEventListener('mouseleave', this.#mouse_leaveCallback);
  }

  #mouse_moveCallback = (that => {
    return event => {
      that.#absolutePos.x = event.clientX;
      that.#absolutePos.y = event.clientY;
      that.#updateRelativePos();

      if(that.#mouseMove_triggered)
        that.canvas2D.pushPoint(event.clientX, event.clientY, 0); // 0 - identifier of this touch
      else {
        that.canvas2D.createLine(event.clientX, event.clientY, 0);
        that.#mouseMove_triggered = true;
      }
  }
  })(this)

  #mouse_leaveCallback = (that => {
    return event => {
      that.#mouseMove_triggered = false;
      that.canvas2D.endLine(0);
    }
  })(this)

  #resizeCallbackQueue = [
    (() => { // default
      this.#windowHeight = window.innerHeight;
      this.#windowWidth = window.innerWidth;
    }).bind(this)
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

  fadeOutSpeed = .035

  constructor (width, height) {
    this.#canvas = document.createElement('canvas');

    this.#canvas.width = width;
    this.#canvas.height = height;

    this.#context = this.#canvas.getContext('2d');

    this.setStyle();

    Object.defineProperty(this.#paths_obj, 'empty', {
      value: true,
      writable: true
    });
  }

  alpha = function (alpha) { // can be changed, not in prototype
    return `rgba(255, 255, 255, ${alpha})`
  }

  setStyle = function () {
    this.#context.shadowColor = this.alpha(.4);
    this.#context.shadowBlur = 6;

    this.#context.lineWidth = 3;
    this.#context.lineJoin = this.#context.lineCap = 'round';
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
      opacity: .6
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
        this.#context.strokeStyle = this.alpha(segment.opacity);
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