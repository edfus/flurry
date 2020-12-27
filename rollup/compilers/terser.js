import { writeFile, readFile } from 'fs';
import { minify } from 'terser';
import { FileIO } from "../helpers/normalize-config.js";
/**
 * @param { Object } options path: input file path, path_output: output file path
 */
async function jsMinifier (options) {
  const file = new FileIO(options);

  return new Promise((resolve, reject) => {
      readFile(file.input.path, "utf8", async (err, data) => {
          if(err)
              return reject(err);
          
          writeFile(file.output.path, (await minify(data)).code, err => 
              err ? reject(err) : resolve(file.output.path) 
          );
      })
  })
}

export default jsMinifier;