import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(process.cwd(), 'app', '(tabs)', 'lessons.tsx'), 'utf8');

/**
 * Имя файла историческое («Plus-only»). Правило владельца 22.09 отменило
 * «только для Plus»: жемчуг работает и у Free — на уроках без пейвола.
 * Ядро покупки (lessons_pearl_unlock.ts) удалено D70/D78.
 * Подробный сторож нового правила — lesson_pearl_unlock_free_allowed_contract.
 */
describe('Plus-only lesson pearl purchase contract', () => {
  it('keeps Plus on paid cards without a pearl CTA on the card', () => {
    expect(source).toContain('<PlusBadge');
    expect(source).not.toContain('lesson-pearl-unlock-');
    expect(source).not.toContain('setGateModal({ kind: "premium", lessonNum: num })');
  });

  // зачем: D107/D70 — покупка урока за жемчуг удалена; модалка гейта осталась, кнопки покупки нет
  it('keeps the progress-gate modal without the pearl purchase button', () => {
    expect(source).toContain('<ThemedChoiceModal');
    expect(source).not.toContain('Разблокировать · ');
    expect(source).not.toContain('buyLessonUnlock');
    expect(source).not.toContain('buyLessonWithPearls');
    expect(source).not.toContain('LESSON_PEARL_UNLOCK');
    expect(source).toContain('ru: "Закрыть"');
  });

  it('платный урок для Free по-прежнему ведёт в пейвол', () => {
    expect(source).toContain('openPremiumPaywall(router, {');
    expect(source).toContain('requiresPremiumForLesson');
  });

  it('labels a durable entitlement only as purchased', () => {
    expect(source).toContain('ru: "Куплено"');
    expect(source).not.toContain('Куплено навсегда');
    expect(source).not.toContain('урок останется доступен');
  });

  it('uses the exact Russian progress-gate wording', () => {
    expect(source).toContain('ru: "Ещё рано"');
    expect(source).not.toMatch(/ru:\s*`Пройди урок \$\{gateModal\.prevNum\} с оценкой 2\.5\+/);
  });
});
