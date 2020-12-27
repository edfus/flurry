import stylus from "stylus";
import { readFile, writeFile } from 'fs';
import { FileIO } from "../helpers/normalize-config.js";

// https://github.com/stylus/stylus/blob/dev/docs/js.md

async function stylusCompiler(config) {
  const file = new FileIO(config);

  const content = await new Promise(
      (resolve, reject) => 
          readFile(
            file.input.path, "utf8",
            (err, data) => err ? reject(err) : resolve(data)
          )
  );

  return (
    new Promise((resolve, reject) => 
        stylus(content)
            .set('filename', file.input.base) // to provide better error reporting.
            .render(async (err, css) => {
                if(err)
                  return reject(err);
                
                if(config.minify) {
                  return resolve(
                    (await import("./clean-css.js")).default(css, config)
                  );
                } else {
                  return writeFile(
                    file.output.path, css,
                    err => err ? reject(err) : resolve(file.output.path)
                  )
                }
            })
    )
  )
}

export default stylusCompiler;