// зачем (аудит R58 🟡 #17/#20/#24/#25/#28/#29, координатор 15.10): сторож связей — двойной тап, отступ подсказки, Plus на старте комбо, мгновенный «Старт» вступления, запись прогресса слов.
import { readFileSync } from 'fs';
import path from 'path';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');

describe('аудит R58 🟡', () => {
  it('#17 «Обучение»: вход в меню урока, комбо, диагностику, экзамен и ранг защищён navOnce', () => {
    const src = read('app/(tabs)/lessons.tsx');
    for (const key of ["lessons:combined_pick", "lessons:diagnostic", 'lessons:level_exam:${lvl}', "lessons:coin_rank"]) expect(src).toContain(key);
    expect((src.match(/lessons:menu:\$\{num\}/g) ?? []).length).toBe(2);
  });
  it('#20 подсказка отказа поднимается на отступ списка, а не на отступ таб-бара', () => {
    expect(read('app/(tabs)/lessons.tsx')).toContain('bottom: listBottomPad,\n                  alignItems: "center",');
  });
  it('#25 меню урока: строки закрыты navOnce', () => {
    const src = read('app/lesson_menu.tsx');
    for (const key of ['lesson_menu:words:', 'lesson_menu:irregular:', 'lesson_menu:prepositions:', 'lesson_menu:theory:', 'lesson_menu:settings_edu', 'lesson_menu:replay:']) expect(src).toContain(key);
  });
  it('#24 комбо: Plus проверяется на старте', () => {
    const src = read('app/combined_lesson_pick.tsx');
    expect(src).toContain("openPremiumPaywall(router, { context: 'combined_lesson' });");
    expect(src).toContain("navOnce('combined_pick:start')");
  });
  it('#28 «Старт» вступления не ждёт запись отметки', () => {
    const src = read('app/lesson1.tsx');
    const body = src.slice(src.indexOf('const handleIntroDone = useCallback'), src.indexOf('const resetNoEnergyModal'));
    expect(body.indexOf('setShowIntroScreens(false);')).toBeLessThan(body.indexOf('AsyncStorage.setItem(introShownKey'));
    expect(body).not.toContain('await AsyncStorage.setItem');
  });
  it('#29 запись прогресса слов и глаголов пишет причину сбоя и не затирает при сбое чтения', () => {
    const words = read('app/lesson_words.tsx');
    expect(words).toContain('progressReadFailedKeys');
    expect(words).toContain('[LESSON-WORDS] progress write FAILED');
    expect(read('app/lesson_irregular_verbs.tsx')).toContain('[IRREGULAR-VERBS] progress write FAILED');
  });
});
