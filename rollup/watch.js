import { join } from "path"
import chokidar from 'chokidar';
import __dirname from "./helpers/__dirname.js";
import debounce from "./helpers/debounce.js";

const root_directory = join(__dirname, '/..');

import { config } from "./builder.config.js";

/**
 * Watcher for js and css files
 */
function filesWatcher() {
    const watcher = chokidar.watch([`${root_directory}/src`], {
        ignored: [".babelrc.json"],
        persistent: true,
        depth: 3,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 500
        },
    });

    watcher.on('change', file => {
        debounce(file, () => {
            for(const suit of config) {
                if(suit.match(file)) {
                    return suit.action(suit.entry, suit.output, suit.config); // async
                }
            }
        }, 1000);
    })
    watcher.on('ready', () => console.info('Now watching files, up for changes.'))
}

filesWatcher();