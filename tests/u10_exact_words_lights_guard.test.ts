/**
 * Сторож U10 «точные слова» (владелец 11.11.2026, дословно: «фраза "лампы выключены", а собрать надо "the lights are off"…
 * должны быть точные слова! не лайтс а лампс, если там лампы или свет»).
 *
 * зачем: подсказка обязана называть то же слово, которое ученик собирает. «Лампы» — это lamps, «свет» — это light / lights.
 * Фразы, где light(s) значило «светофор», владелец велел заменить другими — возвращать их нельзя.
 * Правка данных: scripts/u10_exact_words_lights.cjs и scripts/u10_replace_traffic_light_phrases.cjs.
 * Сработал — исправить подсказку или фразу, а не ослаблять сторож.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

type Phrase = { id: string; target: string; sourceLocales: Record<string, string> };

const DIR = join(__dirname, '..', 'modules', 'classic-courses', 'en');
const phrases: Phrase[] = [];
for (let lesson = 1; lesson <= 32; lesson += 1) {
  const file = join(DIR, `lessons-${String(lesson).padStart(2, '0')}.json`);
  phrases.push(...(JSON.parse(readFileSync(file, 'utf8')) as { phrases: Phrase[] }).phrases);
}
const LIGHT_NOUN = /\b(?:the|this|that|a|no|have|any) lights?\b|^lights?\b/iu;
const describe1 = (p: Phrase): string => `${p.id}: ${p.target} — ${p.sourceLocales.ru} / ${p.sourceLocales.uk}`;

describe('U10: «свет» и «лампы» в английском курсе названы точными словами', () => {
  it('в курсе 1600 фраз', () => {
    expect(phrases.length).toBe(1600);
  });

  it('light(s) не переводится как «лампы», «светофор», «индикатор», «фары»', () => {
    const wrong = phrases.filter((p) => LIGHT_NOUN.test(p.target) && !/\blamps?\b/iu.test(p.target)
      && /ламп|светофор|індикатор|индикатор|світлофор|\bфар(?:ы|а|и)?\b/iu.test(`${p.sourceLocales.ru} ${p.sourceLocales.uk}`));
    expect(wrong.map(describe1)).toEqual([]);
  });

  it('«лампа / лампы» в подсказке — только там, где во фразе lamp / lamps', () => {
    const wrong = phrases.filter((p) => /ламп/iu.test(`${p.sourceLocales.ru} ${p.sourceLocales.uk}`) && !/\blamps?\b/iu.test(p.target));
    expect(wrong.map(describe1)).toEqual([]);
  });

  it('«светофор» в подсказке — только там, где во фразе traffic light', () => {
    const wrong = phrases.filter((p) => /светофор|світлофор/iu.test(`${p.sourceLocales.ru} ${p.sourceLocales.uk}`) && !/traffic lights?/iu.test(p.target));
    expect(wrong.map(describe1)).toEqual([]);
  });

  it('заменённые фразы про светофор не вернулись', () => {
    const targets = new Set(phrases.map((p) => p.target));
    for (const old of ['We crossed the road at the lights.', 'This light will turn green in a moment.', 'Turn left at the lights.', 'She saw the light change.']) {
      expect(targets.has(old)).toBe(false);
    }
  });
});
