{
  // inner
  const fadeOutSpeedLevel = 4;

  // export
  const UseNewBasejs = false,
  
  TestMode = true,

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
    /**
     * 渐隐目标对象
     * @param {*} currentOpacity 初始透明度
     * @param {*} reduction_num 每次执行改变的幅度
     * @param {*} per_ms 每隔多少毫秒执行一次。单位：毫秒
     * @param {*} reference 指向的对象
     */
    const fadeOut = (currentOpacity, reduction_num, per_ms, reference) => { 
      (reference.style.opacity = currentOpacity) < .1
      ? (reference.hidden = true) && (reference.style.willChange = 'auto')
      : setTimeout(() => fadeOut(currentOpacity - reduction_num, reduction_num, per_ms, reference), per_ms)
    }

    const loadSection = document.getElementById('loading-section');
    const loader = document.getElementById('loader');

    setTimeout(()=>{
      if(loadSection.hidden !== true){
        loadSection.style.willChange = "opacity";
        fadeOut(1, .02 * fadeOutSpeedLevel, 25 * fadeOutSpeedLevel, loadSection);
      }
      if(loader.hidden !== true){
        loader.style.willChange = "opacity";
        fadeOut(1, .03 * fadeOutSpeedLevel, 25 * fadeOutSpeedLevel, loader);
      }
    }, config?.loading_timeOut ?? 400)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_Coalescing_Operator
    // fallback: window.config && config.loading_timeOut ? config.loading_timeOut : 400
  },

  RotationSpeed_Sea = .005,
  RotationSpeed_Sky = .01

  ;

  // export default {
  window.config = {
      useNewBasejs: UseNewBasejs,
      testMode: TestMode,
      version: Version,
      cameraSetting: PerspectiveCameraSetting,
      getContainer: GetContainer,
      gameStartCallback: GameStartCallback,
      speed_sea: RotationSpeed_Sea,
      speed_sky: RotationSpeed_Sky
  }
}

window.throwError = function(...args) {
  document.getElementById('show-error').removeAttribute('hidden')
  document.getElementById('errorLog').innerText = args.join('\n');
  console.error.apply(this, arguments);
};