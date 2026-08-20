import { buildApprovalToken } from './jarvis/approval_token';
import {
  buildSupportTelegramReviewPreview,
  buildSupportAttentionRequiredNotice,
  buildSupportOwnerTakenOverNotice,
  buildSupportSendCancelledNotice,
  formatSupportTelegramReview,
  parseSupportReviewApprovalToken,
  supportDraftHash,
  supportEditSessionId,
  supportTelegramJobLeaseOwns,
  supportReviewTokenDepartment,
  supportReviewCancelTokenDepartment,
} from './support_telegram_review';

const MESSAGE_ID = `m_${'a'.repeat(64)}`;

describe('support Telegram review contract', () => {
  test('button token binds action to exact message, revision and draft hash', () => {
    const hash = supportDraftHash('Ответ пользователю');
    const built = buildApprovalToken({
      nonce: 'n'.repeat(32), decisionHash: hash.slice(0, 32),
      department: supportReviewTokenDepartment(MESSAGE_ID, 7), action: 'approve',
      ownerTelegramUserId: '1', ownerTelegramChatId: '1', nowMs: 1000,
    });
    expect(parseSupportReviewApprovalToken(built.doc)).toEqual({
      messageDocId: MESSAGE_ID, draftRevision: 7, action: 'send', draftHashPrefix: hash.slice(0, 32),
    });
  });

  test('reject action means request owner edits, never delete or send', () => {
    const built = buildApprovalToken({
      nonce: 'n'.repeat(32), decisionHash: 'a'.repeat(32),
      department: supportReviewTokenDepartment(MESSAGE_ID, 2), action: 'reject',
      ownerTelegramUserId: '1', ownerTelegramChatId: '1', nowMs: 1000,
    });
    expect(parseSupportReviewApprovalToken(built.doc)?.action).toBe('edit');
  });

  // зачем (владелец, 2026-08-16): "должна ещё быть кнопка отменить!" —
  // третье действие, отдельное от send/edit, кодируется отдельным
  // department-префиксом на том же action='reject', не трогая
  // общий ApprovalAction-тип, используемый другими department'ами Джарвиса.
  describe('cancel token (owner explicitly says no, not "edit")', () => {
    test('a cancel-department token with action=reject parses as cancel, not edit', () => {
      const built = buildApprovalToken({
        nonce: 'n'.repeat(32), decisionHash: 'a'.repeat(32),
        department: supportReviewCancelTokenDepartment(MESSAGE_ID, 3), action: 'reject',
        ownerTelegramUserId: '1', ownerTelegramChatId: '1', nowMs: 1000,
      });
      expect(parseSupportReviewApprovalToken(built.doc)).toEqual({
        messageDocId: MESSAGE_ID, draftRevision: 3, action: 'cancel', draftHashPrefix: 'a'.repeat(32),
      });
    });

    test('a cancel-department token can never be forged with action=approve', () => {
      // зачем: cancel обязан быть необратимым «нет», а не тихим «да» с
      // подменённой этикеткой кнопки.
      const built = buildApprovalToken({
        nonce: 'n'.repeat(32), decisionHash: 'a'.repeat(32),
        department: supportReviewCancelTokenDepartment(MESSAGE_ID, 3), action: 'approve',
        ownerTelegramUserId: '1', ownerTelegramChatId: '1', nowMs: 1000,
      });
      expect(parseSupportReviewApprovalToken(built.doc)).toBeNull();
    });

    test('the plain support_email department never parses as cancel', () => {
      const built = buildApprovalToken({
        nonce: 'n'.repeat(32), decisionHash: 'a'.repeat(32),
        department: supportReviewTokenDepartment(MESSAGE_ID, 3), action: 'reject',
        ownerTelegramUserId: '1', ownerTelegramChatId: '1', nowMs: 1000,
      });
      expect(parseSupportReviewApprovalToken(built.doc)?.action).toBe('edit');
    });

    test('cancel and plain review departments never collide for the same message', () => {
      expect(supportReviewCancelTokenDepartment(MESSAGE_ID, 3))
        .not.toBe(supportReviewTokenDepartment(MESSAGE_ID, 3));
    });
  });

  test('preview omits the subject and escapes the complete sealed body', () => {
    const text = formatSupportTelegramReview({ subject: '<Problem>', draftReply: 'Use <Settings> to change this. Open the app, go to the settings screen and look for the option near the top of the list. If you do not see it there, tell us which screen you are on and we will point you to the right place straight away.', draftRevision: 1 });
    expect(text).not.toContain('Problem');
    expect(text).toContain('&lt;Settings&gt;');
  });

  test('edit session id is stable but does not expose Telegram ids', () => {
    const id = supportEditSessionId('374480287', '374480287');
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(id).not.toContain('374480287');
  });

  test('never puts an approval button behind hidden or sensitive bytes', () => {
    expect(buildSupportTelegramReviewPreview({ finalText: `${'A'.repeat(3000)}\npassword: secret`, draftRevision: 4 })).toMatchObject({ approvable: false });
    expect(buildSupportTelegramReviewPreview({ finalText: 'Write to learner@example.com', draftRevision: 4 })).toMatchObject({ approvable: false });
  });

  test('never offers approval or auto-send for an ungrounded or internal reply', () => {
    const internal = buildSupportTelegramReviewPreview({
      finalText: 'В доступном снимке продукта не нашлось достаточно надёжных фактов.',
      draftRevision: 5,
      customerReady: false,
      customerIssue: 'Куда делся Компас?',
    });
    expect(internal).toMatchObject({ approvable: false, violations: expect.arrayContaining(['internal_process_language']) });
    expect(internal.text).not.toContain('Ответ Джарвиса готов');
    expect(internal.text).not.toContain('Исправленная версия ответа');
    const ungrounded = buildSupportTelegramReviewPreview({
      finalText: 'Здравствуйте! Здесь нужна ручная проверка, чтобы не дать вам неточный ответ. Человек из команды посмотрит вашу ситуацию и напишет в эту же переписку, обычно в течение рабочего дня. Если можете добавить подробностей, напишите их в ответ — так поможем точнее.',
      draftRevision: 5,
      customerReady: false,
    });
    expect(ungrounded).toMatchObject({ approvable: false });
    expect(ungrounded.text).toContain('Ответ не готов');
    expect(ungrounded.text).not.toContain('перепишите ответ');
  });

  test('holding preview identifies the incoming message by sender and subject', () => {
    const input = {
      finalText: 'Здравствуйте! Здесь нужна ручная проверка, чтобы не дать вам неточный ответ. Человек из команды посмотрит вашу ситуацию и напишет в эту же переписку, обычно в течение рабочего дня. Если можете добавить подробностей, напишите их в ответ — так поможем точнее.',
      draftRevision: 6,
      customerReady: true,
      customerIssue: 'Не могу войти в аккаунт после смены телефона.',
      holding: true,
      fromName: '<Ольга>',
      fromEmail: 'olga@example.test',
      subject: 'Доступ <аккаунт>',
    };

    const preview = buildSupportTelegramReviewPreview(input);

    expect(preview.approvable).toBe(true);
    expect(preview.text).toContain('<b>От:</b> &lt;Ольга&gt;');
    expect(preview.text).toContain('olga@example.test');
    expect(preview.text).toContain('<b>Тема:</b> Доступ &lt;аккаунт&gt;');
  });

  test('holding preview stays below the Telegram limit with maximum escaped headers', () => {
    const sentence = 'Здравствуйте! Здесь нужна ручная проверка, чтобы дать точный ответ по вашему вопросу и ничего не придумывать. ';
    const preview = buildSupportTelegramReviewPreview({
      finalText: sentence.repeat(30).slice(0, 2_800),
      draftRevision: 7,
      customerReady: true,
      customerIssue: 'Не могу войти в аккаунт после смены телефона.',
      holding: true,
      fromName: '<'.repeat(200),
      fromEmail: 'sender@example.test',
      subject: '<'.repeat(500),
    });

    expect(preview.approvable).toBe(true);
    expect(preview.text.length).toBeLessThan(4_096);
  });

  test('owner-taken-over notice escapes untrusted mail and stays below Telegram limit', () => {
    const text = buildSupportOwnerTakenOverNotice({
      fromName: '<Ольга>',
      fromEmail: 'olga@example.test',
      subject: '<script>'.repeat(100),
      bodyText: '<b>не разметка клиента</b> & '.repeat(500),
    });

    expect(text).toContain('&lt;Ольга&gt;');
    expect(text).not.toContain('<script>');
    expect(text).not.toContain('<b>не разметка клиента</b>');
    expect(text).toContain('бот не отвечает');
    expect(text.length).toBeLessThan(4_096);
  });

  // зачем этот блок переписан (владелец, 2026-08-17: «не должно быть
  // заготовок!!!»): раньше клиенту на billing/account уходил фиксированный
  // текст «поднимем вашу покупку». Теперь клиенту не уходит НИЧЕГО, а
  // владельцу приходит письмо целиком — тема, от кого, текст — чтобы
  // ответить прямо из Gmail, не заходя в админку.
  test('уведомление никогда не утверждает, что Джарвис подготовил ответ', () => {
    const text = buildSupportAttentionRequiredNotice({
      reason: 'guarded_billing', fromName: 'Шухрат', fromEmail: 'satoshinakamoto2233@gmail.com',
      subject: 'Phraseman', bodyText: 'Могу ли я уточнить если я оплачу подписку оплата какой стране идет?',
    });
    expect(text).toContain('Не знаю, как ответить');
    expect(text).toContain('покупки, подписки или аккаунта');
    expect(text).not.toContain('Ответ Джарвиса готов');
    expect(text).not.toContain('перепишите');
  });

  test('письмо клиента видно в самом уведомлении — не нужно заходить в админку', () => {
    // зачем: раньше текст заканчивался словами «откройте админку → Gmail
    // Support Inbox». Владелец явно попросил убрать этот шаг — минута между
    // «увидел уведомление» и «начал отвечать» лишняя.
    const text = buildSupportAttentionRequiredNotice({
      reason: 'guarded_account', fromName: 'Ольга', fromEmail: 'olga@example.test',
      subject: 'Не могу войти', bodyText: 'Помогите восстановить доступ к аккаунту.',
    });
    expect(text).toContain('Ольга');
    expect(text).toContain('Не могу войти');
    expect(text).toContain('Помогите восстановить доступ');
    expect(text).not.toContain('Откройте админку');
  });

  test('явно сказано, что клиенту ничего не отправлено', () => {
    const text = buildSupportAttentionRequiredNotice({ reason: 'guarded_legal', subject: 'Вопрос', bodyText: 'Текст' });
    expect(text).toMatch(/клиенту.{0,20}(?:ничего не отправлено|пока ничего не отправлено)/i);
  });

  test('HTML в письме клиента экранируется — untrusted-текст не ломает разметку Telegram', () => {
    const text = buildSupportAttentionRequiredNotice({
      reason: 'guarded_billing', subject: '<script>x</script>', bodyText: 'Оплата <b>сейчас</b> недоступна & важно',
    });
    expect(text).not.toContain('<script>');
    expect(text).toContain('&lt;script&gt;');
    expect(text).toContain('&amp;');
  });

  test('без email и имени показывает нейтральное «клиент», не падает', () => {
    expect(() => buildSupportAttentionRequiredNotice({ reason: 'guarded_billing' })).not.toThrow();
    const text = buildSupportAttentionRequiredNotice({ reason: 'guarded_billing' });
    expect(text).toContain('клиент');
  });

  test('очень длинное письмо обрезается — важная строка про «не отправлено» не должна теряться', () => {
    const text = buildSupportAttentionRequiredNotice({
      reason: 'guarded_billing', subject: 'Длинное письмо', bodyText: 'x'.repeat(5_000),
    });
    expect(text.length).toBeLessThan(4_096);
    expect(text).toMatch(/клиенту.{0,20}(?:ничего не отправлено|пока ничего не отправлено)/i);
  });

  test('a Telegram-unsafe preview distinguishes a ready admin draft from a failed answer', () => {
    const text = buildSupportAttentionRequiredNotice({ reason: 'telegram_preview_unsafe' });
    expect(text).toContain('Ответ готов');
    expect(text).toContain('Полная версия сохранена в админке');
    expect(text).toContain('Автоотправка отключена');
  });

  test('a stale worker cannot settle a job after a newer lease reclaims it', () => {
    const reclaimed = {
      action: 'send' as const,
      state: 'processing' as const,
      reviewId: 'review', messageDocId: 'message', draftRevision: 1,
      createdAtMs: 1, updatedAtMs: 2, leaseId: 'worker-b', leaseExpiresAtMs: 3,
    };
    expect(supportTelegramJobLeaseOwns(reclaimed, 'worker-a')).toBe(false);
    expect(supportTelegramJobLeaseOwns(reclaimed, 'worker-b')).toBe(true);
    expect(supportTelegramJobLeaseOwns({ ...reclaimed, state: 'accepted' }, 'worker-b')).toBe(false);
  });

  // зачем (владелец, 2026-08-16: "он обязан готовить ВСЕГДА человеческий
  // ответ и информировать меня, что написал"): раньше unresolved conversation
  // identity был единственным случаем полной тишины — approvable: false с
  // пустым текстом. Preview обязан всегда показать подготовленный текст,
  // при этом явно предупредить, что автоотправки не будет.
  describe('unresolved conversation identity always shows the owner a prepared draft', () => {
    test('is approvable — the owner can still press "send" after checking the thread', () => {
      const preview = buildSupportTelegramReviewPreview({
        finalText: 'Здравствуйте! Прежде чем ответить по существу, команда вручную проверит цепочку переписки — хотим убедиться, что отвечаем именно вам, а не другому человеку. Это займёт немного времени, зато без ошибок. Ответ придёт в это же письмо, обычно в течение рабочего дня.',
        draftRevision: 3,
        customerReady: true,
        holding: true,
        identityUnresolved: true,
      });
      expect(preview.approvable).toBe(true);
    });

    test('shows the full drafted text, not a blocked-response placeholder', () => {
      const preview = buildSupportTelegramReviewPreview({
        finalText: 'Здравствуйте! Прежде чем ответить по существу, команда вручную проверит цепочку переписки — хотим убедиться, что отвечаем именно вам, а не другому человеку. Это займёт немного времени, зато без ошибок. Ответ придёт в это же письмо, обычно в течение рабочего дня.',
        draftRevision: 3,
        customerReady: true,
        holding: true,
        identityUnresolved: true,
      });
      expect(preview.text).toContain('Прежде чем ответить по существу');
      expect(preview.text).not.toContain('Готового ответа нет');
      expect(preview.text).not.toContain('Ответ не готов');
    });

    test('explicitly warns that auto-send will not fire', () => {
      const preview = buildSupportTelegramReviewPreview({
        finalText: 'Здравствуйте! Прежде чем ответить по существу, команда вручную проверит цепочку переписки — хотим убедиться, что отвечаем именно вам, а не другому человеку. Это займёт немного времени, зато без ошибок. Ответ придёт в это же письмо, обычно в течение рабочего дня.',
        draftRevision: 3,
        customerReady: true,
        holding: true,
        identityUnresolved: true,
      });
      expect(preview.text).toMatch(/не подтверждена|другого отправителя/iu);
      expect(preview.text).toMatch(/автоматической отправки.{0,20}не будет/iu);
    });

    test('reads differently from an ordinary holding-topic preview', () => {
      // зачем: обычный промежуточный ответ безопасен для авто-отправки,
      // этот — нет. Владелец должен видеть разницу с первого взгляда.
      const identity = buildSupportTelegramReviewPreview({
        finalText: 'Здравствуйте! Здесь нужна ручная проверка, чтобы не дать вам неточный ответ. Человек из команды посмотрит вашу ситуацию и напишет в эту же переписку, обычно в течение рабочего дня. Если можете добавить подробностей, напишите их в ответ — так поможем точнее.',
        draftRevision: 3, customerReady: true, holding: true, identityUnresolved: true,
      });
      const billing = buildSupportTelegramReviewPreview({
        finalText: 'Здравствуйте! Здесь нужна ручная проверка, чтобы не дать вам неточный ответ. Человек из команды посмотрит вашу ситуацию и напишет в эту же переписку, обычно в течение рабочего дня. Если можете добавить подробностей, напишите их в ответ — так поможем точнее.',
        draftRevision: 3, customerReady: true, holding: true,
      });
      expect(identity.text).not.toBe(billing.text);
    });
  });
});

// зачем этот блок (владелец, 2026-08-17: «я одобрил, но сообщение не
// отправилось»): при отмене подготовленного ответа в Telegram не приходило
// НИЧЕГО. Владелец нажимал кнопку, видел «поставлен в очередь отправки» — и
// считал дело закрытым. Письмо не ушло, узнать об этом было негде. Молчание
// здесь превращает нажатие кнопки в ложное обещание.
describe('buildSupportSendCancelledNotice — почему письмо не ушло', () => {
  test('прямо говорит, что письмо НЕ отправлено', () => {
    const text = buildSupportSendCancelledNotice('support_knowledge_changed', true);
    expect(text).toContain('НЕ отправлено');
  });

  test('объясняет смену кода человеческими словами, без внутренних терминов', () => {
    const text = buildSupportSendCancelledNotice('support_knowledge_changed', true);
    expect(text).toMatch(/изменился код|устаревш/i);
    expect(text).not.toContain('fingerprint');
    expect(text).not.toContain('support_knowledge_changed');
  });

  test('когда готовится новый ответ — говорит «ничего делать не нужно»', () => {
    const text = buildSupportSendCancelledNotice('support_knowledge_changed', true);
    expect(text).toMatch(/ничего делать не нужно/i);
    expect(text).not.toMatch(/отправьте ответ вручную/i);
  });

  test('когда автоматика сдалась — отправляет в админку', () => {
    const text = buildSupportSendCancelledNotice('support_quality_not_customer_ready', false);
    expect(text).toMatch(/вручную/i);
    expect(text).not.toMatch(/ничего делать не нужно/i);
  });

  test('сбой доставки предупреждает про «Отправленные» — чтобы не послать второе письмо', () => {
    const text = buildSupportSendCancelledNotice('delivery_unknown', false);
    expect(text).toContain('Отправленные');
  });

  test('неизвестная причина не даёт пустого или технического текста', () => {
    const text = buildSupportSendCancelledNotice('какой_то_новый_код', false);
    expect(text).toContain('НЕ отправлено');
    expect(text).not.toContain('какой_то_новый_код');
    expect(text.length).toBeGreaterThan(60);
  });

  test('пустая причина не роняет построение', () => {
    expect(() => buildSupportSendCancelledNotice(undefined, false)).not.toThrow();
    expect(buildSupportSendCancelledNotice(null, true)).toContain('НЕ отправлено');
  });
});
