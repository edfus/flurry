import { rollup } from 'rollup';
import babel from 'rollup-plugin-babel';
import { terser } from "rollup-plugin-terser"
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { FileIO } from "../helpers/normalize-config.js";

global.rollupCache = global.rollupCache || {};

function toCamelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|[-_])/g, (letter, index) => {
        return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
    }).replace(/\s+/g, '').replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
}

async function jsCompiler(io, config) {
    const file = new FileIO(io);

    const cache = global.rollupCache[file.input.base] 
                    ? global.rollupCache[file.input.base] 
                    : null;

    const preserveEntrySignatures = config.preserveEntrySignatures;
    delete config.preserveEntrySignatures;
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
                nodeResolve(),
                terser()
            ],
            preserveEntrySignatures: preserveEntrySignatures
        }).then(async bundle => {
            global.rollupCache[file.input.base] = bundle.cache;
            const options = {
                ...{
                    format: "iife",
                    strict: true,
                    sourcemap: false,
                    name: config.name || config.moduleID || toCamelCase(file.input.without_ext)
                },
                ...config
            };
            
            if("chunks" in config) {
                options.dir = file.output.dir;
            } else options.file = file.output.path;

            delete options.chunks;
            delete options.moduleID;
            
            await bundle.write(options);
            await bundle.close();
            return config.entryFileNames 
                    ? config.entryFileNames.replace("[name]", file.output.without_ext)
                    : file.output.path
                ;
        })
    );
}


export default jsCompiler;