// зачем (аудит кнопок R58 #31 и #35, 15.10): на итоге урока V2 — «К урокам»/«Назад» и «Добить» защищены от двойного тапа, после урока 32 кнопка подписана «Завершить» (ведёт на Главную), а «Следующий урок» не ждёт
// облачную сверку подписки до 5 с: быстрый путь по кэшу, полная проверка — только если по кэшу выходит пейвол (платящий не увидит пейвол из-за холодного кэша).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_complete.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('итог урока: тапы и подписи (R58 #31, #35)', () => {
  it('«К урокам»/«Назад» и «Добить» — один раз на окно навигации', () => {
    expect(src).toContain('if (!navOnce(`lesson_complete:back:${lessonId}`)) return;');
    expect(src).toContain('if (!navOnce(`lesson_complete:finish_mistakes:${lessonId}`)) return;');
  });

  it('после урока 32 подпись «Завершить», а не «Следующий урок»', () => {
    expect(src).toMatch(/: lessonId >= 32\n\s+\/\/ зачем \(аудит R58 #35[^\n]*\n\s+\? triLang\(lang, \{ ru: 'Завершить', en: 'Finish'/);
    expect(src).toContain("pl: 'Zakończ'");
  });

  it('«Следующий урок»: быстрый путь без облака, полная проверка только перед пейволом', () => {
    expect(src).toContain('getVerifiedPremiumAccessStatus({ allowCloudRefresh: false })');
    expect(src).toMatch(/premium = await getVerifiedPremiumStatus\(\)/);
    // пейвол — после подтверждения полным путём
    expect(src.indexOf('premium = await getVerifiedPremiumStatus()')).toBeLessThan(src.indexOf("pathname: '/premium_modal'", src.indexOf('premium = await getVerifiedPremiumStatus()')));
  });
});
