import { basename, resolve } from 'path';

import jsCompiler from './compilers/rollup.js';
import jsMinifier from "./compilers/terser.js";
import stylusCompiler from './compilers/stylus.js';

/**
 * rollup, babel, minify.
 */
async function buildJS(file, dest, config = {}) {
  const defaultOptions = {
      src: resolve(file),
      dest: resolve(dest),
      fileName: `{name}.js`,
      format: "umd", // amd, cjs, es, iife, umd, system, esm.
      sourcemap: false,
      moduleID: ''
  }

  const outputFile = await jsCompiler({...defaultOptions, ...config});

  await jsMinifier({
      file: outputFile,
      path_o: resolve(dest),
      fileName: `{name}.min.js`
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
      fileName: `{name}.min.css`,
      minify: true,
      sourcemap: false
  }

  await stylusCompiler({...defaultOptions, ...config});

  console.info(`Built, Compiled and Minified ${basename(file)}`);
}

export { buildJS, buildCSS }