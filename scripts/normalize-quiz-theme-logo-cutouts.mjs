import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const LOGO_DIR = path.join(ROOT, 'assets', 'images', 'quizzes', 'theme_logos');
const BACKUP_ROOT = path.join(ROOT, '.codex-tmp', 'quiz-theme-logo-cutout-backups');
const CANVAS_SIZE = 260;
const SAFE_CONTENT_SIZE = 210;
const MIN_SAFE_MARGIN = Math.floor((CANVAS_SIZE - SAFE_CONTENT_SIZE) / 2);
const ALPHA_THRESHOLD = 12;

const CATEGORY_SLUGS = [
  'kitchen-and-cooking',
  'home-and-rooms',
  'at-the-doctor',
  'body-and-health',
  'shopping-and-money',
];

const THEME_FILES = [
  'dark',
  'gold',
  'coral',
  'minimal-dark',
  'forest',
  'neon-green',
  'midnight',
  'ember',
  'aurora',
  'volt',
];

function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
  };
}

function alphaBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    rightMargin: width - maxX - 1,
    bottomMargin: height - maxY - 1,
  };
}

function minMargin(bounds) {
  if (!bounds) return 0;
  return Math.min(bounds.left, bounds.top, bounds.rightMargin, bounds.bottomMargin);
}

function nowStamp() {
  return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

async function metadataBounds(filePath) {
  const input = fs.readFileSync(filePath);
  const raw = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    info: raw.info,
    bounds: alphaBounds(raw.data, raw.info.width, raw.info.height),
  };
}

async function normalizeLogo(filePath, backupDir, write) {
  const before = await metadataBounds(filePath);
  if (!before.bounds) {
    throw new Error(`No visible pixels in ${path.relative(ROOT, filePath)}`);
  }
  if (before.info.width !== CANVAS_SIZE || before.info.height !== CANVAS_SIZE) {
    throw new Error(`Expected ${CANVAS_SIZE}x${CANVAS_SIZE}: ${path.relative(ROOT, filePath)}`);
  }

  if (write) {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(filePath, path.join(backupDir, path.basename(filePath)));

    const input = fs.readFileSync(filePath);
    const cutout = await sharp(input)
      .ensureAlpha()
      .extract({
        left: before.bounds.left,
        top: before.bounds.top,
        width: before.bounds.width,
        height: before.bounds.height,
      })
      .resize(SAFE_CONTENT_SIZE, SAFE_CONTENT_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const tempPath = `${filePath}.tmp-${process.pid}.webp`;
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    await sharp({
      create: {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{
        input: cutout,
        left: Math.round((CANVAS_SIZE - SAFE_CONTENT_SIZE) / 2),
        top: Math.round((CANVAS_SIZE - SAFE_CONTENT_SIZE) / 2),
      }])
      .webp({ quality: 96, effort: 6 })
      .toFile(tempPath);

    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
  }

  const after = write ? await metadataBounds(filePath) : before;
  return {
    file: path.relative(ROOT, filePath).split(path.sep).join('/'),
    before: before.bounds,
    after: after.bounds,
    beforeMinMargin: minMargin(before.bounds),
    afterMinMargin: minMargin(after.bounds),
    safe: minMargin(after.bounds) >= MIN_SAFE_MARGIN,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stamp = nowStamp();
  const backupDir = path.join(BACKUP_ROOT, stamp);
  const results = [];
  const missing = [];

  for (const slug of CATEGORY_SLUGS) {
    for (const theme of THEME_FILES) {
      const filePath = path.join(LOGO_DIR, `quiz-theme-${slug}-${theme}.webp`);
      if (!fs.existsSync(filePath)) {
        missing.push(path.relative(ROOT, filePath).split(path.sep).join('/'));
        continue;
      }
      results.push(await normalizeLogo(filePath, backupDir, args.write));
    }
  }

  const unsafe = results.filter(item => !item.safe);
  const summary = {
    mode: args.write ? 'write' : 'check',
    processed: results.length,
    missing,
    unsafe,
    backupDir: args.write ? path.relative(ROOT, backupDir).split(path.sep).join('/') : null,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (missing.length > 0 || unsafe.length > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
