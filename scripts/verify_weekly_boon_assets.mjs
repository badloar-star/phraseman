import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assetMapPath = path.join(root, 'constants', 'boonIconAssets.ts');
const source = readFileSync(assetMapPath, 'utf8');
const assetPaths = [...source.matchAll(/require\('\.\.\/(assets\/images\/weekly_boon_icons\/png\/[\w/.-]+\.webp)'\)/g)].map(
  (match) => match[1],
);
const THEME_COUNT = 13;
const LIVE_BOON_ID_COUNT = 10;
const EXPECTED_STATIC_REQUIRES = THEME_COUNT * LIVE_BOON_ID_COUNT;

if (assetPaths.length !== EXPECTED_STATIC_REQUIRES) {
  throw new Error(`Weekly boon asset map must contain ${EXPECTED_STATIC_REQUIRES} static require() paths (${THEME_COUNT} themes × ${LIVE_BOON_ID_COUNT} live boon IDs); found ${assetPaths.length}.`);
}

const missing = assetPaths.filter((assetPath) => !existsSync(path.join(root, assetPath)));
if (missing.length) {
  throw new Error(`Weekly boon asset map references missing file(s):\n${missing.map((assetPath) => `- ${assetPath}`).join('\n')}`);
}

console.log(`Weekly boon asset map verified: ${assetPaths.length} static files.`);
