// Механический аудит ВСЕХ фраз классических курсов (8000): то, что можно проверить скриптом без ИИ.
// Запуск: node scripts/classic_mech_audit.mjs [--json out.json]. Результат: сводка по языкам и типам + список (id, тип, деталь).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const langs = ['en', 'es', 'fr', 'de', 'it'];
const up = (t) => t[0] !== t[0].toLowerCase();
const strip = (t) => t.toLowerCase().replace(/[.,!?;:¿¡]/g, '');
const punct = (t) => /[.,!?;:¿¡]/.test(t);
const found = []; const per = {};
for (const l of langs) {
  per[l] = { phrases: new Set(), kinds: {} };
  for (let n = 1; n <= 32; n++) {
    const j = JSON.parse(readFileSync(join(ROOT, 'modules', 'classic-courses', l, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8'));
    for (const p of j.phrases) {
      const add = (kind, detail) => { found.push({ lang: l, id: p.id, kind, detail }); per[l].phrases.add(p.id); per[l].kinds[kind] = (per[l].kinds[kind] ?? 0) + 1; };
      const ru = p.sourceLocales.ru, uk = p.sourceLocales.uk;
      if (/[іїєґ]/.test(ru)) add('alphabet_ru_has_uk_letters', ru);
      if (/[ыэъё]/.test(uk)) add('alphabet_uk_has_ru_letters', uk);
      if (!ru?.trim() || !uk?.trim()) add('translation_empty', '');
      if (ru === uk && /[а-яё]{4,}/i.test(ru) && !/[іїєґ]/.test(ru)) add('ru_equals_uk', ru);
      if (/\s{2,}|^\s|\s$/.test(ru) || /\s{2,}|^\s|\s$/.test(uk)) add('translation_spaces', '');
      if (/ [.,!?]/.test(ru) || / [.,!?]/.test(uk)) add('translation_space_before_punct', ru);
      const corrects = p.tiles.map((t) => t.correct);
      p.tiles.forEach((t, i) => {
        const seen = new Set();
        if (t.distractors.length !== 5) add('distractor_count', `${i}:${t.distractors.length}`);
        for (const d of t.distractors) {
          const k = strip(d);
          if (!/^[\p{L}][\p{L}'’-]*$/u.test(d)) add('distractor_not_word', `${i}:${d}`);
          if (k === strip(t.correct)) add('distractor_equals_correct', `${i}:${d}`);
          if (seen.has(k)) add('distractor_duplicate', `${i}:${d}`);
          seen.add(k);
          if (i > 0 && up(d) !== up(t.correct) && !(l === 'de' && up(d))) add('distractor_case_differs', `${i}:${t.correct}|${d}`);
          if (i === 0 && up(d) !== up(t.correct)) add('distractor_case_differs_first', `${i}:${t.correct}|${d}`);
          if (punct(d) !== punct(t.correct)) add('distractor_punct_differs', `${i}:${t.correct}|${d}`);
          if (Math.abs(d.length - t.correct.length) > 8 && t.correct.length > 2) add('distractor_length_far', `${i}:${t.correct}|${d}`);
          if (l === 'en' && d === 'i') add('distractor_lowercase_i', `${i}`);
          if (corrects.some((c, j) => j !== i && strip(c) === k) && false) add('distractor_is_other_correct', `${i}:${d}`);
        }
        if (/\s/.test(t.correct)) add('correct_tile_has_space', `${i}:${t.correct}`);
      });
      for (const a of p.alternatives ?? []) {
        if (!/[.!?…]$/.test(a.trim())) add('alt_no_final_punct', a);
        if (strip(a) === strip(p.target)) add('alt_equals_target', a);
      }
      const altKeys = (p.alternatives ?? []).map(strip);
      if (new Set(altKeys).size !== altKeys.length) add('alt_duplicate', '');
      if (!/[.!?…»”"]$/.test(p.target.trim())) add('target_no_final_punct', p.target);
    }
  }
}
console.log('язык | фраз с механическим замечанием | % | виды');
for (const l of langs) console.log(`${l} | ${per[l].phrases.size} | ${(per[l].phrases.size / 16).toFixed(2)}% | ${JSON.stringify(per[l].kinds)}`);
const ix = process.argv.indexOf('--json');
if (ix > 0) writeFileSync(process.argv[ix + 1], JSON.stringify(found, null, 1));
