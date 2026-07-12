(function adminAnalyticsLanguage() {
  'use strict';

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const labels = {
    screen: {
      root: 'Запуск приложения', home: 'Главная', lessons: 'Список уроков', lesson: 'Урок',
      lesson_complete: 'Результат урока', lesson_menu: 'Меню урока', lesson_words: 'Тренировка слов',
      lesson_irregular_verbs: 'Неправильные глаголы', lesson_theory_v2: 'Теория урока',
      quizzes: 'Квизы', quizzes_screen: 'Квизы', friends: 'Друзья', friend_profile: 'Профиль друга',
      premium_modal: 'Предложение подписки', paywall_a: 'Экран оплаты — вариант A',
      paywall_b: 'Экран оплаты — вариант B', paywall_c: 'Экран оплаты — вариант C',
      manage_subscription: 'Управление подпиской', settings_edu: 'Настройки обучения',
      settings_language: 'Настройки языка', settings_notifications: 'Настройки уведомлений',
      settings_themes: 'Настройки оформления', review: 'Повторение', trainer: 'Тренажёр',
      preposition_drill: 'Тренировка предлогов', diagnostic_test: 'Определение уровня', exam: 'Экзамен',
      flashcards: 'Карточки', flashcards_collection: 'Коллекция карточек', flashcards_swipe: 'Карточки — свайпы',
      shards_shop: 'Магазин осколков', streak_stats: 'Статистика серии', personal_plan: 'Персональный план',
      personal_plan_complete: 'Результат персонального плана', referrals: 'Приглашения друзей',
      achievements_screen: 'Достижения', arena_lobby: 'Арена — лобби', arena_game: 'Арена — игра',
      arena_results: 'Арена — результат', club_screen: 'Клуб', league_screen: 'Лига',
      terms_screen: 'Условия использования', privacy_screen: 'Политика конфиденциальности',
      unknown_screen: 'Экран не распознан', missing_screen: 'Название экрана не получено',
    },
    context: {
      unknown: 'Не определено', generic: 'Обычный показ', settings: 'Настройки', manage: 'Управление подпиской',
      personal_plan: 'Персональный план', onboarding: 'Первый запуск', onboarding_plan: 'План при первом запуске',
      intro_ended: 'После пробного доступа', level_up: 'После повышения уровня', quiz_limit: 'Лимит квизов',
      streak: 'Серия занятий', lesson: 'Урок', automatic: 'Автоматический показ', afterwin: 'После победы',
      direct: 'Прямое открытие', winback: 'Возврат пользователя', referral: 'Приглашение друга', home: 'Главная',
    },
    source: {
      unknown: 'Не определено', direct: 'Прямое открытие', onboarding_plan: 'Первый запуск',
      afterwin_levelup: 'После повышения уровня', settings: 'Настройки', onboarding: 'Первый запуск', automatic: 'Автоматически',
    },
    plan: { monthly: 'Месячный', yearly: 'Годовой', lifetime: 'Навсегда', unknown: 'Не определено' },
    failure: {
      identity_sync: 'Не удалось связать аккаунт', no_active_entitlement_after_purchase: 'Магазин не подтвердил доступ',
      payment_pending: 'Платёж ожидает подтверждения', network_error: 'Ошибка сети', payment_error: 'Ошибка оплаты',
      store_error: 'Ошибка магазина', configuration_error: 'Ошибка настройки магазина', sdk_other: 'Другая ошибка магазина',
      unknown: 'Причина не определена', legacy_or_other: 'Старое событие или другая причина',
    },
    cancelReason: {
      UNSUBSCRIBE: 'Пользователь отключил продление', BILLING_ERROR: 'Ошибка оплаты', DEVELOPER_INITIATED: 'Отключено разработчиком',
      PRICE_INCREASE: 'Не принято повышение цены', CUSTOMER_SUPPORT: 'Отключено службой поддержки', UNKNOWN: 'Причина не определена',
    },
    expirationReason: {
      BILLING_ERROR: 'Оплата не прошла', UNSUBSCRIBE: 'Подписка не была продлена', DEVELOPER_INITIATED: 'Доступ завершён разработчиком',
      PRICE_INCREASE: 'Не принято повышение цены', PRODUCT_NOT_AVAILABLE: 'Тариф больше недоступен', UNKNOWN: 'Причина не определена',
    },
    store: { APP_STORE: 'App Store', PLAY_STORE: 'Google Play', STRIPE: 'Stripe', AMAZON: 'Amazon', PROMOTIONAL: 'Промодоступ', all: 'Все магазины' },
    period: { NORMAL: 'Обычная оплата', TRIAL: 'Пробный период', INTRO: 'Льготный период', PROMOTIONAL: 'Промодоступ', unknown: 'Не определено' },
    durationBucket: { '<1m': 'Меньше 1 минуты', '1-5m': 'От 1 до 5 минут', '5-15m': 'От 5 до 15 минут', '15-30m': 'От 15 до 30 минут', '30m+': '30 минут и больше' },
  };

  function label(kind, key) {
    const normalized = String(key ?? '').trim() || 'unknown';
    return labels[kind]?.[normalized] || (kind === 'screen' ? 'Другой экран' : kind === 'plan' ? 'Другой тариф' : 'Не определено');
  }

  function header(text, explanation) {
    const visible = String(text ?? '');
    const tip = String(explanation ?? '');
    return '<th title="' + esc(tip) + '" tabindex="0" aria-label="' + esc(visible + '. ' + tip) + '" style="text-align:left;padding:9px;border-bottom:1px solid #293548;color:#94a3b8">' + esc(visible) + '</th>';
  }

  function explain(text, explanation, tag = 'span') {
    const visible = String(text ?? '');
    const tip = String(explanation ?? '');
    return '<' + tag + ' title="' + esc(tip) + '" tabindex="0" aria-label="' + esc(visible + '. ' + tip) + '">' + esc(visible) + '</' + tag + '>';
  }

  function metricCard(title, value, explanation) {
    return '<div class="an2-card" title="' + esc(explanation) + '" tabindex="0" aria-label="' + esc(title + '. ' + explanation + '. Значение: ' + value) + '">' +
      '<div class="an2-kicker">' + esc(title) + '</div><div class="an2-value">' + esc(value) + '</div><div class="an2-note">' + esc(explanation) + '</div></div>';
  }

  window.AdminAnalyticsLanguage = Object.freeze({ esc, label, header, explain, metricCard });
})();
