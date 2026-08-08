export const ADMIN_CAPABILITY_REGISTRY = Object.freeze([
  { id: 'daily-digest', route: 'overview', nativeRoute: 'daily-briefing', label: 'Брифинг', description: 'Сводка дня: рост, деньги, риски и действия.' },
  { id: 'remote-config', route: 'application', nativeRoute: 'application', label: 'Конфигурация приложения', description: 'Лимиты, экономика, энергия и функциональные переключатели.' },
  { id: 'paywall-ab', route: 'application', nativeRoute: 'application', label: 'A/B-тест пейволов', description: 'Доли показа семи экранов оплаты, социальное доказательство и соль эксперимента.' },
  { id: 'app-messages', route: 'application', nativeRoute: 'campaigns', label: 'Сообщения в приложении', description: 'Баннеры и сообщения для выбранных аудиторий.' },
  { id: 'users', route: 'users', nativeRoute: 'users', label: 'Пользователи', description: 'Поиск, профиль, доступ и действия пользователя.' },
  { id: 'reports', route: 'users', nativeRoute: 'report-center', label: 'Репорты', description: 'Обращения об ошибках и ответы пользователям.' },
  { id: 'gmail-support', route: 'users', nativeRoute: 'support', label: 'Почта поддержки', description: 'Gmail, черновики ответов, отправка и архив.' },
  { id: 'analytics', route: 'money', nativeRoute: 'analytics', label: 'Аналитика', description: 'Платёжные и продуктовые показатели по источникам.' },
  { id: 'openai-budget', route: 'money', nativeRoute: 'diagnostics', label: 'Бюджет генерации', description: 'Модели, функции, дневные и месячные расходы.' },
  { id: 'promo-codes', route: 'money', nativeRoute: 'money', label: 'Промокоды', description: 'Генерация, ограничения и активации.' },
  { id: 'coin-center', route: 'money', nativeRoute: 'coin-center', label: 'Центр монет', description: 'Курс биржи монет в звёзды, ручное переопределение, история и объёмы обменов.' },
  { id: 'asset-studio', route: 'content', nativeRoute: 'asset-studio', label: 'Студия изображений', description: 'Создание изображений через безопасные серверные задания.' },
  { id: 'plans', route: 'content', nativeRoute: 'plans', label: 'Планы', description: 'Структурированные планы действий с серверно заданными шагами.' },
  { id: 'english-test', route: 'content', nativeRoute: 'english-test', label: 'Тест английского', description: 'Воронка веб-теста уровня: лендинг, вопросы, сертификаты, установки приложения.' },
].map((capability) => Object.freeze({ ...capability, migrationStatus: 'native' })));

const NATIVE_PAGE_HASHES = new Set([
  'overview', 'application', 'users', 'money', 'content', 'community', 'diagnostics',
  'support', 'analytics', 'daily-briefing', 'report-center', 'asset-studio', 'plans', 'campaigns', 'coin-center',
  'control-panel', 'admin-settings', 'agent-office', 'agent-manager', 'english-test',
]);

const ANALYTICS_BOOKMARK_HASHES = new Set([
  'product', '/product', 'subscriptions', '/subscriptions', 'monthly', '/monthly',
  'today', '/today', 'growth', '/growth', 'learning', '/learning',
]);

export const RETIRED_CAPABILITY_IDS = Object.freeze([
  'daily-phrases', 'compass', 'mod-queue', 'audit', 'audit-log', 'ops-log', 'archive', 'changelog-0608',
]);
const BLOCKED_HASH_SEGMENTS = new Set(RETIRED_CAPABILITY_IDS);

export function capabilitiesForRoute(route) {
  return ADMIN_CAPABILITY_REGISTRY.filter((capability) => capability.route === route);
}

export function capabilityById(id) {
  return ADMIN_CAPABILITY_REGISTRY.find((entry) => entry.id === id) ?? null;
}

export function resolveCapabilityHash(rawHash) {
  const encoded = String(rawHash ?? '').replace(/^#/, '').trim();
  let requested = encoded;
  try { requested = decodeURIComponent(encoded); } catch { return { resolved: true, route: 'overview', capabilityId: '' }; }
  if (ANALYTICS_BOOKMARK_HASHES.has(requested)) return { resolved: true, route: 'analytics', capabilityId: '' };

  const [requestedRoute, requestedCapabilityId = ''] = requested.split(':');
  if (!requested || BLOCKED_HASH_SEGMENTS.has(requestedRoute) || BLOCKED_HASH_SEGMENTS.has(requestedCapabilityId)) {
    return { resolved: true, route: 'overview', capabilityId: '' };
  }
  if (!requestedCapabilityId && NATIVE_PAGE_HASHES.has(requestedRoute)) {
    return { resolved: false, route: requestedRoute, capabilityId: '' };
  }

  const directCapability = !requestedCapabilityId ? capabilityById(requestedRoute) : null;
  if (directCapability) return { resolved: true, route: directCapability.nativeRoute, capabilityId: '' };

  const requestedCapability = capabilityById(requestedCapabilityId);
  if (requestedCapability && requestedCapability.route === requestedRoute) {
    return { resolved: true, route: requestedCapability.nativeRoute, capabilityId: '' };
  }
  return { resolved: true, route: 'overview', capabilityId: '' };
}
