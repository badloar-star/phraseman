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
    expect(text).toMatch(/материальных изменений нет|в порядке|ничего/i);
    expect(text).toMatch(/не повторя/i);
  });

  test('leads with the finding, not with department jargon', () => {
    const text = buildTelegramDigest({ decisions: [decision()], appTier: 'growth', departmentErrors: [] });
    expect(text).toContain('заплатили');
  });

  test('does not offer a recommendation or narrative for insufficient evidence', () => {
    const text = buildTelegramDigest({
      decisions: [decision({
        status: 'insufficient_evidence', actionability: 'evidence_only', recommendation: 'DO_NOT_SHOW', contentHash: 'h1',
      } as Partial<Decision>)],
      appTier: 'growth', departmentErrors: [], narrativeByHash: new Map([['h1', 'NARRATIVE_MUST_NOT_SHOW']]),
    });
    expect(text).not.toContain('DO_NOT_SHOW');
    expect(text).not.toContain('NARRATIVE_MUST_NOT_SHOW');
    expect(text).toMatch(/неполны|evidence/i);
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

  test('P0 findings sort ahead of lower severities, even if reported later', () => {
    // зачем: при обрезке до пяти находок важное не должно потеряться из-за
    // порядка, в котором департаменты просто вернули решения.
    const list = [
      decision({ department: 'retention', finding: 'Отток снижается' } as Partial<Decision>),
      decision({ department: 'content', finding: 'Обрыв на уроке 5' } as Partial<Decision>),
      decision({ department: 'payments', finding: 'Заплатил, доступа нет' } as Partial<Decision>),
    ];
    const text = buildTelegramDigest({ decisions: list, appTier: 'growth', departmentErrors: [] });
    const paymentsPos = text.indexOf('Заплатил');
    const retentionPos = text.indexOf('Отток');
    expect(paymentsPos).toBeGreaterThanOrEqual(0);
    expect(paymentsPos).toBeLessThan(retentionPos);
  });

  test('stays well under the Telegram message limit', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      decision({ finding: `Очень длинная находка номер ${i} `.repeat(20) } as Partial<Decision>));
    const text = buildTelegramDigest({ decisions: many, appTier: 'mature', departmentErrors: [] });
    expect(text.length).toBeLessThan(4096);
  });

  test('with no narrativeByHash map, output is byte-identical to before the enricher existed', () => {
    // зачем: обогатитель — необязательная надстройка. Без него дайджест не
    // должен меняться ни на символ, иначе панель и Telegram могли бы разойтись.
    const list = [decision({ contentHash: 'h1' } as Partial<Decision>)];
    const withoutMap = buildTelegramDigest({ decisions: list, appTier: 'growth', departmentErrors: [] });
    const withEmptyMap = buildTelegramDigest({
      decisions: list, appTier: 'growth', departmentErrors: [], narrativeByHash: new Map(),
    });
    expect(withEmptyMap).toBe(withoutMap);
  });

  test('appends the narrative for a decision found by its contentHash', () => {
    const list = [decision({ contentHash: 'h1' } as Partial<Decision>)];
    const text = buildTelegramDigest({
      decisions: list,
      appTier: 'growth',
      departmentErrors: [],
      narrativeByHash: new Map([['h1', 'Связный пересказ от LLM.']]),
    });
    expect(text).toContain('Связный пересказ от LLM.');
  });

  test('a narrative is escaped just like any other free text field', () => {
    const list = [decision({ contentHash: 'h1' } as Partial<Decision>)];
    const text = buildTelegramDigest({
      decisions: list,
      appTier: 'growth',
      departmentErrors: [],
      narrativeByHash: new Map([['h1', 'Опасно <script>alert(1)</script>']]),
    });
    expect(text).not.toContain('<script>');
  });
});
