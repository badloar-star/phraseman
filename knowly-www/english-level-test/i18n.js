(function (global) {
  'use strict';

  const STORAGE_KEY = 'language_test_ui_locale_v1';
  const EXTRA_LOCALES = global.EnglishTestExtraLocales;
  if (!EXTRA_LOCALES) throw new Error('EnglishTestExtraLocales must be loaded before i18n.js');
  const UI_LOCALES = Array.from(EXTRA_LOCALES.UI_LOCALES);
  const LOCALE_META = EXTRA_LOCALES.LOCALE_META;
  const TEST_LANGUAGES = ['en', 'de', 'fr', 'it', 'es'];

  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.keys(value).forEach((key) => deepFreeze(value[key]));
      Object.freeze(value);
    }
    return value;
  }

  function isUiLocale(value) { return UI_LOCALES.indexOf(value) !== -1; }
  function isTestLanguage(value) { return TEST_LANGUAGES.indexOf(value) !== -1; }
  function queryValue(search, key) {
    try { return new URLSearchParams(typeof search === 'string' ? search : '').get(key); } catch (_) { return null; }
  }
  function decodedQueryName(token) {
    const equals = token.indexOf('=');
    const rawName = equals === -1 ? token : token.slice(0, equals);
    try { return decodeURIComponent(rawName.split('+').join(' ')); } catch (_) { return null; }
  }
  function escapeHtml(value) {
    const source = String(value);
    let escaped = '';
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (character === '&') escaped += '&amp;';
      else if (character === '<') escaped += '&lt;';
      else if (character === '>') escaped += '&gt;';
      else if (character === '"') escaped += '&quot;';
      else if (character === "'") escaped += '&#39;';
      else escaped += character;
    }
    return escaped;
  }

  const TESTS = {
    en: { bcp47: 'en-US', bankUrl: './data/questions.en.json?v=2026-07-22.4', nativeLabel: 'English', filenameSlug: 'english', filenameSlugs: { ru: 'angliyskiy-yazyk', en: 'english' }, certificateNames: { ru: 'английского языка', en: 'English' }, resultNames: { ru: 'английского языка', en: 'English' }, names: { ru: { nominative: 'английский язык', genitive: 'английского языка', subject: 'английскому языку' }, en: { nominative: 'English', genitive: 'English', subject: 'English' } } },
    de: { bcp47: 'de-DE', bankUrl: './data/questions.de.json?v=2026-08-03.1', nativeLabel: 'Deutsch', filenameSlug: 'german', filenameSlugs: { ru: 'nemetskiy-yazyk', en: 'german' }, certificateNames: { ru: 'немецкого языка', en: 'German' }, resultNames: { ru: 'немецкого языка', en: 'German' }, names: { ru: { nominative: 'немецкий язык', genitive: 'немецкого языка', subject: 'немецкому языку' }, en: { nominative: 'German', genitive: 'German', subject: 'German' } } },
    fr: { bcp47: 'fr-FR', bankUrl: './data/questions.fr.json?v=2026-08-03.1', nativeLabel: 'Français', filenameSlug: 'french', filenameSlugs: { ru: 'frantsuzskiy-yazyk', en: 'french' }, certificateNames: { ru: 'французского языка', en: 'French' }, resultNames: { ru: 'французского языка', en: 'French' }, names: { ru: { nominative: 'французский язык', genitive: 'французского языка', subject: 'французскому языку' }, en: { nominative: 'French', genitive: 'French', subject: 'French' } } },
    it: { bcp47: 'it-IT', bankUrl: './data/questions.it.json?v=2026-08-03.1', nativeLabel: 'Italiano', filenameSlug: 'italian', filenameSlugs: { ru: 'italyanskiy-yazyk', en: 'italian' }, certificateNames: { ru: 'итальянского языка', en: 'Italian' }, resultNames: { ru: 'итальянского языка', en: 'Italian' }, names: { ru: { nominative: 'итальянский язык', genitive: 'итальянского языка', subject: 'итальянскому языку' }, en: { nominative: 'Italian', genitive: 'Italian', subject: 'Italian' } } },
    es: { bcp47: 'es-ES', bankUrl: './data/questions.es.json?v=2026-08-03.1', nativeLabel: 'Español', filenameSlug: 'spanish', filenameSlugs: { ru: 'ispanskiy-yazyk', en: 'spanish' }, certificateNames: { ru: 'испанского языка', en: 'Spanish' }, resultNames: { ru: 'испанского языка', en: 'Spanish' }, names: { ru: { nominative: 'испанский язык', genitive: 'испанского языка', subject: 'испанскому языку' }, en: { nominative: 'Spanish', genitive: 'Spanish', subject: 'Spanish' } } },
  };
  TEST_LANGUAGES.forEach((code) => {
    const localized = EXTRA_LOCALES.TEST_NAMES[code];
    Object.assign(TESTS[code].filenameSlugs, localized.filenameSlugs);
    Object.assign(TESTS[code].certificateNames, localized.certificateNames);
    Object.assign(TESTS[code].resultNames, localized.resultNames);
    Object.assign(TESTS[code].names, localized.names);
  });
  deepFreeze(TESTS);

  const DICTIONARY = deepFreeze({
    ru: {
      document: { title: 'Тест уровня языка — Phraseman', description: 'Узнайте свой уровень языка и получите персональный результат.' },
      header: { title: 'Тест уровня языка', language: 'Язык теста', interface: 'Язык интерфейса', brandHomeAria: 'Phraseman — на главную', brandSubtitle: 'Живой английский' },
      landing: { eyebrow: 'Бесплатная диагностика', title: 'Определите уровень {{language}}', subtitle: 'Ответьте на вопросы и получите ориентировочный уровень по шкале CEFR.', start: 'Начать тест', duration: 'Займёт около {{count}} минут', howItWorks: 'Ответьте на вопросы с вариантами ответа.', certificatePreview: 'Посмотрите предварительный вид сертификата.', trust: 'Результат основан только на текстовых заданиях.', finalCta: 'Начните бесплатную текстовую диагностику.', timerNote: 'На каждый вопрос — 45 секунд.', howItWorksLabel: 'Как это работает', step1Title: 'Ответьте на вопросы', step1Body: '12–20 адаптивных текстовых вопросов.', step2Title: 'Получите уровень', step2Body: 'Текстовая оценка по CEFR.', step3Title: 'Скачайте сертификат', step3Body: 'Сертификат в пяти темах.', certificatePreviewLabel: 'Пример сертификата', previewTitle: 'Вот что вы получите', previewBody: 'Именной сертификат с уровнем.', previewSampleName: 'Ваше имя', trustLabel: 'Почему стоит пройти тест', trustFree: 'Бесплатно', trustNoRegistration: 'Без регистрации', trustInstantResult: 'Результат сразу', finalCtaTitle: 'Готовы узнать свой уровень?', finalCtaButton: 'Начать тест' },
      languageSelector: { title: 'Выберите язык', testLanguage: 'Какой язык проверяем?', uiLanguage: 'Язык интерфейса', continue: 'Продолжить' },
      consent: { text: 'Начиная тест, вы соглашаетесь с обработкой ответов для расчёта результата.', privacy: 'Политика конфиденциальности', accept: 'Согласен и начинаю' },
      socialProof: { text: 'Более {{count}} учеников уже проверили свой уровень.' },
      loading: { title: 'Готовим вопросы', text: 'Это займёт несколько секунд.' }, error: { title: 'Не удалось загрузить тест', text: 'Проверьте подключение и попробуйте снова.', retry: 'Повторить', retryTitle: 'Загрузить тест заново' },
      report: { trigger: 'Заметили ошибку?', title: 'Сообщить об ошибке', subtitle: 'Коротко опишите, что не так — мы проверим задание.', placeholder: 'Что случилось?', hint: 'Минимум {{count}} символов.', tooShort: 'Добавьте подробности: минимум {{count}} символов.', cancel: 'Отмена', submit: 'Отправить', sending: 'Отправляем…', successTitle: 'Сообщение принято!', successText: 'Спасибо — мы проверим это задание.', errorTitle: 'Не удалось отправить', errorText: 'Проверьте подключение и попробуйте ещё раз.', tryAgain: 'Попробовать снова', close: 'Готово', dialogLabel: 'Форма сообщения об ошибке', closeLabel: 'Закрыть форму' },
      question: { progress: 'Вопрос {{answered}} из {{count}}', of: 'из {{count}}', context: 'Контекст', contextInstruction: 'Выберите единственный вариант, который соответствует контексту.', select: 'Выберите ответ', skip: 'Не знаю', exit: 'Выйти', answerGroup: 'Варианты ответа', timerRemaining: 'Осталось времени на вопрос', number: 'Вопрос {{count}}' }, timer: { label: 'Время', expired: 'Время вышло' },
      actions: { next: 'Далее', back: 'Назад', finish: 'Завершить', exit: 'Выйти из теста' }, exitConfirm: { title: 'Выйти из теста?', text: 'Ваш текущий прогресс не сохранится.', stay: 'Продолжить тест', leave: 'Выйти' },
      result: { title: 'Ваш результат', level: 'Ваш уровень: {{level}}', score: '{{correct}} правильных из {{answered}} ответов', subject: 'Уровень {{language}}', scope: 'Это ориентировочная текстовая оценка, а не официальный сертификат: аудирование, говорение и письмо не оцениваются.', pitchSubtitle: 'Ваш следующий шаг', benefit1: '10 000+ фраз живого английского', benefit2: 'Короткие уроки по 5 минут в день', benefit3: 'Тренировка произношения и повторения' },
      stats: { correct: 'Правильные ответы', answered: 'Отвечено', time: 'Время прохождения', skipped: 'Не знаю' }, name: { label: 'Ваше имя', placeholder: 'Введите имя', optional: 'Необязательно' }, alerts: { nameRequired: 'Введите имя для сертификата.', copySuccess: 'Ссылка скопирована.', copyError: 'Не удалось скопировать ссылку.' },
      sharing: { title: 'Поделиться результатом', copy: 'Скопировать ссылку', copied: 'Скопировано', restart: 'Пройти ещё раз', webShareTitle: 'Мой уровень языка', resultPayload: 'Моя предварительная текстовая оценка {{language}} — {{level}}.', clipboardPrompt: 'Скопируйте:' },
      certificate: { title: 'Сертификат результата', language: 'Язык', theme: 'Оформление', download: 'Скачать', print: 'Печать', save: 'Сохранить', close: 'Закрыть', cta: 'Получить сертификат', filename: 'результат-{{language}}-{{level}}', dialogLabel: 'Диалог сертификата результата', closeLabel: 'Закрыть сертификат', languageGroup: 'Язык сертификата', themeGroup: 'Оформление сертификата', create: 'Создать сертификат', downloadPng: 'Скачать PNG', printPdf: 'Печать / PDF', iosReadyImageAlt: 'Готовый сертификат для сохранения', iosLongPressHint: 'Нажмите и удерживайте сертификат, затем выберите «Сохранить в Фото».', pngFailure: 'Не удалось создать PNG. Попробуйте печать.', printTitle: 'Сертификат', ctaText: 'Тренируйте живой английский каждый день с Phraseman.', ctaButton: 'Скачать Phraseman бесплатно', bodyTitle: 'Сертификат', certifies: 'Настоящий сертификат выдан', completed: 'за прохождение проверки уровня {{language}} Phraseman', received: 'с предварительной оценкой по шкале CEFR', summary: '{{correct}} верно из {{answered}}', informal: 'Это неофициальная текстовая оценка, а не аккредитованная языковая квалификация.', themes: { gold: 'Золото', dark: 'Полночь', emerald: 'Изумруд', rose: 'Роза', royal: 'Королевский' } },
      storeBadges: { appStore: 'Загрузите в App Store', googlePlay: 'Скачайте в Google Play', appStoreAria: 'Скачать Phraseman в App Store', googlePlayAria: 'Скачать Phraseman в Google Play' }, resultCta: { title: 'Изучайте английский с Phraseman', text: 'Тренируйте живой английский в коротких уроках Phraseman.', open: 'Открыть Phraseman', low: { title: 'Начните с понятной базы', text: 'Тренируйте живой английский с Phraseman по несколько минут в день.', button: 'Начать учить английский' }, mid: { title: 'Укрепляйте английский', text: 'Тренируйте живой английский и закрывайте пробелы с Phraseman.', button: 'Продолжить английский' }, high: { title: 'Поддерживайте английский', text: 'Тренируйте живой английский каждый день с Phraseman.', button: 'Совершенствовать английский' } },
      footer: { copyright: '© Phraseman', terms: 'Условия использования', privacy: 'Конфиденциальность', about: 'О приложении', privacyLabel: 'Политика конфиденциальности' },
      aria: { languageMenu: 'Открыть выбор языка', close: 'Закрыть', progress: 'Прогресс теста', timer: 'Таймер теста', answerRadiogroup: 'Варианты ответа', answerOptions: 'Выберите один вариант ответа', certificateDialog: 'Диалог сертификата', certificateLanguage: 'Выбор языка сертификата', certificateTheme: 'Выбор оформления сертификата', iosSavePreview: 'Предпросмотр для сохранения на iPhone или iPad', storeLinks: 'Ссылки на магазины приложений', testSelector: 'Выбор проверяемого языка', localeToggle: 'Переключить язык интерфейса', resultLevel: 'Ваш уровень' }, alt: { logo: 'Логотип Phraseman', certificate: 'Предпросмотр сертификата' }, title: { retry: 'Загрузить тест заново', close: 'Закрыть окно', copy: 'Скопировать ссылку' },
      levels: { 'Pre-A1': 'Pre-A1 — вы узнаёте отдельные слова и выражения в тексте.', A1: 'A1 — вы понимаете простые знакомые фразы в письменном виде.', A2: 'A2 — вы интерпретируете короткие повседневные тексты и грамматику.', B1: 'B1 — вы понимаете основное содержание письменных текстов.', B2: 'B2 — вы уверенно интерпретируете сложные тексты, регистр и письменные смыслы.', C1: 'C1 — вы точно интерпретируете сложные письменные тексты и нюансы регистра.', C2: 'C2 — вы понимаете сложные письменные тексты, импликации и тонкие различия.' },
    },
    en: {
      document: { title: 'Language Level Test — Phraseman', description: 'Discover your language level and get a personal result.' },
      header: { title: 'Language Level Test', language: 'Test language', interface: 'Interface language', brandHomeAria: 'Phraseman — home', brandSubtitle: 'Real English' },
      landing: { eyebrow: 'Free assessment', title: 'Find your {{language}} level', subtitle: 'Answer questions and receive an estimated CEFR level.', start: 'Start test', duration: 'Takes about {{count}} minutes', howItWorks: 'Answer multiple-choice text questions.', certificatePreview: 'Preview your result certificate.', trust: 'Your result is based on text tasks only.', finalCta: 'Start your free text assessment.', timerNote: 'You have 45 seconds for each question.', howItWorksLabel: 'How it works', step1Title: 'Answer questions', step1Body: '12–20 adaptive text questions.', step2Title: 'Get your level', step2Body: 'A preliminary text-based CEFR estimate.', step3Title: 'Download a certificate', step3Body: 'A certificate in five themes.', certificatePreviewLabel: 'Certificate preview', previewTitle: 'What you receive', previewBody: 'A named certificate with your level.', previewSampleName: 'Your name', trustLabel: 'Why take the test', trustFree: 'Free', trustNoRegistration: 'No registration', trustInstantResult: 'Instant result', finalCtaTitle: 'Ready to find your level?', finalCtaButton: 'Start test' },
      languageSelector: { title: 'Choose a language', testLanguage: 'Which language are you testing?', uiLanguage: 'Interface language', continue: 'Continue' },
      consent: { text: 'By starting, you agree that your answers are processed to calculate your result.', privacy: 'Privacy policy', accept: 'I agree and start' },
      socialProof: { text: 'More than {{count}} learners have already checked their level.' },
      loading: { title: 'Preparing questions', text: 'This will take a few seconds.' }, error: { title: 'Could not load the test', text: 'Check your connection and try again.', retry: 'Try again', retryTitle: 'Reload the test' },
      report: { trigger: 'Noticed an error?', title: 'Report an error', subtitle: 'Briefly describe what is wrong and we will review the question.', placeholder: 'What happened?', hint: 'At least {{count}} characters.', tooShort: 'Please add more detail: at least {{count}} characters.', cancel: 'Cancel', submit: 'Send', sending: 'Sending…', successTitle: 'Report received!', successText: 'Thank you — we will review this question.', errorTitle: 'Could not send', errorText: 'Check your connection and try again.', tryAgain: 'Try again', close: 'Done', dialogLabel: 'Error report form', closeLabel: 'Close form' },
      question: { progress: 'Question {{answered}} of {{count}}', of: 'of {{count}}', context: 'Context', contextInstruction: 'Choose the only answer that matches the context.', select: 'Choose an answer', skip: "I don't know", exit: 'Exit', answerGroup: 'Answer choices', timerRemaining: 'Time remaining for this question', number: 'Question {{count}}' }, timer: { label: 'Time', expired: 'Time is up' },
      actions: { next: 'Next', back: 'Back', finish: 'Finish', exit: 'Exit test' }, exitConfirm: { title: 'Exit the test?', text: 'Your current progress will not be saved.', stay: 'Keep taking the test', leave: 'Exit' },
      result: { title: 'Your result', level: 'Your level: {{level}}', score: '{{correct}} correct out of {{answered}} answered', subject: '{{language}} level', scope: 'This is an estimated text-only level, not an official certificate: listening, speaking, and writing are not assessed.', pitchSubtitle: 'Your next step', benefit1: '10,000+ real English phrases', benefit2: 'Short five-minute daily lessons', benefit3: 'Pronunciation and review practice' },
      stats: { correct: 'Correct answers', answered: 'Answered', time: 'Time taken', skipped: "I don't know" }, name: { label: 'Your name', placeholder: 'Enter your name', optional: 'Optional' }, alerts: { nameRequired: 'Enter a name for your certificate.', copySuccess: 'Link copied.', copyError: 'Could not copy the link.' },
      sharing: { title: 'Share your result', copy: 'Copy link', copied: 'Copied', restart: 'Take it again', webShareTitle: 'My language level', resultPayload: 'My preliminary text-based {{language}} level is {{level}}.', clipboardPrompt: 'Copy:' },
      certificate: { title: 'Result certificate', language: 'Language', theme: 'Style', download: 'Download', print: 'Print', save: 'Save', close: 'Close', cta: 'Get certificate', filename: '{{language}}-{{level}}-result', dialogLabel: 'Result certificate dialog', closeLabel: 'Close certificate', languageGroup: 'Certificate language', themeGroup: 'Certificate theme', create: 'Create certificate', downloadPng: 'Download PNG', printPdf: 'Print / PDF', iosReadyImageAlt: 'Ready certificate image to save', iosLongPressHint: 'Press and hold the certificate, then choose Save to Photos.', pngFailure: 'Could not create PNG. Try printing instead.', printTitle: 'Certificate', ctaText: 'Practise real English every day with Phraseman.', ctaButton: 'Download Phraseman free', bodyTitle: 'Certificate of Completion', certifies: 'This certifies that', completed: 'completed the Phraseman {{language}} Level Check', received: 'and received an estimated CEFR level of', summary: '{{correct}} correct out of {{answered}}', informal: 'This is an informal text-based assessment, not an accredited language qualification.', themes: { gold: 'Gold', dark: 'Midnight', emerald: 'Emerald', rose: 'Rose', royal: 'Royal' } },
      storeBadges: { appStore: 'Download on the App Store', googlePlay: 'Get it on Google Play', appStoreAria: 'Download Phraseman on the App Store', googlePlayAria: 'Download Phraseman on Google Play' }, resultCta: { title: 'Learn English with Phraseman', text: 'Learn English in short Phraseman lessons.', open: 'Open Phraseman', low: { title: 'Start with a clear foundation', text: 'Practise real English with Phraseman for a few minutes every day.', button: 'Start learning English' }, mid: { title: 'Strengthen your English', text: 'Practise real English and close gaps with Phraseman.', button: 'Keep learning English' }, high: { title: 'Maintain your English', text: 'Practise real English every day with Phraseman.', button: 'Improve your English' } },
      footer: { copyright: '© Phraseman', terms: 'Terms of use', privacy: 'Privacy', about: 'About the app', privacyLabel: 'Privacy policy' },
      aria: { languageMenu: 'Open language selector', close: 'Close', progress: 'Test progress', timer: 'Test timer', answerRadiogroup: 'Answer choices', answerOptions: 'Choose one answer option', certificateDialog: 'Certificate dialog', certificateLanguage: 'Certificate language selector', certificateTheme: 'Certificate style selector', iosSavePreview: 'Preview for saving on iPhone or iPad', storeLinks: 'App store links', testSelector: 'Test language selector', localeToggle: 'Switch interface language', resultLevel: 'Your level' }, alt: { logo: 'Phraseman logo', certificate: 'Certificate preview' }, title: { retry: 'Reload the test', close: 'Close window', copy: 'Copy link' },
      levels: { 'Pre-A1': 'Pre-A1 — you recognise individual words and expressions in text.', A1: 'A1 — you understand simple familiar written phrases.', A2: 'A2 — you interpret short everyday texts and grammar.', B1: 'B1 — you understand the main meaning of written texts.', B2: 'B2 — you confidently interpret complex texts, register, and written meaning.', C1: 'C1 — you accurately interpret complex written texts and register nuances.', C2: 'C2 — you understand complex written texts, implication, and fine distinctions.' },
    },
    ...EXTRA_LOCALES.DICTIONARY,
  });

  function resolveUiLocale(options) {
    const settings = options || {};
    const requested = queryValue(settings.search, 'ui');
    if (isUiLocale(requested)) return requested;
    if (isUiLocale(settings.stored)) return settings.stored;
    const browserLanguage = typeof settings.navigatorLanguage === 'string' ? settings.navigatorLanguage.toLowerCase() : '';
    const browserLocale = browserLanguage.split('-')[0];
    return isUiLocale(browserLocale) ? browserLocale : 'en';
  }
  function resolveTestLanguage(search) { const requested = queryValue(search, 'test'); return isTestLanguage(requested) ? requested : 'en'; }
  function readStoredLocale(storage) {
    try {
      const target = storage === undefined ? global.localStorage : storage;
      const stored = target ? target.getItem(STORAGE_KEY) : null;
      return isUiLocale(stored) ? stored : null;
    } catch (_) { return null; }
  }
  function persistLocale(locale, storage) { if (!isUiLocale(locale)) return false; try { const target = storage === undefined ? global.localStorage : storage; if (!target) return false; target.setItem(STORAGE_KEY, locale); return true; } catch (_) { return false; } }
  function updateUrlSelection(options) {
    const settings = options || {};
    try {
      const original = settings.locationObject && settings.locationObject.href;
      if (typeof original !== 'string') return '';
      const hashIndex = original.indexOf('#');
      const beforeHash = hashIndex === -1 ? original : original.slice(0, hashIndex);
      const hash = hashIndex === -1 ? '' : original.slice(hashIndex);
      const queryIndex = beforeHash.indexOf('?');
      const base = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
      const rawQuery = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);
      const requestedTest = isTestLanguage(settings.testLanguage) ? settings.testLanguage : 'en';
      const includeUi = settings.includeUi !== false && isUiLocale(settings.uiLocale);
      const tokens = rawQuery === '' ? [] : rawQuery.split('&');
      const output = [];
      let wroteTest = false;
      let wroteUi = false;
      for (let index = 0; index < tokens.length; index += 1) {
        const name = decodedQueryName(tokens[index]);
        if (name === 'test') {
          if (!wroteTest) { output.push(`test=${requestedTest}`); wroteTest = true; }
        } else if (name === 'ui') {
          if (includeUi && !wroteUi) { output.push(`ui=${settings.uiLocale}`); wroteUi = true; }
        } else output.push(tokens[index]);
      }
      if (includeUi && !wroteUi) output.push(`ui=${settings.uiLocale}`);
      if (!wroteTest) output.push(`test=${requestedTest}`);
      const href = `${base}?${output.join('&')}${hash}`;
      if (settings.historyObject && typeof settings.historyObject.replaceState === 'function') settings.historyObject.replaceState(null, '', href);
      return href;
    } catch (_) { return ''; }
  }
  function t(locale, key, vars) {
    if (!isUiLocale(locale)) throw new Error(`Unknown locale: ${locale}`);
    const parts = typeof key === 'string' ? key.split('.') : [];
    let value = DICTIONARY[locale];
    for (let index = 0; index < parts.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, parts[index])) throw new Error(`Missing translation key: ${key}`);
      value = value[parts[index]];
    }
    if (typeof value !== 'string') throw new Error(`Missing translation key: ${key}`);
    const values = vars === undefined ? {} : vars;
    let output = ''; let cursor = 0;
    while (cursor < value.length) {
      const open = value.indexOf('{{', cursor);
      if (open === -1) return output + value.slice(cursor);
      output += value.slice(cursor, open);
      const close = value.indexOf('}}', open + 2);
      if (close === -1) throw new Error(`Invalid translation template: ${key}`);
      const name = value.slice(open + 2, close);
      if (!Object.prototype.hasOwnProperty.call(values, name)) throw new Error(`Missing interpolation variable: ${name}`);
      output += escapeHtml(values[name]); cursor = close + 2;
    }
    return output;
  }

  global.EnglishTestI18n = Object.freeze({ UI_LOCALES: Object.freeze(UI_LOCALES), LOCALE_META, TEST_LANGUAGES: Object.freeze(TEST_LANGUAGES), TESTS, DICTIONARY, resolveUiLocale, resolveTestLanguage, readStoredLocale, persistLocale, updateUrlSelection, t });
}(globalThis));
