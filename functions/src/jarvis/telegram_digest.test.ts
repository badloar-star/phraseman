import { buildTelegramDigest, JARVIS_MAX_DECISIONS_IN_DIGEST } from './telegram_digest';
import type { Decision } from './decision';

function decision(over: Partial<Decision> = {}): Decision {
  return {
    department: 'payments',
    finding: 'Двое заплатили, но доступ не выдался.',
    recommendation: 'Выдать Plus вручную',
    risk: 'Люди остались без услуги',
    ...over,
  } as unknown as Decision;
}

describe('Jarvis telegram digest — short, honest, safe to render as HTML', () => {
  test('says plainly that nothing needs attention when there are no decisions', () => {
    const text = buildTelegramDigest({ decisions: [], appTier: 'growth', departmentErrors: [] });
    expect(text).toMatch(/в порядке|ничего/i);
  });

  test('leads with the finding, not with department jargon', () => {
    const text = buildTelegramDigest({ decisions: [decision()], appTier: 'growth', departmentErrors: [] });
    expect(text).toContain('заплатили');
  });

  test('escapes HTML so a stray angle bracket cannot break the message', () => {
    const text = buildTelegramDigest({
      decisions: [decision({ finding: 'Ошибка в <b>уроке</b> & сбой' } as Partial<Decision>)],
      appTier: 'growth',
      departmentErrors: [],
    });
    expect(text).toContain('&lt;b&gt;');
    expect(text).toContain('&amp;');
  });

  test('never sends more than the cap, and says how many were left out', () => {
    const many = Array.from({ length: JARVIS_MAX_DECISIONS_IN_DIGEST + 3 }, (_, i) =>
      decision({ finding: `Находка номер ${i}` } as Partial<Decision>));
    const text = buildTelegramDigest({ decisions: many, appTier: 'scale', departmentErrors: [] });
    expect(text).toContain('ещё 3');
  });

  test('reports unreachable departments instead of pretending they were clean', () => {
    const text = buildTelegramDigest({ decisions: [], appTier: 'seed', departmentErrors: ['safety', 'money'] });
    expect(text).toMatch(/недоступ|не удалось/i);
    expect(text).not.toMatch(/всё в порядке/i);
  });

  test('never leaks a uid or an email into the message', () => {
    const text = buildTelegramDigest({
      decisions: [decision({ finding: 'Клиент user@mail.com uid abc123 ждёт' } as Partial<Decision>)],
      appTier: 'growth',
      departmentErrors: [],
    });
    // Дайджест не должен переносить сырой текст с контактами наружу.
    expect(text).not.toContain('user@mail.com');
    expect(text).not.toContain('abc123');
  });

  test('stays well under the Telegram message limit', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      decision({ finding: `Очень длинная находка номер ${i} `.repeat(20) } as Partial<Decision>));
    const text = buildTelegramDigest({ decisions: many, appTier: 'mature', departmentErrors: [] });
    expect(text.length).toBeLessThan(4096);
  });
});
