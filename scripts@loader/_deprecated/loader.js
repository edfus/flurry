function newWorker () {
  return new Worker(URL.createObjectURL(new Blob([
  `import OBJLoader from '${location.protocol}//${location.host}/lib/OBJLoader.min.js';
  onmessage = ({data: path}) => {
    new OBJLoader().load(path, result => {
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
  if(/^((https?:)?\/\/)/.test(path))
    worker.postMessage(path);
  else if(!/(?<=\/).*\..*(?=\/)/.test(path)) 
    worker.postMessage(`${location.protocol}//${location.host}/${path}`);
  else return Promise.reject(new Error('wrong URL: ' + path));
  return new Promise(resolve => {
    resolveWork = result => resolve(onend(result));
  })
}