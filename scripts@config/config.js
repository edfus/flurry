// export
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
  return document.getElementById('canvas')
},

GameStartCallback = async () => { // asynchronous 异步的，非同时的
  const loadSection = document.getElementById('loading-section');
  const loader = document.getElementById('loader');
  const fadeOut = (num1, num2, speed) => {
    (loadSection.style.opacity = num1) <= .1
        ? loadSection.hidden = true 
        : (loader.style.opacity = num2) 
          && setTimeout(()=>fadeOut(num1 - .06, num2 - .09, speed), speed) // speed单位：毫秒
  }
  setTimeout(()=>{
    fadeOut(1, 1, 75)
  }, 400)
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
    gameStartCallback: GameStartCallback,
    speed_sea: RotationSpeed_Sea,
    speed_sky: RotationSpeed_Sky
}