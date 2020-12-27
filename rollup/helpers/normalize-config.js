import { basename, extname, join, isAbsolute } from 'path';

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

    const src = _config("file", "src", "source",  "path", "path_i", "path_input")
                      .orDefault("");
    const dst = _config("dest", "destination", "path_o", "path_output", "outputPath", "output_path")
                      .orDefault("");
    if(!isAbsolute(src) || !isAbsolute(dst))
      throw new Error(config); // isAbsolute will return false with default value ""

    this._isInConfig = _config;

    this.input = new class {
      path = src
      base = basename(this.path)
      ext = extname(this.base)
      without_ext = this.base.replace(this.ext, '')
    }

    if ('fileName' in config) {
      this.output = join(dst, config.fileName.replace('{name}', this.input.without_ext));
    } else {
      this.output = dst;
    }
  }
}

export { IsIn, FileIO };