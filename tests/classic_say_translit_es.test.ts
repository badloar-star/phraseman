/**
 * Правиловый транслитератор es → кириллица с ударением (scripts/classic_say_translit_es.cjs).
 * зачем (владелец 06.11, «Читается» в теории всех курсов): 245 фраз старой теории es получают чтение правилами; правила подогнаны под 237 чтений теории es, написанных человеком.
 * Сторож не даёт им разойтись: на этих 237 примерах совпадение ru ≥ 95 %, uk ≥ 98 % (остаток — собственные огрехи теории: апостроф вместо ударения у имени, «мо́биль»/«мо́виль»).
 */
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '..', 'modules', 'classic-courses', 'es');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS-модуль сборки
const { translitEs } = require(path.join(__dirname, '..', 'scripts', 'classic_say_translit_es.cjs')) as { translitEs: (text: string, loc: 'ru' | 'uk') => string };

describe('транслитератор es → кириллица', () => {
  it('известные слова и стили теории', () => {
    expect(translitEs('Estoy aquí.', 'ru')).toBe('эсто́й аки́');
    expect(translitEs('Estoy aquí.', 'uk')).toBe('есто́й акі́');
    expect(translitEs('Él está fuera.', 'ru')).toBe('эль эста́ фуэ́ра'); // односложное «él» — без знака ударения
    expect(translitEs('¿Quién está aquí?', 'uk')).toBe('кьє́н еста́ акі́'); // дифтонг с написанным ударением знак сохраняет
    expect(translitEs('Ella está allí.', 'ru')).toBe('э́йя эста́ ай-и́'); // ll между гласными: «йя»; перед i — «й-и»
    expect(translitEs('Ana y Luis están aquí.', 'uk')).toBe('А́на і Луі́с еста́н акі́');
    expect(translitEs('Las llaves de casa.', 'ru')).toBe('лас йа́вес де ка́са');
    expect(translitEs('Leía el mensaje.', 'ru')).toBe('леи́а эль менса́хе'); // хиатус с ударным «í»
  });

  it('на готовых чтениях теории es совпадение ru ≥ 95 %, uk ≥ 98 %', () => {
    const theoryRaw = JSON.parse(fs.readFileSync(path.join(DIR, 'theory.json'), 'utf8'));
    const theory = (theoryRaw.data ?? theoryRaw) as Record<string, { chapters?: Array<{ examples?: Array<{ phraseId?: string; say?: { ru?: string; uk?: string } }> }> }>;
    const targets = new Map<string, string>();
    for (let n = 1; n <= 32; n += 1) {
      const lesson = JSON.parse(fs.readFileSync(path.join(DIR, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8')) as { phrases: Array<{ id: string; target: string }> };
      for (const p of lesson.phrases) targets.set(p.id, p.target);
    }
    let total = 0;
    let okRu = 0;
    let okUk = 0;
    for (const lesson of Object.values(theory)) {
      for (const ch of lesson.chapters ?? []) {
        for (const e of ch.examples ?? []) {
          const target = e.phraseId ? targets.get(e.phraseId) : undefined;
          if (!target || !e.say?.ru || !e.say?.uk) continue;
          total += 1;
          if (translitEs(target, 'ru') === e.say.ru) okRu += 1;
          if (translitEs(target, 'uk') === e.say.uk) okUk += 1;
        }
      }
    }
    expect(total).toBeGreaterThan(200);
    expect(okRu / total).toBeGreaterThanOrEqual(0.95);
    expect(okUk / total).toBeGreaterThanOrEqual(0.98);
  });
});
