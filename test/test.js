import { buildCSS } from "../rollup/builder.js";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

buildCSS(resolve(join(__dirname, "./test.styl")), resolve(__dirname), {
  minify: false
});