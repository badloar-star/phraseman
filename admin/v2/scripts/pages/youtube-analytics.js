(function youtubeAnalyticsModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AdminYoutubeAnalytics = api;
})(typeof globalThis === 'object' ? globalThis : this, function createYoutubeAnalyticsModule() {
  'use strict';

  const SORT_KEYS = new Set([
    'title', 'videoSelects', 'playbackStarts', 'anonymousInstances', 'activeWatchMs',
    'averageActiveWatchMs', 'p50ActiveWatchMs', 'p90ActiveWatchMs', 'completed25',
    'completed50', 'completed75', 'completed95', 'externalVideoOpens',
  ]);

  const state = {
    status: 'idle',
    lastSnapshot: null,
    error: '',
    filters: { rangeDays: 28, platform: 'all', channelId: '', videoId: '' },
    sort: { key: 'playbackStarts', direction: 'desc' },
    access: { authorized: false, canRead: false },
    requestId: 0,
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  function finiteNumber(value, field, nullable = false) {
    if (nullable && value == null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`invalid_${field}`);
    return value;
  }

  function validateSnapshot(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_snapshot');
    if (!input.summary || typeof input.summary !== 'object' || !input.quality || typeof input.quality !== 'object') throw new Error('invalid_snapshot');
    if (!Array.isArray(input.trend) || !Array.isArray(input.funnel) || !Array.isArray(input.videos)) throw new Error('invalid_snapshot');
    if (!['ready', 'empty', 'partial'].includes(String(input.quality.state))) throw new Error('invalid_quality_state');
    if (!input.window || !Number.isSafeInteger(input.window.fromMicros) || !Number.isSafeInteger(input.window.toMicros)) throw new Error('invalid_window');
    if (!input.filters || ![7, 28, 90].includes(input.filters.rangeDays) || !['all', 'ios', 'android'].includes(input.filters.platform)) throw new Error('invalid_filters');
    if (input.dataThroughMicros != null && !Number.isSafeInteger(input.dataThroughMicros)) throw new Error('invalid_data_freshness');

    const qualityCountFields = [
      'totalEvents', 'acceptedEvents', 'missingRequiredFields', 'duplicates', 'unknownSchema',
      'duplicateParameterKeys', 'rowsWithoutStart', 'conflictingVideo', 'conflictingChannel',
      'duplicateStartAttempts', 'invalidDurationAttempts', 'unfinishedAttempts', 'videoRowsReturned',
    ];
    qualityCountFields.forEach((field) => finiteNumber(input.quality[field], `quality_${field}`));
    const validationRatio = finiteNumber(input.quality.validationRatio, 'quality_validationRatio');
    if (validationRatio > 1 || typeof input.quality.videosTruncated !== 'boolean') throw new Error('invalid_quality');

    const summaryFields = [
      'homeClicks', 'catalogOpens', 'videoSelects', 'playerReady', 'playbackStarts',
      'anonymousInstancesWithValidStart', 'watchAttempts', 'totalActiveWatchMs',
      'completed25', 'completed50', 'completed75', 'completed95',
      'externalVideoOpens', 'channelOpens',
    ];
    summaryFields.forEach((field) => finiteNumber(input.summary[field], `summary_${field}`));
    ['averageActiveWatchMs', 'p50ActiveWatchMs', 'p90ActiveWatchMs'].forEach((field) => finiteNumber(input.summary[field], `summary_${field}`, true));
    input.trend.forEach((row) => {
      if (!row || typeof row.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.day)) throw new Error('invalid_trend');
      ['homeClicks', 'catalogOpens', 'videoSelects', 'playbackStarts', 'activeWatchMs'].forEach((field) => finiteNumber(row[field], `trend_${field}`));
    });
    input.funnel.forEach((row) => {
      if (!row || typeof row.step !== 'string' || !['ready', 'not_applicable'].includes(row.status)) throw new Error('invalid_funnel');
      finiteNumber(row.count, 'funnel_count', true);
      finiteNumber(row.percentOfPrevious, 'funnel_percent', true);
    });
    input.videos.forEach((row) => {
      if (!row || typeof row.channelId !== 'string' || typeof row.videoId !== 'string') throw new Error('invalid_video');
      if (row.title != null && typeof row.title !== 'string') throw new Error('invalid_video_title');
      ['videoSelects', 'playbackStarts', 'anonymousInstances', 'activeWatchMs', 'completed25', 'completed50', 'completed75', 'completed95', 'externalVideoOpens']
        .forEach((field) => finiteNumber(row[field], `video_${field}`));
      ['averageActiveWatchMs', 'p50ActiveWatchMs', 'p90ActiveWatchMs'].forEach((field) => finiteNumber(row[field], `video_${field}`, true));
    });
    return input;
  }

  function formatNumber(value) {
    return Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU') : '—';
  }

  function formatDuration(value) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const seconds = Number(value) / 1000;
    if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} с`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(minutes < 10 ? 1 : 0)} мин`;
    return `${(minutes / 60).toFixed(1)} ч`;
  }

  function formatPercent(value) {
    return value == null || !Number.isFinite(Number(value)) ? '—' : `${(Number(value) * 100).toFixed(1)}%`;
  }

  function dateTimeFromMicros(value) {
    return Number.isSafeInteger(value) && value > 0 ? new Date(Math.floor(value / 1000)).toLocaleString('ru-RU') : 'данных пока нет';
  }

  function sortVideoRows(rows, sort = state.sort) {
    const key = SORT_KEYS.has(sort.key) ? sort.key : 'playbackStarts';
    const direction = sort.direction === 'asc' ? 1 : -1;
    return rows.map((row, index) => ({ row, index })).sort((left, right) => {
      const a = key === 'title' ? String(left.row.title || left.row.videoId) : Number(left.row[key] ?? -1);
      const b = key === 'title' ? String(right.row.title || right.row.videoId) : Number(right.row[key] ?? -1);
      const result = typeof a === 'string' ? a.localeCompare(b, 'ru') : a - b;
      return result ? result * direction : left.index - right.index;
    }).map((item) => item.row);
  }

  function sortIndicator(key) {
    if (state.sort.key !== key) return '';
    return state.sort.direction === 'asc' ? ' ↑' : ' ↓';
  }

  function sortButton(key, label, title) {
    return `<button class="youtube-sort" type="button" onclick="AdminYoutubeAnalytics.setSort('${key}')" title="${escapeHtml(title)}">${escapeHtml(label)}${sortIndicator(key)}</button>`;
  }

  function renderMetric(label, value, note) {
    return `<article class="card metric youtube-metric"><label>${escapeHtml(label)}</label><strong>${escapeHtml(value)}</strong><span>${escapeHtml(note)}</span></article>`;
  }

  function renderTrend(snapshot) {
    const rows = snapshot.trend;
    const width = 760;
    const height = 210;
    const pad = 28;
    const maxStarts = Math.max(1, ...rows.map((row) => row.playbackStarts));
    const maxWatch = Math.max(1, ...rows.map((row) => row.activeWatchMs));
    const points = (field, max) => rows.map((row, index) => {
      const x = rows.length < 2 ? width / 2 : pad + index * ((width - pad * 2) / (rows.length - 1));
      const y = height - pad - (row[field] / max) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const tableRows = rows.map((row) => `<tr><td>${escapeHtml(row.day)}</td><td>${formatNumber(row.playbackStarts)}</td><td>${formatDuration(row.activeWatchMs)}</td></tr>`).join('');
    return `<section class="card section youtube-chart-card" aria-labelledby="youtube-trend-title">
      <div class="card-header"><div><h2 id="youtube-trend-title">Запуски и активное время по дням</h2><p>День определяется по UTC-времени начала воспроизведения.</p></div><div class="youtube-legend"><span><i class="starts"></i>Запуски</span><span><i class="watch"></i>Активное время</span></div></div>
      <div class="youtube-chart" role="img" aria-label="Линейный график запусков и активного времени по дням">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path class="grid" d="M${pad} ${pad}H${width - pad}M${pad} ${height / 2}H${width - pad}M${pad} ${height - pad}H${width - pad}"/><polyline class="starts" points="${points('playbackStarts', maxStarts)}"/><polyline class="watch" points="${points('activeWatchMs', maxWatch)}"/></svg>
      </div>
      <details class="youtube-chart-data"><summary>Показать данные графика таблицей</summary><div class="youtube-table-wrap"><table><thead><tr><th>Дата UTC</th><th>Запуски</th><th>Активное время</th></tr></thead><tbody>${tableRows}</tbody></table></div></details>
    </section>`;
  }

  const FUNNEL_LABELS = { home: 'Главная', catalog: 'Каталог', select: 'Выбор видео', start: 'Старт', completed25: 'Не менее 25%', completed75: 'Не менее 75%' };

  function renderFunnel(snapshot) {
    const max = Math.max(1, ...snapshot.funnel.map((row) => Number(row.count || 0)));
    return `<section class="card section" aria-labelledby="youtube-funnel-title"><div class="card-header"><div><h2 id="youtube-funnel-title">Путь до просмотра</h2><p>Абсолютные значения и доля от предыдущего доступного шага.</p></div></div><div class="youtube-funnel">${snapshot.funnel.map((row) => {
      const unavailable = row.status === 'not_applicable';
      const width = unavailable ? 0 : Math.max(3, (Number(row.count || 0) / max) * 100);
      return `<div class="youtube-funnel-row"><div><strong>${escapeHtml(FUNNEL_LABELS[row.step] || row.step)}</strong><span>${unavailable ? 'Не применяется при фильтре по видео' : `${formatNumber(row.count)} · ${formatPercent(row.percentOfPrevious)}`}</span></div><div class="youtube-funnel-track" aria-hidden="true"><span style="width:${width.toFixed(1)}%"></span></div></div>`;
    }).join('')}</div></section>`;
  }

  function renderVideoTable(snapshot) {
    const videos = sortVideoRows(snapshot.videos);
    if (!videos.length) return '<section class="card section"><div class="empty-state"><div>По выбранным фильтрам видео не найдено.</div></div></section>';
    const rows = videos.map((row) => `<tr><td class="youtube-video-name"><strong>${escapeHtml(row.title || 'Видео без названия')}</strong><small>${escapeHtml(row.videoId)} · канал ${escapeHtml(row.channelId)}</small></td><td>${formatNumber(row.videoSelects)}</td><td>${formatNumber(row.playbackStarts)}</td><td>${formatNumber(row.anonymousInstances)}</td><td>${formatDuration(row.activeWatchMs)}</td><td>${formatDuration(row.averageActiveWatchMs)}</td><td>${formatDuration(row.p50ActiveWatchMs)}</td><td>${formatDuration(row.p90ActiveWatchMs)}</td><td>${formatNumber(row.completed25)} / ${formatNumber(row.completed50)} / ${formatNumber(row.completed75)} / ${formatNumber(row.completed95)}</td><td>${formatNumber(row.externalVideoOpens)}</td></tr>`).join('');
    return `<section class="card section" aria-labelledby="youtube-videos-title"><div class="card-header"><div><h2 id="youtube-videos-title">Видео</h2><p>До 200 строк. Название и YouTube ID показаны без пользовательских идентификаторов.</p></div><span class="badge">${formatNumber(videos.length)} видео</span></div><div class="youtube-table-wrap"><table class="youtube-video-table"><thead><tr><th>${sortButton('title', 'Видео', 'Сортировать по названию видео')}</th><th>${sortButton('videoSelects', 'Выборы', 'Сортировать по выборам видео')}</th><th>${sortButton('playbackStarts', 'Запуски', 'Сортировать по запускам')}</th><th>${sortButton('anonymousInstances', 'Экземпляры', 'Сортировать по анонимным экземплярам приложения')}</th><th>${sortButton('activeWatchMs', 'Активное время', 'Сортировать по суммарному активному времени')}</th><th>${sortButton('averageActiveWatchMs', 'Среднее', 'Сортировать по среднему активному времени')}</th><th>${sortButton('p50ActiveWatchMs', 'p50', 'Сортировать по медиане активного времени')}</th><th>${sortButton('p90ActiveWatchMs', 'p90', 'Сортировать по девяностому процентилю')}</th><th>${sortButton('completed75', '≥25/50/75/95%', 'Сортировать по попыткам, достигшим 75 процентов')}</th><th>${sortButton('externalVideoOpens', 'Открыли YouTube', 'Сортировать по внешним открытиям видео')}</th></tr></thead><tbody>${rows}</tbody></table></div>${snapshot.quality.videosTruncated ? '<div class="notice warning">Показаны первые 200 видео по числу запусков и активному времени. Уточните фильтры, чтобы увидеть остальные.</div>' : ''}</section>`;
  }

  function renderQuality(snapshot) {
    const quality = snapshot.quality;
    const defects = [
      ['Без обязательных полей', quality.missingRequiredFields], ['Дубли событий', quality.duplicates],
      ['Неизвестная схема', quality.unknownSchema], ['Повторные параметры', quality.duplicateParameterKeys],
      ['Без найденного старта', quality.rowsWithoutStart], ['Конфликт видео', quality.conflictingVideo],
      ['Конфликт канала', quality.conflictingChannel], ['Повторные старты', quality.duplicateStartAttempts],
      ['Неверная длительность', quality.invalidDurationAttempts], ['Незавершённые попытки', quality.unfinishedAttempts],
    ];
    return `<section class="card section youtube-quality" aria-labelledby="youtube-quality-title"><div class="card-header"><div><h2 id="youtube-quality-title">Что мы можем измерить</h2><p>Учитываются только анонимные экземпляры приложения, согласившиеся на аналитику. Процент согласия здесь вычислить нельзя.</p></div><span class="badge ${quality.state === 'partial' ? 'warning' : quality.state === 'ready' ? 'success' : ''}">${quality.state === 'partial' ? 'Частичные данные' : quality.state === 'ready' ? 'Данные готовы' : 'Данных пока нет'}</span></div><div class="card-body"><p><strong>Свежесть:</strong> ${escapeHtml(dateTimeFromMicros(snapshot.dataThroughMicros))}. Firebase Analytics выгружается в BigQuery не в реальном времени.</p><p>Активное время считается только во время воспроизведения. Checkpoint обычно отправляется раз в 10 секунд; остановка приложения операционной системой может оставить небольшой непросчитанный хвост.</p><div class="youtube-quality-grid">${defects.map(([label, value]) => `<span><strong>${formatNumber(value)}</strong>${escapeHtml(label)}</span>`).join('')}</div><p class="hint">Валидацию прошли ${formatNumber(quality.acceptedEvents)} из ${formatNumber(quality.totalEvents)} событий (${formatPercent(quality.validationRatio)}).</p></div></section>`;
  }

  function renderFilters() {
    const filters = state.filters;
    return `<section class="card youtube-filters" aria-label="Фильтры аналитики YouTube"><div class="field"><label for="youtube-range">Период</label><select id="youtube-range" title="Выберите период аналитики YouTube"><option value="7"${filters.rangeDays === 7 ? ' selected' : ''}>7 дней</option><option value="28"${filters.rangeDays === 28 ? ' selected' : ''}>28 дней</option><option value="90"${filters.rangeDays === 90 ? ' selected' : ''}>90 дней</option></select></div><div class="field"><label for="youtube-platform">Платформа</label><select id="youtube-platform" title="Показывать все платформы или только одну"><option value="all"${filters.platform === 'all' ? ' selected' : ''}>Все платформы</option><option value="ios"${filters.platform === 'ios' ? ' selected' : ''}>iOS</option><option value="android"${filters.platform === 'android' ? ' selected' : ''}>Android</option></select></div><div class="field"><label for="youtube-channel">Канал</label><input id="youtube-channel" maxlength="256" value="${escapeHtml(filters.channelId)}" placeholder="Все каналы" title="Введите точный YouTube ID канала или оставьте поле пустым"></div><div class="field"><label for="youtube-video">Видео</label><input id="youtube-video" maxlength="256" value="${escapeHtml(filters.videoId)}" placeholder="Все видео" title="Введите точный YouTube ID видео или оставьте поле пустым"></div><button class="button primary youtube-refresh" type="button" onclick="AdminYoutubeAnalytics.load(true)" title="Обновить агрегированную статистику YouTube для выбранных фильтров. Данные доступны только для чтения.">${state.status === 'loading' ? 'Обновляем…' : 'Обновить данные'}</button></section>`;
  }

  function renderPanel(access = state.access) {
    state.access = { authorized: access.authorized === true, canRead: access.canRead === true };
    if (!state.access.canRead) return `<section id="youtube-analytics-panel"><header class="page-header"><div><div class="eyebrow">Аналитика / Видео YouTube</div><h1>Аналитика видео YouTube</h1><p>Клики, запуски и активное время просмотра внутри Phraseman.</p></div></header><div class="notice warning" role="alert">У вашей роли нет разрешения <code>analytics.read</code>.</div></section>`;
    const snapshot = state.lastSnapshot;
    const loading = state.status === 'loading';
    let notice = '';
    if (loading && snapshot) notice = '<div class="notice" role="status">Обновляем данные. Ниже сохранён последний успешный снимок.</div>';
    else if (loading) notice = '<div class="youtube-skeleton" role="status">Загружаем агрегированную статистику YouTube…</div>';
    else if (state.status === 'error') notice = `<div class="notice danger" role="alert"><strong>Не удалось обновить данные.</strong><br>${escapeHtml(state.error)}${snapshot ? '<br>Показан последний успешный снимок.' : ''}</div>`;
    else if (snapshot?.quality?.state === 'partial') notice = '<div class="notice warning"><strong>Данные частичные.</strong> Доступные показатели показаны, а проблемы качества перечислены ниже.</div>';
    else if (snapshot?.quality?.state === 'empty') notice = '<div class="notice warning"><strong>Событий пока нет.</strong> Они появятся после выпуска версии с трекингом и следующей выгрузки Firebase Analytics в BigQuery.</div>';

    const content = snapshot && snapshot.quality.state !== 'empty' ? `${renderMetric('Клики с главной', formatNumber(snapshot.summary.homeClicks), 'переходы к YouTube-разделу')}${renderMetric('Запуски', formatNumber(snapshot.summary.playbackStarts), 'валидные старты воспроизведения')}${renderMetric('Анонимные экземпляры', formatNumber(snapshot.summary.anonymousInstancesWithValidStart), 'не гарантированно уникальные люди')}${renderMetric('Активное время', formatDuration(snapshot.summary.totalActiveWatchMs), 'сумма по попыткам')}${renderMetric('Среднее время', formatDuration(snapshot.summary.averageActiveWatchMs), `p50 ${formatDuration(snapshot.summary.p50ActiveWatchMs)} · p90 ${formatDuration(snapshot.summary.p90ActiveWatchMs)}`)}${renderMetric('Открыли канал', formatNumber(snapshot.summary.channelOpens), 'нажатия внешней ссылки')}` : '';
    return `<section id="youtube-analytics-panel"><header class="page-header"><div><div class="eyebrow">Аналитика / Видео YouTube</div><h1>Аналитика видео YouTube</h1><p>Показывает путь от кнопки на главной до просмотра внутри Phraseman и нажатий внешних ссылок YouTube.</p></div><div class="actions"><a class="button" href="#analytics" title="Вернуться к общей аналитике">К общей аналитике</a></div></header>${renderFilters()}${notice}${snapshot && snapshot.quality.state !== 'empty' ? `<section class="metrics section youtube-kpis">${content}</section>${renderTrend(snapshot)}${renderFunnel(snapshot)}${renderVideoTable(snapshot)}` : ''}${snapshot ? renderQuality(snapshot) : ''}</section>`;
  }

  function readFiltersFromDocument() {
    if (typeof document !== 'object') return state.filters;
    return {
      rangeDays: Number(document.getElementById('youtube-range')?.value || state.filters.rangeDays),
      platform: document.getElementById('youtube-platform')?.value || state.filters.platform,
      channelId: String(document.getElementById('youtube-channel')?.value || '').trim(),
      videoId: String(document.getElementById('youtube-video')?.value || '').trim(),
    };
  }

  function rerender() {
    if (typeof document !== 'object') return;
    const current = document.getElementById('youtube-analytics-panel');
    if (current) current.outerHTML = renderPanel(state.access);
  }

  async function load(force = false) {
    if (!state.access.canRead || state.status === 'loading' || (!force && state.lastSnapshot)) return state.lastSnapshot;
    state.filters = readFiltersFromDocument();
    const requestId = ++state.requestId;
    state.status = 'loading';
    state.error = '';
    rerender();
    try {
      if (typeof globalThis.callAdminYoutubeAnalytics !== 'function') throw new Error('Сервис аналитики ещё запускается. Повторите попытку через несколько секунд.');
      const input = {
        rangeDays: state.filters.rangeDays,
        platform: state.filters.platform,
        ...(state.filters.channelId ? { channelId: state.filters.channelId } : {}),
        ...(state.filters.videoId ? { videoId: state.filters.videoId } : {}),
      };
      const response = await globalThis.callAdminYoutubeAnalytics(input);
      const snapshot = validateSnapshot(response?.data ?? response);
      if (requestId !== state.requestId) return state.lastSnapshot;
      state.lastSnapshot = snapshot;
      state.status = snapshot.quality.state;
      state.error = '';
      return snapshot;
    } catch (error) {
      if (requestId !== state.requestId) return state.lastSnapshot;
      const code = String(error?.code || '');
      state.status = 'error';
      state.error = code.includes('permission-denied') || code.includes('unauthenticated')
        ? 'Недостаточно прав для просмотра аналитики YouTube.'
        : code.includes('failed-precondition')
          ? 'Хранилище аналитики ещё не настроено.'
          : 'Сервер не вернул актуальный снимок. Повторите попытку позже.';
      return null;
    } finally {
      if (requestId === state.requestId) rerender();
    }
  }

  function setSort(key) {
    if (!SORT_KEYS.has(key)) return;
    state.sort = state.sort.key === key
      ? { key, direction: state.sort.direction === 'desc' ? 'asc' : 'desc' }
      : { key, direction: key === 'title' ? 'asc' : 'desc' };
    rerender();
  }

  function reset() {
    state.status = 'idle';
    state.lastSnapshot = null;
    state.error = '';
    state.requestId += 1;
  }

  function inspectState() {
    return { ...state, filters: { ...state.filters }, sort: { ...state.sort }, access: { ...state.access } };
  }

  return Object.freeze({ escapeHtml, validateSnapshot, sortVideoRows, renderPanel, load, setSort, reset, inspectState });
});
