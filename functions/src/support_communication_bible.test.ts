import {
  findSupportHumanVoiceViolations,
  replyOpensWithGreeting,
  supportReplyIsCustomerReady,
  SUPPORT_COMMUNICATION_BIBLE_PROMPT,
} from './support_communication_bible';

describe('Phraseman support communication Bible', () => {
  test.each([
    'В доступном снимке продукта не нашлось достаточно надёжных фактов.',
    'По данным репозитория feature was removed in commit abc.',
    'The repository snapshot contains no evidence for this answer.',
    'El reviewer no encontró evidence en el source code.',
  ])('blocks internal process language: %s', (reply) => {
    expect(findSupportHumanVoiceViolations(reply)).toContain('internal_process_language');
  });

  test('blocks the exact robotic diagnostic fallback from the screenshot', () => {
    const reply = 'Мы получили ваше сообщение. Ответьте с версией приложения, платформой (iPhone или Android) и тем, что вы уже пробовали. Никогда не присылайте пароль, код входа или данные карты.';
    expect(findSupportHumanVoiceViolations(reply, 'Куда делся Компас?')).toEqual(expect.arrayContaining([
      'generic_receipt_boilerplate',
      'blanket_diagnostic_request',
      'irrelevant_security_warning',
    ]));
    expect(supportReplyIsCustomerReady({ reply, issue: 'Куда делся Компас?', grounded: true })).toBe(false);
  });

  test('a warm direct historical product answer is customer-ready', () => {
    const reply = 'Здравствуйте! Да, вы правы: отдельный «Компас» с ежедневными рекомендациями раньше был в Phraseman. Позже этот раздел убрали, поэтому сейчас прежний экран больше не показывается. Если вы искали конкретную возможность, расскажите какую — подскажем ближайший вариант.';
    expect(findSupportHumanVoiceViolations(reply, 'Куда делся Компас?')).toEqual([]);
    expect(supportReplyIsCustomerReady({ reply, issue: 'Куда делся Компас?', grounded: true })).toBe(true);
  });

  test('ungrounded model output is never customer-ready even when it sounds polite', () => {
    expect(supportReplyIsCustomerReady({ reply: 'Здравствуйте! Давайте разберёмся.', grounded: false })).toBe(false);
  });

  test('immutable Bible explicitly outranks rude owner style', () => {
    expect(SUPPORT_COMMUNICATION_BIBLE_PROMPT).toMatch(/never rude/i);
    expect(SUPPORT_COMMUNICATION_BIBLE_PROMPT).toMatch(/internal tools/i);
  });

  // зачем этот блок (ЖИВОЙ прогон 25 писем через модель, 2026-08-16):
  // карта решений показывала «отвечает сам» и выглядела здоровой, но сами
  // тексты вскрыли два дефекта, которые никакая проверка не ловила.
  // Урок: маршрутизацию и текст надо проверять отдельно.
  describe('язык ответа совпадает с языком письма', () => {
    test('русский ответ англичанину — нарушение', () => {
      // Реальный ответ модели на письмо «Hi! Where should I begin?».
      expect(findSupportHumanVoiceViolations(
        'Здравствуйте! Рад, что вы начали пользоваться приложением.',
        'Hi! I just installed the app. Where should I begin?',
      )).toContain('wrong_language');
    });

    test('русский ответ испанцу — нарушение', () => {
      expect(findSupportHumanVoiceViolations(
        'Здравствуйте! Обычно советуем 20-30 минут в день.',
        '¡Hola! ¿Cuántos minutos al día recomiendan estudiar?',
      )).toContain('wrong_language');
    });

    test('совпадающий язык нарушением не считается', () => {
      expect(findSupportHumanVoiceViolations(
        'Thank you so much for your kind words! We are glad to hear it.',
        'Hi! Thanks a lot, the app is great!',
      )).not.toContain('wrong_language');
      expect(findSupportHumanVoiceViolations(
        'Спасибо большое за тёплые слова!',
        'Спасибо! Очень нравится приложение.',
      )).not.toContain('wrong_language');
    });

    test('нераспознанный язык ложных срабатываний не даёт', () => {
      // зачем: короткое «ok» или эмодзи не должны ломать проверку.
      expect(findSupportHumanVoiceViolations('👍', '!!!')).not.toContain('wrong_language');
    });
  });

  // зачем этот блок (прогон 10 ТРЕДОВ по 10 сообщений, 2026-08-16):
  // владелец потребовал, чтобы Джарвис задавал наводящие вопросы и писал
  // полно, а не отписками. Прежние правила ПРЯМО это запрещали — «максимум
  // один вопрос», «briefly». Средняя длина ответа была 12 слов.
  describe('полный ответ вместо отписки', () => {
    test('отписка в три строки — нарушение', () => {
      expect(findSupportHumanVoiceViolations(
        'Здравствуйте! Очень рад слышать. Если понадобится помощь — обращайтесь.',
        'Спасибо, приложение супер!',
      )).toContain('too_short');
    });

    test('развёрнутый ответ проходит', () => {
      // Настоящий ответ из прогона тредов, 45 слов.
      expect(findSupportHumanVoiceViolations(
        'Здравствуйте! Очень рады слышать, что наши советы оказались полезными. Понимаем, как важно '
        + 'чувствовать прогресс, и приятно знать, что вы готовы продолжать. Если вдруг возникнут новые '
        + 'вопросы или потребуется поддержка — не стесняйтесь писать. Мы всегда здесь, чтобы помочь вам '
        + 'двигаться вперёд и достигать своих целей.',
        'Спасибо, буду пробовать!',
      )).not.toContain('too_short');
    });

    test('два наводящих вопроса — норма, а не нарушение', () => {
      // зачем: прежний порог в 2 вопроса делал живой диалог нарушением.
      const withQuestions = 'Здравствуйте! Понимаем, как это неприятно, и хотим разобраться вместе с вами. '
        + 'Чтобы подсказать точнее, уточните: в какое время дня вы обычно занимаетесь? '
        + 'И повторяете ли вы слова на следующий день после урока? Это поможет нам понять, '
        + 'что именно стоит поменять в вашем режиме занятий.';
      expect(findSupportHumanVoiceViolations(withQuestions, 'вопрос')).not.toContain('too_many_questions');
    });

    test('допрос анкетой всё ещё нарушение', () => {
      const interrogation = 'Здравствуйте! Уточните версию приложения? Какая платформа? '
        + 'Когда началось? Что уже пробовали? Есть ли скриншот? Какой у вас телефон?';
      expect(findSupportHumanVoiceViolations(interrogation, 'вопрос')).toContain('too_many_questions');
    });

    test('пустой ответ коротким не считается — это другая проблема', () => {
      expect(findSupportHumanVoiceViolations('', 'вопрос')).not.toContain('too_short');
    });
  });

  // зачем этот блок (владелец, 2026-08-16): «повторно говорить
  // здравствуйте можно только если это следующий день — в тот же день
  // повторно не надо». В прогоне 10 тредов КАЖДЫЙ ответ начинался с
  // «Здравствуйте!», включая пятый подряд. Так пишет автоответчик.
  describe('здоровается один раз за день', () => {
    const GREETING = 'Здравствуйте! Понимаем ваш вопрос и хотим разобраться вместе с вами, '
      + 'поэтому смотрим, что можно сделать. Расскажите, пожалуйста, чуть подробнее — '
      + 'так мы подскажем точнее и быстрее найдём решение вашей ситуации.';
    const NO_GREETING = 'Понимаем ваш вопрос и хотим разобраться вместе с вами, поэтому '
      + 'смотрим, что можно сделать. Расскажите, пожалуйста, чуть подробнее — так мы '
      + 'подскажем точнее и быстрее найдём решение вашей ситуации.';

    test('первое письмо дня: приветствие уместно', () => {
      expect(findSupportHumanVoiceViolations(GREETING, 'вопрос', false))
        .not.toContain('repeated_greeting');
    });

    test('повторно в тот же день: приветствие — нарушение', () => {
      expect(findSupportHumanVoiceViolations(GREETING, 'вопрос', true))
        .toContain('repeated_greeting');
    });

    test('продолжение разговора без приветствия проходит', () => {
      expect(findSupportHumanVoiceViolations(NO_GREETING, 'вопрос', true))
        .not.toContain('repeated_greeting');
    });

    test.each([
      'Здравствуйте! ',
      'Добрый день! ',
      'Привет! ',
      'Hello! ',
      'Hi there! ',
      '¡Hola! ',
    ])('распознаёт приветствие в разных языках: %s', (opener) => {
      expect(replyOpensWithGreeting(`${opener}Дальше идёт текст ответа.`)).toBe(true);
    });

    test('слово «привет» в середине письма приветствием не считается', () => {
      // зачем: клиент мог процитировать чужое «привет», и это не повод
      // объявлять ответ нарушением.
      expect(replyOpensWithGreeting('Мы передали ваш привет команде, спасибо!')).toBe(false);
    });
  });

  describe('поддержка говорит «мы», а не «я»', () => {
    test('личное обещание помощи — нарушение', () => {
      // Реальные формулировки из живого прогона: модель обещала личную
      // помощь от лица одного человека, которого за письмом нет.
      for (const reply of [
        'Здравствуйте! Если понадобится, напишите мне, я помогу разобраться.',
        'Обнулить прогресс можно, написав мне сюда.',
      ]) {
        expect(findSupportHumanVoiceViolations(reply, 'вопрос')).toContain('first_person_singular');
      }
    });

    test('ответ от «мы» проходит', () => {
      expect(findSupportHumanVoiceViolations(
        'Здравствуйте! Мы поможем разобраться — напишите нам в ответ на это письмо.',
        'вопрос',
      )).not.toContain('first_person_singular');
    });
  });
});
