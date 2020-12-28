import * as THREE from 'three';

let options = {

};

let material = null;

class Obstacle {
  constructor(initial_z) {
    const angle = options.randomAngle();
    const randomI = options.randomI();
    
    this.x = options.xyDistance * Math.cos(angle);
    this.y = options.xyDistance * Math.sin(angle);
    this.z = initial_z;

    switch(randomI) {
      case 0:
        this.mesh = new THREE.Mesh(
            new THREE.TetrahedronBufferGeometry(options.radius, 0),
            material
          );
        break;
      case 1:
        this.mesh = new THREE.Mesh(
            new THREE.OctahedronBufferGeometry(options.radius, 0), 
            material
          );
        break;
      case 2:
        this.mesh = new THREE.Mesh(
            new THREE.BoxBufferGeometry(options.radius * 1.4, options.radius * 1.4, options.radius * 1.4), 
            material
        );
        break;
      case 3:
        this.mesh = new THREE.Mesh(
            new THREE.IcosahedronBufferGeometry(options.radius, 0), 
            material
          );
        break;
      case 4:
        this.mesh = this.mesh = new THREE.Mesh(
            new THREE.IcosahedronBufferGeometry(options.radius, 3), 
            material
        );
        break;
      default: throw " "
    }

    this.mesh.position.set(this.x, this.y, this.z);

    this.x_1 = this.x + options.amplitude * Math.abs(Math.sin(angle));
    this.x_2 = this.x - options.amplitude * Math.abs(Math.sin(angle));

    this.xSpeed = options.xySpeed * Math.abs(Math.sin(angle));

    this.isSame = Math.abs(Math.sin(angle)) * Math.sin(angle) > 0;
    this.isSame
    ? this.ySpeed = options.xySpeed * Math.cos(angle)
    : this.ySpeed = -options.xySpeed * Math.cos(angle);
  }

  move () {
    this.z -= options.zSpeed;

    if (this.mesh.position.x >= this.x_1) {
      this.isRaising = false;
    }
    else if (this.mesh.position.x <= this.x_2) {
      this.isRaising = true;
    }
    this.x += this.isRaising ? this.xSpeed : -this.xSpeed;
    this.y -= this.isRaising ? this.ySpeed : -this.ySpeed;

    this.mesh.position.set(this.x, this.y, this.z);

    this.mesh.rotation.z += options.rev;
    this.mesh.rotation.y += options.rev;
    this.mesh.rotation.x += options.rev;
  }

  static setOptions (opts) {
    options = Object.assign(options, opts);
    material = new THREE.MeshPhongMaterial({
      color: options.color,
      shininess: options.shininess,
      specular: options.specular, // 高光
      emissive: options.emissive,
      emissiveIntensity: options.emissiveIntensity,
      //metalness: options.metalness
    });
  }
}

export default Obstacle;