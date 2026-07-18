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
      friends: 'Друзья', friend_profile: 'Профиль друга',
      premium_modal: 'Предложение подписки', paywall_a: 'Экран оплаты — вариант A',
      paywall_b: 'Экран оплаты — вариант B', paywall_c: 'Экран оплаты — вариант C',
      manage_subscription: 'Управление подпиской', settings_edu: 'Настройки обучения',
      settings_language: 'Настройки языка', settings_notifications: 'Настройки уведомлений',
      settings_themes: 'Настройки оформления', review: 'Повторение', trainer: 'Тренажёр',
      preposition_drill: 'Тренировка предлогов', diagnostic_test: 'Определение уровня', exam: 'Экзамен',
      flashcards: 'Карточки', flashcards_collection: 'Коллекция карточек', flashcards_swipe: 'Карточки — свайпы',
      shards_shop: 'Магазин осколков', streak_stats: 'Статистика серии', personal_plan: 'Персональный план',
      personal_plan_complete: 'Результат персонального плана', referrals: 'Приглашения друзей',
      achievements_screen: 'Достижения', club_screen: 'Клуб', league_screen: 'Лига',
      terms_screen: 'Условия использования', privacy_screen: 'Политика конфиденциальности',
      unknown_screen: 'Экран не распознан', missing_screen: 'Название экрана не получено',
    },
    context: {
      unknown: 'Не определено', generic: 'Обычный показ', settings: 'Настройки', manage: 'Управление подпиской',
      personal_plan: 'Персональный план', onboarding: 'Первый запуск', onboarding_plan: 'План при первом запуске',
      intro_ended: 'После пробного доступа', level_up: 'После повышения уровня',
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
    action: {
      'shards_shop:open': 'Открыли магазин осколков',
      onboarding_source_select: 'Выбрали источник знакомства с приложением',
      'paywall:abandoned_push': 'Отправлено напоминание после закрытия экрана оплаты',
      'afterwin:shown': 'Показано предложение после победы',
      'intro:ended_shown': 'Показано предложение после пробного доступа',
      'paywall:view': 'Открыт экран оплаты',
      'shards_shop:pack_click': 'Выбран набор осколков',
      'intro:ended_dismiss': 'Закрыто предложение после пробного доступа',
      'shards_shop:purchase_success': 'Успешно куплен набор осколков',
      'intro:ended_cta': 'Нажата кнопка в предложении после пробного доступа',
      'winback:shown': 'Показано предложение вернуться',
      'paywall:purchase_started': 'Начата покупка подписки',
      'paywall:purchase_success': 'Успешно куплена подписка',
      'paywall:purchase_failed': 'Покупка подписки завершилась ошибкой',
      'paywall:dismiss': 'Закрыт экран оплаты',
      'friends:search_start': 'Начат поиск пользователя',
      'friends:search_result': 'Получен результат поиска пользователя',
      'friends:search_error': 'Поиск пользователя завершился ошибкой',
      'friends:add_request_start': 'Начата отправка заявки в друзья',
      'friends:add_request_result': 'Получен результат отправки заявки в друзья',
      'friends:add_request_error': 'Отправка заявки в друзья завершилась ошибкой',
      'friends:send_gift': 'Отправлен подарок другу',
      onboarding_step_view: 'Показан шаг первого запуска',
      onboarding_complete: 'Первый запуск завершён',
      onboarding_plan_goal_select: 'Выбрана цель обучения',
      onboarding_plan_level_select: 'Выбран уровень языка',
      onboarding_plan_minutes_select: 'Выбрано время занятий в день',
      onboarding_plan_billing_select: 'Выбран тариф при первом запуске',
      onboarding_trial_reminder_choice: 'Выбран вариант напоминания о пробном доступе',
      onboarding_plan_phrase_done: 'Завершена первая учебная фраза',
      onboarding_plan_paywall_view: 'Показан экран оплаты при первом запуске',
      onboarding_plan_trial_cta: 'Нажата кнопка пробного доступа при первом запуске',
      onboarding_continue_free: 'Выбрано продолжение без подписки',
      intro_full_access_started: 'Начат пробный полный доступ',
      intro_welcome_shown: 'Показано приветствие пробного доступа',
      intro_welcome_cta: 'Нажата кнопка приветствия пробного доступа',
      intro_ended_shown: 'Показано сообщение об окончании пробного доступа',
      intro_ended_cta: 'Нажата кнопка покупки после пробного доступа',
      intro_ended_dismiss: 'Закрыто предложение после пробного доступа',
      paywall_shown: 'Показан экран оплаты',
      paywall_plan_select: 'Выбран тариф подписки',
      paywall_cta_click: 'Нажата кнопка покупки подписки',
      paywall_close: 'Закрыт экран оплаты',
      purchase_started: 'Начата покупка',
      purchase_completed: 'Покупка завершена успешно',
      purchase_failed: 'Покупка завершилась ошибкой',
      purchase_cancelled: 'Покупка отменена',
      subscription_restored: 'Подписка восстановлена',
      trial_started: 'Начат пробный период',
    },
  };

  function label(kind, key) {
    const normalized = String(key ?? '').trim() || 'unknown';
    return labels[kind]?.[normalized] || (kind === 'screen' ? 'Другой экран' : kind === 'plan' ? 'Другой тариф' : kind === 'action' ? 'Неизвестное действие' : 'Не определено');
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
