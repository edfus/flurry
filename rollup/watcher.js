import { watch } from 'chokidar';
import { buildJS, buildCSS } from "./builder.js";
import __dirname from "./helpers/__dirname.js";
import debounce from "./helpers/debounce.js";

const root_directory = path.join(__dirname, '/..');

/**
 * Watcher for js and css files
 */
function filesWatcher() {
    const watcher = watch([`${root_directory}/src`], {
        ignored: [],
        persistent: true,
        depth: 3,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 500
        },
    });

    watcher.on('change', file => {
        if (file.endsWith('.js')) {
            return debounce(file, buildJS, 10000);
        }
        if (file.endsWith('.styl')) {
            return debounce(file, buildCSS, 1000);
        }
    })
    watcher.on('ready', () => console.info('Now watching files, up for changes.'))
}

filesWatcher();