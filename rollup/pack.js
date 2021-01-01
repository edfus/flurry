import { join } from 'path';

import { buildAll } from "./builder.config.js";
import { processFiles } from "./helpers/copy.js";
import notify from './helpers/notify.js';
import __dirname from "./helpers/__dirname.js";
import { updateFileContent } from "update-file-content";

const args = process.argv.slice(2);
const root_directory = join(__dirname, '/..');

const toReplace = "three",
      replacement = "/node_modules/three/build/three.module.js";

(async () => {
    if(extractArg(/--build-only/i)) {
        await resolveNodeDependencies(
            replacement,
            toReplace
        );
        return buildAll();
    } else {
        if(extractArg(/--(update-)?cache|-c/i)) {
            await updateCacheResources();
            await updateDLC();
        }

        await adoptVersion();

        if(extractArg(/--test|-t/i)) {
            await resolveNodeDependencies(
                toReplace,
                replacement
            );
        } else {
            await resolveNodeDependencies(
                replacement,
                toReplace
            );
        }

        if(extractArg(/--build(?!-only)|-b/i)) {
            await buildAll();
        }
        
        console.info("\nDone.\n");
        return process.exit(0);
    }
})().catch(error => {
    notify('Build Errored', `View logs for more info`);
    throw error;
});

async function updateCacheResources () {
    const ignore = /orbit-controls(\.min)?\.js/;
    const replacement = [];

    replacement.push("\"/\""); // root

    await processFiles(join(root_directory, "./dist/"), filename => {
        if(ignore.test(filename))
            return ;
        else replacement.push(`"${decode(filename)}"`);
    });

    return _updateCache("cache-resources.js", `\n  ${replacement.join(",\n  ")}\n`);
}
  
async function updateDLC () {
    const ignore = /favicons|audio/;
    const replacement = [];

    await processFiles(join(root_directory, "./assets/"), filename => {
        if(ignore.test(filename))
            return ;
        else replacement.push(`"${decode(filename)}"`);
    });

    return _updateCache("downloadable.js", `\n  ${replacement.join(",\n  ")}\n`);
}

function decode (filename) {
    return filename.replace(root_directory, "").replace(/\\/g, "/");
}
  
async function _updateCache(filename, replacement) {
    return updateFileContent({
        file: join(root_directory, "./src/service-worker/", filename),
        search: /export\s+default\s+\[((.|\n)*?)\];/,
        replacement,
        separator: null
    });
}

async function resolveNodeDependencies (from, to) {
    const handler = file => updateFileContent({
        file,
        search: new RegExp(
          `${/\s*from\s*['"]/.source}(${from.replace(/\//g, "\/")})${/['"]/.source}`
        ),
        replacement: to,
        limit: 1
    });

    await processFiles(join(root_directory, "./src/"), handler);
    await processFiles(join(root_directory, "./lib/"), handler);
}

async function adoptVersion () {
    let newVersion;

    try { 
        newVersion = extractArg(/(--version=)/i)
                        || args[0].split(/^v?((\d+\.)+\d+)/)[1]
    } finally {
        if(!newVersion
            && !args.some((arg, index) => /-v/i.test(arg) ? (newVersion = args[index + 1]) : false)
            ) {
                notify("Version name not provided", "possible choice: 3.0.6"); 
                return Promise.reject("adoptVersion failed");
        }
    }

    if(/^(v?(0+\.)+0+)$/.test(newVersion))
        return console.info("Using previous version number.");

    console.info("Version:", newVersion);

    await updateFileContent({
        file: join(root_directory, './package.json'),
        search: /"version":\s*"(.*?)",?/,
        replacement: newVersion
    });

    await updateFileContent({
        file: join(root_directory, './rollup/builder.config.js'),
        search: /const\s+version\s*=\s*"(.*?)";?/,
        replacement: newVersion
    });

    await updateFileContent({
        file: join(root_directory, './src/config/config.js'),
        search: /Version\s*=\s*"(.*?)",?/,
        replacement: newVersion
    });

    await updateFileContent({
        file: join(root_directory, './www/index.html'),
        search: /href="\/dist\/main@(.*?)\.min\.js"/,
        replacement: newVersion
    });

    await updateFileContent({
        file: join(root_directory, 'src/service-worker.js'),
        search: /const\s+version\s*=\s*"(.*?)";?/,
        replacement: newVersion
    });

    console.info('Version adopted smoothly');

    return newVersion;
}

function extractArg(matchPattern) {
    for (let i = 0; i < args.length; i++) {
        if (matchPattern.test(args[i])) {
            const split = args[i].split(matchPattern)
            return split[split.length - 1] || true;
        }
    }
    return false;
}