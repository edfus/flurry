class flurry {
  #pi = Math.PI; // private field
  #scene = null;
  #camera = null;
  #songPlayer = window.songPlayer;
  constructor() { 
    // 创建场景、相机、渲染器
  } 
  init() {
    // 创建灯光、隧道等静态物体
  }
  #update () { // private field function
     // renderloop在外界调用，以便更好的执行暂停等
  }
  stop_audio() {
    return songPlayer.stop_instantly();
  }
  // example
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
  }
}