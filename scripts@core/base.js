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
    sea.mesh.rotation.z += config.speed_sea; // 大海的移动
    sky.mesh.rotation.z += config.speed_sky; // 天空的移动
    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  })() // (function x(){})(): 一种直接调用函数的技巧，可在函数申明后直接调用它。 
}, {passive: true});


function createScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf7d9aa, 100, 950); //NOTE： fog的效果是？

  const setting = config.cameraSetting;
  camera = new THREE.PerspectiveCamera(
      setting.fieldOfView,
      setting.aspectRatio,
      setting.nearPlane,
      setting.farPlane
    ); // PerspectiveCamera
  Object.assign(camera.position, new THREE.Vector3(0, 100, 200));
  /*
  *  Object.assign(target, source)
  *  将一个原对象上的属性拷贝到另一个目标对象上，最终结果取两个对象的并集，如果有冲突的属性，则以原对象上属性为主，表现上就是直接覆盖过去
  *  但很可惜的是，Object.assign 只是浅拷贝，它只处理第一层属性，如果属性是基本类型，则值拷贝，如果是对象类型，则引用拷贝，如果有冲突，则整个覆盖过去。
  */
  // 删除对象属性: delete result['xxx']

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
  let ambientLight, // 暂时未创建？
    hemisphereLight, shadowLight;
  
  //NOTE: 这几种光源有什么区别？我们该将大部分注意力放在哪一个光源处？光源的颜色又该选择哪一个？

  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9);
  scene.add(hemisphereLight);

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

  // ambientLight...
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
  const normalize = (mouseRP, mouseRP_min, mouseRP_max, planePosition_min, planePosition_max) => {
    let mouseRPinBox = Math.max(Math.min(mouseRP, mouseRP_max), mouseRP_min);
    let mouseRPrange = mouseRP_max - mouseRP_min;
    let ratio = (mouseRPinBox - mouseRP_min) / mouseRPrange;
    let planePositionRange = planePosition_max - planePosition_min;
    return planePosition_min + (ratio * planePositionRange);
  } // 按比例移动plane，防止plane随着鼠标移动而越界。
  airplane.mesh.position.y = normalize(mouseRelativePos.y, -.75, .75, 25,  175);
  airplane.mesh.position.x = normalize(mouseRelativePos.x, -.75, .75, -100,  100);
  airplane.propellerSpin();
}

//FIX: THREE.Geometry: .applyMatrix() has been renamed to .applyMatrix4().
//FIX: THREE.MeshPhongMaterial: .shading has been removed. Use the boolean .flatShading instead.
//TODO: 相机旋转跟随飞机旋转的延迟问题