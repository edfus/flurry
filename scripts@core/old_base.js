// "use strict"; ES6 modules are always in strict mode
// import config from '../scripts@config/config.js'; - deprecated
// config = window.config; - not necessary
// type="module" can still get access to config directly
import { Airplane, Sky, Sea } from '../scripts@core/old_customObject.js';
import UserInteraction from '../scripts@core/ui.js'
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
// can't access these seemingly global variables outside base.js, as base.js is loaded as module
var scene = null,
    camera = null,
    renderer = null;

// 3D Models in customObjects.js
var sea = null, // createdBy new Sea()
    airplane = null, // createdBy new Airplane()
    sky = null; // createdBy new Sky()

const userInteraction = new UserInteraction();

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
    let str = ''
    let i = 0;
    for(const ch of navigator.userAgent) {
      str += (value[i] ^ this.#map[ch.codePointAt(0) & (this.#map.length - 1)]).toString(16);
      if(++i >= value.length)
        i = 0;
    } // as navigator.userAgent length is usually longer...
    return str;
  }
  
  #decrypt (value) { 
    if(typeof value !== "string")
      return 0;
    const separatorI = value.lastIndexOf('1ec')
    if(separatorI === -1)
      return 0;
    const data = parseInt(value.substring(0, separatorI), 16); // parseInt
    const check = value.substring(separatorI + 3, value.length);
    if(this.#algorithm(data) === check)
      return data;
    else return 0;
  }
  
  #encrypt (value) {
    return value.toString(16) + '1ec' + this.#algorithm(value);
  }
}

var score = null; // to fix

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

////////////////////////////////////////

window.addEventListener('load', ()=>{
  // loading: 0 ms

  createScene();
  createLights();
  createObjects();

  // loading: 157.890869140625 ms
  userInteraction.addResizeCallback(() => {
    renderer.setSize(userInteraction.WIDTH, userInteraction.HEIGHT);
    camera.aspect = userInteraction.WIDTH / userInteraction.HEIGHT; // camera的aspect应和renderer.setSize的纵横比相同
    camera.updateProjectionMatrix(); 
  })
  if(config.testMode){
    userInteraction.addResizeCallback(() => config.cameraHelper.update());
  }

  userInteraction.addListeners(); 

  config.getContainer().appendChild(renderer.domElement);
  config.getUIContainer().append(userInteraction.canvas2D.domElement); // might be ''
  config.gameStartCallback();
  // loading: 160.85498046875 ms
  score = new Score(config.getScoreContainer(), config.speed_score)
  userInteraction.addUnloadCallback(() => score.store());
  score.start();
    
  (function renderLoop() { // immediate function前不加;会出各种各样奇奇怪怪的错
    if(!window.paused){
      //TODO: if(crashed)
      updatePlane();
      updateBackground();
      updateCameraFov();
      renderer.render(scene, camera);
      userInteraction.canvas2D.paint();
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
}, {passive: true, once: true});

///////////////////////////

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


///////////////////////////////////////
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