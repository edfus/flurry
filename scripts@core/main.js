/* constructors */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@v0.121.0/build/three.module.min.js';
//TODO: replace * for tree shaking concern
import UserInteraction from '../scripts@miscellaneous/UI.js';
import Event from '../scripts@miscellaneous/EventDispatcher.js';
import RenderLoop from '../scripts@miscellaneous/RenderLoop.js';
import AudioPlayer from '../scripts@audio/AudioWorker.js';
import Score from '../scripts@miscellaneous/Score.js';
/* objects */
import colors from '../scripts@config/colors.js';

/* class Game */
class Game {
  /** 原则：
   * game的start、resume、pause、end等函数中不涉及ui的显隐控制，音乐播放等
   * game通过eventDispatcher控制renderLoop。
   * 能只dispatch event的状态函数，就不要设置this.state.inited = true。
   * renderLoop中不修改除canBePaused以外的任何game.state
   * renderLoop中不调用除resume以外的任何game的状态函数（start、pause等）
   * renderLoop中不涉及THREE.js的模型创建、光影更改、碰撞判定等，只调用game的相关函数。
   */
  constructor() {
    this.config = window.config;
    this.colors = colors;
    this.ui = new UserInteraction();
    this.audio = new AudioPlayer();
    this.state = {};
    this.event = new Event();
    this.event.addListener("newEvent", eventName => this.state.now = eventName); // RenderLoop relies on this
    this._load = {
      texture: new THREE.TextureLoader()
    };
    this.init();
  }

  /* main functions */
  init() {
    this.event.dispatch("init");
    this._createScene(this.ui.WIDTH, this.ui.HEIGHT);

    this.tunnel = this._createTunnel();
    this.scene.add(this.tunnel.mesh);

    this.lights = this._createLights();
    this.scene.add.apply(this.scene, Object.values(this.lights));
 
    this.models = {};
    this._loadObjs(this.path_callback_Array).then(() => {
      this.event.dispatch("modelsAllLoaded");
      this.scene.add.apply(this.scene, Object.values(this.models));
    });
    
    this.camera.position.set(0, 40, -500);
    this.camera.rotation.set(0, 3.14, 0)

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

  newSceneColor () {
    const color = new THREE.Color(this.colors.sceneColors[parseInt(Math.random() * this.colors.sceneColors.length)]);
    this.event.dispatch("newSceneColor", color)
    return color;
  }
  
  setSceneColor (color_obj) {
    const colorHexValue = color_obj.getHex();
    const rgb = color_obj.getStyle()
    const darkenRGBColor_10 = this.colors.RGB_Linear_Shade(-.1, rgb);
    const darkenRGBColor_20 = this.colors.RGB_Linear_Shade(-.2, rgb);

    this.lights.spotLight.color.setHex(colorHexValue);

    this.lights.sphereLight.material.color.set(darkenRGBColor_10);
    this.lights.sphereLight.material.emissive.set(darkenRGBColor_10);

    if(!this.scene.fog)
      this.scene.fog = new THREE.Fog(darkenRGBColor_20, this.tunnel.farEndOfTunnel - 4 * this.tunnel.radius, this.tunnel.farEndOfTunnel);
    else this.scene.fog.color.set(darkenRGBColor_20)
  }

  idle_begin () {
    this._idle = {}
    this._idle.smoke = this._addSmoke();
    this.scene.add(this._idle.smoke);
    this.event.addListener("update_idle", this._idle.smoke._update_function)
    this._idle.smoke._update_period = "update_idle";

    const color = this.newSceneColor();
    const hsl = this.colors.complementaryOf(color).getHSL({});

    this.setSceneColor(color);
    switch((Math.random() % .3).toFixed(1)) {
      default: 
        this._idle.stars = this._addStars(hsl.h, hsl.s, hsl.l);
        this.scene.add(this._idle.stars)
        this.event.addListener("update_idle", this._idle.stars._update_function);
        this._idle.stars._update_period = "update_idle";
    }
  }

  idle_clear() {
    for(const obj3D in this._idle) {
      this.scene.remove(this._idle[obj3D]);
      this.dispose(this._idle[obj3D])
    }
    delete this._idle;
  }

  dispose (obj) {
    if(obj.children)
      for (let i = 0; i < obj.children.length; i++) {
          this.dispose(obj.children[i]);
      }
    obj.geometry && obj.geometry.dispose();
    if(obj.material) {
      if (obj.material.map)
        obj.material.map.dispose();
      obj.material.dispose();
    }
    if(obj._update_function) {
      if(obj._update_period)
        this.event.removeListener(obj._update_period, obj._update_function)
      else throw "dispose: has obj._update_function, but !obj._update_period";
    }
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
    if(this.state.canBePaused) { // modified in RenderLoop
      this.event.dispatch("pause");
      if(this.state.started) {
        this.time.total += Date.now() - this.time.lastStamp;
        this.time.lastStamp = Date.now();
      }
      this.state.canBePaused = false;
      return true;
    } else return false;
  }

  resume () { // invoked in RenderLoop
    this.event.dispatch("resume");
    if(this.state.started) {
      this.time.paused += Date.now() - this.time.lastStamp;
      this.time.lastStamp = Date.now();
    }
  }

  planeCrash () {
    this.event.dispatch("crashed");
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
                    .executeOnce(() => {
                      this.ui.freeze();
                      this.state.canBePaused = false;
                      this.ui.startButton
                              .addTriggerCallback(() => game.start(), {once: true})
                              .listenOnce();
                      this.ui.canvas2D.enable();
                      this.idle_begin();
                    })
                    .execute(() => {
                        this.renderer.render(this.scene, this.camera);
                        this.ui.canvas2D.paint();
                        this.update_idle();
                      })
                    .untilGameStateBecomes("start")
                      .then(() => {
                          this.idle_clear()
                          this.ui.canvas2D.disable();
                          RenderLoop.goto("startAnimation")
                          console.info('RenderLoop: game starts');
                        }),
      new RenderLoop("startAnimation")
                    .executeOnce(() => {
                        this.ui.startButton.hide();
                        this.ui.titleMenuButtons.hide().then(() => {
                          this.ui.pauseButton.show();
                        });
                        this.audio.cancelScheduledSong("intro", true)
                        this.audio.playNext(true);
                      })
                    .execute(() => {
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilGameStateBecomes("started")
                      .then(() => {
                          this.state.canBePaused = true;
                          this.whenPaused.initButtons();
                          this.score.start();
                          this.ui.unfreeze()
                          RenderLoop.goto("main")
                        }),
      new RenderLoop("main")
                    .execute(() => {
                        this.update();
                        this.renderer.render(this.scene, this.camera);
                        this.update_main();
                      })
                    .untilGameStateBecomes("crashed")
                      .then(() => {
                          this.state.canBePaused = false;
                          this.ui.pauseButton.hide();
                          this.score.pause();
                          this.ui.freeze();
                          if(this.time.total > 180000) {
                            this.audio.cancelFadeOut();
                            this.audio.playSong("outro")
                          }
                          RenderLoop.goto("backToTitle")
                        }),
      new RenderLoop("paused")
                    .executeOnce(() => {
                        this.score.pause();
                        this.ui.freeze();
                        this.ui.canvas2D.enable();
                        (async () => {
                          await this.ui.pauseButton.hide();
                          this.audio.fadeOut(20);
                          await this.ui.startButton.show();
                          this.ui.startButton.listenOnce();
                        })()
                      })
                    .execute(() => {
                        this.ui.canvas2D.paint();
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilPromise(() => this.whenPaused.listenUserResume())
                      .then(() => {
                        ////////////////
                        this.resume() // 因为要严格要求只有在pause后才能resume，所以在此resume
                        // 这是RenderLoop中唯一一处修改游戏状态的函数。
                        ////////////////
                        this.state.canBePaused = true;
                        this.score.start();
                        this.ui.unfreeze();
                        this.ui.canvas2D.disable();
                        (async () => {
                          this.ui.startButton.hide();
                          await this.ui.pauseButton.show();
                          this.audio.fadeIn(4);
                          this.ui.pauseButton.listenOnce();
                        })()
                        RenderLoop.goto("main");
                        console.info('RenderLoop: game resumed');
                      })
                      .else(() => {
                        this.state.canBePaused = false;
                        this.ui.homeButton.hide(true);
                        this.ui.startButton.hide();
                        this.ui.canvas2D.disable();
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
                          this.ui.resetButtonListeners();
                          this.ui.titleMenuButtons.show().then(() => {
                            this.ui.startButton.show();
                          });
                          this.audio.scheduleSong("intro", true, 6)
                          RenderLoop.goto("idle")
                          console.info('RenderLoop: game ended');
                        })
    )
    .keepExecuting(() => this.update())
    .goto("idle")
    .wheneverGame("pause")
      .then(() => {
        console.info('RenderLoop: game paused');
        RenderLoop.goto("paused")
      });

    /* init -> inited, (直接)
     * load -> loaded, (等待DOM加载后)
     * start -> started. (用户开始游戏后)
     * pause, resume. (用户交互)
     * end -> ended     
     */
  }

  /* scene and camera */
  _createScene (width, height) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("black")
    this.scene.name = "mainScene"
    
    const setting = this.config.cameraSetting;
    this.camera = new THREE.PerspectiveCamera(
        setting.fieldOfView,
        setting.aspectRatio,
        setting.nearPlane,
        setting.farPlane
      );

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    this.composer = new THREE.WebGLRenderer({ 	
      powerPreference: "high-performance",
      antialias: false,
      stencil: false,
      depth: false
      // alpha: 
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio( window.devicePixelRatio );
    // this.renderer.shadowMap.enabled = true;
    // this.composer.autoClear = false;
    // composer.setClearColor( 0xffffff );
  }

  _createTunnel () { // performance notice
    const points = [];
    const tunnel = {}
    const maxI = 600;
    const delta = 25 / 4;
    tunnel.closeEndOfTunnel = -300;
    tunnel.lengthOfTunnel = maxI * delta;
    tunnel.farEndOfTunnel = tunnel.lengthOfTunnel + tunnel.closeEndOfTunnel;
    tunnel.radius = 300;

    for (let i = 0; i < maxI; i++) {
      points.push(new THREE.Vector3(0, 0, tunnel.closeEndOfTunnel + delta * i));
    }
    const curve = new THREE.CatmullRomCurve3(points)
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, tunnel.radius, 50, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({
      side: THREE.BackSide,
      color: 0xffffff
    });

    tunnel.mesh = new THREE.Mesh(tubeGeometry, tubeMaterial)
    tunnel.mesh.name = "tunnel";
    return tunnel
  }

  /* lights */
  _createLights () { 
    /* The renderer has a parameter called "maxLights" that defaults to 4. */
    const delta = 1.8

    const spotLight = new THREE.SpotLight(0x0, 3, this.tunnel.lengthOfTunnel * delta);

    const pointlight = new THREE.PointLight( 0xffffff, 0.3, 300 );
    pointlight.position.set( -8, 60, -50 );

    spotLight.angle = Math.atan(this.tunnel.radius / this.tunnel.lengthOfTunnel) * delta;
    spotLight.decay = .3; // decay = 2 leads to physically realistic light falloff
    spotLight.castShadow = false;

    spotLight.position.set(0, 0, this.tunnel.farEndOfTunnel * delta);
    spotLight.target.position.set(0, 0, this.tunnel.closeEndOfTunnel);
    spotLight.target.updateMatrixWorld();

    spotLight.name = "caveLight"

    const geometry = new THREE.SphereGeometry(this.tunnel.radius, 32, 32);

    const sphereLight = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
                                          // emissiveIntensity: 100
                                        }));
    sphereLight.position.set(0, 0, this.tunnel.farEndOfTunnel)
    sphereLight.name = "sphereLight"
    return {
      spotLight,
      sphereLight,
      pointlight
    };
  }

  _composeEffect () {
    const godray = null;
    // https://www.programmersought.com/article/12781728171/ Self-illuminating property.emissive
    // http://bkcore.com/blog/3d/webgl-three-js-volumetric-light-godrays.html godray
    // https://threejs.org/examples/webgl_postprocessing_godrays.html
    // https://medium.com/@andrew_b_berg/volumetric-light-scattering-in-three-js-6e1850680a41

    // https://stackoverflow.com/questions/15354117/three-js-blur-the-frame-buffer

    // https://threejsfundamentals.org/threejs/lessons/threejs-post-processing.html - intro

    // https://discourse.threejs.org/t/solved-effectcomposer-layers/3158/4 - autoClear & layer
    // http://jsfiddle.net/prisoner849/mjfckw02/
    // https://threejs.org/docs/#manual/en/introduction/How-to-use-post-processing
  }

  path_callback_Array = [
    ['/resource/obj/biplane0.obj', 
      plane => {
        const material = new THREE.MeshPhongMaterial({
          // color: this.colors.planeRed,
          color: 0xffffff,
          side: THREE.DoubleSide,
          flatShading: true,
          emissive: this.colors.planeRed,
          emissiveIntensity: 0.7
        });
        plane.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.material = material
          }
        });
        plane.scale.multiplyScalar(0.05);
        plane.rotation.x = this.deg(12);
        plane.name = "plane_obj"

        const position_propeller = new THREE.Vector3(-8, -4, 140);
        const position_headLight = new THREE.Vector3(-8, 25, 1200);
        const group = new THREE.Group();
        group.add(plane);
        group.add(this._createPropeller(0, position_propeller));
        // group.add(this._createHeadLight(this.colors.lightBlue, position_headLight, position_propeller));
        group.position.set(9,-10,0);
        group.name = "plane";
        this.models.plane = group;
        this.event.addListener("update_main", () => {
          group.rotation.z += this.ui.data.rotate_force;
          group.position.y += this.ui.data.up_force
        }) //TODO: 更改rotate_force的计算，使其不突变。rotate_force和up_force在updateData函数中计算（UI.js)
        //TODO：像_old一样，镜头/飞机是缓动的（这需要目标值，而不是force
        //TODO：飞机上移的翘尾效果，相机和飞机的关系到底是什么？
        // 在f12中敲下game.ui._debugEvents()即可获取rotate_force、up_force实时值
        if(!this.ui.isTouchDevice)
          this.event.addListener("update_main", () => {
            group.position.y *= .95
            group.rotation.z *= .95
          }) // 暂时如此
      }
    ]
  ]

  _createHeadLight (color, positionOfFog, positionOfLight) {

    const angle = Math.PI / 15,
          length = 1 / Math.tan(angle) * (this.tunnel.radius * .6);
          
    const spotLight = new THREE.SpotLight(color, .3, length, angle, 0, 2);
    // https://threejs.org/docs/#api/en/lights/SpotLight

    spotLight.target.position.copy(positionOfFog)
    spotLight.target.updateMatrixWorld()
    spotLight.castShadow = false; //

    spotLight.position.copy(positionOfLight)
    const group = new THREE.Group();
    group.add(spotLight);
    if(this.config.testMode)
      this.addSpotLightHelper(spotLight)

    group.name = "plane_headLight"
    return group
  }

  /* createPropeller */
  _createPropeller (intialRotation, position) {
    const geomPropeller = new THREE.BoxGeometry(100, 5, 5);
    const material = new THREE.MeshLambertMaterial({
      color: 0x6d6d6d,
      side: THREE.DoubleSide,
      flatShading: true,
      emissive: this.colors.planeRed,
      emissiveIntensity: 0
    });

    const propeller = new THREE.Mesh(geomPropeller, material);
    propeller.rotation.z = intialRotation;

    const rotation = this.deg(37.4)
    this.event.addListener("update", () => {
      propeller.rotation.z += rotation;
    });
    propeller.position.copy(position);
    propeller.name = "plane_propeller";
    return propeller
  }

  deg(num) {
    return THREE.MathUtils.degToRad(num)
  }

  _addStars(h, s, l, amount = 300) {
    const positions = [];
    const colors = [];
    const opacities = [];
    const rangeX = this.tunnel.radius;
    const rangeY = this.tunnel.radius;
    const rangeZ = this.tunnel.farEndOfTunnel - this.tunnel.radius * 2;

    for(let i = 0, color = new THREE.Color(); i < amount; i++) {
      const x = THREE.MathUtils.randFloat(-rangeX, rangeX );
      const y = THREE.MathUtils.randFloat(-rangeY, rangeY );
      const z = THREE.MathUtils.randFloat(0, rangeZ );

      positions.push( x, y, z );
      color.setHSL(h, s, Math.random() *  l)
      colors.push(color.r, color.g, color.b)
      opacities.push(Math.random())
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3 ));
    geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(opacities, 1 ));

    const shaderMaterial = new THREE.ShaderMaterial( {
        vertexShader:  
        `attribute float alpha; varying float vAlpha; varying vec3 vColor;
        void main() {
            vAlpha = alpha;
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 4.0;
            gl_Position = projectionMatrix * mvPosition;
        }`,
        fragmentShader:
        `varying float vAlpha; varying vec3 vColor;
        void main() {
            gl_FragColor = vec4( vColor, vAlpha );
        }`,
        transparent: true,
        vertexColors: true
    });
    const points = new THREE.Points(geometry, shaderMaterial);
    points.name = "stars";
    points._update_function = () => {
      const alphas = geometry.attributes.alpha;
      const count = alphas.count;
      for(let i = 0; i < count; i++) {
          alphas.array[i] *= 0.99;
          if(alphas.array[i] < 0.01) { 
              alphas.array[i]  = 1.0;
          }
      }
      geometry.attributes.alpha.needsUpdate = true;
    }
    return points;
  }

  
  _addSmoke () {
    // https://threejs.org/docs/#api/en/loaders/TextureLoader
    const texture =this._load.texture.load("./resource/textures/smoke.png");
    const smokeGeo = new THREE.PlaneBufferGeometry(40, 40);
    const smokeMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      opacity: .2,
      side: THREE.DoubleSide
    });
    const smoke = new THREE.Group();
    const smokePos = this.tunnel.farEndOfTunnel * .7;
    const delta = this.tunnel.radius * 1.8
    for(let p = 0; p < 20; p++) {
      let smokeSegment = new THREE.Mesh(smokeGeo, smokeMaterial);

      smokeSegment.rotation.z = this.deg(Math.random() * 360);
      smokeSegment.rotation.y = this.deg(Math.random() * 15);
      smokeSegment.scale.multiplyScalar(Math.random());
      smokeSegment.position.set(
        (Math.random() - .5) * delta,
        (Math.random() - .5) * delta,
        Math.random() * smokePos
      );
      smoke.add(smokeSegment)
    }
    smoke._update_function = () => {
      smoke.traverse(segement => {
        segement.rotation.z -= 0.002;
      });
    }
    smoke.name = "smoke"
    return smoke
  }
  
  /* debugger */
  _debug () {
    window.THREE = THREE;
    const axes = new THREE.AxesHelper(500)
    axes.name = "axes"
    this.scene.add(axes) // r: x, g: y, b: z
    this.addCameraHelper(this.camera)
    if(this.objects)
      this.addBoxHelper(Object.values(this.objects))
    if(this.lights.spotLight)
      this.addSpotLightHelper(this.lights.spotLight);

    this.event.addListener("newSceneColor", color => {
      console.log("New color! %c0x" + color.getHexString(), "color: #" + color.getHexString(),);
    });
      

    this.event.addListener("modelsAllLoaded", () => {
      this.addBoxHelper(Object.values(this.models))
    }, {once: true});
    /* dynamic import */
    import("../lib/OrbitControls.js").then(({OrbitControls}) => {
      this.event.addListener("started", () => {
        this._controls = new OrbitControls(this.camera, this.renderer.domElement);
        this._controls.enableKeys = false;
        const throttleLog = new ThrottleLog(1600);
        this.event.addListener("update_main", () => 
          throttleLog.log(`position: (${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)})`, 
          `\nrotation: (${this.camera.rotation._x.toFixed(1)}, ${this.camera.rotation._y.toFixed(1)}, ${this.camera.rotation._z.toFixed(1)})`)
        )
        this.event.addListener("pause", () => this._controls.enabled = false, {once: false})
        this.event.addListener("resume", () => this._controls.enabled = true, {once: false})
      }, {once: true})
    })
  }

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
  update () {
    this.event.dispatch("update", performance.now());
  }
  update_main () {
    this.event.dispatch("update_main");
  }
  update_idle () {
    this.event.dispatch("update_idle");
  }

  /* Helpers(used in _debug) */
  addSpotLightHelper (spotLight) {
    const spotLightHelper = new THREE.SpotLightHelper(spotLight);
    spotLightHelper.name = spotLight.name + "_helper"
    this.scene.add(spotLightHelper);
    spotLight.helper = spotLightHelper;
  }

  addCameraHelper (camera) {
    const helper = new THREE.CameraHelper(camera);
    helper.name = camera.name + "_helper"
    this.scene.add(helper);
    this.ui.event.addListener("resize", () => helper.update())
  }

  addBoxHelper (obj3D) {
    if(Array.isArray(obj3D))
      obj3D.forEach(e => {
        e.boxHelper = new THREE.BoxHelper(e.mesh, this.colors.greenForTest);
        e.boxHelper.name = e.name + "_helper"
        this.scene.add(e.boxHelper);
        this.event.addListener("update_main", () => e.boxHelper.update());
        return ;
      })
    else {
      obj3D.boxHelper = new THREE.BoxHelper(obj3D.mesh, this.colors.greenForTest);
      obj3D.boxHelper.name = obj3D.name + "_helper"
      this.scene.add(obj3D.boxHelper);
      this.event.addListener("update_main", () => obj3D.boxHelper.update());
    }
  }

  /* Examples */
  #broadPhaseDetect (obj_vector3) {
    return this.airplane.mesh.position.clone().sub(obj_vector3).length - 3; // 3 - tolerance
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
      if(document.visibilityState === "hidden")
        game.pause()
    }, {passive: true});

    if(Dialog.isBusy)
      game.pause()
    Dialog.addEventListener('dialogHide', () => this.resolve())
    Dialog.addEventListener('dialogShow', () => game.pause())
  }

  initButtons () {
    game.ui.startButton.addTriggerCallback(() => this.resolve(), {once: false, toBeClearedWhenReset: true})

    game.ui.pauseButton.addTriggerCallback(() => game.pause(), {once: false, toBeClearedWhenReset: true})
                       .listenOnce();

    game.ui.homeButton.addTriggerCallback(() => this.reject(game.end()), {once: true})
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
}, {once: true});

window.addEventListener("load", () => {
  game.state.inited 
  ? game.load()
  : game.event.addListener("inited", () => game.load(), {once: true});
}, {passive: true, once: true})