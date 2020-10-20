function newWorker () {
  return new Worker(URL.createObjectURL(new Blob([
  `import OBJLoader from '../lib/OBJLoader.min.js';
  onmessage = ({data: path}) => {
    console.log(path)
    new OBJLoader().load(path, result => {
      postMessage(result, [result]);
    })
  }`], {type: 'application/javascript'})), { type: 'module' });
}

let resolveWork = null;

export default function (path, onend) {
  const worker = newWorker();
  worker.onmessage = ({data: result}) => {
    resolveWork(result);
    worker.terminate();
  }
  worker.postMessage(path);
  return new Promise(resolve => {
    resolveWork = result => resolve(onend(result));
  })
}