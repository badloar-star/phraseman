import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(process.cwd(), 'app', '(tabs)', 'lessons.tsx'), 'utf8');

/**
 * Имя файла историческое («Plus-only»). Правило владельца 22.09 отменило
 * «только для Plus»: жемчуг работает и у Free — на уроках без пейвола.
 * Границу держит ядро (lessons_pearl_unlock.ts), UI её не дублирует.
 * Подробный сторож нового правила — lesson_pearl_unlock_free_allowed_contract.
 */
describe('Plus-only lesson pearl purchase contract', () => {
  it('keeps Plus on paid cards without a pearl CTA on the card', () => {
    expect(source).toContain('<PlusBadge');
    expect(source).not.toContain('lesson-pearl-unlock-');
    expect(source).not.toContain('setGateModal({ kind: "premium", lessonNum: num })');
  });

  it('keeps the previous progress-gate modal and composite purchase flow', () => {
    expect(source).toContain('<ThemedChoiceModal');
    // Владелец 20.09 пустил Free на уроки без пейвола, и с тех пор голого
    // `isPremium && (...)` в коде НЕТ — это утверждение было красным ещё до
    // правки 22.09 и охраняло отменённое правило. Проверяем действующее:
    // кнопка у Plus везде, у Free — на уроках без пейвола.
    expect(source).toContain(
      'isPremium || (gateModal?.kind === "lesson" && !requiresPremiumForLesson(gateModal.lessonNum))',
    );
    expect(source).not.toContain('gateModal?.kind === "lesson" || gateModal?.kind === "levelGate" || gateModal?.kind === "premium"');
    expect(source).toContain('ru: `Разблокировать · ${LESSON_PEARL_UNLOCK_PRICE}`');
    expect(source).toContain('ru: "Закрыть"');
    expect(source).toContain('void buyLessonUnlock(gateModal.lessonNum)');
    expect(source).toContain('icon: oskolokImageForPackShards(LESSON_PEARL_UNLOCK_PRICE)');
  });

  it('уводит в пейвол только на ПЛАТНОМ уроке, а не всех Free', () => {
    // Правило владельца 22.09: «жемчуг должен работать и у Free». Голая
    // отсечка `if (!isPremium)` рубила тап Free ДО вызова ядра, хотя ядро
    // Free продаёт, а кнопка Free показывается. Отсечка допустима только
    // вместе с проверкой платности урока.
    // Проверяем ТЕЛО обработчика покупки, а не весь файл: голый
    // `if (!isPremium)` законно живёт в openCombinedLesson — это другая
    // платная механика (выбор тем), и она под Plus осознанно.
    const handlerStart = source.indexOf('const buyLessonUnlock = useCallback');
    const handlerEnd = source.indexOf('const mountedRef = useRef', handlerStart);
    expect(handlerStart).toBeGreaterThan(-1);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    const handler = source.slice(handlerStart, handlerEnd);
    expect(handler).not.toMatch(/if\s*\(\s*!isPremium\s*\)\s*\{/);
    expect(handler).toContain('if (!isPremium && requiresPremiumForLesson(lessonNum)) {');
    expect(source).toContain('openPremiumPaywall(router, {');
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
