import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { expandAssetPatternsToExactFiles } = require('../app.config.js');
const { expo } = require('../app.json');

const CRITICAL_VISUAL_DIRS = [
  'assets/images/flashcard_backs',
];

function toPosixPath(value) {
  return String(value).replace(/\\/g, '/');
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundledFiles = new Set(expandAssetPatternsToExactFiles(
  projectRoot,
  expo.updates?.assetPatternsToBeBundled || [],
));

const requiredFiles = CRITICAL_VISUAL_DIRS.flatMap((dir) =>
  walkFiles(path.join(projectRoot, dir))
    .filter((filePath) => /\.(?:png|jpe?g|webp)$/i.test(filePath))
    .map((filePath) => toPosixPath(path.relative(projectRoot, filePath))),
);

const missing = requiredFiles.filter((filePath) => !bundledFiles.has(filePath));

if (missing.length > 0) {
  console.error('Critical visual assets are missing from updates.assetPatternsToBeBundled:');
  for (const filePath of missing) console.error(`- ${filePath}`);
  process.exit(1);
}

console.log(`Critical visual asset bundle coverage OK (${requiredFiles.length} files)`);
