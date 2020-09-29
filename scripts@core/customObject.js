// 调用方法： new AirPlane();
import colors from '../scripts@config/colors.js';

const numOfCloudsInSky = 20,
      rotationSpeedOfPropeller = .3;

/*
class name [extends otherName] {
  // class body
}
*/

class Airplane {
  #defaultPropellerSpeed = rotationSpeedOfPropeller;
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
    }); // MeshPhongMaterial：一种具有镜面高光的发亮表面的材料，可以模拟具有镜面高光的光泽表面，使用Phong阴影模型计算阴影。参数：Object
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

    // Propeller *螺旋桨杆
    const geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
    const matPropeller = new THREE.MeshPhongMaterial({
      color: colors.brown,
      flatShading: THREE.FlatShading
    });
    this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
    this.propeller.castShadow = true;
    this.propeller.receiveShadow = true;

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

    this.propeller.add(blade1);
    this.propeller.add(blade2);
    this.propeller.position.set(60, 0, 0);
    this.mesh.add(this.propeller); // propeller的旋转在updatePlane()中控制
  }
  propellerSpin(speed = this.#defaultPropellerSpeed) { 
    // 初始为rotationSpeedOfPropeller，可通过airplaneObj.defaultPropellerSpeed = xxx更改
    this.propeller.rotation.x += speed; // 螺旋桨旋转速度
  }
  set defaultPropellerSpeed(newSpeed) {
    if(!isNaN(newSpeed))
      this.#defaultPropellerSpeed = newSpeed;
    else throw 'Airplane Setter: new speed is Not a Number';
  }
  get defaultPropellerSpeed() {
    return this.#defaultPropellerSpeed;
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
  constructor() {
    this.mesh = new THREE.Object3D();
    this.nClouds = numOfCloudsInSky;
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

      this.mesh.add(newCloud.mesh);
    }
  }
  move(rotateAngel = 0) { // no default
    this.mesh.rotation.z += rotateAngel;
  }
}

class Sea {
  #length = 0; // sea对象的vertices个数，waves数组的length
  constructor() {
    const geometry = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2)); //NOTE: 这句话的用处是？
    this.#length  = geometry.vertices.length;
    this.waves = [];
    for (let i = 0; i < this.#length; i++){
      this.waves.push({
        x: geometry.vertices[i].x,
        y: geometry.vertices[i].y,
        z: geometry.vertices[i].z,
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
    this.mesh.receiveShadow = true; // airplane cast shadow
  }
  move(rotateAngel = 0) { // no default
    this.mesh.rotation.z += rotateAngel;
  }
  moveWaves() { // 海浪
    const vertices = this.mesh.geometry.vertices;
    for (let i = 0; i < this.#length; i++){
      const waveProperties = this.waves[i];
      vertices[i].x =  waveProperties.x + Math.cos(waveProperties.ang) * waveProperties.amp;
      vertices[i].y = waveProperties.y + Math.sin(waveProperties.ang) * waveProperties.amp;
      waveProperties.ang += waveProperties.speed;
    }
    this.mesh.geometry.verticesNeedUpdate = true;
    this.mesh.rotation.z += .005;
  }
}

export {Airplane, Sky, Sea}