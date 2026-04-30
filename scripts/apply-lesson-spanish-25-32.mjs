/**
 * Inserts spanish: after ukrainian for phrases in app/lesson_data_25_32.ts
 * Run: node scripts/apply-lesson-spanish-25-32.mjs
 *
 * Lesson 26–32 use multiline objects: anchor english → russian → ukrainian in order
 * (avoids [\s\S]*? skipping to a later phrase). Lesson 25 uses compact one-line objects.
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPANISH = JSON.parse(
  fs.readFileSync(join(__dirname, 'lesson-25-32-spanish.json'), 'utf8'),
);

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

let content = fs.readFileSync(join(__dirname, '..', 'app', 'lesson_data_25_32.ts'), 'utf8');

const missing = [];

function applyL25(contentStr, id, spanish) {
  const safeId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const engSq = `'(?:[^'\\\\]|\\\\.)*'`;
  const engDq = `"(?:[^"\\\\]|\\\\.)*"`;
  const ru = `'(?:[^'\\\\]|\\\\.)*'`;

  const variants = [
    {
      re: new RegExp(
        `(\\{id:'${safeId}',english:${engSq},russian:${ru},ukrainian:')((?:[^'\\\\]|\\\\.)*)'(,words:\\[)`,
      ),
      build: (m) =>
        `${m[1]}${m[2]}',\n  spanish:'${esc(spanish)}'${m[3]}`,
    },
    {
      re: new RegExp(
        `(\\{id:'${safeId}',english:${engSq},russian:${ru},ukrainian:")((?:[^"\\\\]|\\\\.)*)"(,words:\\[)`,
      ),
      build: (m) =>
        `${m[1]}${m[2]}",\n  spanish:'${esc(spanish)}'${m[3]}`,
    },
    {
      re: new RegExp(
        `(\\{id:'${safeId}',english:${engDq},russian:${ru},ukrainian:')((?:[^'\\\\]|\\\\.)*)'(,words:\\[)`,
      ),
      build: (m) =>
        `${m[1]}${m[2]}',\n  spanish:'${esc(spanish)}'${m[3]}`,
    },
    {
      re: new RegExp(
        `(\\{id:'${safeId}',english:${engDq},russian:${ru},ukrainian:")((?:[^"\\\\]|\\\\.)*)"(,words:\\[)`,
      ),
      build: (m) =>
        `${m[1]}${m[2]}",\n  spanish:'${esc(spanish)}'${m[3]}`,
    },
  ];

  for (const { re, build } of variants) {
    const m = contentStr.match(re);
    if (m) {
      return contentStr.replace(re, build(m));
    }
  }
  return null;
}

for (const [id, spanish] of Object.entries(SPANISH)) {
  if (id.startsWith('lesson')) {
    const safeId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const eng = `(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`;
    const ru = `'(?:[^'\\\\]|\\\\.)*'`;
    const altArr = `\\[\\s*(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")(?:\\s*,\\s*(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"))*\\s*\\]`;
    const engToRu = `,\\s*\\r?\\n\\s*(?:alternatives:\\s*${altArr}\\s*,\\s*\\r?\\n\\s*)?russian:\\s*`;

    const ukSq = new RegExp(
      `(id: '${safeId}',\\s*\\r?\\n\\s*english:\\s*${eng}${engToRu}${ru},\\s*\\r?\\n\\s*ukrainian:\\s*')((?:[^'\\\\]|\\\\.)*)'(\\s*,\\s*\\r?\\n\\s*words:)`,
      'm',
    );
    const ukDq = new RegExp(
      `(id: '${safeId}',\\s*\\r?\\n\\s*english:\\s*${eng}${engToRu}${ru},\\s*\\r?\\n\\s*ukrainian:\\s*")((?:[^"\\\\]|\\\\.)*)"(\\s*,\\s*\\r?\\n\\s*words:)`,
      'm',
    );

    let next = null;
    const mSq = content.match(ukSq);
    if (mSq) {
      next = content.replace(ukSq, `$1$2',\n    spanish: '${esc(spanish)}'$3`);
    } else {
      const mDq = content.match(ukDq);
      if (mDq) {
        next = content.replace(ukDq, `$1$2",\n    spanish: '${esc(spanish)}'$3`);
      }
    }
    if (next === null) {
      missing.push(id);
      continue;
    }
    content = next;
    continue;
  }

  if (id.startsWith('l25p')) {
    const next = applyL25(content, id, spanish);
    if (next === null) {
      missing.push(id);
    } else {
      content = next;
    }
    continue;
  }

  missing.push(id);
}

if (missing.length) {
  console.error('MISSING replacements:', missing);
  process.exit(1);
}

const spanishCount = (content.match(/\bspanish:/g) || []).length;
console.log('spanish fields:', spanishCount);

fs.writeFileSync(join(__dirname, '..', 'app', 'lesson_data_25_32.ts'), content, 'utf8');
