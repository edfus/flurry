import { basename, extname, join, isAbsolute, dirname } from 'path';

class IsIn {
  constructor (obj) {
      return (key, ...left) => {
          return {
              orDefault (defaultValue) {
                  if(left.length) {
                      if(key in obj) return obj[key];
                      for (let i = 0; i < left.length; i++) {
                          if (left[i] in obj)
                              return obj[left[i]];
                      }
                      return defaultValue;
                  } else {
                      return obj.hasOwnProperty(key) ? obj[key] : defaultValue;
                  }
              }
          }
      }
  }
}

class FileIO {
  /*NOTE
   * a tired and loose config handler
   * TODO: investigate arguments naming conventions. AND REMOVE THIS KIND OF SHIT.
   */
  constructor (config) {
    const _config = new IsIn(config);

    const src = _config("file", "src", "source",  "path", "path_i", "path_input", "input")
                      .orDefault("");
    const dst = _config("dest", "destination", "path_o", "path_output", "outputPath", "output_path", "output")
                      .orDefault("");
    if(!isAbsolute(src) || !isAbsolute(dst))
      throw new Error(config); // isAbsolute will return false with default value ""

    this._isInConfig = _config;

    this.input = new class {
      path = src
      base = basename(this.path)
      ext = extname(this.base)
      without_ext = this.path.replace(this.ext, '')
      dir = dirname(this.path)
    }

    const input_base_without_ext = this.input.base.replace(this.input.ext, '');

    this.output = new class {
      path = 'fileName' in config
                ? join(dst, config.fileName.replace('[name]', input_base_without_ext))
                : dst
      base = basename(this.path)
      ext = extname(this.base)
      without_ext = this.path.replace(this.ext, '')
      dir = dirname(this.path)
    }
  }
}

export { IsIn, FileIO };