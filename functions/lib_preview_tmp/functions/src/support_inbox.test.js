"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const support_inbox_1 = require("./support_inbox");
describe('truncateBody', () => {
    test('обрезает до лимита', () => {
        const long = 'x'.repeat(support_inbox_1.BODY_MAX_CHARS + 500);
        expect((0, support_inbox_1.truncateBody)(long).length).toBe(support_inbox_1.BODY_MAX_CHARS);
    });
    test('короткое не трогает; null → пустая строка', () => {
        expect((0, support_inbox_1.truncateBody)('hi')).toBe('hi');
        expect((0, support_inbox_1.truncateBody)(undefined)).toBe('');
        expect((0, support_inbox_1.truncateBody)(null)).toBe('');
    });
});
describe('docIdForMessageId — дедуп-ключ', () => {
    test('чистит небезопасные символы, детерминирован', () => {
        const a = (0, support_inbox_1.docIdForMessageId)('<abc.def@mail.gmail.com>');
        const b = (0, support_inbox_1.docIdForMessageId)('<abc.def@mail.gmail.com>');
        expect(a).toBe(b);
        expect(a).not.toMatch(/[<>@/]/);
        expect(a.length).toBeGreaterThan(0);
    });
    test('полный hash не склеивает разные Message-ID с одинаковой legacy-санитизацией', () => {
        expect((0, support_inbox_1.docIdForMessageId)('<a/b@x>')).not.toBe((0, support_inbox_1.docIdForMessageId)('<a?b@x>'));
        expect((0, support_inbox_1.docIdForMessageId)('<a/b@x>')).toMatch(/^m_[a-f0-9]{64}$/);
    });
    test('пустой Message-ID → пустой id (письмо пропускается выше)', () => {
        expect((0, support_inbox_1.docIdForMessageId)('')).toBe('');
        expect((0, support_inbox_1.docIdForMessageId)('   ')).toBe('');
    });
    test('обрезает слишком длинный', () => {
        expect((0, support_inbox_1.docIdForMessageId)('a'.repeat(1000)).length).toBeLessThanOrEqual(400);
    });
});
describe('selectSupportImapUids — не теряет прочитанные человеком письма', () => {
    test('первый запуск берёт ограниченный хвост независимо от флага Seen', () => {
        expect((0, support_inbox_1.selectSupportImapUids)([1, 2, 3, 4, 5], 0, 3, 1)).toEqual([3, 4, 5]);
    });
    test('после checkpoint берёт новые UID по порядку и небольшой overlap для дедуп-повтора', () => {
        expect((0, support_inbox_1.selectSupportImapUids)([1, 2, 3, 4, 5, 6, 7], 4, 2, 2)).toEqual([3, 4, 5, 6]);
        expect((0, support_inbox_1.selectSupportImapUids)([1, 2, 3, 4, 5, 6, 7], 6, 2, 2)).toEqual([5, 6, 7]);
    });
    test('нормализует дубли и мусорные UID', () => {
        expect((0, support_inbox_1.selectSupportImapUids)([4, 2, 2, -1, 3, Number.NaN], 2, 10, 1)).toEqual([2, 3, 4]);
    });
    test('backfill постепенно идёт назад, чтобы системные письма не вытеснили старые человеческие', () => {
        expect((0, support_inbox_1.selectSupportImapBackfillUids)([1, 2, 3, 4, 5, 6, 7, 8], 7, 3)).toEqual([4, 5, 6]);
        expect((0, support_inbox_1.selectSupportImapBackfillUids)([1, 2, 3], 1, 3)).toEqual([]);
        expect((0, support_inbox_1.selectSupportImapBackfillUids)([1, 2, 3], 0, 3)).toEqual([]);
    });
    test('смена UIDVALIDITY атомарно сбрасывает оба cursor', () => {
        expect((0, support_inbox_1.resolveSupportImapCursor)('111', '111', 900, 300)).toEqual({ checkpointUid: 900, backfillBeforeUid: 300, changed: false });
        expect((0, support_inbox_1.resolveSupportImapCursor)('111', '222', 900, 300)).toEqual({ checkpointUid: 0, backfillBeforeUid: 0, changed: true });
        expect((0, support_inbox_1.resolveSupportImapCursor)('', '222', 900, 300)).toEqual({ checkpointUid: 0, backfillBeforeUid: 0, changed: true });
    });
    test('неразобранные UID сохраняются для повторов и удаляются только после успешного parse', () => {
        expect((0, support_inbox_1.mergeSupportImapFailedUids)([10, 11], [12], [10], 100)).toEqual([11, 12]);
        expect((0, support_inbox_1.mergeSupportImapFailedUids)([], [8, 8, 7], [], 2)).toEqual([7, 8]);
    });
    test('failed UID остаётся во втором pull, даже когда выпал из нового хвоста 500', () => {
        const firstMailbox = Array.from({ length: 600 }, (_, index) => index + 1);
        const failed = (0, support_inbox_1.mergeSupportImapFailedUids)([], [150], [], 100);
        expect((0, support_inbox_1.selectSupportImapUids)(firstMailbox, 0, 500, 20)).toContain(150);
        const grownMailbox = Array.from({ length: 1200 }, (_, index) => index + 1);
        expect((0, support_inbox_1.selectSupportImapUids)(grownMailbox, 0, 500, 20)).not.toContain(150);
        expect((0, support_inbox_1.selectSupportImapRetryUids)(grownMailbox, failed, false, 100)).toEqual([150]);
        expect((0, support_inbox_1.mergeSupportImapFailedUids)(failed, [], [150], 100)).toEqual([]);
    });
});
describe('supportRequestFingerprint', () => {
    test('не зависит от requestId и других runtime-полей', () => {
        const base = { messageDocId: 'm1', replyText: 'Exact reply', expectedDraftRevision: 2 };
        expect((0, support_inbox_1.supportRequestFingerprint)({ ...base, requestId: 'request-a' })).toBe((0, support_inbox_1.supportRequestFingerprint)({ ...base, requestId: 'request-b', ignored: true }));
        expect((0, support_inbox_1.supportRequestFingerprint)(base)).not.toBe((0, support_inbox_1.supportRequestFingerprint)({ ...base, replyText: 'Changed reply' }));
    });
});
describe('hasUsableBody', () => {
    test('есть тело или тема → true', () => {
        expect((0, support_inbox_1.hasUsableBody)({ bodyText: 'hello' })).toBe(true);
        expect((0, support_inbox_1.hasUsableBody)({ subject: 'Q', bodyText: '' })).toBe(true);
    });
    test('пусто → false (ИИ не зовём зря)', () => {
        expect((0, support_inbox_1.hasUsableBody)({ bodyText: '   ', subject: '' })).toBe(false);
        expect((0, support_inbox_1.hasUsableBody)({})).toBe(false);
    });
});
describe('isHumanEmail — только письма от живых людей', () => {
    test('обычное письмо от человека → true', () => {
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'ivan@gmail.com' })).toBe(true);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'maria.petrova@yandex.ru' })).toBe(true);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'john@company.co.uk' })).toBe(true);
    });
    test('List-Unsubscribe → рассылка → false', () => {
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'promo@shop.com', headers: { listUnsubscribe: '<https://unsub>' } })).toBe(false);
    });
    test('служебные Google-адреса → false', () => {
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'no-reply@accounts.google.com' })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'notifications@google.com' })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'foo@mail.google.com' })).toBe(false);
    });
    test('noreply / mailer-daemon / bounce адреса → false', () => {
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'noreply@service.com' })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'no-reply@service.com' })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'donotreply@x.com' })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'mailer-daemon@x.com' })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'bounces+abc@x.com' })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'notifications@x.com' })).toBe(false);
    });
    test('Precedence: bulk / Auto-Submitted → false', () => {
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'a@b.com', headers: { precedence: 'bulk' } })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'a@b.com', headers: { autoSubmitted: 'auto-generated' } })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'a@b.com', headers: { autoSubmitted: 'no' } })).toBe(true); // no = не авто
    });
    test('пустой/битый адрес → false', () => {
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: '' })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'garbage' })).toBe(false);
        expect((0, support_inbox_1.isHumanEmail)({})).toBe(false);
    });
    test('role-адреса пользователей не теряются', () => {
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'info@company.com' })).toBe(true);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'infoservice@company.com' })).toBe(true);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'support@phraseman.app' })).toBe(true);
        expect((0, support_inbox_1.isHumanEmail)({ fromEmail: 'user@phraseman.app' })).toBe(true);
    });
    test('классификация объясняет авто-письмо, но не запрещает его сохранять', () => {
        expect((0, support_inbox_1.classifyEmail)({ fromEmail: 'info@company.com' })).toEqual({ category: 'human' });
        expect((0, support_inbox_1.classifyEmail)({ fromEmail: 'noreply@service.com' }).category).toBe('automated');
        expect((0, support_inbox_1.classifyEmail)({ fromEmail: 'a@b.com', headers: { precedence: 'bulk' } })).toEqual({
            category: 'automated',
            reason: 'precedence_bulk',
        });
    });
});
describe('rawEmailToDoc', () => {
    const raw = {
        messageId: '<m1@x>',
        fromEmail: '  USER@Example.COM ',
        fromName: 'Иван',
        subject: 'Проблема со звуком',
        bodyText: 'y'.repeat(support_inbox_1.BODY_MAX_CHARS + 100),
        receivedAtMs: 1700000000000,
    };
    test('нормализует email, статус new, тело обрезано, дата ISO', () => {
        const d = (0, support_inbox_1.rawEmailToDoc)(raw);
        expect(d.fromEmail).toBe('user@example.com');
        expect(d.status).toBe('new');
        expect(d.bodyText.length).toBe(support_inbox_1.BODY_MAX_CHARS);
        expect(d.receivedAt).toBe(new Date(1700000000000).toISOString());
        expect(d.subject).toBe('Проблема со звуком');
    });
});
describe('composeReplyWithSignature', () => {
    test('подпись цепляется в конец через пустую строку', () => {
        expect((0, support_inbox_1.composeReplyWithSignature)('Спасибо за письмо.', 'Phraseman Support')).toBe('Спасибо за письмо.\n\nPhraseman Support');
    });
    test('пустая подпись → только тело', () => {
        expect((0, support_inbox_1.composeReplyWithSignature)('Тело', '')).toBe('Тело');
        expect((0, support_inbox_1.composeReplyWithSignature)('Тело', '   ')).toBe('Тело');
    });
    test('тримит тело', () => {
        expect((0, support_inbox_1.composeReplyWithSignature)('  Тело  ', 'Sig')).toBe('Тело\n\nSig');
    });
});
describe('sanitizeSupportMailHeader', () => {
    test('удаляет CR/LF и ограничивает длину SMTP-заголовка', () => {
        expect((0, support_inbox_1.sanitizeSupportMailHeader)('Re: hello\r\nBcc: attacker@example.com', 100)).toBe('Re: hello Bcc: attacker@example.com');
        expect((0, support_inbox_1.sanitizeSupportMailHeader)('x'.repeat(50), 20)).toHaveLength(20);
    });
});
describe('escapeHtml', () => {
    test('экранирует все опасные символы', () => {
        expect((0, support_inbox_1.escapeHtml)('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
    });
    test('обычный текст не меняется', () => {
        expect((0, support_inbox_1.escapeHtml)('Привет, мир 123')).toBe('Привет, мир 123');
    });
});
describe('plainToHtmlEmail', () => {
    test('**жирный** превращается в <strong>', () => {
        expect((0, support_inbox_1.plainToHtmlEmail)('Команда **хорошего настроения**')).toContain('Команда <strong>хорошего настроения</strong>');
    });
    test('переносы строк становятся <br>', () => {
        expect((0, support_inbox_1.plainToHtmlEmail)('строка1\nстрока2')).toContain('строка1<br>строка2');
    });
    test('HTML-инъекция экранируется (звёздочки применяются уже после экранирования)', () => {
        const html = (0, support_inbox_1.plainToHtmlEmail)('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).not.toContain('<script>');
    });
    test('оборачивает в div со стилями', () => {
        expect((0, support_inbox_1.plainToHtmlEmail)('x')).toMatch(/^<div style=.+>x<\/div>$/);
    });
});
describe('selectForBatchGenerate — new без черновика, лимит', () => {
    const docs = [
        { status: 'new', draftReply: '' },
        { status: 'new', draftReply: 'уже есть' }, // пропустить: черновик есть
        { status: 'answered', draftReply: '' }, // пропустить: не new
        { status: 'new' }, // взять
        { status: 'archived', draftReply: '' }, // пропустить
    ];
    test('берёт только new без черновика', () => {
        const got = (0, support_inbox_1.selectForBatchGenerate)(docs, 25);
        expect(got.length).toBe(2);
        expect(got.every((d) => d.status === 'new' && !d.draftReply)).toBe(true);
    });
    test('уважает лимит', () => {
        const many = Array.from({ length: 40 }, () => ({ status: 'new', draftReply: '' }));
        expect((0, support_inbox_1.selectForBatchGenerate)(many, support_inbox_1.GENERATE_BATCH_LIMIT).length).toBe(support_inbox_1.GENERATE_BATCH_LIMIT);
        expect((0, support_inbox_1.selectForBatchGenerate)(many, 5).length).toBe(5);
    });
});
describe('selectForBatchSend — new с непустым черновиком', () => {
    test('берёт только new с черновиком', () => {
        const docs = [
            { status: 'new', draftReply: 'готов' },
            { status: 'new', draftReply: '' }, // нет черновика
            { status: 'new', draftReply: '   ' }, // пустой черновик
            { status: 'answered', draftReply: 'x' }, // не new
        ];
        const got = (0, support_inbox_1.selectForBatchSend)(docs);
        expect(got.length).toBe(1);
        expect(got[0].draftReply).toBe('готов');
    });
});
describe('buildReplyPrompt', () => {
    test('содержит тему и тело, обрезает', () => {
        const p = (0, support_inbox_1.buildReplyPrompt)({ subject: 'Тема X', bodyText: 'z'.repeat(support_inbox_1.BODY_MAX_CHARS + 50) });
        expect(p).toContain('Тема X');
        expect(p).toContain('Текст письма:');
        // тело в промпте не длиннее лимита (+ шапка)
        expect(p.length).toBeLessThanOrEqual(support_inbox_1.BODY_MAX_CHARS + 60);
    });
});
//# sourceMappingURL=support_inbox.test.js.map