const LABELS = Object.freeze({
  overview: 'Сводка',
  'app-health': 'Состояние приложения',
  archive: 'Архив',
  'changelog-0608': 'Архив аудита 8 июня',
});

const DIAGNOSTICS_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 15h4l2-7 4 10 2-6h4"/><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function dateTime(value) {
  const milliseconds = Number(value || 0);
  if (!milliseconds) return '—';
  try { return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(milliseconds)); }
  catch { return '—'; }
}

function option(value, selected, label) {
  return `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`;
}

function flattenDetail(value, prefix = '', rows = [], depth = 0, maxRows = 64) {
  if (rows.length >= maxRows) return rows;
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) {
    rows.push([prefix || 'value', value]);
    return rows;
  }
  if (depth >= 3 || typeof value !== 'object') return rows;
  const entries = Array.isArray(value)
    ? value.slice(0, 12).map((item, index) => [String(index), item])
    : Object.entries(value).slice(0, 32);
  for (const [key, nested] of entries) {
    if (rows.length >= maxRows) break;
    flattenDetail(nested, prefix ? `${prefix}.${key}` : key, rows, depth + 1, maxRows);
  }
  return rows;
}

function detailGrid(detail, escapeHtml, maxRows) {
  return flattenDetail(detail, '', [], 0, maxRows)
    .map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value ?? '—')}</dd></div>`)
    .join('');
}

function detailStateNotice(detail, options, escapeHtml) {
  const state = String(detail?.state || '');
  if (!['error', 'empty'].includes(state)) return '';
  const isError = state === 'error';
  const message = isError
    ? String(detail?.error || detail?.message || options.errorMessage)
    : options.emptyMessage;
  return `<section class="card section diagnostics-detail" data-diagnostics-detail-state="${state}" aria-live="polite"><div class="card-header"><div><h2>${options.title}</h2><p>${options.description}</p></div>${options.closeButton}</div><div class="card-body"><div class="notice${isError ? ' danger' : ''}" role="${isError ? 'alert' : 'status'}">${escapeHtml(message)}</div></div></section>`;
}

function sourceHealth(sources, escapeHtml) {
  const rows = asArray(sources);
  if (!rows.length) return '';
  return `<div class="diagnostics-source-health" aria-label="Состояние источников">${rows.map((source) => {
    const status = String(source.status || source.state || 'ready');
    const label = status === 'error' ? 'Ошибка' : status === 'partial' ? 'Частично' : status === 'truncated' ? 'Ограничено' : 'Готово';
    const details = String(source.message || source.error || source.reason || 'Серверный источник ответил без дополнительных замечаний.');
    return `<span class="badge ${status === 'error' ? 'danger' : status === 'ready' ? 'success' : 'warning'}" data-tooltip="${escapeHtml(details)}" tabindex="0">${escapeHtml(source.source || source.id || 'Источник')} · ${label}</span>`;
  }).join('')}</div>`;
}

function stateNotice(state, error, escapeHtml) {
  if (state === 'loading') return '<div class="notice diagnostics-state" role="status" data-state="loading">Загружаем защищённый серверный снимок…</div>';
  if (state === 'empty') return '<div class="notice diagnostics-state" role="status" data-state="empty">По выбранным условиям записей нет.</div>';
  if (state === 'partial') return '<div class="notice warning diagnostics-state" role="status" data-state="partial"><strong>Выборка ограничена.</strong> Один или несколько источников вернули только часть данных; итог нельзя считать полным.</div>';
  if (state === 'truncated') return '<div class="notice warning diagnostics-state" role="status" data-state="truncated"><strong>Достигнут серверный лимит.</strong> Используйте следующую страницу или сузьте фильтры.</div>';
  if (state === 'error') return `<div class="notice danger diagnostics-state" role="alert" data-state="error">${escapeHtml(error || 'Серверный снимок недоступен.')}</div>`;
  if (state === 'ready') return '<span class="visually-hidden" data-state="ready">Данные готовы</span>';
  return '';
}

function metric(label, value, hint = '') {
  return `<article class="metric"><span>${label}</span><strong>${value ?? '—'}</strong>${hint ? `<small>${hint}</small>` : ''}</article>`;
}

function appHealthMetrics(model, escapeHtml) {
  const kpis = model.appHealth.kpis || {};
  const overall = kpis.status || kpis.overallStatus || kpis.health || '—';
  const topRepeat = kpis.topRepeat ?? kpis.topRepeatCount ?? kpis.maxRepeatCount ?? '—';
  return `<section class="metrics diagnostics-kpis section" aria-label="Ключевые показатели">${[
    metric('Status', escapeHtml(overall), kpis.conclusive === false ? 'GREEN / YELLOW / RED · итог неполный' : 'GREEN / YELLOW / RED'),
    metric('Critical', Number(kpis.critical ?? kpis.criticalCount ?? 0), 'критические группы'),
    metric('Warnings', Number(kpis.warnings ?? kpis.warningCount ?? 0), 'предупреждения'),
    metric('Affected users', Number(kpis.affectedUsers ?? kpis.affectedUserCount ?? 0), 'уникальные пользователи'),
    metric('Top repeat', escapeHtml(topRepeat), 'максимум повторов'),
  ].join('')}</section>`;
}

function appHealthFilters(model, escapeHtml) {
  const filters = model.filters || {};
  return `<section class="card section"><div class="card-header"><div><h2>Фильтры событий</h2><p>Сервер применяет закрытые значения, ограничивает размер страницы и не раскрывает личность без права на просмотр пользователей.</p></div></div><div class="card-body diagnostics-filters">
    <div class="field"><label for="diagnostics-period">Период</label><select id="diagnostics-period"><option value="1"${Number(filters.periodHours) === 1 ? ' selected' : ''}>Последний час</option><option value="6"${Number(filters.periodHours) === 6 ? ' selected' : ''}>Последние 6 часов</option><option value="24"${Number(filters.periodHours) === 24 ? ' selected' : ''}>Последние 24 часа</option><option value="168"${Number(filters.periodHours) === 168 ? ' selected' : ''}>Последние 7 дней</option></select></div>
    <div class="field"><label for="diagnostics-severity">Важность</label><select id="diagnostics-severity">${option('all', filters.severity, 'Все')}${option('info', filters.severity, 'Информация')}${option('critical', filters.severity, 'Критическая')}${option('warning', filters.severity, 'Предупреждение')}</select></div>
    <div class="field"><label for="diagnostics-status">Статус</label><select id="diagnostics-status">${option('all', filters.status, 'Все')}${option('new', filters.status, 'Новый')}${option('open', filters.status, 'Открыт')}${option('reviewed', filters.status, 'Проверен')}${option('fixed', filters.status, 'Исправлен')}${option('known', filters.status, 'Известная проблема')}</select></div>
    <div class="field"><label for="diagnostics-feature">Функция</label><input id="diagnostics-feature" value="${escapeHtml(filters.feature || '')}" maxlength="80" placeholder="Например: lessons"></div>
    <div class="field diagnostics-query-field"><label for="diagnostics-query">Поиск</label><input id="diagnostics-query" value="${escapeHtml(filters.query || '')}" maxlength="120" placeholder="Контекст, сообщение или идентификатор"></div>
    <div class="diagnostics-filter-actions"><button class="button primary" data-action="diagnostics-load-app-health" type="button" title="Обновить ограниченный серверный снимок" data-tooltip="Обновить ограниченный серверный снимок">Применить</button><button class="button" data-action="diagnostics-export-app-health" type="button" title="Скачать серверную проекцию без скрытых полей" data-tooltip="Скачать серверную проекцию без скрытых полей">Скачать JSON</button><button class="button" data-action="diagnostics-copy-app-health-ai" type="button" title="Скопировать безопасный текстовый отчёт для анализа" data-tooltip="Скопировать безопасный текстовый отчёт для анализа">Копировать для ИИ</button><button class="button" data-action="diagnostics-copy-app-health-json" type="button" title="Скопировать безопасную JSON-проекцию" data-tooltip="Скопировать безопасную JSON-проекцию">Копировать JSON</button></div>
  </div></section>`;
}

function statusActions(row, escapeHtml, canWrite) {
  const reportId = String(row.reportId || row.id || '');
  const current = String(row.status || 'open');
  if (!reportId) return '';
  const transitions = {
    new: ['reviewed', 'fixed', 'known'],
    open: ['reviewed', 'fixed', 'known'],
    reviewed: ['fixed', 'known'],
    known: ['fixed'],
    fixed: [],
  };
  const allowed = transitions[current] || [];
  const reviewedDisabled = canWrite && allowed.includes('reviewed') ? '' : ' disabled';
  const fixedDisabled = canWrite && allowed.includes('fixed') ? '' : ' disabled';
  const knownDisabled = canWrite && allowed.includes('known') ? '' : ' disabled';
  return `<details class="diagnostics-status-actions"><summary>Изменить статус</summary><div class="field"><label for="diagnostics-status-reason-${escapeHtml(reportId)}">Причина</label><input id="diagnostics-status-reason-${escapeHtml(reportId)}" maxlength="500" autocomplete="off" placeholder="Что проверено и почему меняется статус"></div><div class="actions"><button class="button small" data-action="diagnostics-update-status" data-report-id="${escapeHtml(reportId)}" data-expected-status="${escapeHtml(current)}" data-next-status="reviewed" type="button" title="Пометить событие как проверенное" data-tooltip="Пометить событие как проверенное"${reviewedDisabled}>Проверен</button><button class="button small" data-action="diagnostics-update-status" data-report-id="${escapeHtml(reportId)}" data-expected-status="${escapeHtml(current)}" data-next-status="fixed" type="button" title="Пометить событие как исправленное" data-tooltip="Пометить событие как исправленное"${fixedDisabled}>Исправлен</button><button class="button small" data-action="diagnostics-update-status" data-report-id="${escapeHtml(reportId)}" data-expected-status="${escapeHtml(current)}" data-next-status="known" type="button" title="Пометить событие как известную проблему" data-tooltip="Пометить событие как известную проблему"${knownDisabled}>Известная проблема</button></div></details>`;
}

function appHealthRows(model, escapeHtml, canWrite) {
  const rows = asArray(model.appHealth.items);
  if (!rows.length) return '';
  return `<section class="card section"><div class="card-header"><div><h2>Сгруппированные события</h2><p>Группировка выполняется сервером по fingerprint или context; детали загружаются только по запросу.</p></div><span class="badge">${rows.length}</span></div><div class="table-wrap"><table class="diagnostics-table"><thead><tr><th>Событие</th><th>Важность</th><th>Статус</th><th>Повторы</th><th>Пользователи</th><th>Последнее</th><th>Действия</th></tr></thead><tbody>${rows.map((row) => {
    const reportId = String(row.reportId || row.id || '');
    return `<tr><td data-label="Событие"><strong>${escapeHtml(row.context || row.fingerprint || row.feature || 'Без контекста')}</strong><small>${escapeHtml(row.message || row.title || '')}</small></td><td data-label="Важность"><span class="badge ${row.severity === 'critical' ? 'danger' : row.severity === 'warning' ? 'warning' : ''}">${escapeHtml(row.severity || 'info')}</span></td><td data-label="Статус">${escapeHtml(row.status || 'open')}</td><td data-label="Повторы">${Number(row.repeatCount ?? row.count ?? 1)}</td><td data-label="Пользователи">${Number(row.affectedUsers ?? row.affectedUserCount ?? 0)}</td><td data-label="Последнее">${dateTime(row.lastSeenAtMs || row.createdAtMs)}</td><td data-label="Действия"><button class="button small" data-action="diagnostics-app-health-detail" data-report-id="${escapeHtml(reportId)}" type="button" title="Открыть ограниченную серверную деталь"${reportId ? '' : ' disabled'} data-tooltip="Открыть ограниченную серверную деталь">Детали</button>${statusActions(row, escapeHtml, canWrite)}</td></tr>`;
  }).join('')}</tbody></table></div></section>`;
}

function appHealthDetail(model, escapeHtml) {
  const detail = model.appHealth.detail;
  if (!detail) return '';
  const stateNotice = detailStateNotice(detail, {
    title: 'Деталь события',
    description: 'Серверная проекция с ограниченными полями.',
    closeButton: '<button class="button" data-action="diagnostics-close-app-health-detail" type="button" title="Закрыть деталь события" data-tooltip="Закрыть деталь события">Закрыть</button>',
    emptyMessage: 'Запись события не найдена или больше недоступна.',
    errorMessage: 'Не удалось загрузить деталь события.',
  }, escapeHtml);
  if (stateNotice) return stateNotice;
  const safe = detail.item || detail.detail || detail;
  return `<section class="card section diagnostics-detail" aria-live="polite"><div class="card-header"><div><h2>Деталь события</h2><p>Серверная проекция с ограниченными полями.</p></div><button class="button" data-action="diagnostics-close-app-health-detail" type="button" title="Закрыть деталь события" data-tooltip="Закрыть деталь события">Закрыть</button></div><div class="card-body"><dl class="diagnostics-detail-grid">${detailGrid(safe, escapeHtml, 48)}</dl></div></section>`;
}

function activityRows(model, escapeHtml) {
  const activity = model.activity || {};
  const rows = asArray(activity.items);
  const content = activity.state === 'idle'
    ? '<p class="hint">Активность загружается отдельно, чтобы не расходовать чтения без необходимости.</p>'
    : activity.state === 'loading'
      ? '<div class="notice" role="status">Загружаем активность…</div>'
      : activity.state === 'error'
        ? `<div class="notice danger" role="alert">${escapeHtml(activity.error || 'Активность недоступна.')}</div>`
        : rows.length
          ? `<div class="diagnostics-activity-list">${rows.map((row) => `<article><div><strong>${escapeHtml(row.action || row.type || row.context || 'Событие')}</strong><small>${escapeHtml(row.message || row.feature || '')}</small></div><time>${dateTime(row.createdAtMs || row.timestampMs)}</time></article>`).join('')}</div>`
          : '<p class="hint">За выбранный период активности нет.</p>';
  return `<section class="card section"><div class="card-header"><div><h2>Недавняя активность</h2><p>Ленивая серверная выборка, независимая от списка ошибок.</p></div><button class="button" data-action="diagnostics-load-activity" type="button" title="Загрузить активность по текущему периоду" data-tooltip="Загрузить активность по текущему периоду">Загрузить</button></div><div class="card-body">${sourceHealth(activity.sourceHealth, escapeHtml)}${content}${activity.nextCursor ? '<div class="actions end"><button class="button" data-action="diagnostics-next-activity" type="button" title="Загрузить следующую страницу активности" data-tooltip="Загрузить следующую страницу активности">Показать ещё</button></div>' : ''}</div></section>`;
}

function renderAppHealth(model, escapeHtml, can) {
  const canWrite = can('diagnostics.status.write');
  return `${stateNotice(model.state, model.error, escapeHtml)}${sourceHealth(model.appHealth.sourceHealth, escapeHtml)}${appHealthMetrics(model, escapeHtml)}${appHealthFilters(model, escapeHtml)}${appHealthDetail(model, escapeHtml)}${appHealthRows(model, escapeHtml, canWrite)}${model.appHealth.nextCursor ? '<div class="actions end section"><button class="button" data-action="diagnostics-next-app-health" type="button" title="Загрузить следующую страницу событий" data-tooltip="Загрузить следующую страницу событий">Показать ещё</button></div>' : ''}${activityRows(model, escapeHtml)}`;
}

function archiveFilters(model) {
  return `<section class="card section"><div class="card-header"><div><h2>Закрытые отчёты</h2><p>Только архивные и завершённые статусы, отсортированные от новых к старым.</p></div></div><div class="card-body diagnostics-filters diagnostics-archive-filters"><div class="field"><label for="diagnostics-archive-type">Тип</label><select id="diagnostics-archive-type"><option value="all"${model.archive.type === 'all' ? ' selected' : ''}>Все</option><option value="user"${model.archive.type === 'user' ? ' selected' : ''}>Жалобы пользователей</option><option value="error"${model.archive.type === 'error' ? ' selected' : ''}>Отчёты об ошибках</option></select></div><button class="button primary" data-action="diagnostics-load-archive" type="button" title="Обновить ограниченный архивный снимок" data-tooltip="Обновить ограниченный архивный снимок">Применить</button></div></section>`;
}

function archiveDetail(model, escapeHtml) {
  const detail = model.archive.detail;
  if (!detail) return '';
  const stateNotice = detailStateNotice(detail, {
    title: 'Архивная запись',
    description: 'Личность скрыта, если у роли нет права users.read.',
    closeButton: '<button class="button" data-action="diagnostics-close-archive-detail" type="button" title="Закрыть архивную запись" data-tooltip="Закрыть архивную запись">Закрыть</button>',
    emptyMessage: 'Архивная запись не найдена или больше недоступна.',
    errorMessage: 'Не удалось загрузить архивную запись.',
  }, escapeHtml);
  if (stateNotice) return stateNotice;
  const safe = detail.item || detail.detail || detail;
  return `<section id="archive-detail" class="card section diagnostics-detail" aria-live="polite"><div class="card-header"><div><h2>Архивная запись</h2><p>Личность скрыта, если у роли нет права users.read.</p></div><button class="button" data-action="diagnostics-close-archive-detail" type="button" title="Закрыть архивную запись" data-tooltip="Закрыть архивную запись">Закрыть</button></div><div class="card-body"><dl class="diagnostics-detail-grid">${detailGrid(safe, escapeHtml, 64)}</dl></div></section>`;
}

function archiveRows(model, escapeHtml) {
  const rows = asArray(model.archive.items);
  if (!rows.length) return '';
  return `<section class="card section"><div class="card-header"><div><h2>Архив</h2><p>Содержимое деталей ограничено серверным списком разрешённых полей.</p></div><span class="badge">${rows.length}</span></div><div class="table-wrap"><table class="diagnostics-table"><thead><tr><th>Тип</th><th>Причина или категория</th><th>Статус</th><th>Дата</th><th>Действие</th></tr></thead><tbody>${rows.map((row) => {
    const reportId = String(row.reportId || row.id || '');
    const source = String(row.source || row.sourceType || '');
    const type = row.type === 'user' || source === 'user_reports' ? 'user' : row.type === 'error' || source === 'error_reports' ? 'error' : '';
    return `<tr><td data-label="Тип">${escapeHtml(type || source || '—')}</td><td data-label="Причина или категория"><strong>${escapeHtml(row.reason || row.category || row.title || '—')}</strong><small>${escapeHtml(row.comment || row.message || '')}</small></td><td data-label="Статус"><span class="badge success">${escapeHtml(row.status || 'archived')}</span></td><td data-label="Дата">${dateTime(row.createdAtMs || row.updatedAtMs)}</td><td data-label="Действие"><button class="button small" data-action="diagnostics-archive-detail" data-type="${escapeHtml(type)}" data-report-id="${escapeHtml(reportId)}" type="button" title="Открыть ограниченную архивную деталь"${type && reportId ? '' : ' disabled'} data-tooltip="Открыть ограниченную архивную деталь">Детали</button></td></tr>`;
  }).join('')}</tbody></table></div></section>`;
}

function renderArchive(model, escapeHtml) {
  return `${stateNotice(model.state, model.error, escapeHtml)}${sourceHealth(model.archive.sourceHealth, escapeHtml)}${archiveFilters(model)}${archiveDetail(model, escapeHtml)}${archiveRows(model, escapeHtml)}${model.archive.nextCursor ? '<div class="actions end section"><button class="button" data-action="diagnostics-next-archive" type="button" title="Загрузить следующую страницу архива" data-tooltip="Загрузить следующую страницу архива">Показать ещё</button></div>' : ''}`;
}

function renderChangelogArchive() {
  return `<div class="notice section"><strong>Статический снимок.</strong> Архив 8 июня извлечён из старой админки, зафиксирован хешем и открыт без скриптов и доступа к Firebase.</div><section class="card section"><div class="card-header"><div><h2>Архив аудита 8 июня 2026</h2><p>Изолированное содержимое только для чтения.</p></div><span class="badge success">Статический архив</span></div><iframe class="diagnostics-archive-frame" title="Архив аудита 8 июня 2026" src="data/changelog-0608.html" sandbox="" loading="lazy" referrerpolicy="no-referrer"></iframe></section>`;
}

function navigation(model, escapeHtml) {
  const tabs = Object.entries(LABELS).map(([id, label]) => `<button class="${model.view === id ? 'active' : ''}" data-action="diagnostics-set-view" data-diagnostics-view="${id}" type="button" aria-pressed="${model.view === id}" title="Открыть ${escapeHtml(label)}" data-tooltip="Открыть ${escapeHtml(label)}">${escapeHtml(label)}</button>`).join('');
  const mobile = Object.entries(LABELS).map(([id, label]) => option(id, model.view, label)).join('');
  return `<nav class="diagnostics-tabs section" aria-label="Раздел диагностики">${tabs}</nav><div class="field diagnostics-mobile-view section"><label for="diagnostics-mobile-view">Раздел диагностики</label><select id="diagnostics-mobile-view" data-diagnostics-mobile-view>${mobile}</select></div>`;
}

export function renderDiagnosticsWorkspace(model, { escapeHtml, can, pageHeader = '', overview = '' }) {
  let content = overview;
  if (!can('diagnostics.read')) {
    content = '<div class="notice danger section" role="alert" data-diagnostics-no-read>Недостаточно прав для просмотра диагностики. Обратитесь к администратору ролей.</div>';
  } else if (model.view === 'app-health') content = renderAppHealth(model, escapeHtml, can);
  else if (model.view === 'archive') content = renderArchive(model, escapeHtml);
  else if (model.view === 'changelog-0608') content = renderChangelogArchive();
  return `<div class="diagnostics-workspace" data-view="${escapeHtml(model.view)}">${pageHeader || `<header class="page-header"><div><h1>${DIAGNOSTICS_ICON} Диагностика</h1></div></header>`}${navigation(model, escapeHtml)}${content}</div>`;
}
