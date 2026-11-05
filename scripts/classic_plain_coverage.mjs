// Покрытие новых слов урока теорией «как для ребёнка»: слово введено, если его лемма стоит в тексте главы ИЛИ хотя бы одна фраза с ним (phraseIds) показана
// в примерах глав (фраза → перевод). Также считает задания (sample:false) на урок. Запуск: node scripts/classic_plain_coverage.mjs [lang] [lesson]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = join(ROOT, 'docs', 'work', 'classic_theory_plain');
const norm = (t) => t.toLowerCase().replace(/[.,!?;:¿¡«»"]/g, '');
const langArg = process.argv[2]; const only = process.argv[3] ? Number(process.argv[3]) : null;
for (const l of langArg ? [langArg] : ['en', 'es', 'fr', 'de', 'it']) {
  const dir = join(D, l); if (!existsSync(dir)) continue;
  const gl = JSON.parse(readFileSync(join(ROOT, 'docs', 'work', 'classic_theory_plain', 'glossary_snapshot', l + '.json'), 'utf8')).lemmas;
  for (const f of readdirSync(dir).filter((x) => /^lesson_\d+\.json$/.test(x)).sort()) {
    const n = Number(/\d+/.exec(f)[0]); if (only && n !== only) continue;
    let o; try { o = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { continue; }
    const shown = new Set(o.chapters.flatMap((c) => c.examples.map((e) => e.phraseId)));
    const text = o.chapters.map((c) => c.text.ru + ' ' + c.text.en).join(' ').toLowerCase();
    const words = gl.filter((e) => e.firstLesson === n);
    const hasWord = (w) => text.split(/[^\p{L}'’]+/u).includes(norm(w));
    const missing = words.filter((e) => !(e.phraseIds ?? []).some((id) => shown.has(id)) && !String(e.lemma).toLowerCase().split(/[\s/(),.]+/u).filter((t) => t.length > 1 && !/^(l|le|la|les|il|lo|gli|i|el|los|las|un|una|der|die|das|den|dem|des|ein|eine|the|a|an|to|f|m|pl)$/.test(t)).some((t) => hasWord(t)));
    const tasks = o.chapters.reduce((a, c) => a + (c.practice ?? []).filter((p) => !p.sample).length, 0);
    console.log(`${l} урок ${n}: новых слов ${words.length}, не введено ${missing.length} (${missing.slice(0, 8).map((e) => e.lemma).join(', ')}), заданий ${tasks}, примеров ${shown.size}`);
  }
}
