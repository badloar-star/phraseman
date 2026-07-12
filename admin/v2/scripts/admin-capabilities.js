const RAW_ADMIN_CAPABILITY_REGISTRY = [
  { id: 'control-panel', route: 'overview', label: 'Пульт управления', description: 'Главные переключатели, лимиты, промокоды и параметры ИИ.', legacyTab: 'control-panel' },
  { id: 'overview', route: 'overview', label: 'Операционная сводка', description: 'Сводные показатели текущей админки.', legacyTab: 'overview' },
  { id: 'daily-digest', route: 'overview', label: 'Product Manager Digest', description: 'Рост, деньги, риски, очереди и действия на сегодня.', legacyTab: 'daily-digest' },

  { id: 'remote-config', route: 'application', label: 'Конфигурация приложения', description: 'Лимиты, экономика, энергия и функциональные переключатели.', legacyTab: 'remote-config' },
  { id: 'paywall-ab', route: 'application', label: 'A/B экрана оплаты', description: 'Варианты экрана оплаты и распределение трафика.', legacyTab: 'paywall-ab' },
  { id: 'app-messages', route: 'application', label: 'Сообщения в приложении', description: 'Баннеры и сообщения для выбранных аудиторий.', legacyTab: 'app-messages' },
  { id: 'review-promo', route: 'application', label: 'Plus-опрос', description: 'Конструктор промо-опроса и награды Plus.', legacyTab: 'review-promo' },
  { id: 'alerts', route: 'application', label: 'Telegram-алерты', description: 'Административные оповещения и проверка доставки.', legacyTab: 'alerts' },
  { id: 'push-notify', route: 'application', label: 'Push-уведомления', description: 'Сегменты, предпросмотр и массовая отправка.', legacyTab: 'push-notify' },

  { id: 'users', route: 'users', label: 'Пользователи', description: 'Поиск, профиль, доступ и действия пользователя.', legacyTab: 'users' },
  { id: 'reports', route: 'users', label: 'Репорты', description: 'Обращения об ошибках и ответы пользователям.', legacyTab: 'reports' },
  { id: 'website-inbox', route: 'users', label: 'Почта сайта', description: 'Входящие обращения с сайта.', legacyTab: 'website-inbox' },
  { id: 'gmail-support', route: 'users', label: 'Почта поддержки', description: 'Gmail, черновики ответов, отправка и архив.', legacyTab: 'gmail-support' },
  { id: 'emails', route: 'users', label: 'Рассылки', description: 'База адресов, кампании и история отправки.', legacyTab: 'emails' },
  { id: 'user-reports', route: 'users', label: 'Жалобы пользователей', description: 'Жалобы, статусы и массовые действия.', legacyTab: 'user-reports' },
  { id: 'ideas', route: 'users', label: 'Идеи пользователей', description: 'Новые идеи, решение и ответ автору.', legacyTab: 'ideas' },
  { id: 'ideas-decided', route: 'users', label: 'Архив идей', description: 'Принятые и отклонённые идеи с историей.', legacyTab: 'ideas-decided' },
  { id: 'surveys', route: 'users', label: 'Опросы', description: 'Ответы, редактор, награды и выгрузка.', legacyTab: 'surveys' },
  { id: 'onboarding-sources', route: 'users', label: 'Источники привлечения', description: 'Откуда новые пользователи узнали о приложении.', legacyTab: 'onboarding-sources' },
  { id: 'safety-flags', route: 'users', label: 'Сигналы безопасности', description: 'Опасные сообщения и очередь проверки.', legacyTab: 'safety-flags' },
  { id: 'age-consent', route: 'users', label: 'Возраст и согласие', description: 'Возрастные ограничения и согласие взрослых.', legacyTab: 'age-consent' },
  { id: 'compliance-radar', route: 'users', label: 'Правовые риски', description: 'Юрисдикции, возраст и незакрытые риски.', legacyTab: 'compliance-radar' },
  { id: 'cancel-surveys', route: 'users', label: 'Причины отмены', description: 'Ответы пользователей при отмене подписки.', legacyTab: 'cancel-surveys' },
  { id: 'beta-testers', route: 'users', label: 'Бета-тестеры', description: 'Ауры, постоянный Plus и управление энергией.', legacyPage: 'beta_testers.html' },

  { id: 'analytics', route: 'money', label: 'Аналитика', description: 'Платёжные и продуктовые показатели по источникам.', legacyTab: 'analytics' },
  { id: 'openai-budget', route: 'money', label: 'Бюджет генерации', description: 'Модели, функции, дневные и месячные расходы.', legacyTab: 'openai-budget' },
  { id: 'premium', route: 'money', label: 'Plus-доступ', description: 'Проверка и управление пользовательским Plus.', legacyTab: 'premium' },
  { id: 'vip', route: 'money', label: 'Административный Plus', description: 'Ручная выдача и история привилегий.', legacyTab: 'vip' },
  { id: 'plus-radar', route: 'money', label: 'Радар Plus', description: 'Дубли и подозрительные случаи доступа.', legacyTab: 'plus-radar' },
  { id: 'promo-codes', route: 'money', label: 'Промокоды', description: 'Генерация, ограничения и активации.', legacyTab: 'promo-codes' },
  { id: 'ugc-purchases', route: 'money', label: 'Покупки пользовательского контента', description: 'Платные пользовательские пакеты и операции.', legacyTab: 'ugc-purchases' },
  { id: 'refunds', route: 'money', label: 'Возвраты', description: 'Заявки на возврат и история решений.', legacyTab: 'refunds' },
  { id: 'referrals', route: 'money', label: 'Реферальная программа', description: 'Рефералы, награды и конверсии.', legacyTab: 'referrals' },
  { id: 'telegram-payments', route: 'money', label: 'Telegram-оплаты', description: 'Платежи и выдача доступа через Telegram.', legacyPage: 'testers.html' },
  { id: 'website-payments', route: 'money', label: 'Сайт и веб-оплаты', description: 'Цены, Stripe, PayPal, заказы и коды активации.', legacyPage: 'site.html' },

  { id: 'community-packs', route: 'content', label: 'Пакеты сообщества', description: 'Проверка и публикация пользовательских пакетов.', legacyTab: 'community-packs' },
  { id: 'card-packs', route: 'content', label: 'Наборы карточек', description: 'Содержимое и управление наборами карточек.', legacyTab: 'card-packs' },
  { id: 'daily-phrases', route: 'content', label: 'Фразы дня', description: 'Фразы, расписание и публикация.', legacyTab: 'daily-phrases' },
  { id: 'french-quizzes', route: 'content', label: 'Французские квизы', description: 'Предпросмотр, черновик, публикация и откат.', legacyTab: 'french-quizzes' },
  { id: 'asset-studio', route: 'content', label: 'DALL-E Asset Studio', description: 'Генерация изображений и ассетов через серверный job workflow.' },
  { id: 'explain-reports', route: 'content', label: 'Репорты объяснений', description: 'Ошибки и отзывы по объяснениям.', legacyTab: 'explain-reports' },
  { id: 'explain-cache', route: 'content', label: 'Кэш объяснений', description: 'Проверка и обслуживание готовых объяснений.', legacyTab: 'explain-cache' },
  { id: 'compass', route: 'content', label: 'Компас', description: 'Контент и параметры учебного Компаса.', legacyTab: 'compass' },
  { id: 'full-content-control', route: 'content', label: 'Полный контроль контента', description: 'Серверный и встроенный контент, подстановки и даты.', legacyPage: 'full.html' },

  { id: 'mod-queue', route: 'community', label: 'Очередь модерации', description: 'Пользовательский контент, ожидающий решения.', legacyTab: 'mod-queue' },
  { id: 'help-board', route: 'community', label: 'Доска помощи', description: 'Запросы сообщества и ответы помощников.', legacyTab: 'help-board' },
  { id: 'helpers-board', route: 'community', label: 'Топ помощников', description: 'Лидеры помощи и подтверждённые ответы.', legacyTab: 'helpers-board' },
  { id: 'clubs', route: 'community', label: 'Клубы и лиги', description: 'Клубы, участники и управление лигами.', legacyTab: 'clubs' },
  { id: 'league-chat', route: 'community', label: 'Чат лиг', description: 'Сообщения, ответы и модерация чата.', legacyTab: 'league-chat' },
  { id: 'arena-ranks', route: 'community', label: 'Рейтинг Арены', description: 'Лидеры и ранги Арены.', legacyTab: 'arena-ranks' },
  { id: 'arena-live', route: 'community', label: 'Арена в реальном времени', description: 'Активные матчи и состояние очередей.', legacyTab: 'arena-live' },
  { id: 'arena-bets', route: 'community', label: 'Ставки Арены', description: 'Ставки, статусы и спорные случаи.', legacyTab: 'arena-bets' },
  { id: 'arena-rooms', route: 'community', label: 'Комнаты Арены', description: 'Комнаты, игроки и состояние матчей.', legacyTab: 'arena-rooms' },
  { id: 'ban-list', route: 'community', label: 'Блокировки', description: 'Заблокированные пользователи и причины.', legacyTab: 'ban-list' },

  { id: 'app-health', route: 'diagnostics', label: 'Состояние приложения', description: 'Сигналы здоровья и свежесть источников.', legacyTab: 'app-health' },
  { id: 'audit', route: 'diagnostics', label: 'Журнал аудита', description: 'Административные действия и изменения данных.', legacyTab: 'audit' },
  { id: 'ops-log', route: 'diagnostics', label: 'Операционный журнал', description: 'Серверные операции и технические события.', legacyTab: 'ops-log' },
  { id: 'archive', route: 'diagnostics', label: 'Архив', description: 'Архивные записи административных процессов.', legacyTab: 'archive' },
  { id: 'changelog-0608', route: 'diagnostics', label: 'Архив аудита 8 июня', description: 'Сохранённый контрольный список аудита.', legacyTab: 'changelog-0608' },
];

export const NATIVE_CAPABILITY_ROUTES = Object.freeze({
  'control-panel': 'control-panel',
  overview: 'overview',
  'daily-digest': 'daily-briefing',
  'remote-config': 'application',
  'paywall-ab': 'application',
  'app-messages': 'campaigns',
  'push-notify': 'campaigns',
  users: 'users',
  reports: 'report-center',
  'asset-studio': 'asset-studio',
  'explain-cache': 'explain-cache',
  compass: 'compass',
  'gmail-support': 'support',
  'website-inbox': 'support',
  'emails': 'emails',
  'beta-testers': 'users',
  analytics: 'analytics',
  'openai-budget': 'diagnostics',
  'promo-codes': 'money',
  audit: 'diagnostics',
  'ops-log': 'diagnostics',
});

const NATIVE_PAGE_HASHES = new Set([
  'overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics',
  'support', 'emails', 'analytics', 'daily-briefing', 'report-center', 'asset-studio', 'campaigns', 'control-panel', 'explain-cache', 'compass',
]);

export const ADMIN_CAPABILITY_REGISTRY = Object.freeze(RAW_ADMIN_CAPABILITY_REGISTRY.map((capability) => {
  const nativeRoute = NATIVE_CAPABILITY_ROUTES[capability.id] ?? '';
  return Object.freeze({
    ...capability,
    migrationStatus: nativeRoute ? 'guarded' : 'fallback',
    nativeRoute,
  });
}));

export function capabilitiesForRoute(route) {
  return ADMIN_CAPABILITY_REGISTRY.filter((capability) => capability.route === route);
}

export function capabilityById(id) {
  return ADMIN_CAPABILITY_REGISTRY.find((capability) => capability.id === id) ?? null;
}

export function resolveCapabilityHash(rawHash) {
  const encoded = String(rawHash ?? '').replace(/^#/, '').trim();
  let requested = encoded;
  try { requested = decodeURIComponent(encoded); } catch { /* Keep malformed input fail-closed. */ }
  const [requestedRoute, requestedCapabilityId = ''] = requested.split(':');
  if (!requestedCapabilityId && NATIVE_PAGE_HASHES.has(requestedRoute)) {
    return { resolved: false, route: requestedRoute, capabilityId: '' };
  }
  const directCapability = capabilityById(requestedRoute);
  if (directCapability && !requestedCapabilityId) {
    return directCapability.nativeRoute
      ? { resolved: true, route: directCapability.nativeRoute, capabilityId: '' }
      : { resolved: true, route: directCapability.route, capabilityId: directCapability.id };
  }
  const requestedCapability = capabilityById(requestedCapabilityId);
  if (requestedCapability?.nativeRoute) return { resolved: true, route: requestedCapability.nativeRoute, capabilityId: '' };
  if (requestedCapability?.route === requestedRoute) return { resolved: true, route: requestedRoute, capabilityId: requestedCapability.id };
  return { resolved: false, route: requestedRoute, capabilityId: '' };
}

export function capabilityUrl(capability) {
  if (!capability) return '';
  if (capability.legacyPage) return `../${capability.legacyPage}`;
  return `../index.html#${capability.legacyTab}`;
}
