(function () {
  'use strict';

  var state = { loaded: false, loading: false, briefId: '', brief: null, manifest: null, recommendations: null, experiments: null, decisions: [] };
  var SOURCE_LABELS = {
    error_reports: 'Сообщения пользователей об ошибках', subscription_cancel_surveys: 'Причины отмены подписки', app_errors: 'Ошибки приложения',
    safety_flags: 'Сигналы безопасности', users: 'Новые пользователи', progress_events: 'Учебные действия пользователей',
    revenuecat_premium_events: 'События подписки RevenueCat', revenuecat_shard_transactions: 'Покупки пакетов кристаллов',
    paywall_funnel: 'Воронка предложения Plus', user_ideas: 'Идеи пользователей', user_reports: 'Жалобы на пользователей',
    community_pack_reports: 'Жалобы на паки сообщества', explain_reports: 'Отзывы об объяснениях', website_contact_inbox: 'Обращения с сайта',
    support_inbox: 'Почта поддержки', help_board_topics: 'Темы доски помощи', league_chat_messages: 'Сообщения чата лиг на модерации',
    referral_attributions: 'Реферальные связи', community_pack_purchases: 'Покупки паков сообщества', promo_redemptions: 'Активации промокодов',
    vip_survey_responses: 'Ответы на опрос Plus', community_pack_submissions: 'Паки на модерации', arena_rooms_live: 'Созданные комнаты Арены',
    users_active_subscription_snapshot: 'Активные подписки на конец периода', moderation_backlog_snapshot: 'Остаток очередей модерации', remote_config: 'Настройки приложения'
  };
  var METRIC_LABELS = {
    'growth_activation.users.events': 'Новые пользователи',
    'learning_engagement.progress_events.events': 'Учебные действия',
    'revenue.revenuecat_premium_events.events': 'События подписки RevenueCat',
    'quality_support.app_errors.events': 'Ошибки приложения'
    ,'growth_activation.new_users': 'Новые пользователи'
    ,'growth_activation.activated_new_users': 'Активированные новые пользователи'
    ,'growth_activation.activation_rate': 'Доля активации новых пользователей, %'
    ,'learning_engagement.unique_learners': 'Уникальные активные ученики'
    ,'learning_engagement.lesson_completions': 'Завершённые уроки'
    ,'revenue.paywall_shown': 'Показы предложения Plus'
    ,'revenue.paywall_cta_rate': 'Переход с предложения Plus к кнопке, %'
    ,'revenue.paywall_purchase_rate': 'Покупки после показа Plus, %'
    ,'revenue.trial_starts': 'Начатые пробные периоды'
    ,'revenue.initial_paid_purchases': 'Новые платные покупки'
    ,'revenue.renewals': 'Продления подписки'
    ,'revenue.refunds': 'Возвраты'
    ,'quality_support.errors_per_100_learners': 'Ошибок на 100 активных учеников'
    ,'quality_support.reports_per_100_learners': 'Жалоб на 100 активных учеников'
  };
  var DOMAIN_LABELS = { growth_activation: 'Рост и активация', learning_engagement: 'Обучение и вовлечение', revenue: 'Доход и подписка', quality_support: 'Качество и поддержка', safety_community: 'Безопасность и сообщество', operations: 'Операции' };
  function sourceLabel(sourceId) { return SOURCE_LABELS[sourceId] || String(sourceId || 'Источник данных').replace(/_/g, ' '); }
  function metricLabel(metricId) {
    if (METRIC_LABELS[metricId]) return METRIC_LABELS[metricId];
    var parts = String(metricId || '').split('.');
    return sourceLabel(parts.length > 1 ? parts[1] : metricId) + ' — события';
  }
  function evidenceSummary(ids) {
    ids = Array.isArray(ids) ? ids : [];
    return '<strong>' + text(ids.length ? ('Подтверждений: ' + ids.length) : 'Нет подтверждений') + '</strong>' + (ids.length ? '<span class="pm-tech-id" title="Технические ссылки на доказательства">' + text(ids.join(', ')) + '</span>' : '');
  }
  function actionButton(kind, itemId, to, label) {
    return '<button type="button" data-pm-action="mutate" data-pm-kind="' + text(kind) + '" data-pm-id="' + text(itemId || '') + '" data-pm-from="proposed" data-pm-to="' + text(to) + '">' + text(label) + '</button>';
  }

  function byId(id) { return document.getElementById(id); }
  function text(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function number(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('ru-RU') : 'Н/Д';
  }
  function date(ms) {
    return Number.isFinite(Number(ms)) ? new Date(Number(ms)).toLocaleString('ru-RU') : 'Н/Д';
  }
  function period(window) {
    if (!window) return 'Период не указан';
    return date(window.startMs) + ' — ' + date(window.endMs);
  }
  function setHtml(id, html) {
    var node = byId(id);
    if (node) node.innerHTML = html;
  }
  function setCount(value) {
    var node = byId('pm-count');
    if (node) node.textContent = value || '';
  }
  function bridge() {
    if (!window.pmAdminFirestore) throw new Error('Firestore bridge is not ready');
    return window.pmAdminFirestore;
  }
  function callable(name) {
    if (name === 'adminGenerateProductBrief') return window.getAdminGenerateProductBriefCallable && window.getAdminGenerateProductBriefCallable();
    if (name === 'adminMutateProductItem') return window.getAdminMutateProductItemCallable && window.getAdminMutateProductItemCallable();
    throw new Error('Unknown callable: ' + name);
  }
  function markdown(value) {
    return text(value || '')
      .split(/\n{2,}/)
      .map(function (block) {
        if (/^\s*- /.test(block)) {
          return '<ul>' + block.split('\n').filter(Boolean).map(function (line) {
            return '<li>' + text(line.replace(/^\s*-\s*/, '')) + '</li>';
          }).join('') + '</ul>';
        }
        return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
      }).join('');
  }
  function statusPill(value) {
    var labels = { ok: 'Доступен', partial: 'Неполный', failed: 'Недоступен', not_configured: 'Не сравнивается', not_applicable: 'Не сравнивается' };
    var cls = value === 'ok' ? 'ok' : (value === 'partial' ? 'partial' : (value === 'not_configured' || value === 'not_applicable' ? 'muted' : 'bad'));
    return '<span class="pm-pill ' + cls + '">' + text(labels[value] || 'Неизвестно') + '</span>';
  }
  function installStyles() {
    if (byId('pm-workspace-styles')) return;
    var style = document.createElement('style');
    style.id = 'pm-workspace-styles';
    style.textContent = [
      '#tab-product-manager{padding:20px 22px 40px}',
      '.pm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:14px 0}',
      '.pm-card{background:rgba(15,18,25,.92);border:1px solid rgba(148,163,184,.18);border-radius:14px;padding:16px;box-shadow:0 14px 40px rgba(0,0,0,.22)}',
      '.pm-card h3{font-size:15px;margin:0 0 10px;color:#e5e7eb}',
      '.pm-muted{color:#9ca3af;font-size:12.5px;line-height:1.5}',
      '.pm-article{max-width:1040px;color:#e5e7eb;line-height:1.72;font-size:15px}',
      '.pm-data-table{width:100%;border-collapse:collapse;margin:10px 0 0;font-size:13px}',
      '.pm-data-table th,.pm-data-table td{border-bottom:1px solid rgba(148,163,184,.14);padding:9px 8px;text-align:left;vertical-align:top}',
      '.pm-data-table th{color:#cbd5e1;font-weight:700;background:rgba(148,163,184,.07)}',
      '.pm-pill{display:inline-flex;align-items:center;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:800;border:1px solid rgba(148,163,184,.2)}',
      '.pm-pill.ok{color:#86efac;background:rgba(22,163,74,.12);border-color:rgba(34,197,94,.32)}',
      '.pm-pill.partial{color:#fde68a;background:rgba(217,119,6,.12);border-color:rgba(245,158,11,.32)}',
      '.pm-pill.bad{color:#fca5a5;background:rgba(220,38,38,.12);border-color:rgba(248,113,113,.32)}',
      '.pm-pill.muted{color:#d4d4d8;background:#27272a;border-color:#3f3f46}',
      '.pm-tech-id{display:block;color:#6b7280;font-size:10px;margin-top:2px;font-weight:400}',
      '.pm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}',
      '.pm-actions button{min-height:36px}',
      '@media(max-width:720px){#tab-product-manager{padding:14px}.pm-data-table{font-size:12px}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  async function getDocData(path) {
    var f = bridge();
    var snap = await f.getDoc(f.doc(f.db, path));
    return snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null;
  }

  async function loadRecentDecisions() {
    try {
      var f = bridge();
      var q = f.query(f.collection(f.db, 'admin_pm_decisions'), f.orderBy('decidedAtMs', 'desc'), f.limit(20));
      var snap = await f.getDocs(q);
      var rows = [];
      snap.forEach(function (docSnap) { rows.push(Object.assign({ id: docSnap.id }, docSnap.data())); });
      return rows;
    } catch (e) {
      return [];
    }
  }

  function renderEmpty(message) {
    var html = '<div class="reports-empty">' + text(message) + '</div>';
    ['pm-overview', 'pm-metrics', 'pm-opportunities', 'pm-experiments', 'pm-decisions', 'pm-coverage'].forEach(function (id) { setHtml(id, html); });
  }

  function renderOverview() {
    var brief = state.brief || {};
    setHtml('pm-overview', [
      '<div class="pm-card">',
      '<h3>Product Manager brief</h3>',
      '<div class="pm-muted">Текущий период: ' + text(period(brief.window)) + '</div>',
      '<div class="pm-muted">Сравнение: ' + text(period(brief.previousWindow)) + '</div>',
      '<div class="pm-grid">',
      '<div><strong>Режим:</strong> ' + statusPill(brief.mode === 'full' ? 'ok' : 'partial') + ' ' + text(brief.mode || 'unknown') + '</div>',
      '<div><strong>Сгенерировано:</strong> ' + text(date(brief.generatedAtMs)) + '</div>',
      '<div><strong>Brief ID:</strong> ' + text(state.briefId || brief.briefId || '') + '</div>',
      '</div>',
      '<h3>Статья PM</h3>',
      '<div class="pm-article">' + markdown(brief.article || brief.executiveSummary || 'Пока нет сохранённой статьи.') + '</div>',
      '</div>'
    ].join(''));
  }

  function renderMetrics() {
    var metrics = state.manifest && state.manifest.metrics ? Object.values(state.manifest.metrics) : [];
    var rows = metrics.map(function (m) {
      var delta = Number(m.current || 0) - Number(m.previous || 0);
      return '<tr><td><strong>' + text(metricLabel(m.metricId)) + '</strong><span class="pm-tech-id">' + text(m.metricId) + '</span></td><td>' + text(DOMAIN_LABELS[m.domain] || m.domain) + '</td><td>' + number(m.current) + '</td><td>' + number(m.previous) + '</td><td>' + number(delta) + '</td><td>' + text((m.caveats || []).join(', ') || 'нет') + '</td></tr>';
    }).join('');
    setHtml('pm-metrics', '<div class="pm-card"><h3>Сравнительные метрики</h3><div class="pm-muted">Таблица — доступная замена графикам: текущий период против предыдущего равного периода.</div><table class="pm-data-table" aria-label="Product Manager comparative metric table"><thead><tr><th>Метрика</th><th>Домен</th><th>Сейчас</th><th>Раньше</th><th>Дельта</th><th>Оговорки</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6">Нет полностью сравнимых метрик.</td></tr>') + '</tbody></table></div>');
  }

  function renderItems() {
    var brief = state.brief || {};
    var recs = (brief.recommendations || []).concat(brief.ideas || []);
    var recRows = recs.map(function (item) {
      return '<tr><td><strong>' + text(item.title || 'Рекомендация') + '</strong><span class="pm-tech-id">' + text(item.id || '') + '</span></td><td>' + text(item.impact || '') + '</td><td>' + text(item.effort || '') + '</td><td>' + evidenceSummary(item.evidenceIds) + '</td><td><div class="pm-actions">' + actionButton('recommendation', item.id, 'accepted', 'Принять') + actionButton('recommendation', item.id, 'deferred', 'Отложить') + actionButton('recommendation', item.id, 'rejected', 'Отклонить') + '</div></td></tr>';
    }).join('');
    setHtml('pm-opportunities', '<div class="pm-card"><h3>Рекомендации и идеи</h3><table class="pm-data-table" aria-label="Product Manager recommendations table"><thead><tr><th>Идея</th><th>Impact</th><th>Effort</th><th>Evidence</th><th>Решение</th></tr></thead><tbody>' + (recRows || '<tr><td colspan="5">Пока нет рекомендаций: gate покрытия закрыт или brief в coverage-only режиме.</td></tr>') + '</tbody></table></div>');
    var expRows = (brief.experiments || []).map(function (item) {
      return '<tr><td>' + text(item.hypothesis || 'Гипотеза не описана') + '</td><td><strong>' + text(metricLabel(item.primaryMetricId)) + '</strong><span class="pm-tech-id">' + text(item.primaryMetricId || '') + '</span></td><td>' + evidenceSummary(item.evidenceIds) + '</td><td><div class="pm-actions">' + actionButton('experiment', item.id, 'running', 'Запустить') + actionButton('experiment', item.id, 'rejected', 'Отклонить') + '</div></td></tr>';
    }).join('');
    setHtml('pm-experiments', '<div class="pm-card"><h3>Эксперименты</h3><table class="pm-data-table" aria-label="Product Manager experiments table"><thead><tr><th>Гипотеза</th><th>Метрика</th><th>Evidence</th><th>Решение</th></tr></thead><tbody>' + (expRows || '<tr><td colspan="4">Нет предложенных экспериментов.</td></tr>') + '</tbody></table></div>');
  }

  function renderDecisions() {
    var rows = (state.decisions || []).map(function (d) {
      return '<tr><td>' + text(date(d.decidedAtMs)) + '</td><td>' + text(d.itemType) + '</td><td>' + text(d.itemId) + '</td><td>' + text(d.from) + ' → ' + text(d.to) + '</td><td>' + text(d.comment || d.result || '') + '</td></tr>';
    }).join('');
    setHtml('pm-decisions', '<div class="pm-card"><h3>Журнал решений</h3><table class="pm-data-table" aria-label="Product Manager decisions table"><thead><tr><th>Когда</th><th>Тип</th><th>ID</th><th>Переход</th><th>Комментарий</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">Решений пока нет.</td></tr>') + '</tbody></table></div>');
  }

  function renderCoverage() {
    var coverage = state.manifest && state.manifest.coverage ? state.manifest.coverage : {};
    var rows = Object.keys(coverage).sort().map(function (sourceId) {
      var c = coverage[sourceId] || {};
      return '<tr><td><strong>' + text(sourceLabel(sourceId)) + '</strong><span class="pm-tech-id">' + text(sourceId) + '</span></td><td>' + statusPill(c.current && c.current.status) + '</td><td>' + statusPill(c.previous && c.previous.status) + '</td><td>' + statusPill(c.context_7d && c.context_7d.status) + '</td><td>' + statusPill(c.context_28d && c.context_28d.status) + '</td><td>' + text((c.current && c.current.errorCode) || (c.previous && c.previous.errorCode) || '') + '</td></tr>';
    }).join('');
    setHtml('pm-coverage', '<div class="pm-card"><h3>Покрытие источников</h3><div class="pm-muted">Если здесь failed/partial, Product Manager не имеет права делать уверенные рекомендации по этому домену.</div><table class="pm-data-table" aria-label="Product Manager source coverage table"><thead><tr><th>Источник</th><th>Текущий</th><th>Предыдущий</th><th>7 дней</th><th>28 дней</th><th>Причина</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6">Манифест покрытия ещё не сохранён.</td></tr>') + '</tbody></table></div>');
  }

  function render() {
    installStyles();
    if (!state.brief) { renderEmpty('PM brief ещё не сформирован. Нажмите «Сформировать PM brief».'); return; }
    renderOverview();
    renderMetrics();
    renderItems();
    renderDecisions();
    renderCoverage();
  }

  window.loadProductManagerWorkspace = async function (force) {
    if (state.loading) return;
    if (state.loaded && !force) { render(); return; }
    installStyles();
    state.loading = true;
    setCount('загрузка...');
    try {
      var latest = await getDocData('admin_pm_state/latest');
      if (!latest || !latest.briefId) {
        state.brief = null;
        state.loaded = true;
        render();
        setCount('brief отсутствует');
        return;
      }
      state.briefId = latest.briefId;
      state.brief = await getDocData('admin_pm_briefs/' + latest.briefId);
      state.manifest = await getDocData('admin_pm_evidence_manifests/' + latest.briefId);
      state.recommendations = await getDocData('admin_pm_recommendation_bundles/' + latest.briefId);
      state.experiments = await getDocData('admin_pm_experiment_bundles/' + latest.briefId);
      state.decisions = await loadRecentDecisions();
      state.loaded = true;
      render();
      setCount('обновлено только что');
    } catch (e) {
      renderEmpty('Не удалось загрузить PM Workspace: ' + (e && e.message ? e.message : String(e)));
      setCount('ошибка загрузки');
    } finally {
      state.loading = false;
    }
  };

  window.generateProductManagerBrief = async function () {
    var button = byId('pm-generate');
    if (button) button.disabled = true;
    setCount('генерация...');
    try {
      var fn = callable('adminGenerateProductBrief');
      var key = 'manual:' + new Date().toISOString().replace(/[^0-9TZ]/g, '') + ':' + Math.random().toString(36).slice(2, 10);
      var result = await fn({ idempotencyKey: key });
      state.loaded = false;
      await window.loadProductManagerWorkspace(true);
      setCount(result && result.data && result.data.reused ? 'показан существующий brief' : 'новый brief готов');
    } catch (e) {
      setCount('ошибка генерации');
      alert('Не удалось сформировать PM brief: ' + (e && e.message ? e.message : String(e)));
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.pmMutateItem = async function (itemType, itemId, from, to) {
    try {
      var comment = prompt('Комментарий к решению', '') || '';
      var fn = callable('adminMutateProductItem');
      await fn({ briefId: state.briefId, itemType: itemType, itemId: itemId, from: from, to: to, comment: comment });
      state.loaded = false;
      await window.loadProductManagerWorkspace(true);
    } catch (e) {
      alert('Не удалось сохранить решение: ' + (e && e.message ? e.message : String(e)));
    }
  };

  window.renderProductManagerBrief = function (data) {
    state.brief = data && data.brief ? data.brief : data;
    state.manifest = data && data.manifest ? data.manifest : state.manifest;
    state.loaded = true;
    render();
  };

  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('[data-pm-action="mutate"]') : null;
    if (!button || !byId('tab-product-manager')?.contains(button)) return;
    void window.pmMutateItem(button.dataset.pmKind, button.dataset.pmId, button.dataset.pmFrom, button.dataset.pmTo);
  });
})();
