import {
  truncateBody,
  docIdForMessageId,
  hasUsableBody,
  rawEmailToDoc,
  composeReplyWithSignature,
  selectForBatchGenerate,
  selectForBatchSend,
  buildReplyPrompt,
  BODY_MAX_CHARS,
  GENERATE_BATCH_LIMIT,
  type RawEmail,
} from './support_inbox';

describe('truncateBody', () => {
  test('обрезает до лимита', () => {
    const long = 'x'.repeat(BODY_MAX_CHARS + 500);
    expect(truncateBody(long).length).toBe(BODY_MAX_CHARS);
  });
  test('короткое не трогает; null → пустая строка', () => {
    expect(truncateBody('hi')).toBe('hi');
    expect(truncateBody(undefined)).toBe('');
    expect(truncateBody(null)).toBe('');
  });
});

describe('docIdForMessageId — дедуп-ключ', () => {
  test('чистит небезопасные символы, детерминирован', () => {
    const a = docIdForMessageId('<abc.def@mail.gmail.com>');
    const b = docIdForMessageId('<abc.def@mail.gmail.com>');
    expect(a).toBe(b);
    expect(a).not.toMatch(/[<>@/]/);
    expect(a.length).toBeGreaterThan(0);
  });
  test('пустой Message-ID → пустой id (письмо пропускается выше)', () => {
    expect(docIdForMessageId('')).toBe('');
    expect(docIdForMessageId('   ')).toBe('');
  });
  test('обрезает слишком длинный', () => {
    expect(docIdForMessageId('a'.repeat(1000)).length).toBeLessThanOrEqual(400);
  });
});

describe('hasUsableBody', () => {
  test('есть тело или тема → true', () => {
    expect(hasUsableBody({ bodyText: 'hello' })).toBe(true);
    expect(hasUsableBody({ subject: 'Q', bodyText: '' })).toBe(true);
  });
  test('пусто → false (ИИ не зовём зря)', () => {
    expect(hasUsableBody({ bodyText: '   ', subject: '' })).toBe(false);
    expect(hasUsableBody({})).toBe(false);
  });
});

describe('rawEmailToDoc', () => {
  const raw: RawEmail = {
    messageId: '<m1@x>',
    fromEmail: '  USER@Example.COM ',
    fromName: 'Иван',
    subject: 'Проблема со звуком',
    bodyText: 'y'.repeat(BODY_MAX_CHARS + 100),
    receivedAtMs: 1_700_000_000_000,
  };
  test('нормализует email, статус new, тело обрезано, дата ISO', () => {
    const d = rawEmailToDoc(raw);
    expect(d.fromEmail).toBe('user@example.com');
    expect(d.status).toBe('new');
    expect(d.bodyText.length).toBe(BODY_MAX_CHARS);
    expect(d.receivedAt).toBe(new Date(1_700_000_000_000).toISOString());
    expect(d.subject).toBe('Проблема со звуком');
  });
});

describe('composeReplyWithSignature', () => {
  test('подпись цепляется в конец через пустую строку', () => {
    expect(composeReplyWithSignature('Спасибо за письмо.', 'Phraseman Support')).toBe(
      'Спасибо за письмо.\n\nPhraseman Support',
    );
  });
  test('пустая подпись → только тело', () => {
    expect(composeReplyWithSignature('Тело', '')).toBe('Тело');
    expect(composeReplyWithSignature('Тело', '   ')).toBe('Тело');
  });
  test('тримит тело', () => {
    expect(composeReplyWithSignature('  Тело  ', 'Sig')).toBe('Тело\n\nSig');
  });
});

describe('selectForBatchGenerate — new без черновика, лимит', () => {
  const docs = [
    { status: 'new', draftReply: '' },
    { status: 'new', draftReply: 'уже есть' }, // пропустить: черновик есть
    { status: 'answered', draftReply: '' },     // пропустить: не new
    { status: 'new' },                          // взять
    { status: 'archived', draftReply: '' },     // пропустить
  ];
  test('берёт только new без черновика', () => {
    const got = selectForBatchGenerate(docs, 25);
    expect(got.length).toBe(2);
    expect(got.every((d) => d.status === 'new' && !d.draftReply)).toBe(true);
  });
  test('уважает лимит', () => {
    const many = Array.from({ length: 40 }, () => ({ status: 'new', draftReply: '' }));
    expect(selectForBatchGenerate(many, GENERATE_BATCH_LIMIT).length).toBe(GENERATE_BATCH_LIMIT);
    expect(selectForBatchGenerate(many, 5).length).toBe(5);
  });
});

describe('selectForBatchSend — new с непустым черновиком', () => {
  test('берёт только new с черновиком', () => {
    const docs = [
      { status: 'new', draftReply: 'готов' },
      { status: 'new', draftReply: '' },       // нет черновика
      { status: 'new', draftReply: '   ' },    // пустой черновик
      { status: 'answered', draftReply: 'x' }, // не new
    ];
    const got = selectForBatchSend(docs);
    expect(got.length).toBe(1);
    expect(got[0].draftReply).toBe('готов');
  });
});

describe('buildReplyPrompt', () => {
  test('содержит тему и тело, обрезает', () => {
    const p = buildReplyPrompt({ subject: 'Тема X', bodyText: 'z'.repeat(BODY_MAX_CHARS + 50) });
    expect(p).toContain('Тема X');
    expect(p).toContain('Текст письма:');
    // тело в промпте не длиннее лимита (+ шапка)
    expect(p.length).toBeLessThanOrEqual(BODY_MAX_CHARS + 60);
  });
});
