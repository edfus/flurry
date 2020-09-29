// 全局设置，或者样式类的的东西需要写在这里。
// COLORS
const TestMode = true,

themeColor = '#000', // used in , webmanifest

BackgroundColor = '#f7d9aa', // used in index.html/meta-themeColor, style-background


Version = '1.2.0' + '--dev', //NOTE: 添加功能后记得更改这个

PerspectiveCameraSetting = {
    fieldOfView: 60,
    aspectRatio: window.innerWidth / window.innerHeight,
    nearPlane: 1,
    farPlane: 10000
},

GetContainer = () => {
  return document.getElementById('world')
},

GetFallbackEle = () => {
  return document.getElementById('fallback-content') // fallback content when error occurred
},

RotationSpeed_Sea = .005,
RotationSpeed_Sky = .01

;
// ...

export default {
    testMode: TestMode,
    version: Version,
    cameraSetting: PerspectiveCameraSetting,
    getContainer: GetContainer,
    getFallbackEle: GetFallbackEle,
    speed_sea: RotationSpeed_Sea,
    speed_sky: RotationSpeed_Sky
}