"use strict";
// import config from '../scripts@config/config.js'; - deprecated
// config = window.config; - not necessary
// type="module" can still get access to config directly
import {Airplane, Sky, Sea} from '../scripts@core/old_customObject.js';
/////////////////////////////////
{
  let mode = ['production', '#42c02e'];
  if(config.testMode)
    mode = ['development', '#f25346'];
  const titleStyle = "padding: 1px; border-radius: 3px 0 0 3px; color: #fff; background: #606060;",
        subStyle = "padding: 1px; border-radius: 0 3px 3px 0; color: #fff; background";
  const ua = navigator.userAgent.toString();
  console.info(`%c Version %c ${config.version} `, titleStyle, `${subStyle}: #F5986E;`)
  console.info(`%c Environment %c ${mode[0]} `, titleStyle, `${subStyle}: ${mode[1]};`)
  console.info(`%c Browser %c ${ua.slice(ua.lastIndexOf(') ') + 2, ua.length)} `, titleStyle, `${subStyle}: #1475b2;`)
  console.info(`%c Platform %c ${ua.match(/(?<=\().*?(?=\))/)[0]} `, titleStyle, `${subStyle}: #1475b2;`)
}
////////////////////////////////

//SCENE & CAMERA VARIABLES

var scene = null,
    camera = null,
    renderer = null;

// 3D Models in customObjects.js
var sea = null, // createdBy new Sea()
    airplane = null, // createdBy new Airplane()
    sky = null; // createdBy new Sky()

// can't access these seemingly global variables outside base.js, as base.js is loaded as module
///////////////////////////////////////////////////

class UserInteraction {
  #relativePos = { x: 0, y: 0 };
  #absolutePos = { x: 0, y: 0 };

  #isTouchDevice = false;

  #windowHeight = 0;
  #windowWidth =  0;

  #mouseMove_triggered = false;

  #identifier = "mouse_";

  constructor() {
    this.#isTouchDevice = this.#testTouchDevice();
    this.#identifier = ["mouse_","touch_"][Number(this.#isTouchDevice)];

    this.#windowHeight = window.innerHeight;
    this.#windowWidth = window.innerWidth;
  }

  get isTouchDevice () {
    return this.#isTouchDevice;
  }

  get relativePos () {
    return this.#relativePos;
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
  }

  touch_removeListeners = function () {
    document.removeEventListener('touchstart', this.#touch_startCallback);
    document.removeEventListener('touchmove', this.#touch_moveCallback);
    document.removeEventListener('touchend', this.#touch_endCallback);
  }

  // touchcancel is fired whenever it takes ~200 ms to return from a touchmove event handler.

  #touch_startCallback = (that => {
    return event => {
      event.preventDefault();
      for (const touch of event.touches) {
        canvas2D.createLine(touch.pageX, touch.pageY, touch.identifier)
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
      // setTimeout(() => {
        for (const touch of event.changedTouches) {
          canvas2D.pushPoint(touch.pageX, touch.pageY, touch.identifier)
        } // Is touchmove event fire once in per frame?
      // }, 0)  
    }
  })(this)

  #touch_endCallback = (that => {
    return event => {
      event.preventDefault();
      for (const touch of event.changedTouches) {
        canvas2D.endLine(touch.identifier)
      }
    }
  })(this)

  mouse_addListeners = function () {
    document.addEventListener('mousemove', this.#mouse_moveCallback, {passive: true});
    document.addEventListener('mouseleave', this.#mouse_leaveCallback, {passive: true});
  }

  mouse_removeListeners = function () {
    // "mousemove mouseleave mouseover".split(' ').forEach(e => e)
    document.removeEventListener('mousemove', this.#mouse_moveCallback);
    document.removeEventListener('mouseleave', this.#mouse_leaveCallback);
  }

  #mouse_moveCallback = (that => {
    // 声明建立时和建立后不同。建立后不能访问非static元素，prototype不能访问private field元素，但此时都能
    return event => {
      that.#absolutePos.x = event.clientX;
      that.#absolutePos.y = event.clientY;
      that.#updateRelativePos();

      if(config.testMode)
        if(that.#mouseMove_triggered)
          canvas2D.pushPoint(event.clientX, event.clientY, 0)
        else {
          canvas2D.createLine(event.clientX, event.clientY, 0);
          that.#mouseMove_triggered = true;
        }
    }
  })(this)

  #mouse_leaveCallback = (that => {
    return event => {
      that.#mouseMove_triggered = false;
      if(config.testMode)
        canvas2D.endLine(0);
    }
  })(this)

  #resizeCallback () {
    this.#windowHeight = window.innerHeight;
    this.#windowWidth = window.innerWidth;
    renderer.setSize(this.WIDTH, this.HEIGHT);
    camera.aspect = this.WIDTH / this.HEIGHT;
    // camera的aspect应和renderer.setSize的纵横比相同
    camera.updateProjectionMatrix(); 
    // you will have to call .updateProjectionMatrix for the changes to take effect.
    if(config.testMode){
      config.cameraHelper.update()
    }
    canvas2D.setSize(this.WIDTH, this.HEIGHT)
  }

  resizeCallback = function () {
    return this.#resizeCallback(); // [Violation] 'load' handler took 156ms
    // return this.#resizeCallback_debounce();  // [Violation] 'setTimeout' handler took 51ms
    // in 2020 debounce on resize event still worthy?
  }
}

const userInteraction = new UserInteraction();

class Canvas2D {
  #canvas = null;
  #context = null;
  #paths_obj = {};

  fadeOutSpeed = .035

  constructor () {
    this.#canvas = config.getUIContainer();

    this.#canvas.width = userInteraction.WIDTH;
    this.#canvas.height = userInteraction.HEIGHT;

    this.#context = this.#canvas.getContext('2d');

    this.setStyle();

    Object.defineProperty(this.#paths_obj, 'empty', {
      value: true,
      writable: true
      // enumerable: false - default
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

  /**
   * construct a new line object
   * @param {number} identifier
   * @return {TouchPath} new line object
   */
  createNewTouchPath (identifier) {
    let newPath = { // 0 - identifier of this touch
      segments: [],
      last_i: 0,
      path: new Path2D() // path2D obj
    }
    newPath.segments.push(this.newPathSegment(newPath))

    this.#paths_obj[identifier] = newPath;
    this.#paths_obj.empty = false;
    return newPath;
  }
  /**
   * construct a new line object
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
      value: true,
      // writable: false - default
      // enumerable: false - default
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
}
const canvas2D = new Canvas2D();

// Cannot access 'whenPaused' before initialization. this: undefined
// so using es6 class.
class WhenPaused {
  static divideX = 6;
  // static #renderLoopPtr = null; // function ptr
  // Cannot read private member #renderLoop from an object whose class did not declare it

  // 没有construct的需要，所以全部使用static属性通过WhenPaused访问

  static speed_sea = config.speed_sea / this.divideX;
  static speed_sky = config.speed_sky / this.divideX;
  static speed_propeller = config.speed_propeller / this.divideX;

  static #renderLoop = (that => 
    () => {
      canvas2D.paint();
      updatePlane(that.speed_propeller);
      updateBackground(that.speed_sea, that.speed_sky);
      renderer.render(scene, camera);
      requestAnimationFrame(that.#renderLoopPtr); // ptr, invoked by window so closure necessary
    }
  )(this); // this: WhenPaused 

  static #renderLoopPtr = this.#renderLoop; // must after static #renderLoop's declaration

  static start () {
    userInteraction.removeListeners();
    this.#renderLoopPtr = this.#renderLoop;
    airplane.defaultPropellerSpeed /= this.divideX;
    this.#renderLoop();
  }
  static backTo (newRenderLoop) {
    userInteraction.addListeners();
    airplane.defaultPropellerSpeed = config.defaultPropellerSpeed;
    this.#renderLoopPtr = newRenderLoop; // 
  }
}

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

//INIT THREE JS, SCREEN AND MOUSE EVENTS
window.addEventListener('load', ()=>{
  // loading: 0 ms

  createScene();
  createLights();

  createObjects();

  // loading: 157.890869140625 ms

  config.getContainer().appendChild(renderer.domElement);

  window.addEventListener('resize', () => userInteraction.resizeCallback(), {passive: true});

  config.gameStartCallback();

  // loading: 159.793701171875 ms

  userInteraction.addListeners(); 

  // loading: 160.85498046875 ms

  (function renderLoop() { // immediate function前不加;会出各种各样奇奇怪怪的错
    if(!window.paused){
      //TODO: if(crashed)
      canvas2D.paint(); // 我做着玩的，到时候会删掉 - cloudres
      updatePlane();
      updateBackground();
      updateCameraFov();
      //TODO: updateScore();
      renderer.render(scene, camera);
      requestAnimationFrame(renderLoop);
    } else {
      console.info('RenderLoop: game paused');

      WhenPaused.start();

      waitForUserContinue()
        .then(() => {
          WhenPaused.backTo(renderLoop);
          // can't access immediate function renderLoop outside it
        })
        .catch(err => {
          // console.error(err)
          backToTitle().then(()=>requestAnimationFrame(renderLoop))
        })
    }
  })()
  // loading: 386.660888671875 ms
}, {passive: true});

function createScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
  /*
  * Fog：添加浓度随距离线性增加的雾，达到使远处景物模糊化的效果，用法为 ** = new THREE.Fog(color, near, far);
  * near和far表示与相机的距离，near默认为1，far默认为1000，far-near不能太小，否则会过于模糊或达不到渐变的效果
  * 最近处物体为本身的颜色，雾中物体为物体与雾的混合颜色
  */

  const setting = config.cameraSetting;
  camera = new THREE.PerspectiveCamera(
      setting.fieldOfView,
      setting.aspectRatio,
      setting.nearPlane,
      setting.farPlane
    );
    /*
    * PerspectiveCamera为透视相机，new THREE.PerspectiveCamera(fov, aspect, near, far)
    * fov为纵向视角，默认为50°
    * aspect为摄像机的纵横比，默认为1，即近远平面均为正方形
    * near为近平面与透视顶点的距离，默认为0.1，应大于0
    * far为远平面与透视顶点的距离，默认为2000，应大于near
    */
  Object.assign(camera.position, new THREE.Vector3(0, 100, 200));

  if(config.testMode){
    config.cameraHelper = new THREE.CameraHelper(camera);
    scene.add(config.cameraHelper)
  }
  /*
  *  Object.assign(target, source)
  *  将一个原对象上的属性拷贝到另一个目标对象上，最终结果取两个对象的并集，如果有冲突的属性，则以原对象上属性为主，表现上就是直接覆盖过去
  *  但很可惜的是，Object.assign 只是浅拷贝，它只处理第一层属性，如果属性是基本类型，则值拷贝，如果是对象类型，则引用拷贝，如果有冲突，则整个覆盖过去。
  */
  // 删除对象属性: delete obj['xxx']

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // antialias: 抗s锯齿
  renderer.setSize(userInteraction.WIDTH, userInteraction.HEIGHT); 
  renderer.shadowMap.enabled = true;
}

// LIGHTS
function createLights() {
  /* 
  * HemisphereLight(天空颜色, 光的接地颜色, 光强度 = 1)：
        半球光，在空中创造一个球形光源，无法投射阴影，可反光
  * AmbientLight(光色, 光强度 = 1)：
        环境光，没有方向，照亮场景中的所有对象，不能投射阴影或反光
  * DirectionalLight(光色, 光强度 = 1)：
        定向光，射向目标物体或位置的平行光
    * Its direction is calculated as pointing from the light's position to the target's position
    * light.position.set() -> light.target.position.set() & scene.add(light.target)
    * Setting the rotation has no effect // light.rotation.set()
    * 或用如下代码使其射向某一有属性的物体
      const targetObject = new THREE.Object3D();
      light.target = targetObject;
      scene.add(targetObject); // scene.add(light.target) has same effect
    * https://threejs.org/docs/#api/en/lights/DirectionalLight
  * 颜色均用16进制数表示（0x000为黑色，0xfff为白色（所有颜色的混合即为白）。可参照scripts@config/color.js）
  */
  let ambientLight, hemisphereLight, shadowLight;

  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);
                 // new THREE.HemisphereLight(天空颜色, 光的接地颜色, 光强度 = 1);
  scene.add(hemisphereLight);

  // ambient： (especially of environmental conditions) existing in the surrounding area:
  ambientLight = new THREE.AmbientLight(0xdc8874, .5);
              // new THREE.AmbientLight(光色, 光强度 = 1);
  scene.add(ambientLight);

  shadowLight = new THREE.DirectionalLight(0xffffff, .9); // 白色
             // new THREE.DirectionalLight(光色, 光强度 = 1)
  shadowLight.position.set(150, 350, 350);
  // default target 0 0 0
  shadowLight.castShadow = true;
  shadowLight.shadow.camera.left = -400;
  shadowLight.shadow.camera.right = 400;
  shadowLight.shadow.camera.top = 400;
  shadowLight.shadow.camera.bottom = -400;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 1000;
  shadowLight.shadow.mapSize.width = 2048;
  shadowLight.shadow.mapSize.height = 2048;
  scene.add(shadowLight);
}

function createObjects() {
  createPlane();
  createSea();
  createSky();
  /*  
  * 我们的函数: createPlane() && createobstacles()
  */
}

function createPlane(){
  airplane = new Airplane();
  airplane.mesh.scale.set(.25, .25, .25);
  airplane.mesh.position.y = 100;
  airplane.defaultSpeed = config.speed_propeller;
  scene.add(airplane.mesh);
}

function createSea(){
  sea = new Sea();
  sea.mesh.position.y = -600;
  sea.defaultSpeed = config.speed_sea;
  scene.add(sea.mesh);
}

function createSky() {
  sky = new Sky();
  sky.mesh.position.y = -600;
  sky.defaultSpeed = config.speed_sky;
  scene.add(sky.mesh);
}

/**
 * @param {number | undefined} speed_propeller
 */
function updatePlane(speed_propeller) {
  const targetY = normalize(userInteraction.relativePos.y, -.75, .75, 25, 175);
  airplane.mesh.position.y += (targetY - airplane.mesh.position.y) * 0.1; // 每帧向新的目标点飞去1/10的距离。
  airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * 0.0128; // 飞机与x轴角度随鼠标上下移动而变化
  airplane.mesh.rotation.x = (airplane.mesh.position.y - targetY) * 0.0064; // 飞机与z轴角度随鼠标上下移动而变化
  airplane.propellerSpin(speed_propeller); // 螺旋桨旋转(默认速度0.6)
}
/**
 * @param {number | undefined} speed_sea
 * @param {number | undefined} speed_sky
 */
function updateBackground(speed_sea, speed_sky) {
  sea.moveWaves(speed_sea); // 海浪
  sea.move(speed_sea);
  sky.move(speed_sky); // 大海的移动 - 天空的移动
}

function updateCameraFov(){ // fov: Field Of View - https://blog.csdn.net/weixin_39675633/article/details/103410983
  camera.fov += (normalize(userInteraction.relativePos.x, -1, 1, 40, 80) - camera.fov) * 0.1
  // 40 到 80范围内，40时画面显示内容最小，80时画面显示内容最多（广角）
  // 软件模拟的fov不会导致畸变等，可以直接当放大缩小的工具用
  camera.updateProjectionMatrix();
} 
/**
 * 根据鼠标相对位置返回映射后的绝对位置（飞机及相机)
 * RP: Relative Position, 取值范围为-1到1
 * @param {number} mouseRP userInteraction.relativePos.x | .y
 * @param {number} mouseRP_min
 * @param {number} mouseRP_max
 * @param {number} position_min
 * @param {number} position_max
 * @return {number} 在屏幕上的绝对位置
 */
function normalize(mouseRP, mouseRP_min, mouseRP_max, position_min, position_max) {
  let mouseRPinBox = Math.max(Math.min(mouseRP, mouseRP_max), mouseRP_min);
  let mouseRPrange = mouseRP_max - mouseRP_min;
  let ratio = (mouseRPinBox - mouseRP_min) / mouseRPrange;
  let positionRange = position_max - position_min;
  return position_min + (ratio * positionRange);
} 

//TODO: 相机旋转跟随飞机旋转的延迟问题


///////////////////////////////////////
// handle score & game pause & window.unload

function updateScore() {
  // how to handle and record the speed of the plane?
  //NOTE: _参考\TheAviator\js\game.js <- 参考
}

// Uncaught ReferenceError: Dialog is not defined
// https://stackoverflow.com/questions/37711603/javascript-es6-class-definition-not-accessible-in-window-global

async function waitForUserContinue() {
  return new Promise((resolve, reject) => {
    if(Dialog.isBusy)
      Dialog.addOnceListener('dialogHide', () => 
        resolve(window.paused = false)
      )
  })
  // do something...
} // listen to user's click event, resolve to continue, reject to back to title.
  // remember to removeEventListener

async function backToTitle() {

}
/*
pauseButton.addEventListener('click',()=>{
  // do something...
  songPlayer.stop_instantly()
}, {passive: true})
*/

document.addEventListener("visibilitychange", () => {
  switch(document.visibilityState) {
    case 'visible' : window.paused = false;
      break;
    case 'hidden' : window.paused = true; 
      break;
    default: ; 
  }
}, {passive: true});

window.addEventListener("pagehide", event => { // safari
  if (event.persisted) {
    /* the page isn't being discarded, so it can be reused later */
  }
}, {passive: true});

window.addEventListener('unload', ()=>{
  // restore the score
}, {passive: true, once: true})