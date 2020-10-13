class game {
  #pi = Math.PI; // private field
  #scene = null;
  #camera = null;
  #songPlayer = window.songPlayer;
  #paused = false;
  constructor() { 
    function createScene() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
      
      const setting = config.cameraSetting;
      camera = new THREE.PerspectiveCamera(
          setting.fieldOfView,
          setting.aspectRatio,
          setting.nearPlane,
          setting.farPlane
        );
      camera.lookAt(airplane.mesh.position);
      Object.assign(camera.position, new THREE.Vector3(0, 100, 200));
      if(config.testMode){
        config.cameraHelper = new THREE.CameraHelper(camera);
        scene.add(config.cameraHelper)
      }
      
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(userInteraction.WIDTH, userInteraction.HEIGHT); 
      renderer.shadowMap.enabled = true;
    }


    
  } 
  init() {
    // 创建灯光、隧道等静态物体
    // trigger an event
    function normalize(mouseRP, mouseRP_min, mouseRP_max, position_min, position_max) {
      let mouseRPinBox = Math.max(Math.min(mouseRP, mouseRP_max), mouseRP_min);
      let mouseRPrange = mouseRP_max - mouseRP_min;
      let ratio = (mouseRPinBox - mouseRP_min) / mouseRPrange;
      let positionRange = position_max - position_min;
      return position_min + (ratio * positionRange);
    }



  }
  #update () { // private field function
     // renderloop在外界调用，以便更好的执行暂停等
  }
  stop_audio() {
    return songPlayer.stop_instantly();
  }
  pause () {
    this.#paused = true;
  }

  get paused() {
    return this.#paused;
  }
  // examples
  #createPointCloud(size, transparent, opacity, vertexColors, sizeAttenuation, color) {
    let geometry = new THREE.Geometry();
    const material = new THREE.PointCloudMaterial({
          size: size,
          transparent: transparent,
          opacity: opacity,
          vertexColors: vertexColors,
          sizeAttenuation: sizeAttenuation,
          color: color
      });
    const range = 500;
    for (let i = 0; i < 15000; i++) {
        geometry.vertices.push(
            new THREE.Vector3(
              Math.random() * range,
              Math.random() * range,
              Math.random() * range
            ) // can change pointer to a texture. e.g. an img
          );
        // https://threejs.org/docs/#api/en/math/Color
        geometry.colors.push(new THREE.Color(`hsl(33%, 100%, ${Math.random() * 60}%)`));
        // color 0x00ff00's H S L: 33% 100% 50%
        // Math.random() return a random value between 0 and 1
    }
    return new THREE.PointCloud(geometry, material);
    // group = new THREE.Group();
    //             scene.add(group);
  }
  #onASameLine (THREEobj_arr) {
    const intersects = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize())
                                .intersectObjects(THREEobj_arr);
    if (intersects.length > 0) {
        intersects[0].object.material.transparent = true;
        intersects[0].object.material.opacity = 0.1;
    }
  }
  #flyControls () {
    //TODO: 调查此，检查其是否符合我们的需求
    var flyControls = new THREE.FlyControls(camera);
    flyControls.movementSpeed = 25;
    flyControls.domElement = window.config.getContainer();
    flyControls.rollSpeed = Math.PI / 24;
    flyControls.autoForward = true;
  }
  #addCameraHelper (camera) { 
    scene.add(new THREE.CameraHelper(camera));
  }
  #collisionDetect (obj_vector3) {
    return airplane.mesh.position.clone().sub(obj_vector3).length - this.#tolerance;
    // clone is a must
  }
}

window.game = new game();

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
    document.addEventListener('touchstart', this.#touch_startCallback, {passive: false});
    document.addEventListener('touchmove', this.#touch_moveCallback, {passive: false});
    document.addEventListener('touchend', this.#touch_endCallback, {passive: false});
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
      event.preventDefault();
      for (const touch of event.touches) {
        that.canvas2D.createLine(touch.pageX, touch.pageY, touch.identifier)
      }
    }
  })(this)

  #touch_moveCallback  = (that => {
    return event => {
      event.preventDefault();
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
      event.preventDefault();
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

class WhenPaused { // 没有construct的需要，所以全部使用static属性通过WhenPaused访问
  static divideX = 6;
  static speed_sea = config.speed_sea / this.divideX;
  static speed_sky = config.speed_sky / this.divideX;
  static speed_propeller = config.speed_propeller / this.divideX;

  static #renderLoop () { // the renderLoop to be executed when paused
      updatePlane();
      updateBackground();
      renderer.render(scene, camera);
      userInteraction.canvas2D.paint();
      requestAnimationFrame(() => this.#renderLoopPtr()); // invoked by window
  } // this: WhenPaused 

  static #renderLoopPtr = this.#renderLoop; // must after static #renderLoop's declaration

  static start () {
    userInteraction.removeListeners();
    this.#renderLoopPtr = this.#renderLoop;
    sea.defaultSpeed = this.speed_sea;
    sky.defaultSpeed = this.speed_sky;
    airplane.defaultSpeed = this.speed_propeller;
    score.pause();
    this.#renderLoop();
  }
  static backTo (newRenderLoop) {
    userInteraction.addListeners();
    sea.defaultSpeed = config.speed_sea;
    sky.defaultSpeed = config.speed_sky;
    airplane.defaultSpeed = config.speed_propeller;
    score.start();
    this.#renderLoopPtr = newRenderLoop.bind(window); // .bind(window): can't access WhenPaused by this in newRenderLoop
  }
}

class Score { 
  #dom = null;
  #value = 0;
  #speed = 0;
  #timer = -1;
  #previousMS = Infinity;
  constructor (domElement, initialSpeed, initialScore = this.loadPrevious()) {
    this.#dom = domElement;
    this.#speed = initialSpeed;
    this.#value = initialScore;
  }
  // /**
  //  * @param {number} newSpeed
  //  */
  // set speed (newSpeed) {
  //   this.update();
  //   this.#speed = newSpeed;
  // }

  start () {
    this.#previousMS = performance.now();
    this.update();
  }

  pause () {
    this.#previousMS = Infinity;
    if(this.#timer !== -1)
      clearInterval(this.#timer)
    this.#timer = -1;
  }

  #intervalUpdate (ms) {
    if(this.#timer !== -1)
      clearInterval(this.#timer)
    this.#timer = setInterval(() => {
      this.#dom.innerText = String((this.updateValue() / 1000).toFixed(1)).concat(" Km");
    }, ms)
  }

  update () {
    if(this.#previousMS === Infinity)
      return ;
    if(this.#value < 10000) {
      this.#dom.innerText = String(this.updateValue().toFixed(2)).concat(" m");
      requestAnimationFrame(() => this.update())
    } else {
      this.#dom.innerText = String((this.#value / 1000).toFixed(1)).concat(" Km");
      this.#intervalUpdate(1e5 / this.#speed) // ms per 0.1km
    }
  }

  updateValue () {
    this.#value += this.#speed * (performance.now() - this.#previousMS) / 1000;
    this.#previousMS = performance.now();
    return this.#value;
  }

  store () {
    const dateId = new Date().toLocaleDateString(
        Intl.DateTimeFormat().resolvedOptions().locale, 
        {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      );
    localStorage.score_obj ?? (localStorage.score_obj = `{}`);
    const store_obj = JSON.parse(localStorage.score_obj)
    store_obj[dateId] = store_obj[dateId] ? (this.#value > store_obj[dateId] ? this.#value : store_obj[dateId]) : this.#value;
    localStorage.score_obj = JSON.stringify(store_obj);
    localStorage.score = this.#encrypt(this.#value);
  }

  loadPrevious () {
    return this.#decrypt(localStorage.score)
  }
  #map = new Array(1, 9, 5, 0, 3, 7, 2 ,8); // 2的n次方
  #algorithm (value) { // 简单地散列useragent，以之异或为校验和转换为16进制到value末尾
    let str = '';
    let i = 0;
    const maxLength = value.length / 2;
    for(const ch of navigator.userAgent) {
      i = this.#map[ch.codePointAt(0) & (this.#map.length - 1)];
      str += value[i] ^ i; // undefined will just be i
      if(str.length >= maxLength)
        break;
    } // as navigator.userAgent length is usually longer...
    return parseInt(str).toString(16);
  }
  
  #identifier = 'o'
  #decrypt (value) { 
    if(typeof value !== "string")
      return 0;
    const separatorI = value.lastIndexOf(this.#identifier);
    if(separatorI === -1)
      return 0;
    const data = value.substring(0, separatorI);
    const check = value.substring(separatorI + this.#identifier.length, value.length);
    if(this.#algorithm(data) === check){
      return parseInt(data, 16);
    }
    else return 0;
  }
  
  #encrypt (value) {
    return value.toString(16) + this.#identifier + this.#algorithm(value.toString(16));
  }
}

var score = null; //FIX

let inQueue = false;
function throttleLog () {
  if(inQueue)
    return;
  else {
    console.log.apply(this, arguments);
    setTimeout(() => {
      inQueue = false;
    }, 500)
    inQueue = true;
  }
}

game.ui = new UserInteraction();

game.paused = false; // explicit

game.pause = class { // result in changing game.paused
  static init () { 
    // all methods related to changing game state
    document.addEventListener("visibilitychange", () => {
      if(document.visibilityState === 'visible')
        game.paused = false; 
      else {
        game.paused = true; 
      }
    }, {passive: true});

    Dialog.addEventListener('dialogShow', () => {
      game.paused = true;
    })
  }
  static async waitForUserContinue () {
    return new Promise((resolve, reject) => {
      if(Dialog.isBusy)
        Dialog.addOnceListener('dialogHide', () => 
          resolve(window.paused = false)
        )
    })
  }
  //////////////////////// logic when game paused
  static #renderLoop_whenPaused () { // the renderLoop to be executed when paused
    // do sth...
    requestAnimationFrame(() => this.#renderLoopPtr()); // invoked by window
  }

  static #renderLoopPtr = this.#renderLoop_whenPaused; // must after static #renderLoop's declaration

  static start () {
    game.ui.removeListeners();
    this.#renderLoopPtr = this.#renderLoop_whenPaused;
    this.#renderLoop_whenPaused();
  }
  static backTo (newRenderLoop) {
    game.ui.addListeners();
    this.#renderLoopPtr = newRenderLoop.bind(window); // .bind(window): can't access WhenPaused by this in newRenderLoop
  }
}
