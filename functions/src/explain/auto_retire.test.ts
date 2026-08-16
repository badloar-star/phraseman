import {
  REPORT_REJECT_THRESHOLD,
  buildRetireAlert,
  shouldRetireCache,
} from './auto_retire';

describe('Автоснятие плохого объяснения', () => {
  test('на пороге объяснение снимается', () => {
    // зачем именно 5: константа REPORT_REJECT_THRESHOLD уже была объявлена
    // в explain_reports.ts, но нигде не использовалась — имя обещало
    // отклонение, а кода не было. Порог взят оттуда, а не выдуман.
    expect(shouldRetireCache({ reportCount: REPORT_REJECT_THRESHOLD, alreadyRetired: false })).toBe(true);
  });

  test('до порога не трогаем', () => {
    expect(shouldRetireCache({ reportCount: REPORT_REJECT_THRESHOLD - 1, alreadyRetired: false })).toBe(false);
  });

  test('выше порога тоже снимается — счётчик мог перескочить', () => {
    expect(shouldRetireCache({ reportCount: 99, alreadyRetired: false })).toBe(true);
  });

  test('уже снятое повторно не снимается', () => {
    // зачем: иначе каждая следующая жалоба слала бы владельцу новый сигнал
    // об одном и том же объяснении — ровно тот шум, от которого
    // перестают читать уведомления.
    expect(shouldRetireCache({ reportCount: 12, alreadyRetired: true })).toBe(false);
  });

  test('мусорный счётчик не снимает объяснение', () => {
    expect(shouldRetireCache({ reportCount: Number.NaN, alreadyRetired: false })).toBe(false);
    expect(shouldRetireCache({ reportCount: -5, alreadyRetired: false })).toBe(false);
  });

  test('в сигнале видно фразу и число жалоб', () => {
    const text = buildRetireAlert({ phraseEn: 'break the ice', reportCount: 5, lang: 'ru' });
    expect(text).toContain('break the ice');
    expect(text).toContain('5');
  });

  test('длинная фраза обрезается, сигнал не раздувается', () => {
    const text = buildRetireAlert({ phraseEn: 'x'.repeat(500), reportCount: 5, lang: 'ru' });
    expect(text.length).toBeLessThan(400);
  });

  test('в сигнале нет идентификаторов пользователей', () => {
    // зачем: правило проекта — во внешние каналы уходят количества, не PII.
    const text = buildRetireAlert({ phraseEn: 'test', reportCount: 5, lang: 'ru' });
    expect(text).not.toMatch(/uid|stableUid/i);
  });

  test('сказано, что объяснение сгенерируется заново', () => {
    // зачем: без этого «снято» читается как «фраза сломана навсегда»,
    // и владелец идёт чинить то, что чинится само.
    expect(buildRetireAlert({ phraseEn: 'test', reportCount: 5, lang: 'ru' }))
      .toMatch(/заново|перегенер/i);
  });
});
