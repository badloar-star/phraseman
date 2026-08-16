import {
  KNOWLEDGE_REVIEW_LEAD_DAYS,
  buildKnowledgeReviewNotice,
  evaluateKnowledgeReview,
  selectKnowledgeReviewsDue,
} from './knowledge_review_due';

// зачем (владелец, 2026-08-16): «сделай что-то, что раз в месяц надо обновлять
// описание продукта». Описание устаревает молча: включили раздел, сменили
// тариф — файл продолжает уверенно рассказывать старое, и Джарвис врёт
// клиентам с прежней интонацией. Заметить это можно только по жалобе живого
// человека, поэтому напоминание обязано приходить само.

const NOW = Date.parse('2026-09-10T12:00:00.000Z');
const file = (name: string, reviewBy: string | null) => ({ name, topic: name.replace('.md', ''), reviewBy });

describe('evaluateKnowledgeReview — когда пора перечитать знание', () => {
  test('срок прошёл — напоминаем и считаем просрочку', () => {
    const status = evaluateKnowledgeReview(file('product.md', '2026-09-01'), NOW);
    expect(status.due).toBe(true);
    expect(status.reason).toBe('overdue');
    expect(status.daysLeft).toBeLessThan(0);
  });

  test('срок близко — напоминаем заранее, чтобы успеть', () => {
    const status = evaluateKnowledgeReview(file('product.md', '2026-09-14'), NOW);
    expect(status.due).toBe(true);
    expect(status.reason).toBe('soon');
  });

  test('срок далеко — молчим', () => {
    // зачем: напоминание, которое приходит без повода, перестают читать со
    // второго раза. Молчание здесь — нормальная работа, а не сбой.
    const status = evaluateKnowledgeReview(file('product.md', '2026-12-01'), NOW);
    expect(status.due).toBe(false);
    expect(status.reason).toBe('ok');
  });

  test('на самой границе окна ещё напоминаем', () => {
    const boundary = new Date(NOW + KNOWLEDGE_REVIEW_LEAD_DAYS * 24 * 60 * 60 * 1_000)
      .toISOString().slice(0, 10);
    expect(evaluateKnowledgeReview(file('product.md', boundary), NOW).due).toBe(true);
  });

  test('файл без даты пересмотра — тоже повод напомнить', () => {
    // зачем: файл без срока никто никогда не перечитает. Формат требует дату,
    // поэтому её отсутствие — дефект, а не разрешение молчать вечно.
    const status = evaluateKnowledgeReview(file('common.md', null), NOW);
    expect(status.due).toBe(true);
    expect(status.reason).toBe('missing_date');
  });

  test('битая дата не пропускается как «всё хорошо»', () => {
    for (const broken of ['завтра', '2026-13-45', '01.09.2026', '']) {
      expect(evaluateKnowledgeReview(file('x.md', broken), NOW).due).toBe(true);
    }
  });
});

describe('selectKnowledgeReviewsDue — что показать владельцу', () => {
  test('самое просроченное идёт первым', () => {
    // зачем порядок: в длинном списке глаз читает верхние строки.
    const due = selectKnowledgeReviewsDue([
      file('product.md', '2026-09-14'),
      file('money.md', '2026-08-01'),
      file('support.md', '2026-12-01'),
    ], NOW);
    expect(due.map((s) => s.file)).toEqual(['money.md', 'product.md']);
  });

  test('всё в порядке — пустой список, крон промолчит', () => {
    expect(selectKnowledgeReviewsDue([file('product.md', '2027-01-01')], NOW)).toEqual([]);
  });
});

describe('buildKnowledgeReviewNotice — текст напоминания', () => {
  test('называет файл, срок и адрес — чтобы не пришлось искать', () => {
    const text = buildKnowledgeReviewNotice(
      selectKnowledgeReviewsDue([file('product.md', '2026-09-01')], NOW),
      'https://example.test/legacy.html#product-charter',
    );
    expect(text).toContain('product');
    expect(text).toMatch(/просрочено на \d+ (?:день|дня|дней)/);
    expect(text).toContain('legacy.html#product-charter');
  });

  test('пустой список — пустой текст, а не бодрое «всё хорошо»', () => {
    expect(buildKnowledgeReviewNotice([], 'https://example.test/')).toBe('');
  });

  test('русские окончания не выглядят машинными', () => {
    const days = (iso: string) => buildKnowledgeReviewNotice(
      selectKnowledgeReviewsDue([file('p.md', iso)], NOW), 'u',
    );
    expect(days('2026-09-09')).toContain('1 день');
    expect(days('2026-09-08')).toContain('2 дня');
    expect(days('2026-08-26')).toContain('15 дней');
  });

  test('разметка не ломается на угловых скобках в теме', () => {
    // зачем: текст уходит в телеграм с parse_mode HTML. Незакрытый тег из
    // названия темы обрушил бы всё сообщение, и напоминание не пришло бы.
    const text = buildKnowledgeReviewNotice(
      [{ file: 'x.md', topic: '<b>тема', reviewBy: null, daysLeft: null, due: true, reason: 'missing_date' }],
      'u',
    );
    expect(text).toContain('&lt;b&gt;тема');
  });
});
