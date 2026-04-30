/**
 * Lossless PNG recompression: same pixels, often smaller file (max zlib + adaptive row filters).
 * Skips a file if the new buffer would be larger. No palette/quantization (stays lossless).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const IGNORE_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.expo',
  'dist',
  'build',
  'coverage',
  '.claude',
  '.claude-flow',
  'Pods',
]);

const PNG_LOSSLESS = {
  compressionLevel: 9,
  effort: 10,
  adaptiveFiltering: true,
};

async function* walkPngs(dir) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIR_NAMES.has(e.name)) continue;
      yield* walkPngs(full);
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.png')) {
      yield full;
    }
  }
}

const files = [];
for await (const f of walkPngs(ROOT)) {
  files.push(f);
}
files.sort();

let totalBytesSaved = 0;
let filesImproved = 0;
let wouldBeLarger = 0;
let readErrors = 0;

for (const file of files) {
  const before = (await fs.promises.stat(file)).size;
  const beforeBuf = await fs.promises.readFile(file);
  let outBuf;
  try {
    outBuf = await sharp(beforeBuf).png(PNG_LOSSLESS).toBuffer();
  } catch (e) {
    readErrors++;
    console.error(`[err] ${path.relative(ROOT, file)}: ${e.message}`);
    continue;
  }
  if (outBuf.length < before) {
    await fs.promises.writeFile(file, outBuf);
    totalBytesSaved += before - outBuf.length;
    filesImproved++;
  } else if (outBuf.length > before) {
    wouldBeLarger++;
  }
}

const totalFinal = await Promise.all(files.map((f) => fs.promises.stat(f).then((s) => s.size)));
const sumFinal = totalFinal.reduce((a, b) => a + b, 0);

console.log(
  JSON.stringify(
    {
      pngFiles: files.length,
      filesImproved,
      totalBytesSaved,
      kbSaved: (totalBytesSaved / 1024).toFixed(1),
      mbSaved: (totalBytesSaved / (1024 * 1024)).toFixed(2),
      skippedAlreadyOptimal: files.length - filesImproved - readErrors,
      wouldBeLargerIfRewritten: wouldBeLarger,
      readErrors,
      totalPngSizeAfterBytes: sumFinal,
    },
    null,
    2,
  ),
);
