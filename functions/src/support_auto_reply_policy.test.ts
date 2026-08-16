import {
  buildSupportAutomaticRepairPrompt,
  buildGroundedReplySystemPrompt,
  buildPremiumAlternativePaymentReply,
  buildSafeHoldingReply,
  buildUnresolvedIdentityHoldingReply,
  classifySupportRisk,
  isPremiumAlternativePaymentQuestion,
  parseSupportDraftEnvelope,
  selectFinalAutoReply,
  supportAutoReplyFailureIsRepairable,
  supportReasonHasUnresolvedIdentity,
  replyMakesNoProductClaim,
} from './support_auto_reply_policy';
import type { SupportRepositoryContext } from './support_repository_context_types';
import { makeSupportOwnerInstructionsSnapshot } from './support_owner_instructions';

const context: SupportRepositoryContext = {
  generatedAt: '2026-08-11T00:00:00.000Z', commit: 'a'.repeat(40), dirty: false, appVersion: '1.6.7', appBuild: '112',
  sourceFingerprint: 'f'.repeat(64), trustworthy: true, trustReason: 'verified_build_snapshot',
  queryConcepts: ['learning_activity'],
  evidence: [{
    evidenceId: 'repo-facts-1', path: 'app/lessons.tsx', line: 1,
    text: 'The learning screen contains lessons and practice activities.', relevanceScore: 28,
    queryCoverage: 1, matchedConcepts: ['learning_activity'],
  }],
};

describe('support auto-reply policy', () => {
  test.each([
    ['refund my purchase', 'billing'],
    ['удалите мои персональные данные', 'privacy'],
    ['ребёнку угрожают', 'safety'],
    ['I cannot log in', 'account'],
    ['How do lessons work?', 'safe'],
  ])('classifies %s as %s', (text, expected) => expect(classifySupportRisk(text)).toBe(expected));

  // зачем этот блок (прогон 25 писем, 2026-08-16): карта поведения показала
  // две настоящие дыры — «Какие мои данные вы храните?» и «Моему сыну 9 лет»
  // классифицировались как безопасные и уходили модели. Обе темы имеют
  // отдельные требования закона и сторов, выдумка там недопустима.
  test.each([
    ['Какие мои данные вы храните и передаёте ли третьим лицам?', 'privacy'],
    ['Моему сыну 9 лет, можно ли ему заниматься?', 'safety'],
    ['My daughter is 8 years old, is the app suitable?', 'safety'],
    ['What data do you keep about me?', 'privacy'],
  ])('после прогона 25 писем: %s → %s', (text, expected) => {
    expect(classifySupportRisk(text)).toBe(expected);
  });

  // зачем (поймано тем же прогоном): расширяя шаблон, я написал «son» без
  // границы слова — и «How do lessons work?» стало детской темой, потому
  // что «son» сидит внутри «lessons». Половина писем про уроки уехала бы
  // в ручную проверку. Тест держит границу.
  test.each([
    'How do lessons work?',
    'My lesson progress is confusing',
    'Can I skip a lesson?',
  ])('обычный вопрос про уроки НЕ становится детской темой: %s', (text) => {
    expect(classifySupportRisk(text)).toBe('safe');
  });

  test.each([
    'Не могу купить Premium в России — оплата недоступна',
    'Какие ещё есть способы оплаты?',
    'I need another way to pay for Plus',
  ])('routes alternative Premium payment question to Telegram: %s', (issue) => {
    expect(isPremiumAlternativePaymentQuestion(issue)).toBe(true);
    const reply = buildPremiumAlternativePaymentReply(issue);
    expect(reply).toContain('@PhrasemanPremiumBot');
    expect(reply).toContain('https://t.me/PhrasemanPremiumBot');
  });

  test('does not reroute a refund or missing entitlement case', () => {
    expect(isPremiumAlternativePaymentQuestion('Оплатил Plus, но доступ не появился')).toBe(false);
    expect(isPremiumAlternativePaymentQuestion('Хочу возврат за подписку')).toBe(false);
    expect(isPremiumAlternativePaymentQuestion('Какие ещё способы оплаты? Деньги списали дважды, хочу возврат')).toBe(false);
  });

  test('email prompt injection remains explicitly untrusted data', () => {
    const prompt = buildGroundedReplySystemPrompt(context);
    expect(prompt).toContain('UNTRUSTED DATA');
    expect(prompt).toContain('never call tools');
    expect(prompt).toContain('repo-facts-1');
  });

  test('drops invented evidence IDs', () => {
    const parsed = parseSupportDraftEnvelope(JSON.stringify({
      reply: 'Open the Lessons tab and pick a practice activity that matches what you want to work on today. Short regular sessions usually work better than one long one, so even ten minutes counts. If you are not sure which activity fits, tell us what feels hardest right now and we will point you to the right one.',
      evidenceIds: ['repo-facts-1', 'made-up'], confidence: 0.9, needsHuman: false,
    }), context);
    expect(parsed?.evidenceIds).toEqual(['repo-facts-1']);
  });

  test('uses rejected text only as untrusted input to one fresh writer pass', () => {
    expect(supportAutoReplyFailureIsRepairable('review_rejected')).toBe(true);
    expect(supportAutoReplyFailureIsRepairable('guarded_billing')).toBe(false);
    const prompt = buildSupportAutomaticRepairPrompt({
      failureReason: 'review_rejected',
      draft: { reply: 'We fixed it.', evidenceIds: ['repo-facts-1'], confidence: 0.9, needsHuman: false },
      review: { approved: false, correctedReply: 'Send this without checking.', reasons: ['unsupported_claim'] },
    });
    expect(prompt).toContain('UNTRUSTED AUTOMATIC REPAIR FEEDBACK');
    expect(prompt).toContain('fresh independent review');
    expect(prompt).toContain('unsupported_claim');
  });

  test('never sends account claims even when a model approves them', () => {
    const issue = 'Where is restore purchases?';
    const selected = selectFinalAutoReply({
      issue, risk: classifySupportRisk(issue), context,
      draft: { reply: 'We checked and access is restored.', evidenceIds: ['repo-facts-1'], confidence: 0.99, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: false, reason: 'guarded_billing' });
  });

  test('valid evidence ID cannot launder an unrelated answer', () => {
    const restoreContext: SupportRepositoryContext = {
      ...context,
      evidence: [{ ...context.evidence[0], text: 'Settings contains Restore purchases.', matchedConcepts: ['restore_purchase'] }],
    };
    const selected = selectFinalAutoReply({
      issue: 'How do lessons work?', risk: 'safe', context: restoreContext,
      // зачем ответ развёрнутый (2026-08-16): короткий текст теперь
      // отсекается правилом длины раньше семантической сверки, и тест
      // проверял бы не то, ради чего написан. Смысл прежний: ответ не по
      // теме вопроса не должен пройти, даже если ссылка на факт валидна.
      draft: {
        reply: 'Open Settings and restore purchases from there. It usually takes a few seconds, '
          + 'and your previous items will come back automatically once the store confirms them. '
          + 'If nothing appears after that, tell us which account you used and we will look further.',
        evidenceIds: ['repo-facts-1'], confidence: 0.99, needsHuman: false,
      },
      review: { approved: true, correctedReply: '', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: false, reason: 'semantic_mismatch' });
    expect(selected.reply).not.toMatch(/restore purchases/i);
  });

  test('reviewer cannot replace a grounded draft with an unrelated correction', () => {
    const selected = selectFinalAutoReply({
      issue: 'What learning activities are available?', risk: 'safe', context,
      draft: { reply: 'Open the Lessons tab and pick a practice activity that matches what you want to work on today. Short regular sessions usually work better than one long one, so even ten minutes counts. If you are not sure which activity fits, tell us what feels hardest right now and we will point you to the right one.', evidenceIds: ['repo-facts-1'], confidence: 0.9, needsHuman: false },
      review: { approved: true, correctedReply: 'Restore your purchase.', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: true, reason: 'grounded_and_reviewed' });
    expect(selected.reply).not.toContain('Restore');
  });

  test('allows a relevant grounded safe answer only after independent approval', () => {
    const selected = selectFinalAutoReply({
      issue: 'What learning activities are available?', risk: 'safe', context,
      draft: { reply: 'Open the Lessons tab and pick a practice activity that matches what you want to work on today. Short regular sessions usually work better than one long one, so even ten minutes counts. If you are not sure which activity fits, tell us what feels hardest right now and we will point you to the right one.', evidenceIds: ['repo-facts-1'], confidence: 0.9, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: true, reason: 'grounded_and_reviewed' });
  });

  test('rejects a model-invented link even when evidence and reviewer approve it', () => {
    const selected = selectFinalAutoReply({
      issue: 'What learning activities are available?', risk: 'safe', context,
      draft: { reply: 'Open the Lessons tab and pick a practice activity that matches what you want to work on today. Short regular sessions usually work better than one long one, so even ten minutes counts. If you are not sure which activity fits, tell us what feels hardest right now and we will point you to the right one. See https://fake.example/help', evidenceIds: ['repo-facts-1'], confidence: 0.9, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
      ownerInstructions: makeSupportOwnerInstructionsSnapshot('Пишем дружелюбно.', 1),
    });
    expect(selected).toMatchObject({ grounded: false, reason: 'unapproved_link' });
    expect(selected.reply).not.toContain('fake.example');
  });

  test('untrusted repository snapshot can only produce a holding reply', () => {
    const selected = selectFinalAutoReply({
      issue: 'What learning activities are available?', risk: 'safe', context: { ...context, trustworthy: false, trustReason: 'fingerprint_mismatch' },
      draft: { reply: 'Open the Lessons tab and pick a practice activity that matches what you want to work on today. Short regular sessions usually work better than one long one, so even ten minutes counts. If you are not sure which activity fits, tell us what feels hardest right now and we will point you to the right one.', evidenceIds: ['repo-facts-1'], confidence: 1, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
    });
    expect(selected).toMatchObject({ grounded: false, reason: 'untrusted_snapshot_fingerprint_mismatch' });
  });

  // зачем (владелец, 2026-08-16): раньше "личность отправителя не
  // подтверждена" была единственным случаем, когда Джарвис никак не отвечал
  // клиенту и не сообщал владельцу — вкладка Telegram показывала пустоту.
  // Проверяем, что причина распознаётся и что для неё есть непустой текст,
  // который не выглядит как обычный holding-ответ по теме (billing/account).
  describe('unresolved conversation identity never leaves the owner without a prepared reply', () => {
    test.each([
      'conversation_sender_mismatch',
      'conversation_ambiguous_parent',
    ])('recognizes %s as an unresolved-identity reason', (reason) => {
      expect(supportReasonHasUnresolvedIdentity(reason)).toBe(true);
    });

    test.each([
      'guarded_billing',
      'guarded_account',
      'model_unavailable',
      'auto_repair_budget_daily_cap',
      '',
      undefined,
      null,
    ])('does not misclassify unrelated reasons like %s', (reason) => {
      expect(supportReasonHasUnresolvedIdentity(reason)).toBe(false);
    });

    test('produces a non-empty reply for every supported language', () => {
      expect(buildUnresolvedIdentityHoldingReply('Проблема с приложением').trim().length).toBeGreaterThan(0);
      expect(buildUnresolvedIdentityHoldingReply('The app is broken').trim().length).toBeGreaterThan(0);
      expect(buildUnresolvedIdentityHoldingReply('¿Cómo uso la aplicación?').trim().length).toBeGreaterThan(0);
    });

    test('never claims the case was already checked or resolved', () => {
      // зачем: как и обычный holding-ответ, он не должен утверждать факты о
      // продукте или аккаунте — команда ещё не проверяла цепочку переписки.
      const reply = buildUnresolvedIdentityHoldingReply('Проблема с приложением');
      expect(reply).not.toMatch(/мы (?:проверили|вернули|исправили)/iu);
    });

    test('reads differently from a generic billing holding reply', () => {
      // зачем: если бы функция просто делегировала в buildSafeHoldingReply,
      // владелец не смог бы отличить "тема требует ручной проверки" от
      // "мы не уверены, кому вообще отвечаем" — а это разные ситуации.
      const identity = buildUnresolvedIdentityHoldingReply('Проблема с приложением');
      const billing = buildSafeHoldingReply('Проблема с приложением', 'billing');
      expect(identity).not.toBe(billing);
    });
  });
});

// зачем этот блок (владелец, 2026-08-16: «мне надо чтобы Джарвис по-людски
// отвечал на имейлы»): измерено на проде — из 234 писем НОЛЬ настоящих
// ответов, потому что ответ без ссылки на исходный код всегда отвергался.
// На «спасибо» и «планируете немецкий?» доказательствам взяться неоткуда,
// и такие письма были обречены на заглушку навсегда. Правка пропускает их,
// но ТОЛЬКО когда ни вопрос, ни ответ ничего о продукте не утверждают.
// Тесты ниже держат эту границу: они охраняют ослабление защиты.
describe('Ответ без утверждений о продукте', () => {
  const NO_EVIDENCE_CONTEXT: SupportRepositoryContext = {
    ...context, queryConcepts: [], evidence: [],
  };

  function decide(reply: string, ctx: SupportRepositoryContext = NO_EVIDENCE_CONTEXT) {
    return selectFinalAutoReply({
      issue: 'Спасибо\nПросто хотел сказать спасибо, приложение супер!',
      risk: 'safe',
      context: ctx,
      draft: { reply, evidenceIds: [], confidence: 0.9, needsHuman: false },
      review: { approved: true, correctedReply: '', reasons: [] },
    });
  }

  describe('распознавание утверждений', () => {
    test('тёплая благодарность утверждением не является', () => {
      expect(replyMakesNoProductClaim('Спасибо большое за тёплые слова! Очень приятно это слышать — такие письма правда поддерживают нас в работе. Рады, что у вас всё складывается хорошо и приносит удовольствие. Если вдруг появятся вопросы или предложения, пишите нам сюда, всегда рады помочь.')).toBe(true);
    });

    test('обещание добавить функцию — это утверждение', () => {
      // зачем: обещание и срок — то, чем модель врёт убедительнее всего.
      // Даже без единого концепта продукта такой текст пропускать нельзя.
      expect(replyMakesNoProductClaim('Немецкий обязательно добавим в следующем обновлении!')).toBe(false);
      expect(replyMakesNoProductClaim('We will add German soon.')).toBe(false);
    });

    test('утверждение о работе функции ловится через концепты', () => {
      expect(replyMakesNoProductClaim('Звук включается в настройках упражнений.')).toBe(false);
    });

    // зачем эти случаи (ЖИВОЙ прогон через модель, 2026-08-16): на вопрос
    // «можно ли заниматься офлайн?» модель уверенно ответила «не получится,
    // всё требует подключения» — чистая выдумка. И она ПРОШЛА мою проверку,
    // потому что слов «интернет» и «подключение» нет в словаре концептов.
    // Дыру открыл я сам предыдущей правкой; ловим форму утверждения о
    // наличии возможности, а не список названий функций.
    test.each([
      'Заниматься без интернета не получится, все материалы требуют подключения.',
      'Эта возможность пока не поддерживается.',
      'Offline mode is not available in the app.',
      'Такая функция уже доступна всем.',
    ])('утверждение о наличии возможности — это факт о продукте: %s', (reply) => {
      expect(replyMakesNoProductClaim(reply)).toBe(false);
    });

    test('тёплый ответ без утверждений по-прежнему проходит', () => {
      // зачем: новая проверка не должна перекрыть путь вообще всему.
      expect(replyMakesNoProductClaim('Спасибо большое за тёплые слова! Очень приятно это слышать — такие письма правда поддерживают нас в работе. Рады, что у вас всё складывается хорошо и приносит удовольствие. Если вдруг появятся вопросы или предложения, пишите нам сюда, всегда рады помочь.')).toBe(true);
    });

    test('пустой ответ утверждением не считается, но и не проходит', () => {
      expect(replyMakesNoProductClaim('')).toBe(false);
    });
  });

  describe('сквозное решение', () => {
    test('на «спасибо» Джарвис наконец отвечает сам, без заглушки', () => {
      const out = decide('Спасибо большое за тёплые слова! Очень приятно это слышать — такие письма правда поддерживают нас в работе. Рады, что у вас всё складывается хорошо и приносит удовольствие. Если вдруг появятся вопросы или предложения, пишите нам сюда, всегда рады помочь.');
      expect(out).toMatchObject({ grounded: true, reason: 'no_product_claim' });
      expect(out.reply).toContain('Спасибо');
    });

    test('обещание про немецкий по-прежнему уходит в заглушку', () => {
      const out = decide('Немецкий обязательно добавим в следующем обновлении!');
      expect(out.grounded).toBe(false);
    });

    test('если вопрос ПРО продукт — доказательства всё ещё обязательны', () => {
      // зачем: послабление не должно протекать на письма про функции.
      // Вопрос с концептами обязан идти прежним, строгим путём.
      const out = selectFinalAutoReply({
        issue: 'Звук\nГде включить звук в упражнениях?',
        risk: 'safe',
        context: { ...context, queryConcepts: ['audio'], evidence: [] },
        draft: { reply: 'Посмотрите в настройках.', evidenceIds: [], confidence: 0.9, needsHuman: false },
        review: { approved: true, correctedReply: '', reasons: [] },
      });
      expect(out).toMatchObject({ grounded: false, reason: 'insufficient_evidence' });
    });

    test('деньги остаются под защитой даже без единого концепта', () => {
      const out = selectFinalAutoReply({
        issue: 'Возврат\nВерните деньги за подписку.',
        risk: 'billing',
        context: NO_EVIDENCE_CONTEXT,
        draft: { reply: 'Конечно, сейчас всё решим.', evidenceIds: [], confidence: 0.9, needsHuman: false },
        review: { approved: true, correctedReply: '', reasons: [] },
      });
      expect(out).toMatchObject({ grounded: false, reason: 'guarded_billing' });
    });

    // зачем эти четыре случая (найдено тестом 2026-08-16): в JavaScript \b
    // не работает с кириллицей, и из-за внешних \b вся РУССКАЯ половина
    // запрета на ложные утверждения молча не срабатывала. «Мы вернули вам
    // деньги» проходило свободно — то есть защита была выключена ровно для
    // той части переписки, которой больше всего. Дефект был в проекте до
    // этой правки; тесты держат его закрытым.
    test.each([
      'Мы проверили и вернули вам деньги.',
      'Мы исправили эту ошибку.',
      'Доступ уже открыт, попробуйте войти.',
      'Возврат оформлен, ожидайте зачисления.',
    ])('ложное утверждение о выполненном действии не проходит: %s', (reply) => {
      expect(decide(reply).grounded).toBe(false);
    });

    test('английские ложные утверждения тоже по-прежнему ловятся', () => {
      expect(decide('We have refunded your payment.').grounded).toBe(false);
    });

    // зачем эти случаи (прогон 10 ТРЕДОВ, 2026-08-16): модель девять раз
    // написала «мы сейчас проверяем ваш аккаунт» и «мы связались с
    // поддержкой App Store». Прежний запрет ловил только прошедшее время
    // («мы проверили»), а настоящее проходило свободно. Клиент при этом
    // ждёт результата проверки, которая даже не начиналась.
    test.each([
      'Мы сейчас проверяем ваш аккаунт и скоро сообщим результат по вашему обращению.',
      'Мы связались с поддержкой App Store, чтобы уточнить статус вашей подписки сегодня.',
      'Мы разбираемся с вашей ситуацией и вернёмся с ответом в ближайшее время сегодня.',
      'We are currently checking your account and will get back to you shortly today.',
    ])('ложь о начатой работе не проходит: %s', (reply) => {
      expect(decide(reply).grounded).toBe(false);
    });

    // зачем (тот же прогон): на «верните деньги» модель ответила
    // «подготовим возврат» и «можем оформить возврат». Обещать чужие
    // деньги она не вправе — это решение владельца.
    test.each([
      'Мы обязательно подготовим возврат денег, если ситуация не улучшится в ближайшие дни.',
      'Если проблема не решится, мы можем оформить возврат средств вам в ближайшее время.',
      'We will issue a refund if the problem is not solved within the next few days.',
    ])('обещание денег не проходит: %s', (reply) => {
      expect(decide(reply).grounded).toBe(false);
    });

    test('низкая уверенность модели закрывает путь', () => {
      const out = selectFinalAutoReply({
        issue: 'Спасибо\nСпасибо!',
        risk: 'safe',
        context: NO_EVIDENCE_CONTEXT,
        draft: { reply: 'Спасибо вам за тёплые слова, очень приятно!', evidenceIds: [], confidence: 0.3, needsHuman: false },
        review: { approved: true, correctedReply: '', reasons: [] },
      });
      expect(out).toMatchObject({ grounded: false, reason: 'insufficient_evidence' });
    });

    test('непроверенный снимок продукта закрывает путь', () => {
      const out = decide('Спасибо за тёплые слова!', {
        ...NO_EVIDENCE_CONTEXT, trustworthy: false, trustReason: 'fingerprint_mismatch',
      });
      expect(out.grounded).toBe(false);
    });
  });
});
