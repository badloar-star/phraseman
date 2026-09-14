import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'season_pass.tsx'), 'utf8');
const nodeColumnWidth = Number(/const NODE_COLUMN_WIDTH = (\d+);/.exec(source)?.[1]);
const rowHeight = Number(/const ROW_HEIGHT = (\d+);/.exec(source)?.[1]);
const trackRows = 60;
const overscanTop = 456;
const overscanBottom = 220;
const density = 3;
const screenWidth = 360;
const canvasHeight = rowHeight * trackRows + overscanTop + overscanBottom;
const oldBitmapBytes = screenWidth * canvasHeight * density ** 2 * 4;
const newBitmapBytes = nodeColumnWidth * canvasHeight * density ** 2 * 4;

assert.equal(oldBitmapBytes, 119_180_160, 'regression fixture must reproduce the Android 16 allocation');
assert.equal(newBitmapBytes, 18_539_136, 'narrow SVG budget must cover the same full-height track');
assert.match(source, /const spineColumnLeft = \(screenWidth - NODE_COLUMN_WIDTH\) \/ 2;/, 'track column must stay centered');
assert.match(source, /width=\{NODE_COLUMN_WIDTH\}/, 'one continuous SVG must rasterize only the node column');
assert.match(source, /viewBox=\{`\$\{spineColumnLeft\} \$\{-spineOverscanTop\} \$\{NODE_COLUMN_WIDTH\} \$\{spineCanvasHeight\}`\}/, 'viewBox must retain the global path coordinates');
assert.match(source, /marginLeft: spineColumnLeft/, 'narrow SVG must align with the centered node column');
assert.match(source, /<Path d=\{backgroundRegions\.divider\}/, 'the divider remains one full continuous path');
assert.match(source, /<Path d=\{spineGoldPath\}/, 'the progress path remains continuous');

console.log('season pass spine bitmap budget contract passed');
