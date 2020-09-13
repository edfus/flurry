//NOTE: 调用方法： new AirPlane();
import colors from '../scripts@config/colors.js';

const numOfCloudsInSky = 20,
      rotationSpeedOfPropeller = .3;

/*
class name [extends otherName] {
  // class body
}
*/

class Airplane {
  constructor() {
    this.mesh = new THREE.Object3D();
    this.mesh.name = "airPlane";

    // Create the cabin *座舱
    const geomCockpit = new THREE.BoxGeometry(60, 50, 50, 1, 1, 1);
    const matCockpit = new THREE.MeshPhongMaterial({
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

    let blade = new THREE.Mesh(geomBlade, matBlade);
    blade.position.set(8, 0, 0);
    blade.castShadow = true;
    blade.receiveShadow = true;

    this.propeller.add(blade);
    this.propeller.position.set(50, 0, 0);
    this.mesh.add(this.propeller); // propeller的旋转在updatePlane()中控制
  }
  propellerSpin(speed = rotationSpeedOfPropeller) { // 默认速度为rotationSpeedOfPropeller
    this.propeller.rotation.x += speed; // 螺旋桨旋转速度
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
      const height = 750 + Math.random() * 200; //NOTE: 750 200 数值是怎么确定的？是否可更改以更好适应Mobile端和PC端？
      newCloud.mesh.position.x = Math.cos(angle) * height;
      newCloud.mesh.position.y = Math.sin(angle) * height;
      newCloud.mesh.rotation.z = angle + Math.PI / 2; // rotation

      newCloud.mesh.position.z = -400 - Math.random() * 400; // random z pos //NOTE: 400如何确定？

      const scaleRatio = 1 + Math.random() * 2; // random scale
      newCloud.mesh.scale.set(scaleRatio, scaleRatio, scaleRatio);

      this.mesh.add(newCloud.mesh);
    }
  }
}

class Sea {
  constructor() {
    const geometry = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
    geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2)); //NOTE: 这句话的用处是？

    const material = new THREE.MeshPhongMaterial({
      color: colors.blue,
      transparent: true,
      opacity: .6,
      shading: THREE.FlatShading,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true; // airplane cast shadow
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

export {Airplane, Sky, Sea}