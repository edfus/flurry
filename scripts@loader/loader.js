function newWorker () {
  return new Worker(URL.createObjectURL(new Blob([
  `import OBJLoader from '${location.protocol}//${location.host}/lib/OBJLoader.min.js';
  onmessage = ({data: path}) => {
    // const encoder = new TextEncoder();
    new OBJLoader().load(\`${location.protocol}//${location.host}\${path}\`, result => {
      postMessage(result.toJSON());
    })
  }, err => postMessage(err);`], {type: 'application/javascript'})), { type: 'module' });
} 
/* (^^;;)
 * NOTE: in worker the path must be absolute
 * .toJSON(): function(){r.setFromEuler(t,!1)} could not be cloned
 * TODO: glTF Format
 */
let resolveWork = null;

export default function (path, onend) {
  const worker = newWorker();
  // const bufferDecoder = new TextDecoder("utf-8");
  worker.onmessage = ({data: result}) => {
    resolveWork(result);
    worker.terminate();
  }
  worker.postMessage(path);
  return new Promise(resolve => {
    resolveWork = result => resolve(onend(result));
  })
}