//NOTE: 全局设置，或者样式类的的东西需要写在这里。
// COLORS
const TestMode = true,

PerspectiveCameraSetting = {
    fieldOfView: 60,
    aspectRatio: window.innerWidth / window.innerHeight,
    nearPlane: 1,
    farPlane: 10000
},

GetContainer = () => {
  return document.getElementById('world')
},

RotationSpeed_Sea = .005,
RotationSpeed_Sky = .01,
RotationSpeed_Airplane = .3

// ...

export default {
    testMode: TestMode,
    cameraSetting: PerspectiveCameraSetting,
    getContainer: GetContainer,
    speed_sea: RotationSpeed_Sea,
    speed_sky: RotationSpeed_Sky,
    speed_airplane: RotationSpeed_Airplane
}