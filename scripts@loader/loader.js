function newWorker () {
  return new Worker(URL.createObjectURL(new Blob([
  `import OBJLoader from '${location.protocol}//${location.host}/lib/OBJLoader.min.js';
  onmessage = ({data: path}) => {
    new OBJLoader().load(\`${location.protocol}//${location.host}\${path}\`, result => {
      postMessage(result, [result]);
    })
  }`], {type: 'application/javascript'})), { type: 'module' });
}
/* (^^;;)
 * NOTE: in worker the path must be absolute
 */
let resolveWork = null;

export default function (path, onend) {
  const worker = newWorker();
  worker.onmessage = ({data: result}) => {
    console.log(result)
    resolveWork(result);
    worker.terminate();
  }
  worker.postMessage(path);
  return new Promise(resolve => {
    resolveWork = result => resolve(onend(result));
  })
}