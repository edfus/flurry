import fs, { promises as fsp } from 'fs';
import path from 'path';
/**
 * No check for src & dst's validation
 * Timestamp, mode, links and devices unhandled.
 * https://github.com/jprichardson/node-fs-extra/blob/master/lib/copy/copy.js
 */
class TestRules {
  constructor (rules) {
      return name => rules.some(rule => {
          switch (typeof rule) { 
              case "string": return name === rule;
              case "object": 
                  if(rule instanceof RegExp)
                      return rule.test(name);
              default:
                  return false; // invalid matching rule
          }
      })
  }
}

async function copy (src, dst, opts) {
  const matchRules = {
      folders: new TestRules(opts.ignoreFolders),
      files: new TestRules(opts.ignoreFiles)
  }

  const _copy = async (src, dst) => 
      touchItems_in(src, {
          folder: async folderPath => {
              if ( !matchRules.folders( path.basename(folderPath) ) ) { // should not ignore
                  const newPath = path.join(dst, folderPath.replace(src, ""))
                  if(!fs.existsSync(newPath)) 
                      await fsp.mkdir(newPath);
                  return _copy(folderPath, newPath);
              }
          },
  
          file: async filePath => {
              if ( !matchRules.files( path.basename(filePath) ) ) { // should not ignore
                 return fsp.copyFile(filePath, path.join(dst, filePath.replace(src, "")));
              }
          }
      })
  ;

  return _copy(src, dst);
}

async function touchItems_in (directory, { folder: dir_cb, file: file_cb}) {
  return (
      fsp.readdir(directory, {withFileTypes: true})
          .then(results => Promise.all(
            results.map(async dirent_obj => {
                if(dirent_obj.isDirectory()) {
                    return dir_cb(path.join(directory, dirent_obj.name));
                }
                if(dirent_obj.isFile()) {
                    return file_cb(path.join(directory, dirent_obj.name));
                }
                return false; // discard other file types
            })
          ))
  )
}

async function processFiles (directory, callback) {
    const handler = {
        folder: dirPath => touchItems_in(dirPath, handler),
        file: file => callback(file)
    }

    return touchItems_in(directory, handler)
}

export { copy, processFiles };