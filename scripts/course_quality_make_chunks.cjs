#!/usr/bin/env node
// course_quality_make_chunks — пакеты смыслового аудита по ЧИСТОМУ HEAD (Ревизор 05.11).
// Запуск: node scripts/course_quality_make_chunks.cjs <папка-вывода> [курсы=en,es,fr,de,it]
// Читает уроки через `git show HEAD:...` (рабочее дерево может содержать чужие правки). 100 фраз на чанк: chunk_<курс>_NN.json (формат как в pass1).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const out = process.argv[2];
if (!out) { console.error('нужна папка вывода'); process.exit(2); }
const courses = (process.argv[3] || 'en,es,fr,de,it').split(',');
const root = path.join(__dirname, '..');
fs.mkdirSync(out, { recursive: true });
const sha = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
for (const c of courses) {
  const all = [];
  for (let n = 1; n <= 32; n += 1) {
    const rel = 'modules/classic-courses/' + c + '/lessons-' + String(n).padStart(2, '0') + '.json';
    const j = JSON.parse(execSync('git show HEAD:' + rel, { cwd: root, maxBuffer: 1 << 28 }).toString());
    for (const p of j.phrases) {
      all.push({ lesson: n, id: p.id, target: p.target, ru: p.sourceLocales && p.sourceLocales.ru, uk: p.sourceLocales && p.sourceLocales.uk, tiles: p.tiles.map((t) => ({ correct: t.correct, distractors: t.distractors })), alternatives: p.alternatives || [], accepted: p.accepted || undefined });
    }
  }
  for (let i = 0; i < all.length; i += 100) fs.writeFileSync(path.join(out, 'chunk_' + c + '_' + String(i / 100).padStart(2, '0') + '.json'), JSON.stringify(all.slice(i, i + 100)));
}
const ins = path.join(root, 'docs', 'work', 'course_quality_1pct', 'pass1', 'INSTRUCTIONS.md');
if (fs.existsSync(ins)) fs.copyFileSync(ins, path.join(out, 'INSTRUCTIONS.md'));
console.log('HEAD', sha, '->', out, fs.readdirSync(out).length, 'файлов');
