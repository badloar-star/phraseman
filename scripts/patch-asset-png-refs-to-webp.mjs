/**
 * Rewrites source references from .png to .webp for converted app assets.
 * Skips share-card export temp filenames (components/share_cards/shareCardPng.ts).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const IGNORE_DIR = new Set([
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

const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.md', '.mdc']);

/** Path segment assets/images/… (allows parens/spaces in filenames); stops before closing quote. */
const ASSET_IMG_PNG = /assets\/images\/[^'"]+?\.png/g;

const ADMIN_AVATAR = /avatars\/(\$\{idx\}|\d+)\.png/g;

async function* walkFiles(dir) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIR.has(e.name)) continue;
      const relDir = path.relative(ROOT, full).replace(/\\/g, '/');
      if (relDir === 'docs' || relDir.startsWith('docs/')) continue;
      yield* walkFiles(full);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (TEXT_EXT.has(ext)) yield full;
    }
  }
}

function patchContent(relPath, text) {
  const norm = relPath.replace(/\\/g, '/');
  /* Expo app.json must keep real PNG paths for icon / adaptiveIcon / splash (schema). */
  if (norm === 'app.json' || norm.endsWith('/app.json')) {
    return { out: text, changed: false };
  }
  let out = text;
  let changed = false;

  const skipAssetImg =
    norm === 'components/share_cards/shareCardPng.ts' ||
    norm.endsWith('/components/share_cards/shareCardPng.ts');

  if (!skipAssetImg) {
    const next = out.replace(ASSET_IMG_PNG, (m) => `${m.slice(0, -4)}.webp`);
    if (next !== out) {
      out = next;
      changed = true;
    }
  }

  if (norm === 'admin/index.html') {
    const next = out.replace(ADMIN_AVATAR, (_, id) => `avatars/${id}.webp`);
    if (next !== out) {
      out = next;
      changed = true;
    }
  }

  return { out, changed };
}

let filesPatched = 0;
for await (const file of walkFiles(ROOT)) {
  const rel = path.relative(ROOT, file);
  const raw = await fs.promises.readFile(file, 'utf8');
  const { out, changed } = patchContent(rel, raw);
  if (changed) {
    await fs.promises.writeFile(file, out, 'utf8');
    filesPatched++;
    console.log('patched', rel.replace(/\\/g, '/'));
  }
}

console.log(JSON.stringify({ filesPatched }, null, 2));
