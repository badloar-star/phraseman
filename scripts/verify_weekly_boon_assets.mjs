import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assetMapPath = path.join(root, 'constants', 'boonIconAssets.ts');
const source = readFileSync(assetMapPath, 'utf8');
const assetPaths = [...source.matchAll(/require\('\.\.\/(assets\/images\/weekly_boon_icons\/png\/[\w/.-]+\.webp)'\)/g)].map(
  (match) => match[1],
);

if (assetPaths.length !== 130) {
  throw new Error(`Weekly boon asset map must contain 130 static require() paths; found ${assetPaths.length}.`);
}

const missing = assetPaths.filter((assetPath) => !existsSync(path.join(root, assetPath)));
if (missing.length) {
  throw new Error(`Weekly boon asset map references missing file(s):\n${missing.map((assetPath) => `- ${assetPath}`).join('\n')}`);
}

console.log(`Weekly boon asset map verified: ${assetPaths.length} static files.`);
