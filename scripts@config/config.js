// inner
const fadeOutSpeedLevel = 4;

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

  const reduction_num1 = .02 * fadeOutSpeedLevel,
        reduction_num2 = .03 * fadeOutSpeedLevel;

  const fadeOut = (num1, num2, speed) => {
    (loadSection.style.opacity = num1) <= .1
        ? (loadSection.hidden = true) && (loadSection.style.willChange = loader.style.willChange = 'auto')
        : (loader.style.opacity = num2) 
          && setTimeout(()=>fadeOut(num1 - reduction_num1, num2 - reduction_num2, speed), speed) // speed单位：毫秒
  }
  setTimeout(()=>{
    loadSection.style.willChange = "opacity";
    loader.style.willChange = "opacity";
    fadeOut(1, 1, 25 * fadeOutSpeedLevel);
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