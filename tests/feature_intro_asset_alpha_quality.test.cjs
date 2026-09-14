const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

test('feature-intro masters have a clean opaque silhouette, not a chroma-key haze', async () => {
  const directory = path.join(process.cwd(), 'assets', 'images', 'feature_intros', 'dark');
  const files = fs.readdirSync(directory).filter((file) => file.endsWith('.webp') && !file.includes('legacy-lessons'));
  assert.equal(files.length, 13);

  for (const file of files) {
    const { data } = await sharp(path.join(directory, file)).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    let partiallyTransparentPixels = 0;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] > 0 && data[index] < 255) partiallyTransparentPixels += 1;
    }
    assert.ok(
      partiallyTransparentPixels <= 800,
      `${file} has ${partiallyTransparentPixels} semi-transparent pixels; the artwork must not be damaged by background extraction`,
    );
  }
});
