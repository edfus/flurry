const colors = config.colors;

class Airplane {
  defaultSpeed = 0;
  constructor() {
    this.mesh = new THREE.Object3D();
    this.mesh.name = "airplane";

    // Create the cabin *座舱
    const geomCockpit = new THREE.BoxGeometry(60, 50, 50, 1, 1, 1); 
    /*
    *  BoxGeometry(width, height, depth, widthSegments = 1, heightSegments = 1, depthSegments = 1)
    *  segments解释为沿着边的长(宽、高）度分段的矩形面的数量。简单来说segments设成1就行。
    */
    const matCockpit = new THREE.MeshPhongMaterial({
      color: colors.red,
      flatShading: THREE.FlatShading
    });
    /*
    * 材质的着色有flatShading和smoothShading两种
    * flatShading能显示出组成图形的各个平面的轮廓，smoothShading使整个图形浑然一体
    * 用法为flatShading: THREE.FlatShading 或 smoothShading: THREE.SmoothShading
    * 将flatShading设置为THREE.SmoothShading，其效果仍为flatShading。
    * 默认着色为smoothShading。
    */
    //几何体里面有一个vertices数组变量，可以用来存放点。
    geomCockpit.vertices[4].y -= 10;
    geomCockpit.vertices[4].z += 20;
    geomCockpit.vertices[5].y -= 10;
    geomCockpit.vertices[5].z -= 20;
    geomCockpit.vertices[6].y += 30;
    geomCockpit.vertices[6].z += 20;
    geomCockpit.vertices[7].y += 30;
    geomCockpit.vertices[7].z -= 20;
    let cockpit = new THREE.Mesh(geomCockpit, matCockpit);
    cockpit.castShadow = true;
    cockpit.receiveShadow = true;
    this.mesh.add(cockpit);
    cockpit.name = 'airplane-cabin'
    this._cabin = cockpit;

    // Create Engine
    const geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
    const matEngine = new THREE.MeshPhongMaterial({
      color: colors.white,
      flatShading: THREE.FlatShading
    });
    let engine = new THREE.Mesh(geomEngine, matEngine);
    engine.position.x = 50;
    engine.castShadow = true;
    engine.receiveShadow = true;
    this.mesh.add(engine);
    engine.name = 'airplane-engine'
    this._engine = engine;

    // Create Tailplane *横尾翼
    const geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
    const matTailPlane = new THREE.MeshPhongMaterial({
      color: colors.red,
      flatShading: THREE.FlatShading
    });
    let tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
    tailPlane.position.set(-40, 20, 0);
    tailPlane.castShadow = true;
    tailPlane.receiveShadow = true;
    this.mesh.add(tailPlane);
    tailPlane.name = 'airplane-tailPlane'
    this._tailPlane = tailPlane;

    // Create Wing *机翼
    const geomSideWing = new THREE.BoxGeometry(30, 5, 120, 1, 1, 1);
    const matSideWing = new THREE.MeshPhongMaterial({
      color: colors.red,
      flatShading: THREE.FlatShading
    });
    let sideWing = new THREE.Mesh(geomSideWing, matSideWing);
    sideWing.position.set(0, 15, 0);
    sideWing.castShadow = true;
    sideWing.receiveShadow = true;
    this.mesh.add(sideWing);
    sideWing.name = 'airplane-wing'
    this._wing = sideWing;

    // Propeller *螺旋桨杆
    const geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
    const matPropeller = new THREE.MeshPhongMaterial({
      color: colors.brown,
      flatShading: THREE.FlatShading
    });
    this._propeller = new THREE.Mesh(geomPropeller, matPropeller);
    this._propeller.castShadow = true;
    this._propeller.receiveShadow = true;

    // Blades *叶片
    const geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
    const matBlade = new THREE.MeshPhongMaterial({
      color: colors.brownDark,
      flatShading: THREE.FlatShading
    });

    let blade1 = new THREE.Mesh(geomBlade, matBlade);
    blade1.position.set(8, 0, 0);
    blade1.castShadow = true;
    blade1.receiveShadow = true;

    let blade2 = blade1.clone();
    blade2.rotation.x = Math.PI/2;
  
    blade2.castShadow = true;
    blade2.receiveShadow = true;

    this._propeller.add(blade1);
    this._propeller.add(blade2);
    this._propeller.position.set(60, 0, 0);
    this.mesh.add(this._propeller); // propeller的旋转在updatePlane()中控制
    this._propeller.name = 'airplane-propeller'
  }
  propellerSpin(speed = this.defaultSpeed) { 
    this._propeller.rotation.x += speed; // 螺旋桨旋转速度
  }
}

class Cloud {
  constructor() {
    this.mesh = new THREE.Object3D();
    this.mesh.name = "cloud";

    const geometry = new THREE.CubeGeometry(20, 20, 20);
    const material = new THREE.MeshPhongMaterial({
      color: colors.white,
    });

    const nBlocks = 3 + Math.floor(Math.random() * 3); // 该Cloud由多少个cube组成

    for (let i = 0; i < nBlocks; i++) {
      let newCube = new THREE.Mesh(geometry.clone(), material);
      newCube.position.x = i * 15;
      newCube.position.y = Math.random() * 10;
      newCube.position.z = Math.random() * 10;
      newCube.rotation.z = Math.random() * Math.PI * 2;
      newCube.rotation.y = Math.random() * Math.PI * 2;

      const scaleRatio = .1 + Math.random() * .9; // random scale
      newCube.scale.set(scaleRatio, scaleRatio, scaleRatio);
      newCube.castShadow = true;
      newCube.receiveShadow = true;
      this.mesh.add(newCube);
    }
  }
}

class Sky {
  defaultSpeed = 0;
  constructor() {
    this.mesh = new THREE.Object3D();
    this.mesh.name = "sky";
    this.nClouds = config.numOfCloudsInSky;
    this.clouds = [];
    const stepAngle = Math.PI * 2 / this.nClouds;
    for (let i = 0, newCloud = {}; i < this.nClouds; i++) {
      this.clouds.push(newCloud = new Cloud());

      const angle = stepAngle * i; // rotation
      const height = 750 + Math.random() * 200;
      newCloud.mesh.position.x = Math.cos(angle) * height;
      newCloud.mesh.position.y = Math.sin(angle) * height;
      newCloud.mesh.rotation.z = angle + Math.PI / 2; // rotation
      newCloud.mesh.position.z = -400 - Math.random() * 400; // random z pos
      /*
      * 确定height，position.z的参数时可以分别对这两个变量取值来找到最好的视觉效果的范围，然后得到函数
      * 我们用three.js创建一个空间并将各个带属性的物体置于某个坐标处，故空间的相对位置与屏幕没有关系，可适用于Mobile等
      */

      const scaleRatio = 1 + Math.random() * 2; // random scale
      newCloud.mesh.scale.set(scaleRatio, scaleRatio, scaleRatio);
      newCloud.mesh.name = "cloud"
      this.mesh.add(newCloud.mesh);
    }
  }
  move(rotation = this.defaultSpeed) {
    this.mesh.rotation.z += rotation;
  }
}

class Sea {
  #waves = [];
  defaultSpeed = 0;
  constructor() {
    const geometry = new THREE.CylinderGeometry(600, 600, 800, 40, 10); 
    // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded: Boolean, thetaStart, thetaLength)
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2)); 
    // .applyMatrix4 ( m : Matrix4 ) :  Multiplies this vector (with an implicit 1 in the 4th dimension) and m, and divides by perspective.
    // 简单来说参数用-Math.PI / 2可以让圆柱体最接近球体

    //NOTE: 那为什么要先建立圆柱体再把其切为球体呢？为何不直接new一个SphereGeometry？
    const vertices = geometry.vertices,
          length = vertices.length;
    for (let i = 0; i < length; i++){
      this.#waves.push({
        x: vertices[i].x,
        y: vertices[i].y,
        z: vertices[i].z,
        ang: Math.random()  * Math.PI * 2, // 海浪的角度 angle
        amp: 5 + Math.random() * 15, // 海浪高度 amplitude
        speed: 0.016 + Math.random() * 0.032, // angle的变化速度
      });
    };

    const material = new THREE.MeshPhongMaterial({
      color: colors.blue,
      transparent: true,
      opacity: .8,
      flatShading: THREE.FlatShading,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = "sea";
    this.mesh.receiveShadow = true;
  }
  move(rotation = this.defaultSpeed) {
    this.mesh.rotation.z += rotation;
  }
  moveWaves(rotation = this.defaultSpeed) {
    const vertices = this.mesh.geometry.vertices,
          length = vertices.length;

    for (let i = 0; i < length; i++){
      const {x, y, speed, ang: currentAng, amp: amplitude} = this.#waves[i];

      vertices[i].x = x + Math.cos(currentAng) * amplitude;
      vertices[i].y = y + Math.sin(currentAng) * amplitude;
      this.#waves[i].ang += speed;
    }
    this.mesh.geometry.verticesNeedUpdate = true;
    this.mesh.rotation.z += rotation;
  }
}

export {Airplane, Sky, Sea}