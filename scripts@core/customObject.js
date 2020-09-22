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
    *  BoxGeometry(width : Float, height : Float, depth : Float, widthSegments : Integer, heightSegments : Integer, depthSegments : Integer)
    *  三个segments的默认参数是1，segments解释为沿着边的长(宽、高）度分段的矩形面的数量。简单来说segments设成1就行。
    */
    const matCockpit = new THREE.MeshPhongMaterial({ //FIX: THREE.MeshPhongMaterial: .shading has been removed. Use the boolean .flatShading instead.
      color: colors.red,
      shading: THREE.FlatShading
    });
    let cockpit = new THREE.Mesh(geomCockpit, matCockpit);
    cockpit.castShadow = true;
    cockpit.receiveShadow = true;
    this.mesh.add(cockpit);

    // Create Engine
    const geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
    const matEngine = new THREE.MeshPhongMaterial({
      color: colors.white,
      shading: THREE.FlatShading
    });
    let engine = new THREE.Mesh(geomEngine, matEngine);
    engine.position.x = 40;
    engine.castShadow = true;
    engine.receiveShadow = true;
    this.mesh.add(engine);

    // Create Tailplane *横尾翼
    const geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
    const matTailPlane = new THREE.MeshPhongMaterial({
      color: colors.red,
      shading: THREE.FlatShading
    });
    let tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
    tailPlane.position.set(-35, 25, 0);
    tailPlane.castShadow = true;
    tailPlane.receiveShadow = true;
    this.mesh.add(tailPlane);

    // Create Wing *机翼
    const geomSideWing = new THREE.BoxGeometry(40, 8, 150, 1, 1, 1);
    const matSideWing = new THREE.MeshPhongMaterial({
      color: colors.red,
      shading: THREE.FlatShading
    });
    let sideWing = new THREE.Mesh(geomSideWing, matSideWing);
    sideWing.position.set(0, 0, 0);
    sideWing.castShadow = true;
    sideWing.receiveShadow = true;
    this.mesh.add(sideWing);

    // Propeller *螺旋桨杆
    const geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
    const matPropeller = new THREE.MeshPhongMaterial({
      color: colors.brown,
      shading: THREE.FlatShading
    });
    this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
    this.propeller.castShadow = true;
    this.propeller.receiveShadow = true;

    // Blades *叶片
    const geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
    const matBlade = new THREE.MeshPhongMaterial({
      color: colors.brownDark,
      shading: THREE.FlatShading
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
  constructor() {
    const geometry = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
    geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2)); //NOTE: 这句话的用处是？


    var l = geometry.vertices.length;

    this.waves = [];

    for (var i=0;i<l;i++){
      var v = geometry.vertices[i];
      this.waves.push({y:v.y,
                      x:v.x,
                      z:v.z,
                      ang:Math.random()*Math.PI*2,
                      amp:5 + Math.random()*15,
                      speed:0.016 + Math.random()*0.032
                      });
    };

    const material = new THREE.MeshPhongMaterial({
      color: colors.blue,
      transparent: true,
      opacity: .8,
      shading: THREE.FlatShading,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true; // airplane cast shadow
  }
  move(rotateAngel = 0) { // no default
    this.mesh.rotation.z += rotateAngel;
  }
  moveWaves() { //海浪
    let verts = this.mesh.geometry.vertices;
    let l = verts.length;
    for (let i=0; i<l; i++){
      let v = verts[i];
      let vprops = this.waves[i];
      v.x =  vprops.x + Math.cos(vprops.ang)*vprops.amp;
      v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;
      vprops.ang += vprops.speed;
    }
    this.mesh.geometry.verticesNeedUpdate=true;
    this.mesh.rotation.z += .005;
  }
}

export {Airplane, Sky, Sea}