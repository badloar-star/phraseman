import {
  truncateBody,
  docIdForMessageId,
  hasUsableBody,
  classifyEmail,
  isHumanEmail,
  rawEmailToDoc,
  composeReplyWithSignature,
  localizedSupportSignature,
  escapeHtml,
  plainToHtmlEmail,
  selectForBatchGenerate,
  selectForBatchSend,
  buildReplyPrompt,
  BODY_MAX_CHARS,
  GENERATE_BATCH_LIMIT,
  selectSupportImapUids,
  selectSupportImapBackfillUids,
  sanitizeSupportMailHeader,
  resolveSupportImapCursor,
  mergeSupportImapFailedUids,
  selectSupportImapRetryUids,
  supportRequestFingerprint,
  candidateOpenThreadDocIdsForOwnerReply,
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
  test('полный hash не склеивает разные Message-ID с одинаковой legacy-санитизацией', () => {
    expect(docIdForMessageId('<a/b@x>')).not.toBe(docIdForMessageId('<a?b@x>'));
    expect(docIdForMessageId('<a/b@x>')).toMatch(/^m_[a-f0-9]{64}$/);
  });
  test('пустой Message-ID → пустой id (письмо пропускается выше)', () => {
    expect(docIdForMessageId('')).toBe('');
    expect(docIdForMessageId('   ')).toBe('');
  });
  test('обрезает слишком длинный', () => {
    expect(docIdForMessageId('a'.repeat(1000)).length).toBeLessThanOrEqual(400);
  });
});

describe('selectSupportImapUids — не теряет прочитанные человеком письма', () => {
  test('первый запуск берёт ограниченный хвост независимо от флага Seen', () => {
    expect(selectSupportImapUids([1, 2, 3, 4, 5], 0, 3, 1)).toEqual([3, 4, 5]);
  });

  test('после checkpoint берёт новые UID по порядку и небольшой overlap для дедуп-повтора', () => {
    expect(selectSupportImapUids([1, 2, 3, 4, 5, 6, 7], 4, 2, 2)).toEqual([3, 4, 5, 6]);
    expect(selectSupportImapUids([1, 2, 3, 4, 5, 6, 7], 6, 2, 2)).toEqual([5, 6, 7]);
  });

  test('нормализует дубли и мусорные UID', () => {
    expect(selectSupportImapUids([4, 2, 2, -1, 3, Number.NaN], 2, 10, 1)).toEqual([2, 3, 4]);
  });

  test('backfill постепенно идёт назад, чтобы системные письма не вытеснили старые человеческие', () => {
    expect(selectSupportImapBackfillUids([1, 2, 3, 4, 5, 6, 7, 8], 7, 3)).toEqual([4, 5, 6]);
    expect(selectSupportImapBackfillUids([1, 2, 3], 1, 3)).toEqual([]);
    expect(selectSupportImapBackfillUids([1, 2, 3], 0, 3)).toEqual([]);
  });

  test('смена UIDVALIDITY атомарно сбрасывает оба cursor', () => {
    expect(resolveSupportImapCursor('111', '111', 900, 300)).toEqual({ checkpointUid: 900, backfillBeforeUid: 300, changed: false });
    expect(resolveSupportImapCursor('111', '222', 900, 300)).toEqual({ checkpointUid: 0, backfillBeforeUid: 0, changed: true });
    expect(resolveSupportImapCursor('', '222', 900, 300)).toEqual({ checkpointUid: 0, backfillBeforeUid: 0, changed: true });
  });

  test('неразобранные UID сохраняются для повторов и удаляются только после успешного parse', () => {
    expect(mergeSupportImapFailedUids([10, 11], [12], [10], 100)).toEqual([11, 12]);
    expect(mergeSupportImapFailedUids([], [8, 8, 7], [], 2)).toEqual([7, 8]);
  });

  test('failed UID остаётся во втором pull, даже когда выпал из нового хвоста 500', () => {
    const firstMailbox = Array.from({ length: 600 }, (_, index) => index + 1);
    const failed = mergeSupportImapFailedUids([], [150], [], 100);
    expect(selectSupportImapUids(firstMailbox, 0, 500, 20)).toContain(150);
    const grownMailbox = Array.from({ length: 1200 }, (_, index) => index + 1);
    expect(selectSupportImapUids(grownMailbox, 0, 500, 20)).not.toContain(150);
    expect(selectSupportImapRetryUids(grownMailbox, failed, false, 100)).toEqual([150]);
    expect(mergeSupportImapFailedUids(failed, [], [150], 100)).toEqual([]);
  });
});

describe('supportRequestFingerprint', () => {
  test('не зависит от requestId и других runtime-полей', () => {
    const base = { messageDocId: 'm1', replyText: 'Exact reply', expectedDraftRevision: 2 };
    expect(supportRequestFingerprint({ ...base, requestId: 'request-a' })).toBe(
      supportRequestFingerprint({ ...base, requestId: 'request-b', ignored: true }),
    );
    expect(supportRequestFingerprint(base)).not.toBe(supportRequestFingerprint({ ...base, replyText: 'Changed reply' }));
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

describe('isHumanEmail — только письма от живых людей', () => {
  test('обычное письмо от человека → true', () => {
    expect(isHumanEmail({ fromEmail: 'ivan@gmail.com' })).toBe(true);
    expect(isHumanEmail({ fromEmail: 'maria.petrova@yandex.ru' })).toBe(true);
    expect(isHumanEmail({ fromEmail: 'john@company.co.uk' })).toBe(true);
  });

  test('List-Unsubscribe → рассылка → false', () => {
    expect(isHumanEmail({ fromEmail: 'promo@shop.com', headers: { listUnsubscribe: '<https://unsub>' } })).toBe(false);
  });

  test('служебные Google-адреса → false', () => {
    expect(isHumanEmail({ fromEmail: 'no-reply@accounts.google.com' })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'notifications@google.com' })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'foo@mail.google.com' })).toBe(false);
  });

  test('noreply / mailer-daemon / bounce адреса → false', () => {
    expect(isHumanEmail({ fromEmail: 'noreply@service.com' })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'no-reply@service.com' })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'donotreply@x.com' })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'mailer-daemon@x.com' })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'bounces+abc@x.com' })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'notifications@x.com' })).toBe(false);
  });

  test('никогда не отвечает самому support-ящику (защита от mail loop)', () => {
    expect(classifyEmail({ fromEmail: 'support.phraseman@gmail.com' })).toEqual({
      category: 'automated',
      reason: 'own_mailbox',
    });
  });

  test('Precedence: bulk / Auto-Submitted → false', () => {
    expect(isHumanEmail({ fromEmail: 'a@b.com', headers: { precedence: 'bulk' } })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'a@b.com', headers: { autoSubmitted: 'auto-generated' } })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'a@b.com', headers: { autoSubmitted: 'no' } })).toBe(true); // no = не авто
  });

  test('пустой/битый адрес → false', () => {
    expect(isHumanEmail({ fromEmail: '' })).toBe(false);
    expect(isHumanEmail({ fromEmail: 'garbage' })).toBe(false);
    expect(isHumanEmail({})).toBe(false);
  });

  test('role-адреса пользователей не теряются', () => {
    expect(isHumanEmail({ fromEmail: 'info@company.com' })).toBe(true);
    expect(isHumanEmail({ fromEmail: 'infoservice@company.com' })).toBe(true);
    expect(isHumanEmail({ fromEmail: 'support@phraseman.app' })).toBe(true);
    expect(isHumanEmail({ fromEmail: 'user@phraseman.app' })).toBe(true);
  });

  test('классификация объясняет авто-письмо, но не запрещает его сохранять', () => {
    expect(classifyEmail({ fromEmail: 'info@company.com' })).toEqual({ category: 'human' });
    expect(classifyEmail({ fromEmail: 'noreply@service.com' }).category).toBe('automated');
    expect(classifyEmail({ fromEmail: 'a@b.com', headers: { precedence: 'bulk' } })).toEqual({
      category: 'automated',
      reason: 'precedence_bulk',
    });
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
  test('локализует известную английскую подпись для русского письма', () => {
    const signature = 'Thanks so much,\n\nThe Phraseman Team\nJust reply here if you need anything else.';
    expect(localizedSupportSignature('Здравствуйте! Поможем разобраться.', signature)).toBe(
      'Команда Phraseman\nПоддержка: Phraseman by Knowly\nСправка: https://knowlyapps.com/help',
    );
    expect(localizedSupportSignature('Hello! We can help.', signature)).toBe(signature);
  });
});

describe('sanitizeSupportMailHeader', () => {
  test('удаляет CR/LF и ограничивает длину SMTP-заголовка', () => {
    expect(sanitizeSupportMailHeader('Re: hello\r\nBcc: attacker@example.com', 100)).toBe('Re: hello Bcc: attacker@example.com');
    expect(sanitizeSupportMailHeader('x'.repeat(50), 20)).toHaveLength(20);
  });
});

describe('escapeHtml', () => {
  test('экранирует все опасные символы', () => {
    expect(escapeHtml('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  });
  test('обычный текст не меняется', () => {
    expect(escapeHtml('Привет, мир 123')).toBe('Привет, мир 123');
  });
});

describe('plainToHtmlEmail', () => {
  test('**жирный** превращается в <strong>', () => {
    expect(plainToHtmlEmail('Команда **хорошего настроения**')).toContain(
      'Команда <strong>хорошего настроения</strong>',
    );
  });
  test('переносы строк становятся <br>', () => {
    expect(plainToHtmlEmail('строка1\nстрока2')).toContain('строка1<br>строка2');
  });
  test('HTML-инъекция экранируется (звёздочки применяются уже после экранирования)', () => {
    const html = plainToHtmlEmail('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });
  test('оборачивает в div со стилями', () => {
    expect(plainToHtmlEmail('x')).toMatch(/^<div style=.+>x<\/div>$/);
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
    expect(p).toContain('UNTRUSTED CUSTOMER EMAIL');
    expect(p).toContain('<body>');
    expect(p).toContain('END UNTRUSTED CUSTOMER EMAIL');
    expect(p).toContain('[REDACTED_TOKEN]');
    // тело в промпте не длиннее лимита (+ шапка)
    expect(p.length).toBeLessThanOrEqual(BODY_MAX_CHARS + 60);
  });
  test('не дублирует процитированную старую переписку в текущем сообщении', () => {
    const p = buildReplyPrompt({
      subject: 'Re: Help',
      bodyText: 'Новая деталь\n\nOn Monday, Support wrote:\n> Старый ответ',
    });
    expect(p).toContain('Новая деталь');
    expect(p).not.toContain('Старый ответ');
  });
});

// зачем (владелец, 2026-08-16): "если на сообщение уже ответили, на него не
// надо повторно отвечать" — раньше Джарвис читал только INBOX и не видел
// ответ, отправленный владельцем напрямую в Gmail мимо админки.
describe('candidateOpenThreadDocIdsForOwnerReply — matching a Sent reply to an open thread', () => {
  test('In-Reply-To alone resolves to the exact same docId the inbound message was stored under', () => {
    const inboundId = 'CAF+abc123@mail.gmail.com';
    const candidates = candidateOpenThreadDocIdsForOwnerReply({ inReplyTo: `<${inboundId}>` });
    expect(candidates).toEqual([docIdForMessageId(`<${inboundId}>`)]);
  });

  test('empty In-Reply-To falls back to References, nearest ancestor first', () => {
    const near = '<near@example.test>';
    const far = '<far@example.test>';
    const candidates = candidateOpenThreadDocIdsForOwnerReply({ references: [far, near] });
    expect(candidates).toEqual([docIdForMessageId(near), docIdForMessageId(far)]);
  });

  test('In-Reply-To is tried before any References entry', () => {
    const direct = '<direct@example.test>';
    const older = '<older@example.test>';
    const candidates = candidateOpenThreadDocIdsForOwnerReply({ inReplyTo: direct, references: [older] });
    expect(candidates[0]).toBe(docIdForMessageId(direct));
    expect(candidates).toContain(docIdForMessageId(older));
  });

  test('a duplicate id (In-Reply-To also present in References) is not returned twice', () => {
    const shared = '<shared@example.test>';
    const candidates = candidateOpenThreadDocIdsForOwnerReply({ inReplyTo: shared, references: [shared] });
    expect(candidates).toEqual([docIdForMessageId(shared)]);
  });

  test('a completely unrelated new email (no headers) yields no candidates', () => {
    expect(candidateOpenThreadDocIdsForOwnerReply({})).toEqual([]);
  });

  test('blank/whitespace-only headers do not produce a bogus candidate', () => {
    expect(candidateOpenThreadDocIdsForOwnerReply({ inReplyTo: '   ', references: ['', '  '] })).toEqual([]);
  });
});
