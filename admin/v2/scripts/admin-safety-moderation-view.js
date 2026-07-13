const LABELS = Object.freeze({
  overview: 'Сводка',
  'user-reports': 'Жалобы',
  'safety-flags': 'Сигналы',
  'age-consent': 'Возраст и согласие',
  'policy-evidence': 'Политика и доказательства',
  'ban-list': 'Блокировки',
  'other-reports': 'Другие репорты',
});

const ICON = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>';

function dateTime(value) {
  const ms = Number(value || 0);
  return ms ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms)) : '—';
}

function metric(label, value, note = '', tone = '') {
  return `<article class="metric ${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function option(value, current, label) {
  return `<option value="${value}"${String(current || '') === value ? ' selected' : ''}>${label}</option>`;
}

function stateNotice(model, escapeHtml) {
  if (model.state === 'loading') return '<div class="notice section" role="status">Обновляем защищённый серверный снимок. Последние загруженные данные остаются на экране.</div>';
  if (model.state === 'error') return `<div class="notice danger section" role="alert"><strong>Данные не загружены.</strong> ${escapeHtml(model.error || 'Повторите запрос.')}</div>`;
  if (model.state === 'empty') return '<div class="empty-state section"><strong>По выбранным условиям записей нет.</strong><p>Измените фильтры или обновите снимок.</p></div>';
  if (model.state === 'partial') return '<div class="notice warning section"><strong>Снимок неполный.</strong> Один из источников недоступен или достиг безопасного лимита. Неполнота показана явно и не заменяется нулями.</div>';
  return '';
}

function sourceHealth(model, escapeHtml) {
  const sources = Array.isArray(model.workspace?.sources) ? model.workspace.sources : [];
  if (!sources.length) return '';
  return `<div class="safety-source-health section" aria-label="Состояние источников">${sources.map((source) => `<span class="badge ${source.status === 'ready' ? 'success' : source.status === 'partial' ? 'warning' : 'danger'}" title="${escapeHtml(source.reason || 'Источник прочитан полностью')}" data-tooltip="${escapeHtml(source.reason || 'Источник прочитан полностью')}">${escapeHtml(source.name)} · ${escapeHtml(source.status)}</span>`).join('')}</div>`;
}

function filters(model, escapeHtml) {
  if (!['user-reports', 'safety-flags', 'ban-list'].includes(model.view)) return '';
  const status = model.view === 'user-reports'
    ? `<div class="field"><label for="safety-status">Статус</label><select id="safety-status">${option('', model.filters.status, 'Все')}${option('new', model.filters.status, 'Новые')}${option('reviewed', model.filters.status, 'Проверенные')}${option('archived', model.filters.status, 'Архив')}</select></div>`
    : model.view === 'safety-flags'
      ? `<div class="field"><label for="safety-status">Статус</label><select id="safety-status">${option('', model.filters.status, 'Все')}${option('open', model.filters.status, 'Открытые')}${option('handled', model.filters.status, 'Обработанные')}</select></div>`
      : `<div class="field"><label for="safety-sort">Сортировка</label><select id="safety-sort">${option('date_desc', model.filters.sort, 'Сначала новые')}${option('date_asc', model.filters.sort, 'Сначала старые')}${option('name', model.filters.sort, 'По имени')}</select></div>`;
  const category = model.view === 'safety-flags' ? `<div class="field"><label for="safety-category">Категория</label><select id="safety-category">${option('', model.filters.category, 'Все')}${['suicide','self_harm','abuse','violence','sexual_minors','sexual','hate','illicit'].map((value) => option(value, model.filters.category, value)).join('')}</select></div>` : '';
  const reason = model.view === 'user-reports' ? '<div class="field"><label for="safety-reason-filter">Причина</label><input id="safety-reason-filter" value="" placeholder="Точный код причины"></div>' : '';
  return `<section class="card section"><div class="card-body report-filters"><div class="field"><label for="safety-query">Поиск</label><input id="safety-query" type="search" value="${escapeHtml(model.filters.query || '')}" placeholder="UID, имя, причина или ID"></div>${status}${category}${reason}<button class="button primary" data-action="safety-load" type="button" title="Создать новый серверный снимок" data-tooltip="Создать новый серверный снимок">Применить</button>${model.view === 'user-reports' ? '<button class="button" data-action="safety-export" type="button" title="Экспортировать полный отфильтрованный снимок в CSV" data-tooltip="Экспортировать полный отфильтрованный снимок в CSV">CSV</button>' : ''}</div></section>`;
}

function overview(model, escapeHtml) {
  const counts = model.workspace?.summary?.counts || {};
  return `<section class="metrics section">${metric('Жалобы', Number(counts.user_reports || 0), 'user_reports')}${metric('Сигналы безопасности', counts.safety_flags == null ? '—' : Number(counts.safety_flags), counts.safety_flags == null ? 'Нет доступа' : 'safety_flags')}${metric('Записи согласия', counts.user_consents == null ? '—' : Number(counts.user_consents), 'Клиентская телеметрия')}${metric('Глобальные блокировки', Number(counts.banned_users || 0), 'banned_users')}</section><section class="card section"><div class="card-header"><div><h2>Рабочая очередь</h2><p>Все связанные инструменты собраны в одном месте, но права доступа к чувствительным данным остаются раздельными.</p></div></div><div class="card-body safety-overview-links">${Object.entries(LABELS).filter(([id]) => !['overview','other-reports'].includes(id)).map(([id, label]) => `<button class="capability-item" type="button" data-action="safety-set-view" data-safety-view="${id}" title="Открыть ${escapeHtml(label)}" data-tooltip="Открыть ${escapeHtml(label)}"><span><strong>${escapeHtml(label)}</strong><small>Открыть защищённый серверный снимок</small></span>${ICON}</button>`).join('')}</div></section>`;
}

function selection(row, model) {
  const checked = model.selectedIds.includes(row.id) ? ' checked' : '';
  return `<input type="checkbox" data-safety-select="${row.id}" aria-label="Выбрать запись ${row.id}"${checked}>`;
}

function reportRows(model, escapeHtml, can) {
  const rows = model.items || [];
  if (!rows.length) return '';
  return `<section class="card section"><div class="card-header"><div><h2>Жалобы пользователей</h2><p>${Number(model.workspace?.totalMatched || rows.length)} записей в неизменяемом снимке.</p></div><button class="button danger-ghost" data-action="safety-preview-report-bulk" type="button"${model.selectedIds.length ? '' : ' disabled'} title="Архивировать только выбранные записи" data-tooltip="Архивировать только выбранные записи">В архив (${model.selectedIds.length})</button></div><div class="table-wrap"><table><thead><tr><th></th><th>Кого</th><th>Причина</th><th>Статус</th><th>Источник</th><th>Дата</th><th>Действия</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${selection(row, model)}</td><td><button class="table-link" data-user-profile-uid="${escapeHtml(row.reportedUid)}" type="button" title="Открыть профиль" data-tooltip="Открыть профиль"><strong>${escapeHtml(row.reportedName || 'Без имени')}</strong><small class="mono">${escapeHtml(row.reportedUid)}</small></button></td><td>${escapeHtml(row.reason)}</td><td><span class="badge">${escapeHtml(row.status)}</span></td><td>${escapeHtml([row.screen, row.platform, row.appVersion].filter(Boolean).join(' · ') || '—')}</td><td>${dateTime(row.createdAtMs)}</td><td><details><summary>Действия</summary><div class="moderation-actions"><div class="field"><label for="safety-reason-${escapeHtml(row.id)}">Причина действия</label><input id="safety-reason-${escapeHtml(row.id)}" maxlength="500" placeholder="Обязательное основание"></div><div class="actions"><button class="button" data-action="safety-preview-report-status" data-target-id="${escapeHtml(row.id)}" data-status="reviewed" type="button"${can('reports.status.write') ? '' : ' disabled'}>Проверено</button><button class="button" data-action="safety-preview-report-status" data-target-id="${escapeHtml(row.id)}" data-status="archived" type="button"${can('reports.status.write') ? '' : ' disabled'}>Архив</button></div><div class="field"><label for="safety-warning-${escapeHtml(row.id)}">Предупреждение</label><textarea id="safety-warning-${escapeHtml(row.id)}" maxlength="2000" placeholder="Текст предупреждения пользователю"></textarea></div><button class="button" data-action="safety-preview-warning" data-target-id="${escapeHtml(row.id)}" data-uid="${escapeHtml(row.reportedUid)}" data-name="${escapeHtml(row.reportedName)}" type="button"${can('users.moderation.write') ? '' : ' disabled'}>Предупредить</button><div class="field"><label for="safety-rename-${escapeHtml(row.id)}">Новое имя</label><input id="safety-rename-${escapeHtml(row.id)}" maxlength="32" placeholder="Требует второго администратора"></div><button class="button" data-action="safety-preview-rename" data-target-id="${escapeHtml(row.id)}" data-uid="${escapeHtml(row.reportedUid)}" data-name="${escapeHtml(row.reportedName)}" type="button"${can('users.moderation.identity.write') ? '' : ' disabled'}>Переименовать</button><button class="button danger-ghost" data-action="safety-preview-ban" data-target-id="${escapeHtml(row.reportedUid)}" data-report-id="${escapeHtml(row.id)}" data-name="${escapeHtml(row.reportedName)}" type="button"${can('users.moderation.ban.write') ? '' : ' disabled'}>Заблокировать</button></div></details></td></tr>`).join('')}</tbody></table></div></section>`;
}

function flagRows(model, escapeHtml, can) {
  const rows = model.items || [];
  if (!rows.length) return '';
  return `<section class="card section"><div class="card-header"><div><h2>Сигналы безопасности</h2><p>В списке показывается только короткий фрагмент. Полный контекст требует причины и записывается в аудит.</p></div><button class="button" data-action="safety-preview-flags-bulk" type="button"${model.selectedIds.length && can('users.moderation.write') ? '' : ' disabled'}>Обработать (${model.selectedIds.length})</button></div><div class="table-wrap"><table><thead><tr><th></th><th>Пользователь</th><th>Категория</th><th>Фрагмент</th><th>Состояние</th><th>Дата</th><th>Действия</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${selection(row, model)}</td><td><button class="table-link mono" data-user-profile-uid="${escapeHtml(row.uid)}" type="button">${escapeHtml(row.uid)}</button></td><td><span class="badge warning">${escapeHtml(row.category)}</span></td><td class="safety-preview-text">${escapeHtml(row.textPreview || '—')}</td><td>${row.handled ? '<span class="badge success">Обработан</span>' : '<span class="badge warning">Открыт</span>'}</td><td>${dateTime(row.createdAtMs)}</td><td><details><summary>Проверить</summary><div class="moderation-actions"><div class="field"><label for="safety-sensitive-reason-${escapeHtml(row.id)}">Зачем нужен полный контекст</label><input id="safety-sensitive-reason-${escapeHtml(row.id)}" maxlength="500" placeholder="Обязательная причина аудита"></div><button class="button" data-action="safety-sensitive-detail" data-target-id="${escapeHtml(row.id)}" type="button"${can('users.moderation.sensitive.read') ? '' : ' disabled'}>Открыть контекст</button><div class="field"><label for="safety-disposition-${escapeHtml(row.id)}">Решение</label><input id="safety-disposition-${escapeHtml(row.id)}" maxlength="80" placeholder="reviewed, escalated, false_positive"></div><div class="field"><label for="safety-note-${escapeHtml(row.id)}">Служебная заметка</label><textarea id="safety-note-${escapeHtml(row.id)}" maxlength="1000"></textarea></div><div class="field"><label for="safety-reason-${escapeHtml(row.id)}">Основание изменения</label><input id="safety-reason-${escapeHtml(row.id)}" maxlength="500"></div><button class="button primary" data-action="safety-preview-flag" data-target-id="${escapeHtml(row.id)}" type="button"${can('users.moderation.write') ? '' : ' disabled'}>Подготовить решение</button></div></details></td></tr>`).join('')}</tbody></table></div></section>`;
}

function sensitiveDetail(model, escapeHtml) {
  const detail = model.sensitive;
  if (!detail) return '';
  return `<section class="card section safety-sensitive-detail"><div class="card-header"><div><h2>Чувствительный контекст</h2><p>Доступ записан в журнал аудита: ${escapeHtml(detail.auditId || '—')}.</p></div><button class="button" data-action="safety-close-sensitive" type="button">Закрыть</button></div><div class="card-body"><p class="sensitive-message">${escapeHtml(detail.userText || 'Текст отсутствует')}</p>${Array.isArray(detail.conversation) && detail.conversation.length ? `<div class="conversation-list">${detail.conversation.map((entry) => `<article><strong>${escapeHtml(entry.role || 'unknown')}</strong><p>${escapeHtml(entry.text || '')}</p></article>`).join('')}</div>` : ''}</div></section>`;
}

function evidence(model, escapeHtml) {
  const summary = model.workspace?.summary || {};
  const legal = model.view === 'policy-evidence';
  const groups = legal
    ? [['Возрастные группы', summary.ageBrackets], ['Согласие на аналитику', summary.analyticsConsent], ['Принятие документов', summary.legalAcceptance], ['Платформы', summary.platforms]]
    : [['Возрастные группы', summary.ageBrackets], ['Согласие на аналитику', summary.analyticsConsent], ['Принятие документов', summary.legalAcceptance]];
  return `<div class="notice warning section"><strong>Клиентская телеметрия, не юридический реестр.</strong> Данные отражают наблюдаемые поля старого клиента и могут быть неполными.</div>${legal ? '<div class="notice section"><strong>Не является юридическим заключением.</strong> Экран показывает наличие или отсутствие доказательств, но не определяет юрисдикцию и не делает вывод о соответствии закону.</div>' : ''}<section class="metrics section">${metric('Всего записей', Number(summary.total || 0), summary.sourceKind || '—')}${metric('Устаревшие', Number(summary.stale || 0), 'старше контрольного окна', summary.stale ? 'warning' : '')}${metric('Неопределённые', Number(summary.invalid || 0), 'неполные клиентские поля', summary.invalid ? 'warning' : '')}${metric('Расхождение политики и runtime', summary.policyRuntimeMismatch ? 'Есть' : 'Нет', 'проверяется без юридического вывода', summary.policyRuntimeMismatch ? 'warning' : 'success')}</section><div class="columns section">${groups.map(([label, values]) => `<section class="card"><div class="card-header"><h2>${label}</h2></div><div class="card-body key-value-list">${Object.entries(values || {}).map(([key, value]) => `<div><span>${escapeHtml(key)}</span><strong>${Number(value || 0)}</strong></div>`).join('') || '<p>Нет данных</p>'}</div></section>`).join('')}</div>${legal ? `<section class="card section"><div class="card-header"><div><h2>Недостающие доказательства</h2><p>Это список пробелов в данных, а не обвинение и не правовая оценка.</p></div></div><div class="card-body"><ul>${(summary.missingEvidence || []).map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join('') || '<li>Список не получен</li>'}</ul><span class="visually-hidden">missingEvidence</span></div></section>` : ''}`;
}

function banRows(model, escapeHtml, can) {
  const rows = model.items || [];
  const manual = can('users.moderation.ban.write') ? `<section class="card section"><div class="card-header"><div><h2>Заблокировать по UID</h2><p>Операция требует preview и подтверждения второго администратора. Независимая блокировка чата не меняется.</p></div></div><div class="card-body report-filters"><div class="field"><label for="safety-manual-ban-uid">Канонический UID</label><input id="safety-manual-ban-uid" value="${escapeHtml(model.manualBanUid || '')}" autocomplete="off"></div><div class="field"><label for="safety-manual-ban-name">Имя для аудита</label><input id="safety-manual-ban-name" maxlength="160"></div><div class="field"><label for="safety-manual-ban-reason">Причина</label><input id="safety-manual-ban-reason" maxlength="500"></div><button class="button danger-ghost" data-action="safety-preview-manual-ban" type="button">Подготовить блокировку</button></div></section>` : '';
  if (!rows.length) return manual;
  return `${manual}<section class="card section"><div class="card-header"><div><h2>Глобальные блокировки</h2><p><code>banned_users</code> — источник истины; остальные поля показаны как проверяемые проекции.</p></div></div><div class="table-wrap"><table><thead><tr><th>Пользователь</th><th>Причина</th><th>Проекции</th><th>Дата</th><th>Действие</th></tr></thead><tbody>${rows.map((row) => `<tr><td><button class="table-link" data-user-profile-uid="${escapeHtml(row.uid)}" type="button"><strong>${escapeHtml(row.name || 'Без имени')}</strong><small class="mono">${escapeHtml(row.uid)}</small></button></td><td>${escapeHtml(row.reason || '—')}</td><td><span class="badge ${row.consistency === 'consistent' ? 'success' : 'warning'}">${escapeHtml(row.consistency)}</span><small>users.banned: ${String(row.usersBanned)} · leaderboard: ${String(row.leaderboardPresent)} · chat: ${String(row.chatRestricted)}</small></td><td>${dateTime(row.bannedAtMs)}</td><td><div class="field compact"><label for="safety-reason-${escapeHtml(row.uid)}">Основание</label><input id="safety-reason-${escapeHtml(row.uid)}" maxlength="500"></div><button class="button" data-action="safety-preview-unban" data-target-id="${escapeHtml(row.uid)}" data-name="${escapeHtml(row.name)}" type="button"${can('users.moderation.ban.write') ? '' : ' disabled'}>Разблокировать</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

function otherReports(model, escapeHtml) {
  const delegated = model.workspace?.summary?.delegatedRoute || 'report-center';
  return `<section class="card section"><div class="card-header"><div><h2>Другие репорты</h2><p>Ошибки приложения, контентные репорты и ответы пользователям остаются в существующем Центре репортов без дублирования логики.</p></div><span class="badge success">delegatedRoute: ${escapeHtml(delegated)}</span></div><div class="card-body"><a class="button primary" href="#report-center" title="Открыть действующий Центр репортов" data-tooltip="Открыть действующий Центр репортов">Открыть Центр репортов</a></div></section>`;
}

function previewCard(model, escapeHtml) {
  const preview = model.preview;
  if (!preview) return '';
  return `<section class="card section moderation-preview"><div class="card-header"><div><h2>Предпросмотр изменения</h2><p>${escapeHtml(preview.action)} · ${escapeHtml(preview.targetId)}</p></div><span class="badge ${preview.irreversible ? 'danger' : preview.requiresApproval ? 'warning' : 'success'}">${preview.irreversible ? 'Необратимо' : preview.requiresApproval ? 'Нужен второй администратор' : 'Можно применить'}</span></div><div class="card-body"><dl><dt>Риск</dt><dd>${escapeHtml(preview.risk || '—')}</dd><dt>Откат</dt><dd>${escapeHtml(preview.rollbackPath || '—')}</dd><dt>Истекает</dt><dd>${dateTime(preview.expiresAtMs)}</dd></dl><span class="visually-hidden">requiresApproval rollbackPath irreversible</span>${preview.requiresApproval ? `<div class="actions"><button class="button" data-action="safety-request-approval" type="button">Запросить подтверждение</button><div class="field"><label for="safety-approval-id">ID подтверждения второго администратора</label><input id="safety-approval-id" value="${escapeHtml(model.approvalId || '')}" autocomplete="off"></div><div class="field"><label for="safety-approval-reason">Основание подтверждения</label><input id="safety-approval-reason" maxlength="500"></div><button class="button" data-action="safety-approve" type="button">Подтвердить как второй администратор</button></div>` : ''}<div class="field"><label for="safety-confirmation">Точное подтверждение</label><input id="safety-confirmation" placeholder="${escapeHtml(preview.confirmation || '')}" autocomplete="off"></div><div class="actions end"><button class="button" data-action="safety-discard-preview" type="button">Отмена</button><button class="button primary" data-action="safety-apply-preview" type="button">Применить</button></div></div></section>`;
}

export function renderSafetyModerationCenter(model, { escapeHtml, can }) {
  const canView = (id) => id === 'other-reports' ? can('reports.read')
    : ['age-consent', 'policy-evidence'].includes(id) ? can('users.moderation.aggregate.read')
      : ['safety-flags', 'ban-list'].includes(id) ? can('users.moderation.safety.read')
        : can('users.moderation.read');
  const visibleViews = Object.entries(LABELS).filter(([id]) => canView(id));
  const tabs = visibleViews.map(([id, label]) => `<button class="${model.view === id ? 'active' : ''}" data-action="safety-set-view" data-safety-view="${id}" type="button" aria-pressed="${model.view === id}" title="Открыть ${escapeHtml(label)}" data-tooltip="Открыть ${escapeHtml(label)}">${escapeHtml(label)}</button>`).join('');
  const mobile = visibleViews.map(([id, label]) => option(id, model.view, label)).join('');
  let content = '';
  if (model.view === 'overview') content = overview(model, escapeHtml);
  else if (model.view === 'user-reports') content = reportRows(model, escapeHtml, can);
  else if (model.view === 'safety-flags') content = `${sensitiveDetail(model, escapeHtml)}${flagRows(model, escapeHtml, can)}`;
  else if (model.view === 'age-consent' || model.view === 'policy-evidence') content = evidence(model, escapeHtml);
  else if (model.view === 'ban-list') content = banRows(model, escapeHtml, can);
  else content = otherReports(model, escapeHtml);
  return `<header class="page-header"><div><div class="eyebrow">Пользователи / Контроль рисков</div><h1>${ICON} Безопасность и модерация</h1><p>Жалобы, чувствительные сигналы, доказательства согласия и блокировки с единым аудитом действий.</p></div><div class="page-actions"><a class="button" href="#users">Пользователи</a><button class="button primary" data-action="safety-load" type="button" title="Обновить текущий серверный снимок" data-tooltip="Обновить текущий серверный снимок">Обновить</button></div></header><nav class="safety-moderation-tabs section" aria-label="Раздел центра безопасности">${tabs}</nav><div class="field safety-moderation-mobile-view section"><label for="safety-mobile-view">Раздел центра безопасности</label><select id="safety-mobile-view" data-safety-mobile-view>${mobile}</select></div>${stateNotice(model, escapeHtml)}${sourceHealth(model, escapeHtml)}${filters(model, escapeHtml)}${content}${model.nextCursor ? '<div class="actions end section"><button class="button" data-action="safety-next" type="button">Показать ещё</button></div>' : ''}${previewCard(model, escapeHtml)}`;
}
