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

  it('«Следующий урок»: пейвол только при подтверждённом «нет» — решение lesson_next_access, кэш сбрасывается перед полной проверкой (Ревизор 15.10, 🔴)', () => {
    expect(src).toContain("import { resolveNextLessonAccess } from './lesson_next_access';");
    expect(src).toContain('contextPremium: () => hasPremiumRef.current,');
    expect(src).toContain('prepare: invalidatePremiumCache,');
    expect(src).toContain('verify: () => getVerifiedPremiumStatus(),');
    expect(src).toContain("if (accessDecision === 'paywall') {");
    // быстрый путь с облаком off больше не кладёт холодный false в кэш, который читает запасная проверка
    expect(src).not.toContain('getVerifiedPremiumAccessStatus({ allowCloudRefresh: false }).catch(noteSwallowedAs(\'lesson_complete:goNext');
    // холодный false при открытии экрана сбрасывается
    expect(src).toContain('if (!premium) invalidatePremiumCache();');
  });
});
