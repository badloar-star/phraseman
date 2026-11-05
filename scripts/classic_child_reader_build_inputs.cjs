// classic_child_reader_build_inputs — собирает входы для «проверки пятилетнего читателя» (Ревизор 05.11).
// Запуск: node scripts/classic_child_reader_build_inputs.cjs [локаль=ru] [уроки=1,2,3]
// зачем: читатель-агент получает ТОЛЬКО этот файл (вступление + теория + первые 6 заданий) — как реальный человек.
const fs = require('fs');
const path = require('path');
const { theoryTexts, introTexts, ROOT } = require('./classic_plain_reader_extract.cjs');
const loc = process.argv[2] || 'ru';
const lessons = (process.argv[3] || '1,2,3').split(',').map(Number);
const OUT = path.join(__dirname, '..', 'docs', 'work', 'classic_child_reader_2026_11_05', 'input');
fs.mkdirSync(OUT, { recursive: true });
for (const c of ['en', 'es', 'fr', 'de', 'it']) {
  let md = `# Курс «${c}» — тексты перед уроками ${lessons.join(', ')} (язык интерфейса: ${loc})\n\nЭто ВСЁ, что видит человек перед первыми заданиями. Больше у него нет ничего.\n`;
  for (const n of lessons) {
    const L = JSON.parse(fs.readFileSync(path.join(ROOT, c, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8'));
    md += `\n## УРОК ${n}\n\n### Вступление (экраны перед уроком)\n${introTexts(c, n, loc).map((s) => '- ' + s.replace(/\n/g, ' ')).join('\n')}\n\n### Теория (кнопка «Теория»)\n${theoryTexts(c, n, loc).map((s) => '- ' + s.replace(/\n/g, ' ')).join('\n')}\n\n### Первые задания урока (человек собирает перевод из плиток)\n`;
    L.phrases.slice(0, 6).forEach((p, i) => { md += `${i + 1}. Дана фраза: «${(p.sourceLocales && p.sourceLocales[loc]) || ''}» → нужно собрать на изучаемом языке из плиток: ${p.tiles.map((t) => t.text || t.correct).join(' | ')}\n`; });
  }
  fs.writeFileSync(path.join(OUT, `${c}_lessons_${lessons.join('_')}_${loc}.md`), md);
}
console.log('ok', OUT);
