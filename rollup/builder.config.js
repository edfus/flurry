import { join } from 'path';
import __dirname from "./helpers/__dirname.js";
import { buildJS, buildCSS } from "./builder.js";

const root_dir = join(__dirname, "../");

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
      format: "esm"
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
      format: "iife"
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

const version = "1.1.3"; //NOTE

async function buildAll () {
  return (
      Promise.all(
          config.map(({action, entry, output, config}) => 
            action(entry, output, config)
          )
      )
  );
}

export { config, version, buildAll }