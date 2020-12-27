import path from 'path';

import { build } from "./builder.js";
import notify from './helpers/notify.js';
import __dirname from "./helpers/__dirname.js";
import rw_stream from "./helpers/rw_stream.js";

const args = process.argv.slice(2);
const root_directory = path.join(__dirname, '/..');

(async () => {
    if(extractArg(/--build-only/i)) {
        return build();
    } else {
        await adoptVersion();

        if(extractArg(/--build(?!-only)|-b/i)) {
            await build();
        }

        console.info("\nDone.\n");
        return process.exit(0);
    }
})().catch(error => {
    notify('Build Errored', `View logs for more info`);
    throw error;
});



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

    await updateFileVersion({
        file: path.join(root_directory, 'package.json'),
        search: /"version":\s*"(.*)",?/,
        replace: newVersion
    });

    await updateFileVersion({
        file: path.join(root_directory, 'rollup/version.js'),
        search: /export\s+default\s+"(.*)";?/,
        replace: newVersion
    });

    await updateFileVersion({
        file: path.join(root_directory, 'src/config/config.js'),
        search: /Version\s*=\s*"(.*)",?/,
        replace: newVersion
    });

    await updateFileVersion({
        file: path.join(root_directory, 'src/service-worker.js'),
        search: /const\s+version\s*=\s*"(.*)";?/,
        replace: newVersion
    });

    console.info('Version adopted smoothly');

    return newVersion;
}

async function updateFileVersion(data) {
    // set the global flag to ensure search pattern is "stateful"
    const pattern = new RegExp(data.search, 'g'); 
    let matches = null;

    return rw_stream(data.file, /\r?\n/, (line, EOF) => {
        while ((matches = pattern.exec(line)) !== null) {
            let foundLine = matches[0];
            let newLine = foundLine.replace(matches[1], data.replace)
            line = line.replace(foundLine, newLine);
        }

        return EOF ? line : line.concat("\n"); // LF
    });
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