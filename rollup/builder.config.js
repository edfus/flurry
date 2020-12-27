import { join } from 'path';
import __dirname from "./helpers/__dirname.js";
import { buildJS, buildCSS } from "./builder.js";

const root_dir = join(__dirname, "../");

const version = "1.2.4";

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
      chunkFileNames: `[name].min.js`,
      entryFileNames: `[name]@${version}.min.js`,
      compact: true,
      preserveEntrySignatures: false,
      moduleID: "flurry"
    }
  },
  {
    match (fileName) {
      return /(config\/config\.js)$/.test(fileName)
    },
    action: buildJS,
    entry: join(root_dir, "./src/config/config.js"),
    output: join(root_dir, "./dist"),
    config: {
      format: "iife",
      fileName: "config.min.js",
      compact: true,
      moduleID: "config"
    }
  },
  {
    match (fileName) {
      return /(service-worker\.js)$/.test(fileName)
    },
    action: buildJS,
    entry: join(root_dir, "./src/service-worker.js"),
    output: join(root_dir, "./"),
    config: {
      format: "iife",
      fileName: "sw.js",
      compact: true,
      moduleID: "sw"
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