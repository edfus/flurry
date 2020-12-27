import { dirname } from "path"

import { rollup } from 'rollup';
import babel from 'rollup-plugin-babel';
import { FileIO } from "../helpers/normalize-config.js";

global.rollupCache = global.rollupCache || {};

function toCamelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|[-_])/g, (letter, index) => {
        return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
    }).replace(/\s+/g, '').replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
}

async function jsCompiler(config) {
    const file = new FileIO(config);
    const _config = file._isInConfig;

    const cache = global.rollupCache[file.input.base] 
                    ? global.rollupCache[file.input.base] 
                    : null;
    return ( // UMD and IIFE output formats are not supported for code-splitting builds.
        rollup({ // https://rollupjs.org/guide/en/#rolluprollup
            input: file.input.path,
            cache: cache,
            plugins: [
                babel({
                    comments: false,
                    presets: [
                        ['@babel/preset-env', {
                            modules: false, // https://babeljs.io/docs/en/babel-preset-env#modules
                            targets: {
                                esmodules: true
                            }
                        }]
                    ]
                }),
            ]
        }).then(async bundle => {
            global.rollupCache[file.input.base] = bundle.cache;
            const options = {
                format: _config("format").orDefault("iife"),
                strict: _config("strict").orDefault(true),
                sourcemap: _config("sourcemap").orDefault(false),
                name: _config("moduleID", "name")
                        .orDefault(toCamelCase(file.input.without_ext))
            }

            if("chunks" in config)
                options.dir = dirname(file.output);
            else options.file = file.output;
            
            await bundle.write(options);
            await bundle.close();
            return file.output;
        })
    );
}


export default jsCompiler;