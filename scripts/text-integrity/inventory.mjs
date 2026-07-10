import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { collectProductionFiles, scanTextIntegrity } = require('./inventory-core.cjs');

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..', '..');
const relativeFiles = collectProductionFiles(root);
const result = scanTextIntegrity(root, relativeFiles);

process.stdout.write(`${JSON.stringify({
  baselineStatus: 'missing',
  files: result.files,
  unsafeSites: result.unsafeSites,
  unsafeGroups: result.unsafeGroups,
})}\n`);
