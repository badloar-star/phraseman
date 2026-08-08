/**
 * Найти translate_meaning с одинаковым RU и UK (слова после ·) — кальки/ошибка локали.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function halves(s) {
  const parts = String(s).split('·').map((x) => x.trim());
  const a = parts[0] || '';
  const b = parts.slice(1).join('·').trim() || '';
  return { ru: a, uk: b };
}

function scan(rows, label) {
  let n = 0;
  for (const q of rows) {
    if (q.type !== 'translate_meaning') continue;
    const badOpt = [];
    for (let i = 0; i < q.options.length; i++) {
      const { ru, uk } = halves(q.options[i]);
      if (ru && uk && ru === uk) badOpt.push(i);
    }
    const { ru: cr, uk: cu } = halves(q.correct);
    const badCorr = cr && cu && cr === cu;
    if (badOpt.length || badCorr) {
      n++;
      if (n <= 25)
        console.log(label, q.question?.slice(0, 55), 'optSameIdx', badOpt, 'corrSame', badCorr);
    }
  }
  console.log(label, 'cardsWithSameRuUk', n);
}

for (const [name, rel] of [
  ['B1', 'scripts/b1_seed.json'],
  ['A2', 'scripts/a2_seed.json'],
]) {
  const rows = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  scan(rows, name);
}
