import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const GENERATED_ROOT = path.join(process.env.USERPROFILE || process.env.HOME || '', '.codex', 'generated_images');
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'quizzes', 'level_cards');
const SOURCE_DIR = path.join(OUT_DIR, 'dalle_sources');
const BACKUP_DIR = path.join(OUT_DIR, 'backups');

const [level, theme] = process.argv.slice(2);

if (!level || !theme) {
  console.error('Usage: node scripts/save-latest-dalle-quiz-level-card.mjs <easy|medium|hard> <theme-slug>');
  process.exit(1);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next);
    return /\.(png|jpe?g|webp)$/i.test(entry.name) ? [next] : [];
  });
}

const latest = walk(GENERATED_ROOT)
  .map(file => ({ file, mtimeMs: fs.statSync(file).mtimeMs }))
  .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.file;

if (!latest) {
  console.error(`No generated images found under ${GENERATED_ROOT}`);
  process.exit(1);
}

await fs.promises.mkdir(SOURCE_DIR, { recursive: true });
await fs.promises.mkdir(BACKUP_DIR, { recursive: true });

const sourceName = `quiz-card-${level}-${theme}-dalle-20260604-v1.png`;
const sourcePath = path.join(SOURCE_DIR, sourceName);
const targetPath = path.join(OUT_DIR, `quiz-card-${level}-${theme}.webp`);
const backupPath = path.join(BACKUP_DIR, `quiz-card-${level}-${theme}-before-dalle-20260604.webp`);

await fs.promises.copyFile(latest, sourcePath);

if (fs.existsSync(targetPath) && !fs.existsSync(backupPath)) {
  await fs.promises.copyFile(targetPath, backupPath);
}

await sharp(sourcePath)
  .resize(640, 236, { fit: 'cover', position: 'center' })
  .webp({ quality: 92, effort: 5 })
  .toFile(targetPath);

console.log(`saved ${targetPath} from ${latest}`);
