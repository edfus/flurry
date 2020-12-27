import { join, basename, resolve } from 'path';

import version from "./version.js";
import __dirname from "./helpers/__dirname.js";
import jsCompiler from './compilers/rollup.js';
import jsMinifier from "./compilers/terser.js";
import stylusCompiler from './compilers/stylus.js';


const offset = join(__dirname, "../");

let config = {
  js: {
      match: {
        test (fileName) {
          return !/(service-worker.js)$/.test(fileName);
        }
      },
      src: offset.concat("src/main.js"),
      dest: offset.concat("dist")
  },
  css: {
      match: /.*/,
      src: offset.concat("src/styles/style.styl"),
      dest: offset.concat("dist"),
  }
};

/**
 * rollup, babel, minify.
 */
async function buildJS(file, dest) {
  if(config.js.match.test(file))
    file = config.js.src;
  else if(!dest)
    throw new Error(`buildJS: ${file} !match && !dest`);

  const outputFile = await jsCompiler({
      src: resolve(file),
      dest: resolve(dest || config.js.dest),
      fileName: `{name}@${version}.js`,
      format: 'umd', // amd, cjs, es, iife, umd, system. esm? universal module.
      sourcemap: false,
      moduleID: ''
  })

  await jsMinifier({
      file: outputFile,
      path_o: resolve(dest || config.default_dest),
      fileName: `{name}.min.js`
  })

  console.info(`Built, Compiled and Minified ${basename(file)}`)
}


/**
* Handle Postcss files
*/
async function buildCSS(file) {
  if(config.css.match.test(file))
    file = config.css.src;
  else if(!dest)
    throw new Error(`buildCSS: ${file} !match && !dest`);

  await stylusCompiler({
        file: resolve(file),
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
              buildJS(config.js.src),
              buildJS(offset.concat("src/service-worker.js"), offset.concat("www")),
              buildCSS(config.css.src)
          ]
      )
  );
}

export { buildJS, buildCSS, build }