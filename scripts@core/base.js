class game {
  #pi = Math.PI; // private field
  #scene = null;
  #camera = null;
  #songPlayer = window.songPlayer;
  #paused = false;
  constructor() { 
    // 创建场景、相机、渲染器
  } 
  init() {
    // 创建灯光、隧道等静态物体
    // trigger an event
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
//////////////////////////////// game's child objects
import UserInteraction from '../scripts@core/ui.js';

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
