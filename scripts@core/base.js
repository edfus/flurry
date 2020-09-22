import config from '../scripts@config/config.js';
import {Airplane, Sky, Sea} from '../scripts@core/customObject.js';
/////////////////////////////////
{
  let mode = ['production', '#42c02e'];
  if(config.testMode)
    mode = ['development', '#f25346'];
  const titleStyle = "padding: 1px; border-radius: 3px 0 0 3px; color: #fff; background: #606060;",
        subStyle = "padding: 1px; border-radius: 0 3px 3px 0; color: #fff; background";

  console.info(`%c Version %c ${config.version} `, titleStyle, `${subStyle}: #F5986E;`)
  console.info(`%c Environment %c ${mode[0]} `, titleStyle, `${subStyle}: ${mode[1]};`)
  console.info(`%c Browser %c ${navigator.userAgent.split(' (')[0]} `, titleStyle, `${subStyle}: #1475b2;`)
  console.info(`%c Platform %c ${navigator.userAgent.split('(')[1].split(')')[0]} `, titleStyle, `${subStyle}: #1475b2;`)
}
////////////////////////////////
//SCREEN & MOUSE VARIABLES

var HEIGHT = window.innerHeight, WIDTH = window.innerWidth, // will be changed in window resize event
    mouseRelativePos = { x: 0, y: 0 };

//SCENE & CAMERA VARIABLES

var scene = null,
    camera = null,
    renderer = null;

// 3D Models in customObjects.js
var sea = null, // createdBy new Sea()
    airplane = null, // createdBy new Airplane()
    sky = null; // createdBy new Sky()

///////////////////////////////////////////////////
          
//INIT THREE JS, SCREEN AND MOUSE EVENTS
window.addEventListener('load', ()=>{
  document.addEventListener('mousemove', event => {
    mouseRelativePos = {
      x: -1 + (event.clientX / WIDTH) * 2,
      y: 1 - (event.clientY / HEIGHT) * 2
    };
  }, {passive: true});
  // HANDLE MOUSE EVENTS
  createScene();
  createLights();

  createObjects();

  (function renderLoop(){
    // 循环函数，在每帧更新对象的位置和渲染场景
    //TODO: 在renderLoop中完成粒子特效等的处理
    //TODO: 完成暂停函数的处理
    updatePlane();
    updateBackground();
    updateCameraFov();
    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  })() // (function x(){})(): 一种直接调用函数的技巧，可在函数申明后直接调用它。 
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
  camera = new THREE.PerspectiveCamera( //NOTE: PerspectiveCamera的设定参数？
      setting.fieldOfView,
      setting.aspectRatio,
      setting.nearPlane,
      setting.farPlane
    );
  Object.assign(camera.position, new THREE.Vector3(0, 100, 200));
  /*
  *  Object.assign(target, source)
  *  将一个原对象上的属性拷贝到另一个目标对象上，最终结果取两个对象的并集，如果有冲突的属性，则以原对象上属性为主，表现上就是直接覆盖过去
  *  但很可惜的是，Object.assign 只是浅拷贝，它只处理第一层属性，如果属性是基本类型，则值拷贝，如果是对象类型，则引用拷贝，如果有冲突，则整个覆盖过去。
  */
  // 删除对象属性: delete obj['xxx']

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMap.enabled = true;

  config.getContainer().appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
  }, {passive: true}); // HANDLE SCREEN EVENTS
}

// LIGHTS
function createLights() {
  /*
  * HemisphereLight：半球光，在空中创造一个球形光源，无法投射出阴影，可在物体上产生反光效果
  * AmbientLight：环境光，没有方向，照亮场景中的所有对象，不能投射阴影或反光
  * DirectionalLight：定向灯，从无限远处设向目标物体或位置的平行光，不能直接控制光线的方向，用法为new THREE.DirectionalLight(光色, 光强度);
  * DirectionalLight.position.set(x = 0, y = 0, z = 0);
  * 可用scene.add(light.target)改变位置 //NOTE: scene.add不是向场景中添加光吗？为什么是改变位置？
  * 或用如下代码使其射向某一有属性的物体
    var targetObject = new THREE.Object3D();
    scene.add(targetObject);
    light.target = targetObject;
  * 颜色均用16进制数表示（0x000为黑色，0xfff为白色（所有颜色的混合即为白）。可参照scripts@config/color.js）
  * 光强度默认为1 
  */
  let ambientLight, hemisphereLight, shadowLight;

  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9);
                 // new THREE.HemisphereLight(天空颜色, 光的接地颜色, 光强度 = 1);
  scene.add(hemisphereLight);

  ambientLight = new THREE.AmbientLight(0xdc8874, .5);
              // new THREE.AmbientLight(光色, 光强度 = 1);
  scene.add(ambientLight);

  shadowLight = new THREE.DirectionalLight(0xffffff, .9);
  shadowLight.position.set(150, 350, 350);
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
  const targetY = normalize(mouseRelativePos.y, -.75, .75, 25, 175);
  airplane.mesh.position.y += (targetY - airplane.mesh.position.y) * 0.1;
  airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * 0.0128; // 飞机与x轴角度随鼠标上下移动而变化
  airplane.mesh.rotation.x = (airplane.mesh.position.y - targetY) * 0.0064; // 飞机与z轴角度随鼠标上下移动而变化
  // 0.1 0.0128 0.0064的选取机制不大清楚……
  airplane.propellerSpin(.6); // 加快螺旋桨旋转速度 (默认速度0.3)
  // 可通过airplane.defaultPropellerSpeed = 0.6直接修改默认速度
  //NOTE: 为什么这里要加快速度？是否需要直接更改 rotationSpeedOfPropeller (customObjects.js)来进一步封装？
}

function updateBackground() {
  sea.moveWaves(); // 海浪
  sea.move(config.speed_sea);
  sky.move(config.speed_sky); // 大海的移动 - 天空的移动
}

function updateCameraFov(){
  camera.fov = normalize(mouseRelativePos.x,-1,1,40, 80);
  camera.updateProjectionMatrix();
}

function normalize(mouseRP, mouseRP_min, mouseRP_max, position_min, position_max) {
  let mouseRPinBox = Math.max(Math.min(mouseRP, mouseRP_max), mouseRP_min);
  let mouseRPrange = mouseRP_max - mouseRP_min;
  let ratio = (mouseRPinBox - mouseRP_min) / mouseRPrange;
  let positionRange = position_max - position_min;
  return position_min + (ratio * positionRange);
} // 根据鼠标位置来返回飞机及相机位置

//FIX: THREE.Geometry: .applyMatrix() has been renamed to .applyMatrix4().
//FIX: THREE.MeshPhongMaterial: .shading has been removed. Use the boolean .flatShading instead.
//TODO: 相机旋转跟随飞机旋转的延迟问题