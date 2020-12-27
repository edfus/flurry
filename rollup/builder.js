import { basename, resolve } from 'path';

import jsCompiler from './compilers/rollup.js';
import jsMinifier from "./compilers/terser.js";
import stylusCompiler from './compilers/stylus.js';

/**
 * rollup, babel, minify.
 */
async function buildJS(file, dest, config = {}) {
  const fileName = config.fileName ? config.fileName : `[name].js`;

  delete config.fileName;

  const outputFile = await jsCompiler({
      src: resolve(file),
      dest: resolve(dest),
      fileName: fileName
  }, config);

  await jsMinifier({
      file: outputFile,
      path_o: resolve(dest),
      fileName: config.compact ? `[name].js` : `[name].min.js`
  })

  console.info(`Built, Compiled and Minified ${basename(file)}`)
}


/**
* Handle Postcss files
*/
async function buildCSS(file, dest, config = {}) {
  const defaultOptions = {
      file: resolve(file),
      dest: resolve(dest),
      fileName: `[name].css`,
      minify: true,
      sourcemap: false
  }

  await stylusCompiler({...defaultOptions, ...config});

  console.info(`Built, Compiled and Minified ${basename(file)}`);
}

export { buildJS, buildCSS }