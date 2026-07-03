import {
  aggregateDigestFacts,
  isDigestEmpty,
  buildDigestPrompt,
  utcDayKey,
  type DigestSourceRows,
} from './admin_daily_digest';

const EMPTY_ROWS: DigestSourceRows = { reports: [], cancels: [], appErrors: [], safety: [] };

describe('aggregateDigestFacts', () => {
  test('пустые источники → нули и пустой дайджест', () => {
    const facts = aggregateDigestFacts(EMPTY_ROWS);
    expect(facts.reports.total).toBe(0);
    expect(facts.cancels.total).toBe(0);
    expect(facts.appErrors.total).toBe(0);
    expect(facts.safety.total).toBe(0);
    expect(isDigestEmpty(facts)).toBe(true);
  });

  test('репорты: total, open (не fixed/answered/archived), категории, топ-экраны', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      reports: [
        { status: 'new', category: 'audio', screen: 'lesson' },
        { status: 'new', category: 'audio', screen: 'lesson' },
        { status: 'fixed', category: 'typo', screen: 'quiz' },
        { status: 'answered', category: 'audio', screen: 'lesson' },
      ],
    });
    expect(facts.reports.total).toBe(4);
    expect(facts.reports.open).toBe(2); // fixed + answered исключены
    expect(facts.reports.byCategory).toEqual({ audio: 3, typo: 1 });
    expect(facts.reports.topScreens[0]).toEqual({ screen: 'lesson', count: 3 });
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('отмены: считает по причине и берёт до 5 непустых сэмплов, режет до 160 символов', () => {
    const long = 'x'.repeat(300);
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      cancels: [
        { reason: 'too_expensive', reasonText: 'дорого' },
        { reason: 'too_expensive', reasonText: long },
        { reason: 'not_using_enough', reasonText: '' },
        { reason: 'other' },
      ],
    });
    expect(facts.cancels.total).toBe(4);
    expect(facts.cancels.byReason.too_expensive).toBe(2);
    expect(facts.cancels.byReason.other).toBe(1);
    expect(facts.cancels.sampleTexts).toContain('дорого');
    expect(facts.cancels.sampleTexts.every((t) => t.length <= 160)).toBe(true);
    // пустые тексты не попали
    expect(facts.cancels.sampleTexts.length).toBe(2);
  });

  test('app_errors: total и critical', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      appErrors: [{ severity: 'warning' }, { severity: 'critical' }, { severity: 'critical' }],
    });
    expect(facts.appErrors.total).toBe(3);
    expect(facts.appErrors.critical).toBe(2);
  });

  test('safety: open = не handled, категории', () => {
    const facts = aggregateDigestFacts({
      ...EMPTY_ROWS,
      safety: [
        { category: 'suicide', handled: false },
        { category: 'self_harm', handled: true },
        { category: 'suicide', handled: false },
      ],
    });
    expect(facts.safety.total).toBe(3);
    expect(facts.safety.open).toBe(2);
    expect(facts.safety.byCategory).toEqual({ suicide: 2, self_harm: 1 });
    // наличие safety-события делает дайджест непустым
    expect(isDigestEmpty(facts)).toBe(false);
  });

  test('unknown-ключ для отсутствующих полей', () => {
    const facts = aggregateDigestFacts({ ...EMPTY_ROWS, reports: [{ status: 'new' }] });
    expect(facts.reports.byCategory).toEqual({ unknown: 1 });
  });
});

describe('buildDigestPrompt / utcDayKey', () => {
  test('промпт — валидный JSON фактов', () => {
    const facts = aggregateDigestFacts({ ...EMPTY_ROWS, reports: [{ status: 'new', category: 'audio' }] });
    const prompt = buildDigestPrompt(facts);
    const parsed = JSON.parse(prompt);
    expect(parsed.reports.total).toBe(1);
  });

  test('utcDayKey — YYYY-MM-DD по UTC', () => {
    expect(utcDayKey(Date.UTC(2026, 6, 3, 23, 59, 0))).toBe('2026-07-03');
    expect(utcDayKey(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
  });
});
