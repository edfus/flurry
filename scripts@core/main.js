/* constructors */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@v0.121.0/build/three.module.min.js';
//TODO: replace * for tree shaking concern
import UserInteraction from '../scripts@miscellaneous/UI.js';
import Event from '../scripts@miscellaneous/EventDispatcher.js';
import RenderLoop from '../scripts@miscellaneous/RenderLoop.js';
import AudioPlayer from '../scripts@audio/AudioWorker.js';
import Score from '../scripts@miscellaneous/Score.js';
import Drawer from '../scripts@effect/drawTextures.js';
import Obstacle from './obstacles.js';
/* objects */
import colors from '../scripts@config/colors.js';

/* class Game */
class Game {
  /** 原则：
   * game的start、resume、pause、end等函数中不涉及ui的显隐控制，音乐播放等
   * game通过eventDispatcher控制renderLoop。
   * 能只dispatch event的状态函数，就不要设置this.state.inited = true。
   * renderLoop中不调用除resume、end以外的任何game的状态函数（start、pause等）
   * renderLoop中不涉及THREE.js的模型创建、光影更改、碰撞判定等，只调用game的相关函数。
   */
  constructor() {
    this.config = window.config;
    this.colors = colors;
    this.ui = new UserInteraction();
    this.audio = new AudioPlayer();
    this.state = {};
    this.event = new Event();
    this._load = {
      texture: new THREE.TextureLoader()
    };
    this.getTexture = new Drawer();
    this.collidableMeshList = [];
    this.init();
  }

  /* main functions */
  init() {
    this.state.now = "init"
    this.event.dispatch("init");
    this._createScene(this.ui.WIDTH, this.ui.HEIGHT);

    this.tunnel = this._createTunnel();
    this.scene.add(this.tunnel.mesh);

    this.lights = this._createLights();
    this.scene.add.apply(this.scene, Object.values(this.lights));
 
    this.models = {};
    this._loadglTFs(this.path_callback_Array).then(() => {
      this.event.dispatch("modelsAllLoaded");
      this.scene.add.apply(this.scene, Object.values(this.models));
    });

    this._initObstacles();
    
    this.camera.position.set(0, 80, -500);
    this.camera.rotation.set(0, Math.PI, 0);

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
    this.state.now = "inited"
  }

  load () {
    this.state.now = "load"
    this.event.dispatch("load");
    this.config.getContainer().append(this.renderer.domElement);
    this.config.getUIContainer().append(this.ui.canvas2D.domElement);
    this.score.bind(this.config.getScoreContainer());
    this.event.addListener("planeLoaded", () => this.config.gameLoadedCallback(), {once: true})
    this._log();
    this.event.dispatch("loaded");
    this.state.loaded = true;
    this.state.now = "loaded"
  }

  idle_begin () {
    this.state.canBePaused = false;
    this.state.now = "idle";
    this.event.dispatch("idle");
    const colorArray = this.newSceneColor();
    this.setSceneColor(colorArray);
    const color = colorArray[2];
    const hsl = this.colors.complementaryOf(color).getHSL({});
    this._idle = {}
    
    switch((Math.random() % .3).toFixed(1)) {
      case "0.2":
        this._idle.snow = this._addSnow();
        this.scene.add(this._idle.snow)
        this.event.addListener("update_idle", this._idle.snow._update_function);
        this._idle.snow._update_period = "update_idle";
        break;
      default: 
        this._idle.stars = this._addStars(hsl.h, hsl.s, hsl.l);
        this.scene.add(this._idle.stars)
        this.event.addListener("update_idle", this._idle.stars._update_function);
        this._idle.stars._update_period = "update_idle";
        this._idle.waste = this._addSolidWaste();
        this.scene.add(this._idle.waste);
        this.event.addListener("update_idle", this._idle.waste._update_function)
        this._idle.waste._update_period = "update_idle";
    }
  }

  idle_clear() {
    for(const obj3D in this._idle) {
      this.dispose(this._idle[obj3D])
    }
    delete this._idle;
  }

  start () {
    this.state.now = "start"
    this.event.dispatch("start");
    setTimeout(() => {
      this.state.canBePaused = true;
      this.state.now = "started"
      this.event.dispatch("started");
      this.state.started = true;
      this.time = {
        lastStamp: Date.now(), // milliseconds
        total: 0,
        paused: 0
      }
      this.obstacles.prTimeStamp = Date.now();
      this._addObstacle();
    }, 100) //TODO: start animation
  }

  pause () {
    if(this.state.canBePaused) { // modified in RenderLoop
      this.state.canBePaused = false;
      this.state.now = "pause"
      this.event.dispatch("pause");
      this.time.total += Date.now() - this.time.lastStamp;
      this.time.lastStamp = Date.now();
      return true;
    } else return false;
  }

  resume () { // invoked in RenderLoop
    this.state.canBePaused = true;
    this.state.now = "resume"
    this.event.dispatch("resume");
    this.time.paused += Date.now() - this.time.lastStamp;
    this.time.lastStamp = Date.now();
  }

  planeCrash () {
    console.log("crashed")
    // this.state.canBePaused = false;
    // this.state.now = "crash"
    // this.event.dispatch("crash");
    // this.time.total += Date.now() - this.time.lastStamp;
    // this.time.lastStamp = Date.now();
    // Dialog.newError("crashed!", 3000)
    // setTimeout(() => {
    //   this.state.now = "crashed"
    //   this.event.dispatch("crashed");
    // }, 3000) //TODO: crash animaiton
  }

  end () {
    this.state.canBePaused = false;
    this.state.now = "end"
    this.event.dispatch("end");
    this.state.started = false;
    setTimeout(() => {
      this.obstacles.running.forEach(obstacle => this.dispose(obstacle.mesh));
      this.obstacles.running.clear();
      this.state.now = "ended";
      this.event.dispatch("ended")
    }, 300); //TODO: end animation
  }

  constructRenderLoops () {
    RenderLoop._game = this;
    this.renderLoop = RenderLoop;
    RenderLoop.add(
      new RenderLoop("idle")
                    .executeOnce(() => {
                      this.ui.freeze();
                      this.ui.startButton
                              .addTriggerCallback(() => game.start(), {once: true})
                              .listenOnce();
                      this.ui.canvas2D.enable();
                      this.idle_begin();
                    })
                    .execute(() => {
                        this.update_idle();
                        this.renderer.render(this.scene, this.camera);
                        this.ui.canvas2D.paint();
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
                        this.update_startAnim();
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilGameStateBecomes("started")
                      .then(() => {
                          this.whenPaused.initButtons();
                          this.score.start();
                          this.ui.unfreeze()
                          RenderLoop.goto("main")
                        }),
      new RenderLoop("main")
                    .execute(() => {
                        this.update_main();
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilGameStateBecomes("crash")
                      .then(() => {
                          this.ui.pauseButton.hide();
                          this.ui.homeButton.hide(true);
                          this.score.pause();
                          this.ui.freeze();
                          this.audio.fadeOut(6);
                          if(this.time.total > 80000) {
                            this.audio.scheduleSong("outro", false, 3)
                          }
                          RenderLoop.goto("crash")
                        }),
      new RenderLoop("crash")
                    .execute(() => {
                        this.update_crash();
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilGameStateBecomes("crashed")
                      .then(() => {
                          ////////////////
                          this.end() // 因为要严格要求只有在crashed后才能end，所以在此end
                          ////////////////
                          RenderLoop.goto("endAnimation");
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
                        this.update_paused();
                        this.ui.canvas2D.paint();
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilPromise(() => this.whenPaused.listenUserResume())
                      .then(() => {
                        ////////////////
                        this.resume() // 因为要严格要求只有在pause后才能resume，所以在此resume
                        // 这是RenderLoop中唯一一处修改游戏状态的函数。
                        ////////////////
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
                        ////////////////
                        this.end() // 因为要严格要求只有在pause后才能end，所以在此end
                        ////////////////
                        this.ui.homeButton.hide(true);
                        this.ui.startButton.hide();
                        this.ui.canvas2D.disable();
                        if(this.time.total > 180000) {
                          this.audio.cancelFadeOut();
                          this.audio.playSong("outro")
                        }
                        RenderLoop.goto("endAnimation")
                      }),
      new RenderLoop("endAnimation")
                    .execute(() => {
                        this.update_endAnim();
                        this.renderer.render(this.scene, this.camera);
                      })
                    .untilGameStateBecomes("ended")
                      .then(() => {
                          this.ui.resetButtonListeners();
                          this.ui.titleMenuButtons.show().then(() => {
                            this.ui.startButton.show();
                          });
                          this.audio.scheduleSong("intro", true, 8)
                          RenderLoop.goto("idle")
                          console.info('RenderLoop: game ended');
                        })
    )
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

  newSceneColor () {
    let colorArray = this.colors.sceneColors[parseInt(Math.random() * this.colors.sceneColors.length)];
    colorArray = [
      new THREE.Color(colorArray[0]),
      colorArray[1],
      new THREE.Color(colorArray[2])
    ];
    this.event.dispatch("newSceneColor", colorArray);
    return colorArray
  }
  
  setSceneColor (colorArray) {
    const color_obj = colorArray[0];
    const themeColor = colorArray[1];

    const colorHexValue = color_obj.getHex();
    const rgb = color_obj.getStyle();
    const darkenRGBColor_10 = this.colors.RGB_Linear_Shade(-.1, rgb);
    const darkenRGBColor_20 = this.colors.RGB_Linear_Shade(-.2, rgb);

    this.lights.spotLight.color.setHex(colorHexValue);

    this.lights.sphereLight.material.color.set(darkenRGBColor_10);
    this.lights.sphereLight.material.emissive.set(darkenRGBColor_10);

    if(!this.scene.fog)
      this.scene.fog = new THREE.Fog(darkenRGBColor_20, this.tunnel.farEndOfTunnel - 4 * this.tunnel.radius, this.tunnel.farEndOfTunnel);
    else this.scene.fog.color.set(darkenRGBColor_20);

    document.documentElement.style.setProperty('--theme-color', themeColor);
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
    const delta = 25 / 4; //TODO: enlarge radius and delta
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
  
  _initObstacles () {
    const amountInPool = 2
    this.obstacles = {
      start_z: 4000,
      end_z: -500,
      detect_z: {
        max: 300,
        min: -150
      },
      gap: 10 * 1000,
      pool: new Array(amountInPool),
      running: new Set() // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
    }
      
    Obstacle.setOptions({
      radius: 100,
      color: 0x808a87,
      shininess: 100,
      specular: 0xffffff,
      emissive: 0x696969,
      emissiveIntensity: 0.3,
      metalness: 1,
      xyDistance: 80,
      zDistance: 5000,
      spacing: 2000,
      amplitude: 180, // peak
      xySpeed: 0.8,
      zSpeed: 6,
      rev: 0.006, // 转速
      randomAngle: () => Math.random() * 7,
      randomI: () => Math.floor(Math.random() * 5)
    })

    for(let i = 0; i < amountInPool; i++) {
      const obstacle = new Obstacle(this.obstacles.start_z);
      this.obstacles.pool[i] = obstacle;
    }

    this.event.addListener("update_main", timeStamp => {
      this.obstacles.running.forEach(obstacle => {
        obstacle.move();
        if(obstacle.mesh.position.z <= this.obstacles.detect_z.max) {
          if(obstacle.needsDetect === false) {
            if(obstacle.mesh.position.z <= this.obstacles.end_z) {
              this.obstacles.running.delete(obstacle);
              this.dispose(obstacle.mesh);
              this.event.dispatch("obstacleRemoved");
              return ;
            }
          } else {
            if(!obstacle.hasOwnProperty('needsDetect')) {
              obstacle.needsDetect = true;
              this.collidableMeshList.push(obstacle.mesh);
              return ;
            } else if(obstacle.mesh.position.z <= this.obstacles.detect_z.min) {
              obstacle.needsDetect = false;
              this.collidableMeshList.splice(this.collidableMeshList.indexOf(obstacle.mesh), 1);
              return ;
            }
          }
        }
      })
      if(timeStamp - this.obstacles.prTimeStamp > this.obstacles.gap) {
        this._addObstacle();
        this.obstacles.prTimeStamp = timeStamp;
      }
    })
  }

  _addObstacle () {
    const newObstacle = this.obstacles.pool.shift();
    if(!newObstacle) throw new Error("!newObstacle")
    this.obstacles.running.add(newObstacle);
    this.scene.add(newObstacle.mesh);
    this.event.dispatch("obstacleAdded");
    setTimeout(() => {
      const obstacle = new Obstacle(this.obstacles.start_z);
      this.obstacles.pool.push(obstacle);
    }, 0)
  }

  /* lights */
  _createLights () { 
    /* The renderer has a parameter called "maxLights" that defaults to 4. */
    const delta = 1.8

    const spotLight = new THREE.SpotLight(0x0, 3, this.tunnel.lengthOfTunnel * delta);

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
      sphereLight
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
    ['/resource/obj/biplane0.glb', 
      result => {
        const plane = result.scene.children[0];
        result.scenes = null;
        result.scene = null;
        result = null
        const material = new THREE.MeshPhongMaterial({
          color: this.colors.planeRed,
          // color: 0xffffff,
          side: THREE.DoubleSide,
          flatShading: true,
          emissive: this.colors.planeRed,
          emissiveIntensity: .4
        });
        plane.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.material = material
          }
        });
        plane.scale.multiplyScalar(0.05);
        plane.rotation.x = this.deg(12);
        plane.name = "plane_obj";
        plane.isPlane = true;
        
        let count = 0;
        this.event.addListener("update_main", () => {
          if(this.collidableMeshList.length) {
            if(++count === 6) {
              count = 0;
              if(this.isCollided_buffer(plane, this.collidableMeshList))
                this.planeCrash();
              else console.log("detecting. not crashed")
            }
          }
        })

        // 减少机翼长度，屁股上移，光泽
        const pointlight = new THREE.PointLight( 0xffffff, 0.5, 200 );
        pointlight.position.set(-8, 60, -10);
        pointlight.name = "plane_shining";
      
        const position_propeller = new THREE.Vector3(-8, -4, 140);
        const position_headLight = new THREE.Vector3(-8, 25, 400);
        const group = new THREE.Group();
        group.add(plane);
        group.add(pointlight);
        group.add(this._createPropeller(0, position_propeller));
        group.add(this._createHeadLight(this.colors.lightBlue, position_headLight, position_propeller));
        group.name = "plane";
        const initialPosition = {
          x: 9,
          y: 39,
          z: 0
        }
        
        group.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
        
        this.models.plane = group;

        this.ui.target.setOrigin(initialPosition);

        this.event.addListener("update_main", () => {
          // console.log(this.ui.target.average.x);
          // console.log(this.ui.target.average.y);
          group.position.y += (this.ui.target.average.y - group.position.y) * .1;
          group.position.x += (this.ui.target.average.x - group.position.x) * .1;
          group.rotation.z = (this.ui.target.average.y - group.position.y) * .1;
        })

        this.event.dispatch("planeLoaded", plane, pointlight);
      }
    ]
  ]

  _createHeadLight (color, positionOfFog, positionOfLight) {

    const angle = Math.PI / 15,
          length = 1 / Math.tan(angle) * this.tunnel.radius;
          
    const spotLight = new THREE.SpotLight(color, .3, length, angle, 0, 2);

    spotLight.castShadow = false; //NOTE

    spotLight.position.copy(positionOfLight);

    const lensFlareGeo = new THREE.PlaneBufferGeometry(256, 256);
    const lensFlareMaterial = new THREE.MeshLambertMaterial({ //TODO
      map: this.getTexture.headLight(),
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: .6
    });
    const lensFlare = new THREE.Mesh(lensFlareGeo, lensFlareMaterial);
    lensFlare.position.copy(positionOfFog)
    spotLight.target = lensFlare;
    const group = new THREE.Group();
    group.add(spotLight);
    group.add(lensFlare);

    group.name = "plane_headLight"
    return group
  }

  /* createPropeller */
  _createPropeller (intialRotation, position) {
    const angle = 3;
    const width = 8;
    const length = 50;
    const shape_propeller = new THREE.Shape();
    const minusV = length * Math.tan(this.deg(angle))
    const halfWidth = width / 2;
    const halfWidth_M = halfWidth - minusV;

    shape_propeller.moveTo(halfWidth_M, 0)
    shape_propeller.lineTo(halfWidth, length)
    shape_propeller.lineTo(-halfWidth, length)
    shape_propeller.lineTo(-halfWidth_M, 0)
    shape_propeller.lineTo(-halfWidth, -length)
    shape_propeller.lineTo(halfWidth, -length)
    shape_propeller.lineTo(halfWidth_M, 0)

    const geomPropeller = new THREE.ShapeBufferGeometry( shape_propeller );
    const material = new THREE.MeshLambertMaterial({
      color: 0x6d6d6d,
      side: THREE.DoubleSide,
      flatShading: true,
      emissive: this.colors.planeRed,
      emissiveIntensity: 0.3
    });

    const propeller = new THREE.Mesh(geomPropeller, material);
    propeller.rotation.z = intialRotation;

    const rotation = this.deg(65) //TODO 加快
    const func = () => {
      propeller.rotation.z -= rotation;
    }
    ["update_idle", "update_main", "update_startAnim", "update_endAnim"].forEach(name => {
      this.event.addListener(name, func);
    })

    propeller.position.copy(position);
    propeller.name = "plane_propeller";
    return propeller
  }

  deg(num) {
    return THREE.MathUtils.degToRad(num)
  }

  _addMeteor () {

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
        }`, // gl_FragColor是否会自动被THREE.js设置，导致重复设置？
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

  _addSnow (amount = 300) {
    const positions = [];
    const velocities = [];
    const rangeX = this.tunnel.radius;
    const rangeY = this.tunnel.radius;
    const rangeZ = this.tunnel.farEndOfTunnel - this.tunnel.radius * 2;

    for(let i = 0; i < amount; i++) {
      const x = THREE.MathUtils.randFloat(-rangeX, rangeX );
      const y = THREE.MathUtils.randFloat(-rangeY, rangeY );
      const z = THREE.MathUtils.randFloat(50, rangeZ );
      
      const v_x = Math.floor(Math.random() - .5);
      const v_y = -Math.floor(Math.random() * 3 + 1.5);
      const v_z = Math.floor(Math.random() * 0.1 - 0.05) ;
      const velocity = new THREE.Vector3(v_x, v_y, v_z);
      
      positions.push( x, y, z );
      velocities.push(velocity);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        size: 40,
        color: 0xffffff,
        vertexColors: false,
        map: this.getTexture.snow(),
        transparent: true,
        depthTest: false,
        // blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.name = "snow";
    
    const wind = {
      x: Math.random() * .1,
      z: Math.random(),
      index: 0,
      indexMax: amount * 5,
      invert: false
    }
    points._update_function = timeStamp => {
      const positions = geometry.attributes.position;
      const count = positions.count;
      for(let i = 0, index = 0; i < count; i++) {
        const velocity = velocities[i];
        positions.array[index++] += Math.sin(timeStamp * 0.0006 * velocity.x) + wind.x;
        positions.array[index] += velocity.y;
        if(positions.array[index] < -rangeY) {
          positions.array[index] = rangeY;
          if(++wind.index > wind.indexMax) {
            wind.x = -wind.x;
            wind.z = -wind.z;
            wind.index = 0;
          }
        }
        positions.array[++index] += Math.cos(timeStamp * 0.0006 * velocity.z) + wind.z;
        index++; 
      }
      geometry.attributes.position.needsUpdate = true;
    }
    return points;
  }

  _addSolidWaste () {
    // https://threejs.org/docs/#api/en/loaders/TextureLoader
    const texture =this._load.texture.load("./resource/textures/smoke.png");
    const wasteGeo = new THREE.PlaneBufferGeometry(40, 40);
    const wasteMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      opacity: .2,
      side: THREE.DoubleSide
    });
    const waste = new THREE.Group();
    const wastePos = this.tunnel.farEndOfTunnel * .7;
    const delta = this.tunnel.radius * 1.8
    for(let p = 0; p < 20; p++) {
      let wasteSegment = new THREE.Mesh(wasteGeo, wasteMaterial);

      wasteSegment.rotation.z = this.deg(Math.random() * 360);
      wasteSegment.rotation.y = this.deg(Math.random() * 15);
      wasteSegment.scale.multiplyScalar(Math.random());
      wasteSegment.position.set(
        (Math.random() - .5) * delta,
        (Math.random() - .5) * delta,
        Math.random() * wastePos
      );
      waste.add(wasteSegment)
    }
    waste._update_function = () => {
      waste.traverse(segement => {
        segement.rotation.z -= 0.002;
      });
    }
    waste.name = "solid waste"
    return waste
  }

  isCollided (obj3d, collidableMeshList) {
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

  isCollided_buffer (obj3d, collidableMeshList) {
    if(obj3d.isPlane)
      return obj3d.children.some(child => this.isCollided_buffer(child, collidableMeshList))
    const vertices = obj3d.geometry.attributes.position.array;
    const position = obj3d.position;
    for(let i = 0; i < vertices.length; i += 3) {
      const localVertex = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2])
      // const globalVertex = localVertex.applyMatrix4(obj3d.matrix);
      // const directionVector = globalVertex.sub(position);
  
      const ray = new THREE.Raycaster(position, localVertex);
      const collisionResults = ray.intersectObjects(collidableMeshList);
      if(collisionResults.length > 0)
          return true;
    }
    return false;
  }

  dispose (obj) {
    if(obj.mesh) {
      obj = obj.mesh
      console.warn("Game.prototype.dispose expects mesh(obj3D)")
    }
    this.scene.remove(obj);
    if(obj.parent)
      obj.parent.remove(obj);
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
    this.event.addListener("obstacleRemoved", () => console.log("obstacleRemoved", Date.now()))
    this.event.addListener("obstacleAdded", () => console.log("obstacleAdded", Date.now()))

    this.event.addListener("newSceneColor", colorArray => {
      console.log("New color! %c0x" + colorArray[0].getHexString() + " %c" + colorArray[1], "color: #" +colorArray[0].getHexString(),  "color: " + colorArray[1]);
    });

    this.event.addListener("crashed", () => console.log("%ccrashed", "color: red; background: aqua"))
    this.event.addListener("planeLoaded", (plane, light) => {
      this.addPointLightHelper(light, 100);
      this.addBoxHelper(plane)
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
        this.event.addListener("started", () => this._controls.enabled = true, {once: false})
        this.event.addListener("ended", () => this._controls.enabled = false, {once: false})
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
  update_main () {
    this.event.dispatch("update_main", Date.now());
  }
  update_idle () {
    this.event.dispatch("update_idle", Date.now());
  }
  update_crash () {
    this.event.dispatch("update_crash", Date.now());
  }
  update_paused () {
    this.event.dispatch("update_paused", Date.now());
  }
  update_startAnim () {
    this.event.dispatch("update_startAnim", Date.now());
  }
  update_endAnim () {
    this.event.dispatch("update_endAnim", Date.now());
  }

  /* Helpers(used in _debug) */
  addSpotLightHelper (spotLight) {
    const spotLightHelper = new THREE.SpotLightHelper(spotLight);
    spotLightHelper.name = spotLight.name + "_helper"
    this.scene.add(spotLightHelper);
    spotLight.helper = spotLightHelper;
  }

  addPointLightHelper (pointLight, size) {
    const pointLightHelper = new THREE.PointLightHelper(pointLight, size);
    pointLightHelper.name = pointLight.name + "_helper";
    this.scene.add(pointLightHelper);
    pointLight.helper = pointLightHelper;
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

    game.ui.homeButton.addTriggerCallback(() => this.reject(), {once: true})
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

window.addEventListener("DOMContentLoaded", () => {
  game.state.inited 
  ? game.load()
  : game.event.addListener("inited", () => game.load(), {once: true});
}, {passive: true, once: true})