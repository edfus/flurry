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
  #isTouchDevice = false;
  #windowHeight = 0;
  #windowWidth =  0;
  #debounce = {
    timer: 0,
    gap_ms: 30,
    triggered: false
  };

  #isDragging = false;

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

  addListeners () {
    // this['#mouse_addListeners'] - undefined
    this[`${this.#identifier}addListeners`]();
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

  touch_addListeners () {
    document.addEventListener('touchstart', this.#touch_startCallback, {passive: false});
    document.addEventListener('touchmove', this.#touch_moveCallback, {passive: false});
    document.addEventListener('touchend', this.#touch_endCallback, {passive: false});
  }

  touch_removeListeners () {
    document.removeEventListener('touchstart', this.#touch_startCallback);
    document.removeEventListener('touchmove', this.#touch_moveCallback);
    document.removeEventListener('touchend', this.#touch_endCallback);
  }

  // touchcancel is fired whenever it takes ~200 ms to return from a touchmove event handler.

  #touch_startCallback = (that => {
    return event => {
      event.preventDefault();
      // switch (event.touches.length)
      that.#isDragging = true;
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
      that.#relativePos = {
        x: -1 + (x / event.touches.length / that.WIDTH) * 2,
        y: 1 - (y / event.touches.length / that.HEIGHT) * 2
      };
      setTimeout(() => {
        // ...
      }, 0)
    }
  })(this)

  #touch_endCallback = (that => {
    return event => {
      event.preventDefault();
      that.#isDragging = false;
    }
  })(this)

  mouse_addListeners () {
    document.addEventListener('mousedown', this.#mouse_downCallback, {passive: true});
    document.addEventListener('mousemove', this.#mouse_moveCallback, {passive: true});
    document.addEventListener('mouseup', this.#mouse_upCallback, {passive: true});
  }

  mouse_removeListeners () {
    document.removeEventListener('mousedown', this.#mouse_downCallback);
    document.removeEventListener('mousemove', this.#mouse_moveCallback);
    document.removeEventListener('mouseup', this.#mouse_upCallback);
  }

  #mouse_downCallback = (that => {
    return event => {
      that.#isDragging = true;
    }
  })(this)

  #mouse_moveCallback = (that => {
    // 声明建立时和建立后不同。建立后不能访问非static元素，prototype不能访问private field元素，但此时都能
    return event => {
      that.#relativePos = {
        x: -1 + (event.clientX / that.WIDTH) * 2,
        y: 1 - (event.clientY / that.HEIGHT) * 2
      }
    }
  })(this)

  #mouse_upCallback = (that => {
    return event => {
      that.#isDragging = false;
    }
  })(this)

  #resizeCallback_debounce () {
    if(this.#debounce.triggered)
      clearTimeout(this.#debounce.timer)
    else this.#debounce.triggered = true;
    this.#debounce.timer = setTimeout(() => this.#resizeCallback(), this.#debounce.gap_ms)
  } // If handle does not identify an entry in the list of active timers of the WindowOrWorkerGlobalScope object on which [clearTimeout] was invoked, the method does nothing.

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
    this.#debounce.triggered = false;
  }

  resizeCallback () {
    return this.#resizeCallback(); // [Violation] 'load' handler took 156ms
    // return this.#resizeCallback_debounce();  // [Violation] 'setTimeout' handler took 51ms
    // in 2020 debounce on resize event still worthy?
  }

  #testTouchDevice () {
    if ("ontouchstart" in window) 
      return true;
    else return false;
    // Modernizr's way isn't working (^^;)
  }
}

const userInteraction = new UserInteraction();

class Canvas2D {
  // #lineMaterial = null;
  #canvas = null;
  #context = null;

  #camera2D = null;
  #scene2D = null;

  #width = 0;
  #height = 0;

  constructor () {
    this.#width = userInteraction.WIDTH;
    this.#height = userInteraction.HEIGHT;

    this.#canvas = new OffscreenCanvas(this.#width, this.#height);
    this.#context = this.#canvas.getContext('2d');

    // // Create the camera and set the viewport to match the screen dimensions.
    // this.#camera2D = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0, 30 );

    scene.background = new THREE.CanvasTexture(this.#canvas);
    // https://threejs.org/docs/#api/en/textures/CanvasTexture

    // let material = new THREE.MeshBasicMaterial( {map: texture} );
    // material.transparent = true;
    // material.depthTest = false;
    // material.depthWrite = false;

    // this.#lineMaterial = new THREE.LineBasicMaterial({ 
    //   color: config.colors.white, 
    //   vertexColors: false,
    //   linewidth: 1,
    //   opacity: 1,
    //   transparent: true
    // })
  }

  setSize (width, height) {
    this.#width = width;
    this.#height = height;
    this.#canvas.width = width;
    this.#canvas.height = height;

    // this.#camera2D.left = width / -2;
    // this.#camera2D.right = width / 2;
    // this.#camera2D.top = height / 2;
    // this.#camera2D.bottom = height / -2;
    // this.#camera2D.updateProjectionMatrix();
  }

  drawNewLine () {
 
  }

  updateLines () {

  }

  clear () {
    this.#context.save();
    this.#context.clearRect(0, 0, this.#width, this.#height); // fillRect
  } // 高宽改变时，画布内容会被清空，需要重新绘制

  
}

// Cannot access 'whenPaused' before initialization. this: undefined
// so using es6 class.
class WhenPaused {
  static #divideX = 6;
  static #renderLoopPtr = null; // function ptr
  // static #renderLoopPtr = this.#renderLoop;
  // Cannot read private member #renderLoop from an object whose class did not declare it
  constructor() {

  }

  static #speed_sea = config.speed_sea / this.#divideX;
  static #speed_sky = config.speed_sky / this.#divideX;

  static #renderLoop = (that => 
    () => {
      updatePlane();
      updateBackground(that.#speed_sea, that.#speed_sky);
      renderer.render(scene, camera);
      requestAnimationFrame(that.#renderLoopPtr); // ptr, invoked by window so closure necessary
    }
  )(this) // this: WhenPaused, whether renderLoop is a static method or not

  static start () {
    userInteraction.removeListeners();
    this.#renderLoopPtr = this.#renderLoop;
    airplane.defaultPropellerSpeed /= this.#divideX;
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
  // HANDLE MOUSE EVENTS
  
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
  scene.add(airplane.mesh);
}

function createSea(){
  sea = new Sea();
  sea.mesh.position.y = -600;
  scene.add(sea.mesh);
}

function createSky() {
  sky = new Sky();
  sky.mesh.position.y = -600;
  scene.add(sky.mesh);
}

function updatePlane() {
  const targetY = normalize(userInteraction.relativePos.y, -.75, .75, 25, 175);
  airplane.mesh.position.y += (targetY - airplane.mesh.position.y) * 0.1; // 每帧向新的目标点飞去1/10的距离。
  airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * 0.0128; // 飞机与x轴角度随鼠标上下移动而变化
  airplane.mesh.rotation.x = (airplane.mesh.position.y - targetY) * 0.0064; // 飞机与z轴角度随鼠标上下移动而变化
  airplane.propellerSpin(); // 螺旋桨旋转(默认速度0.6)
}

function updateBackground(speed_sea = config.speed_sea, speed_sky = config.speed_sky) {
  sea.moveWaves(); // 海浪
  sea.move(speed_sea);
  sky.move(speed_sky); // 大海的移动 - 天空的移动
}

function updateCameraFov(){ // fov: Field Of View - https://blog.csdn.net/weixin_39675633/article/details/103410983
  camera.fov = normalize(userInteraction.relativePos.x, -1, 1, 40, 80);
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