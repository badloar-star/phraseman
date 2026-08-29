import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const appConfig = JSON.parse(read('app.json'));
const fontPlugin = appConfig.expo.plugins.find(
  (entry) => Array.isArray(entry) && entry[0] === 'expo-font',
);
assert.ok(fontPlugin, 'expo-font plugin must be configured');

const androidFonts = fontPlugin[1].android.fonts;
assert.deepEqual(
  androidFonts.map((font) => font.fontFamily),
  ['Inter'],
  'Android must register one Inter family so fontWeight selects a bundled face',
);
assert.deepEqual(
  androidFonts[0].fontDefinitions.map(({ path: fontPath, weight }) => ({ path: fontPath, weight })),
  [
    { path: './assets/fonts/Inter-Regular.ttf', weight: 400 },
    { path: './assets/fonts/Inter-SemiBold.ttf', weight: 600 },
    { path: './assets/fonts/Inter-Bold.ttf', weight: 700 },
    { path: './assets/fonts/Inter-Black.ttf', weight: 900 },
  ],
);

const {
  generateFontManagerCalls,
  getXmlSpecs,
  groupByFamily,
} = require(path.join(root, 'node_modules/expo-font/plugin/build/withFontsAndroid.js'));
const groupedFonts = groupByFamily(androidFonts);
const xmlSpecs = getXmlSpecs('unused', groupedFonts);
assert.equal(xmlSpecs.length, 1);
assert.equal(path.basename(xmlSpecs[0].path), 'xml_inter.xml');
assert.deepEqual(
  xmlSpecs[0].xml['font-family'].font.map((entry) => Number(entry.$['app:fontWeight'])),
  [400, 600, 700, 900],
);
assert.deepEqual(
  generateFontManagerCalls(groupedFonts, 'kt'),
  ['    ReactFontManager.getInstance().addCustomFont(this, "Inter", R.font.xml_inter)'],
);

console.log('android font family contract: PASS');
