import UserInteraction from '../scripts@miscellaneous/ui.js';
import Score from '../scripts@miscellaneous/score.js';
import audio from '../scripts@miscellaneous/audioWorker.js';
import load from '../scripts@loader/loader.js';
import EventLoop from '../scripts@miscellaneous/eventLoop.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@v0.121.0/build/three.module.min.js';

class Game {
  constructor() { 
    this.config = window.config;
    this.colors = this.config.colors;
    this.ui = new UserInteraction();
    this.audio = audio;
    this.event = new EventLoop();
    this.state = {};
    this.load = load;
    this.init();
  }

  /* main functions */
  init() {
    this._createScene(this.ui.WIDTH, this.ui.HEIGHT);

    this.lights = this._createLights();
    this.scene.add.apply(this.scene, Object.values(this.lights));

    this.objects = this._createObjects();
    this.scene.add.apply(this.scene, Object.values(this.objects));
    this.models = {};
    this._loadModels(); // multi thread
    
    this.camera.position.set(200, 200, 200);
    this.camera.lookAt(100, 100, 100);
    // this.camera.rotation.set(-180, 0, 180)
    // this.camera.lookAt(this.objects.plane.position);

    this.ui.addResizeCallback(() => {
      this.renderer.setSize(this.ui.WIDTH, this.ui.HEIGHT);
      this.camera.aspect = this.ui.WIDTH / this.ui.HEIGHT; 
      this.camera.updateProjectionMatrix(); 
    })
    this.score = new Score(this.config.speed_score);
    this.ui.addUnloadCallback(() => this.score.store());

    this.config.testMode ? this._debug() : void 0;
  
    this.event.dispatch("inited");
    this.state.inited = true;
  }

  _debug () {
    this.scene.add(new THREE.AxesHelper(500))
    this.addCameraHelper(this.camera)
    this.addBoxHelper(Object.values(this.objects))
    this.event.addListener("modelsAllLoaded", () => {
      this.addBoxHelper(Object.values(this.models))
    }, {once: true});
    import("../lib/OrbitControls.js").then(({OrbitControls}) => {
      this._controls = new OrbitControls( this.camera, this.renderer.domElement );
      const throttleLog = new ThrottleLog(1600);
      this.addUpdateFunc(() => 
        throttleLog.log(`position: (${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)})`, 
        `\nrotation: (${this.camera.rotation._x.toFixed(1)}, ${this.camera.rotation._y.toFixed(1)}, ${this.camera.rotation._z.toFixed(1)})`)
      )
    })
  }

  start () {
    this.event.dispatch("start");
    this.ui.addListeners(); 
    this.config.getContainer().append(this.renderer.domElement);
    this.config.getUIContainer().append(this.ui.canvas2D.domElement);
    this.config.gameStartCallback();
  
    this.score.bind(this.config.getScoreContainer());
    this.score.start();
    this._log();
    this.state.started = true;
  }
  
  #updateCallbackQueue = []
  addUpdateFunc (func) {
    this.#updateCallbackQueue.push(func);
  }
  update () {
    this.#updateCallbackQueue.forEach(e => void e());
  }

  /* scene and camera */
  _createScene (width, height) {
    this.scene = new THREE.Scene();
    // this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
    
    const setting = this.config.cameraSetting;
    this.camera = new THREE.PerspectiveCamera(
        setting.fieldOfView,
        setting.aspectRatio,
        setting.nearPlane,
        setting.farPlane
      );

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
  }

  /* lights */
  _createLights () {
    const shadowLight = new THREE.DirectionalLight(0xffffff, .9);
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
    return {
      ambientLight: new THREE.AmbientLight(0xdc8874, .5),
      hemisphereLight: new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9),
      shadowLight: shadowLight
    };
  }

  /* createObjects */
  _createObjects () {
    // other objects
    const geometry = new THREE.BoxGeometry(100, 100, 100);
    const material = new THREE.MeshPhongMaterial({
      color: this.colors.red,
      flatShading: THREE.FlatShading
    });
    const testCube = new THREE.Mesh(geometry, material);
    this.addUpdateFunc(() => {
      testCube.rotation.x += .008
      testCube.rotation.z += .003
    });
    return ({ 
      testCube
    })
  }

  async _loadModels () {
    return Promise.allSettled(
      [
        ['/resource/obj/biplane0.obj', 
          plane => {
            plane = new THREE.ObjectLoader().parse(plane)
            plane.traverse(child => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshBasicMaterial({
                  // map: new THREE.TextureLoader().load("/test/naitou.jpg"),
                  color: 0xffffff,
                  side: THREE.DoubleSide
                });
              }
            });
            plane.scale.set(0.05, 0.05, 0.05);
            // plane.scale.set(1, 1, 1);
            // this.addUpdateFunc(() => {
            //   plane.rotation.x += .008;
            //   plane.rotation.z += .003;
            // });
            this.models.plane = plane;
          }
        ]
      ].map(([path, callback]) => this.load(path, callback)))
       .then(results => {
        for (const result of results) {
          if (result.status !== "fulfilled")
            return Promise.reject(result.reason);
        }
        this.event.dispatch("modelsAllLoaded");
        this.scene.add.apply(this.scene, Object.values(this.models));
      })
  }

  /* Helpers(used in _debug) */
  addCameraHelper (camera) {
    const helper = new THREE.CameraHelper(camera);
    this.scene.add(helper);
    this.ui.addResizeCallback(() => helper.update());
  }

  addBoxHelper (obj3D) {
    if(Array.isArray(obj3D))
      obj3D.forEach(e => {
        e.boxHelper = new THREE.BoxHelper(e.mesh, 0x00ff00);
        this.scene.add(e.boxHelper);
        this.addUpdateFunc(() => e.boxHelper.update());
        return ;
      })
    else {
      obj3D.boxHelper = new THREE.BoxHelper(obj3D.mesh, 0x00ff00);
      this.scene.add(obj3D.boxHelper);
      this.addUpdateFunc(() => obj3D.boxHelper.update());
    }
  }

  /* Examples */
  #broadPhaseDetect (obj_vector3) {
    return this.airplane.mesh.position.clone().sub(obj_vector3).length - 3; // 3 - tolerance
  }

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
    // scene.add(group);
  }
  #flyControls () {
    //TODO: 调查此，检查其是否符合我们的需求
    var flyControls = new THREE.FlyControls(camera);
    flyControls.movementSpeed = 25;
    flyControls.domElement = this.config.getContainer();
    flyControls.rollSpeed = Math.PI / 24;
    flyControls.autoForward = true;
  }
  #isCollided(obj3d, collidableMeshList) {
    const vertices = obj3d.geometry.vertices;
    const position = obj3d.position;
    for(let i = vertices.length - 1; i >= 0; i--) {
      const localVertex = vertices[i].clone();
      const globalVertex = localVertex.applyMatrix4(obj3d.matrix);
      const directionVector = globalVertex.sub(position);
  
      const ray = new THREE.Raycaster(position, directionVector.clone().normalize());
      const collisionResults = ray.intersectObjects(collidableMeshList);
      if(collisionResults.length > 0 && collisionResults[0].distance < directionVector.length())
          return true;
    }
    return false;
  }
  _log () {
    let mode = ['production', '#42c02e'];
    if(this.config.testMode)
      mode = ['development', '#f25346'];
    const titleStyle = "padding: 1px; border-radius: 3px 0 0 3px; color: #fff; background: #606060;",
          subStyle = "padding: 1px; border-radius: 0 3px 3px 0; color: #fff; background";
    const ua = navigator.userAgent.toString();
    console.info([
      ' ______   __       __  __   ______    ______    __  __    ',
      '/_____/\\ /_/\\     /_/\\/_/\\ /_____/\\  /_____/\\  /_/\\/_/\\   ',
      '\\::::_\\/_\\:\\ \\    \\:\\ \\:\\ \\\\:::_ \\ \\ \\:::_ \\ \\ \\ \\ \\ \\ \\  ',
      ' \\:\\/___/\\\\:\\ \\    \\:\\ \\:\\ \\\\:(_) ) )_\\:(_) ) )_\\:\\_\\ \\ \\ ',
      '  \\:::._\\/ \\:\\ \\____\\:\\ \\:\\ \\\\: __ `\\ \\\\: __ `\\ \\\\::::_\\/ ',
      '   \\:\\ \\    \\:\\/___/\\\\:\\_\\:\\ \\\\ \\ `\\ \\ \\\\ \\ `\\ \\ \\ \\::\\ \\ ',
      '    \\_\\/     \\_____\\/ \\_____\\/ \\_\\/ \\_\\/ \\_\\/ \\_\\/  \\__\\/ ',
    ].join('\n'))
    console.info(`%c Version %c ${this.config.version} `, titleStyle, `${subStyle}: #F5986E;`)
    console.info(`%c Environment %c ${mode[0]} `, titleStyle, `${subStyle}: ${mode[1]};`)
    console.info(`%c Browser %c ${ua.slice(ua.lastIndexOf(') ') + 2, ua.length)} `, titleStyle, `${subStyle}: #1475b2;`)
    console.info(`%c Platform %c ${ua.match(/(?<=\().*?(?=\))/)[0]} `, titleStyle, `${subStyle}: #1475b2;`)
  }
}

window.game = new Game();
////////////////////////////////
game.paused = false; // explicit

game.pause = new class { // result in changing game.paused
  init () { 
    // all methods related to changing game state
    document.addEventListener("visibilitychange", () => {
      if(document.visibilityState === 'visible') {
        // game.audio.fadeIn(4);
        game.paused = false; 
      } else {
        game.paused = true;
        // game.audio.fadeOut(20);
      }
    }, {passive: true});

    Dialog.addEventListener('dialogShow', () => {
      game.paused = true;
    })

    this.pauseButton = document.querySelector(".ui-button.pause");
    this._addButtonListener = () => this.pauseButton.addEventListener("click", () => {
      game.paused = true;
      game.audio.fadeOut();
      this.pauseButton.dataset.triggered = "true";
    }, {passive: true, once: true});
    this._addButtonListener();
  }

  async waitForUserContinue () {
    return new Promise((resolve, reject) => {
      if(Dialog.isBusy)
        Dialog.addOnceListener('dialogHide', () => 
          resolve(game.paused = false)
        )
      else if(this.pauseButton.dataset.triggered) {
        delete this.pauseButton.dataset.triggered;
        //TODO
      }
    })
  }
  /* logic when game paused */
  renderLoop_whenPaused () {
    // do sth...
    requestAnimationFrame(() => this.#renderLoopPtr());
  }

  #renderLoopPtr = this.renderLoop_whenPaused;

  start () {
    game.score.pause()
    game.ui.removeListeners();
    this.#renderLoopPtr = this.renderLoop_whenPaused;
    this.renderLoop_whenPaused();
    this.waitForUserContinue()
      .then(() => {
        this.backTo(game.renderLoop.bind(game));
        game.score.start()
      })
      .catch(err => {s
        backToTitle().then(() => game.renderLoop())
        // game.audio.playSong("intro")
      })
  }
  backTo (newRenderLoop) {
    game.ui.addListeners();
    this.#renderLoopPtr = newRenderLoop;
  }
}

game.renderLoop = function () {
  if(!this.paused){
    //TODO: if(crashed)
    this.update();
    this.renderer.render(this.scene, this.camera);
    this.ui.canvas2D.paint();
    requestAnimationFrame(() => this.renderLoop());
  } else {
    console.info('RenderLoop: game paused');
    this.pause.start();
  }
}

game.event.addListener("start", () => {
  game.pause.init();
  game.renderLoop();
}, {once: true});

window.addEventListener("load", () => {
  game.state.inited 
  ? game.start()
  : game.event.addListener("inited", () => game.start(), {once: true});
}, {passive: true, once: true})