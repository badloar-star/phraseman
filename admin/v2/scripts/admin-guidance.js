const ACTION_GUIDANCE = Object.freeze({
  'discard-remote-config-preview': 'Отменить текущий предпросмотр без публикации изменений в рабочем приложении.',
  'preview-remote-config': 'Показать точные изменения Remote Config до публикации; данные приложения пока не изменятся.',
  'publish-remote-config': 'Опубликовать проверенные изменения Remote Config в рабочем приложении и записать действие в журнал.',
  'load-factory-jobs': 'Загрузить последние задания фабрики контента с сервера.',
  'refresh-factory-detail': 'Повторно загрузить выбранное задание и его текущее состояние с сервера.',
  'back-to-factory-jobs': 'Вернуться к списку заданий без изменения выбранного задания.',
  'load-openai-budget': 'Загрузить серверные расходы и лимиты ИИ без запуска платных операций.',
  'load-support': 'Обновить список писем поддержки и подготовленных ответов с сервера.',
  'pull-support': 'Запросить новые письма из Gmail; существующие ответы и статусы не изменятся.',
  'generate-support-reply': 'Сгенерировать черновик ответа для проверки; письмо не будет отправлено.',
  'cancel-support-reply-batch': 'Отменить подготовленный пакет; ещё не начатые письма не будут отправлены.',
  'dispatch-support-reply-batch': 'Подтвердить и отправить запечатанный пакет писем; операция фиксируется и не повторяется автоматически.',
  'cancel-support-reply': 'Отменить подготовленную отправку без отправки письма.',
  'dispatch-support-reply': 'Подтвердить и отправить запечатанный ответ точному получателю через Gmail.',
  'save-support-signature': 'Сохранить подпись, которая будет добавляться сервером к новым ответам поддержки.',
});

const HREF_GUIDANCE = Object.freeze({
  '#daily-briefing': 'Открыть подробный утренний отчёт руководителя.',
  '#report-center': 'Открыть единую очередь жалоб, ошибок и контентных репортов.',
  '#support': 'Открыть почту поддержки и защищённую подготовку ответов.',
  '#content': 'Открыть фабрику языков и управление контентом.',
  '#analytics': 'Открыть подробную продуктовую и подписочную аналитику.',
  '#subscriptions': 'Открыть подписочную аналитику в Admin V2.',
});

export function specificGuidanceForControl(attributes) {
  const action = String(attributes.action ?? '');
  if (action === 'resolve-support-reply') {
    return attributes.resolution === 'accepted'
      ? 'Подтвердить после ручной проверки Gmail, что письмо действительно находится в папке «Отправленные».'
      : 'Подтвердить после ручной проверки Gmail, что письмо не было отправлено и операцию можно подготовить заново.';
  }
  if (action === 'set-support-status') {
    return attributes.status === 'archived'
      ? 'Переместить письмо в архив поддержки; само письмо и история ответа сохранятся.'
      : 'Вернуть письмо из архива в очередь новых обращений.';
  }
  if (ACTION_GUIDANCE[action]) return ACTION_GUIDANCE[action];

  const filter = String(attributes.supportFilter ?? '');
  if (filter) return ({
    new: 'Показать только новые обращения, которые ещё требуют решения.',
    answered: 'Показать обращения, на которые уже подготовлен или отправлен ответ.',
    archived: 'Показать обращения, перемещённые в архив.',
    all: 'Показать обращения всех статусов без фильтра.',
  })[filter] ?? '';

  const factoryStep = String(attributes.factoryStep ?? '');
  if (factoryStep === '2') return 'Перейти к генерации выбранного задания; публикация контента не начнётся.';
  if (factoryStep === '3') return 'Перейти к проверке результата и источников перед публикацией.';

  const href = String(attributes.href ?? '');
  if (HREF_GUIDANCE[href]) return HREF_GUIDANCE[href];
  if (String(attributes.className ?? '').split(/\s+/).includes('asset-preview')) return 'Открыть созданное изображение в полном размере в отдельной вкладке.';
  return '';
}
