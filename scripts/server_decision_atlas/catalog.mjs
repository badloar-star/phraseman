import { scanServerDecisionAtlasSources } from './inventory.mjs';

const GLOSSARY = [
  ['Приложение', 'Phraseman на телефоне игрока. Оно показывает экран и может сохранить действие до появления интернета.'],
  ['Сервер', 'Удалённая часть Phraseman. Она проверяет важные действия, хранит общие данные или заканчивает работу позже.'],
  ['Синхронизация', 'Передача изменения между телефоном и удалённым хранилищем, чтобы данные не потерялись.'],
  ['Optimistic', 'Экран меняется сразу, до ответа сети. Если сеть не ответит, приложение должно понятно обработать это позже.'],
  ['Очередь', 'Сохранённый список действий. Он ждёт подходящего момента, например возвращения интернета, и отправляется позже.'],
  ['Контракт', 'Контракт — это фиксированное правило проекта. Оно защищает важные данные и не является случайной настройкой.'],
  ['Идемпотентный повтор', 'Повтор одного и того же действия возвращает прежний результат и не даёт награду или списание второй раз.'],
  ['Квитанция', 'Постоянная запись, которая доказывает одно действие и его точный результат.'],
  ['Перезапись', 'Одна версия данных заменяет другую. Карточка всегда говорит, кто именно может это сделать.'],
  ['Фоновая задача', 'Автоматическая серверная работа, которая запускается позже, по расписанию или после изменения данных.'],
  ['Webhook', 'Сообщение от внешнего сервиса в Phraseman, например подтверждение оплаты.'],
].map(([term, simpleMeaning]) => ({ term, simpleMeaning }));

const CATEGORY_RULES = [
  [/rune|shard|xp|level|reward|spin|chest|streak/iu, 'Прогресс и награды'],
  [/premium|purchase|payment|revenue|wallet|access|gift|checkout|coin/iu, 'Экономика и доступ'],
  [/learning|lesson|content|phrase|dailyPhrase/iu, 'Уроки и контент'],
  [/league|arena|tournament|friend|leaderboard|podium/iu, 'Социальное и игры'],
  [/voice|max|audio/iu, 'Voice и MAX'],
  [/auth|account|delete|consent|privacy|identity/iu, 'Аккаунт и приватность'],
  [/admin|jarvis|support|analytics|diagnostic/iu, 'Операционный контур'],
];
const AUTHORITY_POLICY = [
  [/^(practiceRuneGrant|progressSubmitEvent|submitLearningV2.*Completion)$/u, 'client', 'Для этого личного прогресса проектный контракт назначает приложение источником результата; сервер хранит неизменяемую запись и синхронизирует её.'],
  [/webhook|stripe|paypal|revenuecat|telegram/iu, 'external', 'Решение подтверждает внешний сервис; Phraseman сохраняет его результат.'],
  [/^(admin|auth|accountDelete|webCheckout|premium|voiceMinute)/u, 'server', 'Это действие проверяет сервер, потому что затрагивает доступ, безопасность или внешнее подтверждение.'],
];

function categoryFor(name) {
  return CATEGORY_RULES.find(([matcher]) => matcher.test(name))?.[1] ?? 'Остальные серверные связи';
}
function titleFor(name) {
  return name.replace(/([a-z0-9])([A-Z])/gu, '$1 $2').replace(/_/gu, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function searchAliasesFor(record) {
  const haystack = `${record.name} ${record.sourcePath}`.toLocaleLowerCase('en');
  const aliases = [];
  if (/rune|shard/iu.test(haystack)) aliases.push('руна', 'руны', 'жемчуг', 'валюта');
  if (/\bxp\b|experience|level/iu.test(haystack)) aliases.push('опыт', 'уровень', 'xp');
  if (/premium|purchase|payment|checkout|revenue/iu.test(haystack)) aliases.push('покупка', 'оплата', 'премиум');
  if (/sync|queue|offline/iu.test(haystack)) aliases.push('синхронизация', 'очередь', 'без сети');
  return aliases;
}
function authorityFor(record) {
  const policy = AUTHORITY_POLICY.find(([matcher]) => matcher.test(record.name));
  return policy
    ? { kind: policy[1], explanation: policy[2] }
    : { kind: 'not-established', explanation: 'Статический разбор нашёл маршрут, но не доказывает, кто решает итог во всех сценариях.' };
}
function routeExplanation(record) {
  const lower = record.name.toLocaleLowerCase('en');
  const verb = lower.includes('delete') || lower.includes('revoke') ? 'удаляет или отзывает сохранённое состояние'
    : lower.includes('create') || lower.includes('enqueue') ? 'создаёт новую сохранённую задачу или запись'
      : lower.includes('update') || lower.includes('set') || lower.includes('publish') ? 'меняет сохранённые настройки или данные'
        : lower.includes('claim') || lower.includes('grant') || lower.includes('reward') ? 'подтверждает и записывает награду или право'
          : lower.includes('sync') || lower.includes('reconcile') ? 'сверяет и синхронизирует уже существующие данные'
            : lower.includes('get') || lower.includes('list') || lower.includes('status') ? 'читает сохранённые данные для показа'
              : lower.includes('submit') || lower.includes('report') ? 'принимает действие и передаёт его на проверку'
                : lower.includes('final') || lower.includes('complete') ? 'завершает начатый процесс'
                  : 'обрабатывает отдельное действие приложения или внутренней системы';
  const prefix = {
    callable: 'Это серверная функция: она',
    http: 'Это веб-маршрут: он',
    schedule: 'Это автоматическая задача по времени: она',
    'firestore-trigger': 'Это автоматическая реакция на изменение данных: она',
    'client-callable': 'Это связь из приложения с серверной функцией: она',
    'client-firestore': 'Это прямая связь приложения с хранилищем: она',
    'client-http': 'Это прямой интернет-запрос из приложения или админки: он',
  }[record.routeType];
  return `${prefix} ${verb}.`;
}
function safetyFor(record, authority) {
  if (/^(practiceRuneGrant|progressSubmitEvent|submitLearningV2.*Completion)$/u.test(record.name)) return { lockedReason: 'Это личный прогресс: нельзя тихо включить серверное списание или откат. Контракт защищает уже полученный результат игрока и безопасный повтор действия.' };
  if (authority.kind === 'server' || authority.kind === 'external' || /admin|auth|delete|ban|payment|checkout|access|identity/iu.test(record.name)) return { lockedReason: 'Это затрагивает доступ, безопасность, удаление аккаунта, деньги или внешнее подтверждение. Вариант можно обсудить, но не применить одной кнопкой.' };
  return { lockedReason: null };
}
function markerText(marker) {
  if (marker.state === 'evidence-found') return `В этом исходнике найдено явное упоминание: ${marker.name}.`;
  return 'Статический разбор не подтвердил это поведение. Это не означает, что поведения нет — нужна ручная проверка.';
}
function choicesFor(record) {
  const authorityLabel = { client: 'Приложение', server: 'Сервер', shared: 'Совместно', external: 'Внешний сервис', 'not-established': 'Нужно проверить вручную' }[record.authority.kind];
  return [
    { key: 'visibility', label: 'Когда игрок видит результат?', baseline: record.markers.find((item) => item.name === 'optimistic')?.state === 'evidence-found' ? 'Сразу' : 'Нужно проверить вручную', options: ['Сразу', 'После ответа', 'Показать «сохраняем»'], locked: false, consequence: 'Выбор будет только черновиком. Карта покажет затронутые исходники до любых правок.' },
    { key: 'sync', label: 'Как отправляется изменение?', baseline: record.markers.find((item) => item.name === 'queue')?.state === 'evidence-found' ? 'Через очередь при необходимости' : 'Нужно проверить вручную', options: ['Сразу', 'Через очередь при необходимости', 'Только при интернете'], locked: false, consequence: 'Выбор будет только черновиком. Карта покажет затронутые исходники до любых правок.' },
    { key: 'authority', label: 'Кто решает окончательный результат?', baseline: authorityLabel, options: ['Приложение', 'Сервер', 'Совместно', 'Внешний сервис'], locked: Boolean(record.safety.lockedReason), consequence: record.safety.lockedReason ?? 'Смена того, кто решает итог, потребует отдельного плана и проверки контракта.' },
  ];
}
function countBy(records, getKey) {
  return Object.fromEntries([...records.reduce((map, record) => map.set(getKey(record), (map.get(getKey(record)) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function buildServerDecisionAtlas(root = process.cwd()) {
  const scanned = scanServerDecisionAtlasSources(root);
  const records = scanned.records.map((record) => {
    const authority = authorityFor(record);
    const enriched = { ...record, title: titleFor(record.name), category: categoryFor(record.name), plainWhat: routeExplanation(record), searchAliases: searchAliasesFor(record), authority };
    enriched.safety = safetyFor(enriched, authority);
    enriched.markerExplanations = enriched.markers.map((marker) => ({ ...marker, simpleMeaning: markerText(marker) }));
    enriched.choices = choicesFor(enriched);
    return enriched;
  });
  const metrics = {
    totalRecords: records.length,
    serverExports: scanned.serverExports,
    sourceFiles: scanned.sourceFiles,
    byRouteType: countBy(records, (record) => record.routeType),
    withTestEvidence: records.filter((record) => record.evidence.some((item) => item.kind === 'test-source')).length,
    withContractEvidence: records.filter((record) => record.evidence.some((item) => item.kind === 'contract-source')).length,
    staticBehaviorEstablished: records.filter((record) => record.markers.some((item) => item.state === 'evidence-found')).length,
  };
  return { schemaVersion: 'server-decision-atlas.v1', generatedAt: new Date().toISOString(), glossary: GLOSSARY, metrics, records };
}
