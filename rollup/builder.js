import { join, basename, resolve } from 'path';

import version from "./version.js";
import __dirname from "./helpers/__dirname.js";
import jsCompiler from './compilers/rollup.js';
import jsMinifier from "./compilers/terser.js";
import stylusCompiler from './compilers/stylus.js';

const offset = join(__dirname, "../");

let config = {
  js: {
      src: offset.concat("src/main.js"),
      dest: offset.concat("dist"),
  },
  css: {
      src: offset.concat("src/styles/style.styl"),
      dest: offset.concat("dist"),
  }
};

/**
 * rollup, babel, minify.
 */
async function buildJS() {
  const file = resolve(config.js.src);

  const outputFile = await jsCompiler({
      src:  file,
      dest: resolve(config.js.dest),
      fileName: `{name}@${version}.js`,
      format: 'umd', // amd, cjs, es, iife, umd, system. esm? universal module.
      sourcemap: false,
      moduleID: ''
  })

  await jsMinifier({
      file: outputFile,
      path_o: resolve(config.js.dest),
      fileName: `{name}.min.js`
  })

  console.info(`Built, Compiled and Minified ${basename(file)}`)
}


/**
* Handle Postcss files
*/
async function buildCSS() {
  const file = resolve(config.css.src);

  await stylusCompiler({
        file,
        dest: resolve(config.css.dest),
        fileName: `{name}@${version}.min.css`,
        minify: true,
        sourcemap: false
  });

  console.info(`Built, Compiled and Minified ${basename(file)}`);
}

async function build () {
  return (
      Promise.all(
          [
              buildJS(),
              buildCSS()
          ]
      )
  );
}

export { buildJS, buildCSS, build }