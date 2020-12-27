import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export default dirname(join(fileURLToPath(import.meta.url), '/..'));
