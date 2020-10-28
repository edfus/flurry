/* constructors */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@v0.121.0/build/three.module.min.js';
//TODO: replace * for tree shaking concern
import UserInteraction from '../scripts@miscellaneous/UI.js';
import Event from '../scripts@miscellaneous/EventDispatcher.js';
import RenderLoop from '../scripts@miscellaneous/RenderLoop.js';
import AudioPlayer from '../scripts@miscellaneous/AudioWorker.js';
import Score from '../scripts@miscellaneous/Score.js';

/* class Game */
class Game {
  /** 原则：
   * game的start、resume、pause、end等函数中不涉及ui的显隐控制，音乐播放等
   * game通过eventDispatcher控制renderLoop。
   * 能只dispatch event的状态函数，就不要设置this.state.inited = true。
   * renderLoop中不修改game.state
   * renderLoop中不涉及THREE.js的模型创建、光影更改、碰撞判定等，只调用game的相关函数。
   */
  constructor() {
    this.config = window.config;
    this.colors = this.config.colors;
    this.ui = new UserInteraction();
    this.audio = new AudioPlayer();
    this.state = {};
    this.event = new Event();
    this.event.addListener("newEvent", eventName => this.state.now = eventName); // RenderLoop relies on this
    this._load = {};
    this.init();
  }

  /* main functions */
  init() {
    this.event.dispatch("init");
    this._createScene(this.ui.WIDTH, this.ui.HEIGHT);
    this.tunnel = this._createTunnel();
    this.scene.add(this.tunnel);

    this.lights = this._createLights();
    this.scene.add.apply(this.scene, Object.values(this.lights));

    // this.objects = this._createObjects();
    // this.scene.add.apply(this.scene, Object.values(this.objects));

    this.models = {};
    this._loadObjs(this.path_callback_Array).then(() => {
      this.event.dispatch("modelsAllLoaded");
      this.scene.add.apply(this.scene, Object.values(this.models));
    });
    
    this.camera.position.set(-8.2, -8.2, -318.2);
    this.camera.rotation.set(3.0, 0, 3.146)

    this.constructRenderLoops();

    this.ui.event.addListener("resize", () => {
      this.renderer.setSize(this.ui.WIDTH, this.ui.HEIGHT);
      this.camera.aspect = this.ui.WIDTH / this.ui.HEIGHT; 
      this.camera.updateProjectionMatrix(); 
    })
    this.score = new Score(this.config.speed_score);
    this.ui.event.addListener("beforeunload", () => this.score.store());

    this.ui.initButtons();
    this.ui.addListeners();

    this.config.testMode ? this._debug() : void 0;
  
    this.event.dispatch("inited");
    this.state.inited = true;
  }

  load () {
    this.event.dispatch("load");
    this.config.getContainer().append(this.renderer.domElement);
    this.config.getUIContainer().append(this.ui.canvas2D.domElement);
    this.score.bind(this.config.getScoreContainer());
    this.config.gameLoadedCallback();
    this._log();
    this.event.dispatch("loaded");
    this.state.loaded = true; 
  }

  start () {
    this.event.dispatch("start");
    setTimeout(() => {
      this.event.dispatch("started");
      this.state.started = true;
      this.time = {
        lastStamp: Date.now(), // milliseconds
        total: 0,
        paused: 0
      }
    }, 100) //TODO: start animation
  }

  pause () {
    this.event.dispatch("pause");
    if(this.state.started) {
      this.time.total += Date.now() - this.time.lastStamp;
      this.time.lastStamp = Date.now();
    }
  }

  resume () {
    this.event.dispatch("resume");
    if(this.state.started) {
      this.time.paused += Date.now() - this.time.lastStamp;
      this.time.lastStamp = Date.now();
    }
  }

  end () {
    this.event.dispatch("end");
    this.state.started = false;
    setTimeout(() => this.event.dispatch("ended"), 300); //TODO: backToTitle animation
  }

  constructRenderLoops () {
    RenderLoop._game = this;
    this.renderLoop = RenderLoop;
    RenderLoop.add(
      new RenderLoop("idle")
                    .executeOnce(() => this.ui.freeze())
                    .execute(() => {
                        this.renderer.render(this.scene, this.camera);
                        this.ui.canvas2D.paint();
                      })
                    .untilGameStateBecomes("start")
                      .then(() => {
                          RenderLoop.goto("startAnimation")
                          console.info('RenderLoop: game starts');
                        }),
      new RenderLoop("startAnimation")
                    .executeOnce(() => {
                        this.ui.startButton.hide();
                        this.ui.titleMenuButtons.hide().then(() => {
                          this.ui.pauseButton.show();
                        });
                        this.audio.playNext(true);
                      })
                    .execute(() => {
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilGameStateBecomes("started")
                      .then(() => {
                          this.score.start();
                          this.ui.unfreeze()
                          RenderLoop.goto("main")
                        }),
      new RenderLoop("main")
                    .execute(() => {
                        //TODO: if(crashed)
                        this.update();
                        this.renderer.render(this.scene, this.camera);
                      }),
      new RenderLoop("paused")
                    .executeOnce(() => {
                        this.score.pause();
                        this.ui.freeze();
                      })
                    .execute(() => {
                        this.ui.canvas2D.paint();
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilPromise(() => this.whenPaused.listenUserResume())
                      .then(() => {
                        this.score.start();
                        this.ui.unfreeze();
                        RenderLoop.goto("main");
                        console.info('RenderLoop: game resumed');
                      })
                      .else(() => {
                        this.ui.homeButton.hide(true);
                        this.ui.startButton.hide();
                        if(this.time.total > 180000) {
                          this.audio.cancelFadeOut();
                          this.audio.playSong("outro")
                        }
                        RenderLoop.goto("backToTitle")
                      }),
      new RenderLoop("backToTitle")
                    .execute(() => {
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilGameStateBecomes("ended")
                      .then(() => {
                          this.ui.titleMenuButtons.show().then(() => {
                            this.ui.startButton.show();
                          });
                          this.audio.scheduleSong("intro", true, 6)
                          RenderLoop.goto("idle")
                          console.info('RenderLoop: game ended');
                        })
    )
    .goto("idle")
    .wheneverGame("pause")
      .then(() => {
        if(this.state.started) { //FIX: when in startAnim 
          console.info('RenderLoop: game paused');
          RenderLoop.goto("paused")
        }
      });

    /* init -> inited, (直接)
     * load -> loaded, (等待DOM加载后)
     * start -> started. (用户开始游戏后)
     * pause, resume. (用户交互)
     * end -> ended     
     */
  }

  /* debugger */
  _debug () {
    this.scene.add(new THREE.AxesHelper(500))
    this.addCameraHelper(this.camera)
    // this.addBoxHelper(Object.values(this.objects))
    this.event.addListener("modelsAllLoaded", () => {
      this.addBoxHelper(Object.values(this.models))
    }, {once: true});
    /* dynamic import */
    import("../lib/OrbitControls.js").then(({OrbitControls}) => {
      this.event.addListener("started", () => {
        this._controls = new OrbitControls(this.camera, this.renderer.domElement);
        const throttleLog = new ThrottleLog(1600);
        this.addUpdateFunc(() => 
          throttleLog.log(`position: (${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)})`, 
          `\nrotation: (${this.camera.rotation._x.toFixed(1)}, ${this.camera.rotation._y.toFixed(1)}, ${this.camera.rotation._z.toFixed(1)})`)
        )
        this.event.addListener("pause", () => this._controls.enabled = false, {once: false})
        this.event.addListener("resume", () => this._controls.enabled = true, {once: false})
      }, {once: true})
    })
  }

  /* scene and camera */
  _createScene (width, height) {
    this.scene = new THREE.Scene();
     this.scene.background = new THREE.Color(0xa5a4a4);
    this.scene.fog = new THREE.Fog(0x555555, 100, 950);
    
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

  _createTunnel () {
    let points = [];
    for (let i = 0; i < 200; i += 1) {
      points.push(new THREE.Vector3(-8.2, -8.2 + 0.5 * i, -300 + 25 * (i / 4)));
    }
    const curve = new THREE.CatmullRomCurve3(points)
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 200, 50, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({
      side: THREE.BackSide,
      color: 0xffffff
    });
    const tunnel = new THREE.Mesh(tubeGeometry, tubeMaterial);
    return tunnel;
  }
  /* lights */
  _createLights () {
    const spotLight = new THREE.SpotLight();
    spotLight.color = new THREE.Color(0x555555);
    spotLight.castShadow = true;
    spotLight.position.set(20, -80, -400);
    spotLight.intensity = 1; // 光的强度 默认值为1
    spotLight.distance = 500; // 从发光点发出的距离，光的亮度，会随着距离的远近线性衰减
    spotLight.angle = 0.4; // 光色散角度，默认是 Math.PI * 2
    spotLight.penumbra = 0.1; // 光影的减弱程度，默认值为0， 取值范围 0 -- 1之间
    spotLight.decay = 1; // 光在距离上的量值, 和光的强度类似（衰减指数）
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024; // 设置阴影分辨率
    spotLight.shadow.camera.near = 0.1; // 投影近点 --> 从距离光源的哪一才产生阴影
    spotLight.shadow.camera.far = 300; // 投影原点 --> 到光源的哪一点位置不产生阴影
    spotLight.shadow.camera.fov = 10; // 投影视场
    var target = new THREE.Object3D();
    target.position.set(0, 0, 0);
    spotLight.target = target;
    //  const light = new THREE.PointLight( 0xdf1491, 1, 10000 );
    //  light.position.set( 0, 0, 0 );
    return {
        ambientLight: new THREE.AmbientLight(0xFFFFFF*Math.random(), 1),
        spotLight: spotLight,
     // light
    };
  }

  // /* createObjects */
  // _createObjects () {
  //   // other objects
  //   const geometry = new THREE.BoxGeometry(100, 100, 100);
  //   const material = new THREE.MeshPhongMaterial({
  //     color: this.colors.red,
  //     flatShading: THREE.FlatShading
  //   });
  //   const testCube = new THREE.Mesh(geometry, material);
  //   this.addUpdateFunc(() => {
  //     testCube.rotation.x += .008
  //     testCube.rotation.z += .003
  //   });
  //   testCube.scale.set(0.1, 0.1, 0.1);
  //   testCube.position.set(-180, 40, 80);
  //   return ({ 
  //     testCube
  //   })
  // }

  path_callback_Array = [
    ['/resource/obj/biplane0.obj', //FIX: biplane7.obj加载后无法显示
      plane => {
        plane.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshBasicMaterial({
              // map: new THREE.TextureLoader().load("/test/naitou.jpg"),
              color: 0x9e4b4b,
              // color: 0xffffff,
              side: THREE.DoubleSide
            });
          }
        });
        plane.scale.set(0.05, 0.05, 0.05);
        this.models.plane = plane;
      }
    ]
  ]

  /* load obj files using main thread */
  async _loadglTFs (path_callback_Array) {
    if(!this._load.glTF) {
      const temp = new (await import('../scripts@loader/GLTFLoader.js')).GLTFLoader;
      this._load.glTF = temp.load.bind(temp);
    }
    return Promise.allSettled(
      path_callback_Array.map(([path, callback]) => new Promise(resolve => this._load.glTF(path, result => resolve(callback(result))))))
       .then(results => {
        for (const result of results) {
          if (result.status !== "fulfilled")
            return Promise.reject(result.reason);
        }
      })
  }

  /* load obj files using main thread */
  async _loadObjs (path_callback_Array) {
    if(!this._load.obj) {
      const temp = new (await import('../scripts@loader/OBJLoader2.js')).OBJLoader2;
      this._load.obj = temp.load.bind(temp);
    }
    return Promise.allSettled(
      path_callback_Array.map(([path, callback]) => new Promise(resolve => this._load.obj(path, result => resolve(callback(result))))))
       .then(results => {
        for (const result of results) {
          if (result.status !== "fulfilled")
            return Promise.reject(result.reason);
        }
      })
  }

  /* load obj files by worker */
  async _loadObjsByWorker (path_callback_Array) {
    if(!this._load.obj_worker) {
      const temp = new (await import('../scripts@loader/OBJLoader2Parallel.js')).OBJLoader2Parallel;
      this._load.obj_worker = temp.load.bind(temp);
    }
    return Promise.allSettled(
      path_callback_Array.map(([path, callback]) => new Promise(resolve => this._load.obj_worker(path, result => resolve(callback(result))))))
       .then(results => {
        for (const result of results) {
          if (result.status !== "fulfilled")
            return Promise.reject(result.reason);
        }
      })
  }
  /* Unvarying functions */
  
  #updateCallbackQueue = []
  addUpdateFunc (func) {
    this.#updateCallbackQueue.push(func);
  }
  update () {
    this.#updateCallbackQueue.forEach(e => void e());
  }

  /* Helpers(used in _debug) */
  addCameraHelper (camera) {
    const helper = new THREE.CameraHelper(camera);
    this.scene.add(helper);
    this.ui.event.addListener("resize", () => helper.update())
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

game.whenPaused = new class {
  resolve () {
    if(this._resolve)
      this._resolve();
    this._reject = null;
    this._resolve = null;
  }
  reject () {
    if(this._reject)
      this._reject();
    this._reject = null;
    this._resolve = null;
  }
  init () { // all methods related to changing game state
    document.addEventListener("visibilitychange", () => {
      if(document.visibilityState === 'visible') {
        game.audio.fadeIn(4);
        this.resolve(game.resume()) //FIX
      } else {
        game.audio.fadeOut(20);
        game.pause();
      }
    }, {passive: true});

    if(Dialog.isBusy) {
      game.pause()
    }
    Dialog.addEventListener('dialogShow', () => game.pause())
    Dialog.addEventListener('dialogHide', () => this.resolve(game.resume()))

    game.event.addListener("started", () => this.initButtons(), {once: true})
  }

  initButtons () {
    game.ui.startButton.addTriggerCallback(async () => {
      this.resolve(game.resume())
      
      game.ui.startButton.hide();
      await game.ui.pauseButton.show();
      game.audio.fadeIn(4);
      game.ui.pauseButton.listenOnce();
    }, {once: false})

    game.ui.pauseButton.addTriggerCallback(async () => {
        game.pause();

        await game.ui.pauseButton.hide();
        game.audio.fadeOut(10)
        await game.ui.startButton.show();
        game.ui.startButton.listenOnce();
      }, {once: false})
    .listenOnce();

    game.ui.homeButton.addTriggerCallback(async () => this.reject(game.end()), {once: true})
                      .listenOnce();
  }

  async listenUserResume () {
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    })
  }
}

game.event.addListener("loaded", () => {
  game.whenPaused.init();
  game.renderLoop.start();

  game.ui.startButton.addTriggerCallback(() => game.start(), {once: true})
                     .listenOnce();
}, {once: true});

window.addEventListener("load", () => {
  game.state.inited 
  ? game.load()
  : game.event.addListener("inited", () => game.load(), {once: true});
}, {passive: true, once: true})