/**
 * Inserts spanish: field after ukrainian for all phrases in app/lesson_data_17_24.ts
 * Run: node scripts/apply-lesson-spanish-17-24.mjs
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPANISH = JSON.parse(
  fs.readFileSync(join(__dirname, 'lesson-17-24-spanish.json'), 'utf8')
);

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

let content = fs.readFileSync(join(__dirname, '..', 'app', 'lesson_data_17_24.ts'), 'utf8');

const missing = [];

for (const [id, spanish] of Object.entries(SPANISH)) {
  if (id.startsWith('lesson')) {
    const safeId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `(id: '${safeId}',[\\s\\S]*?\\n\\s*ukrainian: ')((?:[^'\\\\]|\\\\.)*)'(\\s*,\\s*\\n\\s*words:)`,
      'm'
    );
    if (!re.test(content)) {
      missing.push(id);
      continue;
    }
    content = content.replace(re, `$1$2',\n    spanish: '${esc(spanish)}'$3`);
    continue;
  }

  if (id.startsWith('l20p') || id.startsWith('l21p')) {
    const safeId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let re;
    if (id === 'l20p50') {
      re = new RegExp(
        `(\\{id:'l20p50',english:"(?:[^"\\\\]|\\\\.)*",russian:'(?:[^'\\\\]|\\\\.)*',ukrainian:')((?:[^'\\\\]|\\\\.)*)'(,words:\\[)`,
        ''
      );
    } else {
      re = new RegExp(
        `(\\{id:'${safeId}',english:'(?:[^'\\\\]|\\\\.)*',russian:'(?:[^'\\\\]|\\\\.)*',ukrainian:')((?:[^'\\\\]|\\\\.)*)'(,words:\\[)`,
        ''
      );
    }
    if (!re.test(content)) {
      missing.push(id);
      continue;
    }
    content = content.replace(re, `$1$2',\n  spanish:'${esc(spanish)}'$3`);
  }
}

if (missing.length) {
  console.error('MISSING replacements:', missing);
  process.exit(1);
}

const spanishCount = (content.match(/\bspanish:/g) || []).length;
console.log('spanish fields:', spanishCount);

fs.writeFileSync(join(__dirname, '..', 'app', 'lesson_data_17_24.ts'), content, 'utf8');
