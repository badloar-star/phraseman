import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const [, , targetPathArg, sourceDirArg, widthArg, heightArg] = process.argv;

if (!targetPathArg || !sourceDirArg || !widthArg || !heightArg) {
  console.error('usage: node scripts/save-latest-dalle-background-asset.mjs <targetPath> <sourceDir> <width> <height>');
  process.exit(1);
}

const root = process.cwd();
const targetPath = path.resolve(root, targetPathArg);
const sourceDir = path.resolve(root, sourceDirArg);
const width = Number(widthArg);
const height = Number(heightArg);

if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
  console.error('width and height must be positive integers');
  process.exit(1);
}

const generatedRoot = path.join(os.homedir(), '.codex', 'generated_images');
const generatedFiles = [];

function collectPngs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectPngs(full);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      generatedFiles.push(full);
    }
  }
}

collectPngs(generatedRoot);

if (generatedFiles.length === 0) {
  console.error(`no generated png files found under ${generatedRoot}`);
  process.exit(1);
}

generatedFiles.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
const latest = generatedFiles[0];

fs.mkdirSync(sourceDir, { recursive: true });
fs.mkdirSync(path.dirname(targetPath), { recursive: true });

const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
const targetBase = path.basename(targetPath, path.extname(targetPath));
const copiedSource = path.join(sourceDir, `${targetBase}-dalle-${stamp}.png`);
fs.copyFileSync(latest, copiedSource);

if (fs.existsSync(targetPath)) {
  const backupDir = path.join(path.dirname(targetPath), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${targetBase}-${stamp}${path.extname(targetPath)}`);
  fs.copyFileSync(targetPath, backupPath);
}

await sharp(copiedSource)
  .resize(width, height, { fit: 'cover', position: 'center' })
  .webp({ quality: 92 })
  .toFile(targetPath);

const metadata = await sharp(targetPath).metadata();
console.log(`saved ${targetPath} ${metadata.width}x${metadata.height} from ${latest}`);
