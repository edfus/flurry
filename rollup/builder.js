import { basename, resolve } from 'path';

import jsCompiler from './compilers/rollup.js';
import stylusCompiler from './compilers/stylus.js';

/**
 * Rollup & babel the js files
 * @param {string} file the relative path from where you ran the node command or the abs path
 * of the entry file (of a whole module) to be built
 * @param {string} dest the destination **folder**
 * @param {Object} config {fileName: `[name].min.js`, compact: true, format: "esm", moduleID: "", ...}
 */
async function buildJS(file, dest, config = {}) {
  const fileName = config.fileName || `[name].min.js`;

  delete config.fileName;

  await jsCompiler({
      src: resolve(file),
      dest: resolve(dest),
      fileName: fileName
  }, config);

  console.info(`Built, Compiled and Minified ${basename(file)}`)
}


/**
 * Build stylus files.
 * @param {string} file the relative path from where you ran the node command or the abs path
 * @param {string} dest the destination **folder**
 * @param {Object} config {fileName: `[name].css`, minify: true ...s}
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