/**
 * «Читается» в теории fr (старый формат, 370 фраз): сторож чтений, собранных scripts/classic_say_fr_source.cjs.
 * зачем (владелец 06.11, «Читается» в теории всех курсов; fr — полу-ручная разметка: правила дают черновик, каждую фразу просмотрели глазами): (1) у каждой фразы старой теории есть
 * чтение ru и uk, кириллицей, с одним знаком ударения на слово; (2) единообразие: чтение слова из словаря docs/work/classic_say_fr/words.json встречается во всех фразах с этим словом
 * (кроме фраз с правкой целиком phrases.json); (3) украинское чтение выводится из русского правилом ruToUk — на готовых чтениях Теории совпадение ≥ 95 %.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'modules', 'classic-courses', 'fr');
const readText = (p: string): string => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const readJson = <T>(p: string): T => JSON.parse(readText(p)) as T;
const ACUTE = '́';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS-модуль сборки
const { ruToUk } = require(path.join(ROOT, 'scripts', 'classic_say_translit_fr.cjs')) as { ruToUk: (ru: string) => string };

type SayFile = { ru: Record<string, string>; uk: Record<string, string> };
const say = readJson<SayFile>(path.join(DIR, 'say.json'));
const words = readJson<Record<string, string>>(path.join(ROOT, 'docs', 'work', 'classic_say_fr', 'words.json'));
const phraseFixes = readJson<Record<string, string>>(path.join(ROOT, 'docs', 'work', 'classic_say_fr', 'phrases.json'));

const targets = new Map<string, string>();
for (let n = 1; n <= 32; n += 1) {
  const lesson = readJson<{ phrases: Array<{ id: string; target: string }> }>(path.join(DIR, `lessons-${String(n).padStart(2, '0')}.json`));
  for (const p of lesson.phrases) targets.set(p.id, p.target);
}

function oldFormatIds(): string[] {
  const raw = readJson<{ data?: Record<string, any> } & Record<string, any>>(path.join(DIR, 'theory.json'));
  const theory = (raw.data ?? raw) as Record<string, any>;
  const ids = new Set<string>();
  for (const d of Object.values(theory)) {
    if (!d || d.plain === true) continue;
    for (const ch of d.chapters ?? []) for (const id of [...(ch.exampleIds ?? []), ...(ch.examples ?? []).map((e: any) => e?.phraseId)]) if (id) ids.add(String(id));
  }
  return [...ids];
}

describe('теория fr (старый формат): «Читается» ru и uk', () => {
  const ids = oldFormatIds();

  it('у каждой фразы старой теории есть чтение ru и uk, без латиницы и смеси алфавитов', () => {
    expect(ids.length).toBeGreaterThan(300);
    const bad: string[] = [];
    for (const id of ids) {
      const ru = say.ru[id];
      const uk = say.uk[id];
      if (!ru || !uk) { bad.push(`${id}: нет чтения`); continue; }
      if (/[A-Za-z]/.test(ru + uk)) bad.push(`${id}: латиница «${ru}»`);
      if (/[іїєґ]/i.test(ru)) bad.push(`${id}: украинские буквы в ru «${ru}»`);
      if (/[ыэъё]/i.test(uk)) bad.push(`${id}: русские буквы в uk «${uk}»`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it.each(['ru', 'uk'] as const)('ударение (%s): не больше одного знака на слово', (loc) => {
    const bad: string[] = [];
    for (const [id, text] of Object.entries(say[loc])) for (const word of text.split(/\s+/)) if (word.split(ACUTE).length - 1 > 1) bad.push(`${id}: «${word}»`);
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('единообразие: чтение слова из словаря встречается в чтении каждой фразы с этим словом', () => {
    const strip = (text: string): string => text.replace(/́/g, '');
    const bad: string[] = [];
    for (const id of ids) {
      if (phraseFixes[id]) continue;
      const ru = strip(say.ru[id] ?? '');
      for (const token of (targets.get(id) ?? '').toLowerCase().split(/[^\p{L}]+/u).filter(Boolean)) {
        const reading = words[token];
        if (reading && !ru.includes(strip(reading))) bad.push(`${id}: «${token}» = «${reading}» нет в «${say.ru[id]}»`);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('украинское чтение выводится из русского правилом: ≥ 95 % на готовых чтениях Теории', () => {
    const theoryRaw = readJson<{ data?: Record<string, any> } & Record<string, any>>(path.join(DIR, 'theory.json'));
    const theory = (theoryRaw.data ?? theoryRaw) as Record<string, any>;
    const pairs: Array<{ ru: string; uk: string }> = [];
    for (const d of Object.values(theory)) for (const ch of d?.chapters ?? []) for (const e of ch?.examples ?? []) if (e?.say?.ru && e?.say?.uk) pairs.push(e.say);
    const extra = readJson<Record<string, { ru: string; uk: string }>>(path.join(ROOT, 'docs', 'work', 'classic_intro_plain', 'say_extra_fr.json'));
    for (const [k, v] of Object.entries(extra)) if (!k.startsWith('_') && v?.ru && v?.uk) pairs.push(v);
    expect(pairs.length).toBeGreaterThan(200);
    const ok = pairs.filter((p) => ruToUk(p.ru) === p.uk).length;
    expect(ok / pairs.length).toBeGreaterThanOrEqual(0.95);
  });

  it('запись say.json в manifest.json совпадает с файлом (bytes, sha256)', () => {
    const manifest = readJson<{ languages: Record<string, { files: Record<string, { bytes: number; sha256: string }> }> }>(path.join(DIR, '..', 'manifest.json'));
    const text = readText(path.join(DIR, 'say.json'));
    const entry = manifest.languages.fr.files['say.json'];
    expect(entry.bytes).toBe(Buffer.byteLength(text));
    expect(entry.sha256).toBe(crypto.createHash('sha256').update(text).digest('hex'));
  });
});
