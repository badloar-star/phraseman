import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(process.cwd(), 'app', '(tabs)', 'lessons.tsx'), 'utf8');

describe('Plus-only lesson pearl purchase contract', () => {
  it('keeps Plus on paid cards without a pearl CTA on the card', () => {
    expect(source).toContain('<PlusBadge');
    expect(source).not.toContain('lesson-pearl-unlock-');
    expect(source).not.toContain('setGateModal({ kind: "premium", lessonNum: num })');
  });

  it('keeps the previous progress-gate modal and composite purchase flow', () => {
    expect(source).toContain('<ThemedChoiceModal');
    expect(source).toContain('isPremium && (gateModal?.kind === "lesson" || gateModal?.kind === "levelGate")');
    expect(source).not.toContain('gateModal?.kind === "lesson" || gateModal?.kind === "levelGate" || gateModal?.kind === "premium"');
    expect(source).toContain('ru: `Разблокировать · ${LESSON_PEARL_UNLOCK_PRICE}`');
    expect(source).toContain('ru: "Закрыть"');
    expect(source).toContain('void buyLessonUnlock(gateModal.lessonNum)');
    expect(source).toContain('icon: oskolokImageForPackShards(LESSON_PEARL_UNLOCK_PRICE)');
  });

  it('fails closed if the purchase handler is reached without active Plus', () => {
    expect(source).toContain('if (!isPremium) {');
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
