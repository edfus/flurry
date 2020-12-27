import { join } from 'path';
import __dirname from "./helpers/__dirname.js";
import { buildJS, buildCSS } from "./builder.js";

const root_dir = join(__dirname, "../");

const version = "1.1.3";

const config = [
  {
    match (fileName) {
      return /((?<!service-worker)\.js)$/.test(fileName)
    },
    action: buildJS,
    entry: join(root_dir, "./src/main.js"),
    output: join(root_dir, "./dist"),
    config: {
      chunks: true,
      format: "esm",
      chunkFileNames: `[name].js`,
      entryFileNames: `[name]@${version}.js`,
      compact: true,
      preserveEntrySignatures: false
    }
  },
  {
    match (fileName) {
      return /(service-worker\.js)$/.test(fileName)
    },
    action: buildJS,
    entry: join(root_dir, "./src/service-worker.js"),
    output: join(root_dir, "./www"),
    config: {
      format: "iife",
      fileName: "sw.js",
      compact: true
    }
  },
  {
    match (fileName) {
      return /(\.styl)$/.test(fileName);
    },
    action: buildCSS,
    entry: join(root_dir, "./src/styles/style.styl"),
    output: join(root_dir, "./dist")
  }
];

async function buildAll () {
  return (
      Promise.all(
          config.map(({action, entry, output, config}) => 
            action(entry, output, config)
          )
      )
  );
}

export { config, buildAll }