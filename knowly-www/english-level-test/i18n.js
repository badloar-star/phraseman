(function (global) {
  'use strict';

  const STORAGE_KEY = 'language_test_ui_locale_v1';
  const UI_LOCALES = ['ru', 'en'];
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

  const TESTS = deepFreeze({
    en: { bcp47: 'en-US', bankUrl: './data/questions.en.json?v=20260801-1', nativeLabel: 'English', filenameSlug: 'english', names: { ru: { nominative: 'английский язык', genitive: 'английского языка', subject: 'английскому языку' }, en: { nominative: 'English', genitive: 'English', subject: 'English' } } },
    de: { bcp47: 'de-DE', bankUrl: './data/questions.de.json?v=20260801-1', nativeLabel: 'Deutsch', filenameSlug: 'german', names: { ru: { nominative: 'немецкий язык', genitive: 'немецкого языка', subject: 'немецкому языку' }, en: { nominative: 'German', genitive: 'German', subject: 'German' } } },
    fr: { bcp47: 'fr-FR', bankUrl: './data/questions.fr.json?v=20260801-1', nativeLabel: 'Français', filenameSlug: 'french', names: { ru: { nominative: 'французский язык', genitive: 'французского языка', subject: 'французскому языку' }, en: { nominative: 'French', genitive: 'French', subject: 'French' } } },
    it: { bcp47: 'it-IT', bankUrl: './data/questions.it.json?v=20260801-1', nativeLabel: 'Italiano', filenameSlug: 'italian', names: { ru: { nominative: 'итальянский язык', genitive: 'итальянского языка', subject: 'итальянскому языку' }, en: { nominative: 'Italian', genitive: 'Italian', subject: 'Italian' } } },
    es: { bcp47: 'es-ES', bankUrl: './data/questions.es.json?v=20260801-1', nativeLabel: 'Español', filenameSlug: 'spanish', names: { ru: { nominative: 'испанский язык', genitive: 'испанского языка', subject: 'испанскому языку' }, en: { nominative: 'Spanish', genitive: 'Spanish', subject: 'Spanish' } } },
  });

  const DICTIONARY = deepFreeze({
    ru: {
      document: { title: 'Тест уровня языка — Phraseman', description: 'Узнайте свой уровень языка и получите персональный результат.' },
      header: { title: 'Тест уровня языка', language: 'Язык теста', interface: 'Язык интерфейса' },
      landing: { eyebrow: 'Бесплатная диагностика', title: 'Определите уровень {{language}}', subtitle: 'Ответьте на вопросы и получите ориентировочный уровень по шкале CEFR.', start: 'Начать тест', duration: 'Займёт около {{count}} минут' },
      languageSelector: { title: 'Выберите язык', testLanguage: 'Какой язык проверяем?', uiLanguage: 'Язык интерфейса', continue: 'Продолжить' },
      consent: { text: 'Начиная тест, вы соглашаетесь с обработкой ответов для расчёта результата.', privacy: 'Политика конфиденциальности', accept: 'Согласен и начинаю' },
      socialProof: { text: 'Более {{count}} учеников уже проверили свой уровень.' },
      loading: { title: 'Готовим вопросы', text: 'Это займёт несколько секунд.' }, error: { title: 'Не удалось загрузить тест', text: 'Проверьте подключение и попробуйте снова.', retry: 'Повторить' },
      question: { progress: 'Вопрос {{answered}} из {{count}}', of: 'из {{count}}', select: 'Выберите ответ' }, timer: { label: 'Время', expired: 'Время вышло' },
      actions: { next: 'Далее', back: 'Назад', finish: 'Завершить', exit: 'Выйти из теста' }, exitConfirm: { title: 'Выйти из теста?', text: 'Ваш текущий прогресс не сохранится.', stay: 'Продолжить тест', leave: 'Выйти' },
      result: { title: 'Ваш результат', level: 'Ваш уровень: {{level}}', score: '{{correct}} правильных из {{answered}} ответов', subject: 'Уровень {{language}}', scope: 'Это ориентировочная оценка, а не официальный сертификат.' },
      stats: { correct: 'Правильные ответы', answered: 'Отвечено', time: 'Время прохождения' }, name: { label: 'Ваше имя', placeholder: 'Введите имя', optional: 'Необязательно' }, alerts: { nameRequired: 'Введите имя для сертификата.', copySuccess: 'Ссылка скопирована.', copyError: 'Не удалось скопировать ссылку.' },
      sharing: { title: 'Поделиться результатом', copy: 'Скопировать ссылку', copied: 'Скопировано', restart: 'Пройти ещё раз' },
      certificate: { title: 'Сертификат результата', language: 'Язык', theme: 'Оформление', download: 'Скачать', print: 'Печать', save: 'Сохранить', close: 'Закрыть', cta: 'Получить сертификат', filename: 'результат-{{language}}-{{level}}' },
      storeBadges: { appStore: 'Загрузите в App Store', googlePlay: 'Скачайте в Google Play' }, resultCta: { title: 'Продолжайте учиться с Phraseman', text: 'Практикуйте язык каждый день в коротких уроках.', open: 'Открыть Phraseman' },
      footer: { copyright: '© Phraseman', terms: 'Условия использования', privacy: 'Конфиденциальность' },
      aria: { languageMenu: 'Открыть выбор языка', close: 'Закрыть', progress: 'Прогресс теста', timer: 'Таймер теста' }, alt: { logo: 'Логотип Phraseman', certificate: 'Предпросмотр сертификата' }, title: { retry: 'Загрузить тест заново', close: 'Закрыть окно', copy: 'Скопировать ссылку' },
      levels: { 'Pre-A1': 'Pre-A1 — начало пути: вы узнаёте отдельные слова и выражения.', A1: 'A1 — базовый уровень: вы понимаете простые знакомые фразы.', A2: 'A2 — элементарный уровень: вы общаетесь в повседневных ситуациях.', B1: 'B1 — средний уровень: вы справляетесь с большинством бытовых задач.', B2: 'B2 — выше среднего: вы уверенно понимаете сложные тексты и речь.', C1: 'C1 — продвинутый уровень: вы гибко используете язык в учёбе и работе.', C2: 'C2 — свободное владение: вы точно понимаете и выражаете сложные мысли.' },
    },
    en: {
      document: { title: 'Language Level Test — Phraseman', description: 'Discover your language level and get a personal result.' },
      header: { title: 'Language Level Test', language: 'Test language', interface: 'Interface language' },
      landing: { eyebrow: 'Free assessment', title: 'Find your {{language}} level', subtitle: 'Answer questions and receive an estimated CEFR level.', start: 'Start test', duration: 'Takes about {{count}} minutes' },
      languageSelector: { title: 'Choose a language', testLanguage: 'Which language are you testing?', uiLanguage: 'Interface language', continue: 'Continue' },
      consent: { text: 'By starting, you agree that your answers are processed to calculate your result.', privacy: 'Privacy policy', accept: 'I agree and start' },
      socialProof: { text: 'More than {{count}} learners have already checked their level.' },
      loading: { title: 'Preparing questions', text: 'This will take a few seconds.' }, error: { title: 'Could not load the test', text: 'Check your connection and try again.', retry: 'Try again' },
      question: { progress: 'Question {{answered}} of {{count}}', of: 'of {{count}}', select: 'Choose an answer' }, timer: { label: 'Time', expired: 'Time is up' },
      actions: { next: 'Next', back: 'Back', finish: 'Finish', exit: 'Exit test' }, exitConfirm: { title: 'Exit the test?', text: 'Your current progress will not be saved.', stay: 'Keep taking the test', leave: 'Exit' },
      result: { title: 'Your result', level: 'Your level: {{level}}', score: '{{correct}} correct out of {{answered}} answered', subject: '{{language}} level', scope: 'This is an estimated level, not an official certificate.' },
      stats: { correct: 'Correct answers', answered: 'Answered', time: 'Time taken' }, name: { label: 'Your name', placeholder: 'Enter your name', optional: 'Optional' }, alerts: { nameRequired: 'Enter a name for your certificate.', copySuccess: 'Link copied.', copyError: 'Could not copy the link.' },
      sharing: { title: 'Share your result', copy: 'Copy link', copied: 'Copied', restart: 'Take it again' },
      certificate: { title: 'Result certificate', language: 'Language', theme: 'Style', download: 'Download', print: 'Print', save: 'Save', close: 'Close', cta: 'Get certificate', filename: '{{language}}-{{level}}-result' },
      storeBadges: { appStore: 'Download on the App Store', googlePlay: 'Get it on Google Play' }, resultCta: { title: 'Keep learning with Phraseman', text: 'Practise your language every day in short lessons.', open: 'Open Phraseman' },
      footer: { copyright: '© Phraseman', terms: 'Terms of use', privacy: 'Privacy' },
      aria: { languageMenu: 'Open language selector', close: 'Close', progress: 'Test progress', timer: 'Test timer' }, alt: { logo: 'Phraseman logo', certificate: 'Certificate preview' }, title: { retry: 'Reload the test', close: 'Close window', copy: 'Copy link' },
      levels: { 'Pre-A1': 'Pre-A1 — starting out: you recognise individual words and expressions.', A1: 'A1 — beginner: you understand simple familiar phrases.', A2: 'A2 — elementary: you communicate in everyday situations.', B1: 'B1 — intermediate: you handle most everyday tasks.', B2: 'B2 — upper-intermediate: you confidently understand complex texts and speech.', C1: 'C1 — advanced: you use the language flexibly for study and work.', C2: 'C2 — proficient: you understand and express complex ideas precisely.' },
    },
  });

  function resolveUiLocale(options) {
    const settings = options || {};
    const requested = queryValue(settings.search, 'ui');
    if (isUiLocale(requested)) return requested;
    if (isUiLocale(settings.stored)) return settings.stored;
    return typeof settings.navigatorLanguage === 'string' && settings.navigatorLanguage.toLowerCase().slice(0, 3) === 'ru-' || settings.navigatorLanguage === 'ru' ? 'ru' : 'en';
  }
  function resolveTestLanguage(search) { const requested = queryValue(search, 'test'); return isTestLanguage(requested) ? requested : 'en'; }
  function readStoredLocale(storage) {
    try {
      const stored = storage ? storage.getItem(STORAGE_KEY) : null;
      return isUiLocale(stored) ? stored : null;
    } catch (_) { return null; }
  }
  function persistLocale(locale, storage) { if (!isUiLocale(locale) || !storage) return false; try { storage.setItem(STORAGE_KEY, locale); return true; } catch (_) { return false; } }
  function updateUrlSelection(options) {
    const settings = options || {};
    try {
      const url = new URL(settings.locationObject && settings.locationObject.href);
      url.searchParams.set('test', isTestLanguage(settings.testLanguage) ? settings.testLanguage : 'en');
      if (settings.includeUi === false || !isUiLocale(settings.uiLocale)) url.searchParams.delete('ui'); else url.searchParams.set('ui', settings.uiLocale);
      const href = url.href;
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
      output += String(values[name]); cursor = close + 2;
    }
    return output;
  }

  global.EnglishTestI18n = Object.freeze({ UI_LOCALES: Object.freeze(UI_LOCALES), TEST_LANGUAGES: Object.freeze(TEST_LANGUAGES), TESTS, DICTIONARY, resolveUiLocale, resolveTestLanguage, readStoredLocale, persistLocale, updateUrlSelection, t });
}(globalThis));
