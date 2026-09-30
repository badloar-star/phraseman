const REALTIME_EXCEPTIONS = new Map([
  ['components/PremiumContext.tsx', {
    service: 'subscription',
    reason: 'Это проекция права на подписку; D66 допускает её получение с сервера.',
  }],
  ['app/app_messages.ts', {
    service: 'notification',
    reason: 'Это доставка уведомлений; D66 допускает серверный канал уведомлений.',
  }],
  ['app/remote_account_deletion_monitor.ts', {
    service: 'technical-authentication',
    reason: 'Это технический защитный контур аккаунта, необходимый для безопасного доступа к синхронизации.',
  }],
]);

export function classifyD66(record) {
  // Все Firestore-операции в app_messages относятся к разрешённому каналу
  // уведомлений: доставка, состояние прочтения и пользовательские реакции.
  // Это не продуктовая награда или доступ, поэтому сервер здесь только
  // доставляет/сохраняет состояние уведомления.
  if (record.sourcePath === 'app/app_messages.ts') {
    return {
      kind: 'allowed-service',
      service: 'notification',
      reason: 'Модуль обслуживает только доставку уведомлений, состояние прочтения и реакции; D66 допускает этот серверный канал.',
    };
  }
  if (record.sourcePath === 'app/user_notifications.ts') {
    return {
      kind: 'allowed-service',
      service: 'notification',
      reason: 'Модуль читает и кеширует уведомления одноразовым запросом; постоянного listener нет, сервер не принимает продуктовые решения.',
    };
  }
  if (record.sourcePath === 'app/auth_provider.ts') {
    return {
      kind: 'allowed-service',
      service: 'technical-authentication',
      reason: 'Модуль обслуживает вход, стабильную identity-привязку и безопасное восстановление аккаунта; это технический auth-контур, а не продуктовая награда или доступ.',
    };
  }
  if (record.sourcePath === 'app/remote_account_deletion_monitor.ts') {
    return {
      kind: 'allowed-service',
      service: 'technical-authentication',
      reason: 'Модуль наблюдает только за техническим маркером удаления аккаунта и безопасно завершает identity-flow; это auth safety, не продуктовая логика.',
    };
  }
  if (record.sourcePath === 'app/cloud_sync.ts') {
    return {
      kind: 'allowed-service',
      service: 'progress-sync',
      reason: 'Модуль передаёт и восстанавливает локальное состояние прогресса/аккаунта; он не должен принимать наградные или доступовые решения.',
    };
  }
  if (record.sourcePath === 'app/video_phrases_client.ts' || record.sourcePath === 'functions/src/video_phrases.ts') {
    return {
      kind: 'allowed-service',
      service: 'content-video',
      reason: 'Контур обслуживает только получение/обновление видеоконтента; он не решает доступ, награды или личный прогресс.',
    };
  }
  if (record.routeType === 'client-firestore' && record.name === 'onSnapshot') {
    const exception = REALTIME_EXCEPTIONS.get(record.sourcePath);
    if (exception) return { kind: 'allowed-service', ...exception };
    if (record.sourcePath === 'app/firestore_friend_requests.ts') {
      return {
        kind: 'retire-or-replace',
        service: null,
        reason: 'Постоянная лента друзей не относится к разрешённым сервисам D66; заменить чтением по фокусу с TTL и локальным SWR-кешем.',
      };
    }
    if (record.sourcePath === 'app/league_group_boosts.ts') {
      return {
        kind: 'retire-or-replace',
        service: null,
        reason: 'Постоянное состояние группы не относится к разрешённым сервисам D66; удалить вместе с устаревшей механикой либо заменить локальным состоянием.',
      };
    }
    return {
      kind: 'retire-or-replace',
      service: null,
      reason: 'Постоянное Firestore-соединение не входит в явный allowlist D66; нужен отдельный безопасный путь замены.',
    };
  }

  if (record.routeType === 'client-firestore' || record.routeType === 'client-callable' || record.routeType === 'client-http') {
    return {
      kind: 'manual-review',
      service: null,
      reason: 'Статический разбор нашёл связь, но не доказывает её назначение. Сверить с D66 до изменения поведения.',
    };
  }

  return {
    kind: 'manual-review',
    service: null,
    reason: 'Серверный маршрут требует отдельного анализа: atlas не делает предположений о праве сервера принимать решение.',
  };
}
