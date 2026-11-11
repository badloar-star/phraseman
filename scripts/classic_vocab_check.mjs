// Проверка словарных файлов docs/work/classic_vocab/<lang>/lesson_NN.json против входа docs/work/classic_vocab/input/<lang>_NN.json.
// Запуск: node scripts/classic_vocab_check.mjs [lang] [lesson]   Выход ≠0 при браке.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newFormsByLesson } from './classic_vocab_input.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TERMS = /(падеж|предлог\b|глагол|существительн|прилагательн|местоимен|артикл|спряжен|инфинитив|причасти|число\b|род\b|форма\b|времен|дієслов|іменник|прикметник|займенник|прийменник|відмін|article\b|verb\b|noun\b|preposition|tense|infinitive|plural|singular)/i;
const only = process.argv[2] && /^[a-z]{2}$/.test(process.argv[2]) ? process.argv[2] : null; const onlyN = process.argv[3] ? Number(process.argv[3]) : null;
let bad = 0, files = 0;
for (const lang of only ? [only] : ['en', 'es', 'fr', 'de', 'it']) {
  const generated = newFormsByLesson(lang);
  const d = join(ROOT, 'docs', 'work', 'classic_vocab', lang); if (!existsSync(d)) continue;
  for (const f of readdirSync(d).filter((x) => /^lesson_\d+\.json$/.test(x)).sort()) {
    const n = Number(/\d+/.exec(f)[0]); if (onlyN && n !== onlyN) continue; files++;
    const err = (m) => { bad++; console.log(`${lang} урок ${n}: ${m}`); };
    let out; try { out = JSON.parse(readFileSync(join(d, f), 'utf8')); } catch (e) { err(`не JSON: ${e.message.slice(0, 60)}`); continue; }
    const inp = JSON.parse(readFileSync(join(ROOT, 'docs', 'work', 'classic_vocab', 'input', `${lang}_${String(n).padStart(2, '0')}.json`), 'utf8'));
    if (JSON.stringify(inp.words.map((w) => w.form)) !== JSON.stringify((generated[n] ?? []).map((w) => w.form))) err('устаревший input cache');
    const words = out.words ?? {};
    for (const w of inp.words) if (!words[w.form]) err(`нет слова «${w.form}»`);
    for (const k of Object.keys(words)) if (!inp.words.some((w) => w.form === k)) err(`лишнее слово «${k}»`);
    for (const [k, m] of Object.entries(words)) {
      for (const loc of ['ru', 'uk']) {
        const v = m?.[loc]; if (typeof v !== 'string' || !v.trim()) { err(`«${k}»: пусто ${loc}`); continue; }
        if (TERMS.test(v)) err(`«${k}».${loc}: грамм. термин «${v}»`);
        if (/[A-Za-z]{2,}/.test(v.replace(/\([^)]*\)/g, ''))) err(`«${k}».${loc}: латиница «${v}»`);
        if (/[A-Za-z][Ѐ-ӿ]|[Ѐ-ӿ][A-Za-z]/.test(v)) err(`«${k}».${loc}: смесь алфавитов «${v}»`);
        if (v.length > 60) err(`«${k}».${loc}: длинно`);
      }
      if (!m?.en?.trim()) err(`«${k}»: пусто en`);
      if (/russian|cyrillic|ukrainian/i.test(JSON.stringify(m))) err(`«${k}»: чужой язык`);
    }
  }
}
console.log(`проверено файлов: ${files}, замечаний: ${bad}`); process.exit(bad ? 1 : 0);
