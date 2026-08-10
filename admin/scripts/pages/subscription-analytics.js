(function () {
  'use strict';

  var CACHE_TTL_MS = 60000;
  var cache = new Map();
  var inFlight = null;
  function element(id) { return document.getElementById(id); }
  function selected(id, fallback) { var node = element(id); return node && node.value ? node.value : fallback; }
  function unwrap(response) { return response && response.data && typeof response.data === 'object' ? response.data : response; }
  function setStatus(message, isError) {
    var node = element('subscription-analytics-status');
    if (!node) return;
    node.textContent = message;
    node.style.color = isError ? '#fca5a5' : '#94a3b8';
  }
  function setBusy(busy) {
    var panel = element('subscription-analytics-panel');
    var button = panel && panel.querySelector ? panel.querySelector('.analytics-detail-controls button') : null;
    if (button) {
      button.disabled = busy;
      button.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
  }
  function errorText(error) {
    var code = String(error && error.code || '');
    if (code.indexOf('permission-denied') !== -1) return 'Нет права money.read для просмотра платежей.';
    return String(error && error.message || error || 'Неизвестная ошибка загрузки.').slice(0, 240);
  }

  function breakdown(title, rows) {
    var L = window.AdminAnalyticsLanguage;
    return '<section class="pa-section"><h3>' + L.escapeHtml(title) + '</h3>' + L.table([
      { key: 'id', label: 'Категория', format: L.humanize },
      { key: 'events', label: 'События', format: L.number },
    ], rows, 'Данных для разбивки нет.') + '</section>';
  }

  function render(data) {
    var L = window.AdminAnalyticsLanguage;
    var metrics = data.metrics || {};
    var revenue = data.revenue || {};
    var money = revenue.money || {};
    var trial = revenue.trialToPaid || {};
    var churn = revenue.churn || {};
    var coverage = revenue.coverage || {};
    var html = '<section class="pa-section"><h3>Ключевые события</h3>' + L.cards([
      { label: 'Первые покупки', value: L.number(metrics.purchases) },
      { label: 'Lifetime-покупки', value: L.number(metrics.lifetimePurchases) },
      { label: 'Продления', value: L.number(metrics.renewals) },
      { label: 'Отмены продления', value: L.number(metrics.cancellations) },
      { label: 'Проблемы списания', value: L.number(metrics.billingIssues) },
      { label: 'Возвраты', value: L.number(metrics.refunds) },
      { label: 'Транзакции', value: L.number(metrics.distinctTransactions) },
    ]) + '</section>';
    html += '<section class="pa-section"><h3>Доход и подписочные цепочки</h3>' + L.cards([
      { label: 'Валовой доход', value: L.moneyMicros(money.grossRevenueUsdMicros) },
      { label: 'Оценка поступлений', value: L.moneyMicros(money.estimatedProceedsUsdMicros) },
      { label: 'ARPPU gross', value: L.moneyMicros(money.arppuGrossUsdMicros) },
      { label: 'Trial → paid', value: L.percent(trial.rate), note: L.number(trial.convertedTrialChains) + ' из ' + L.number(trial.eligibleTrialChains) + ' зрелых цепочек' },
      { label: 'Реализованный churn', value: L.number(churn.realizedChurnChains) },
      { label: 'Доля возвратов', value: L.percent(money.refundTransactionRate) },
    ]) + '<div class="pa-note">Финансовое покрытие: полное — ' + L.number(coverage.completeEvents)
      + ', частичное — ' + L.number(coverage.partialEvents) + ', недоступно — ' + L.number(coverage.unavailableEvents) + '.</div></section>';
    html += breakdown('Типы событий', metrics.byEventType);
    html += breakdown('Товары', metrics.byProduct);
    html += breakdown('Магазины', metrics.byStore);
    html += breakdown('Причины отмены', metrics.byCancellationReason);
    html += '<section class="pa-section"><h3>Продления по месяцам</h3>' + L.table([
      { key: 'monthOffset', label: 'Месяц', format: function (value) { return value == null ? '—' : 'M' + value; } },
      { key: 'eligibleChains', label: 'Зрелые цепочки', format: L.number },
      { key: 'renewedChains', label: 'Продлились', format: L.number },
      { key: 'rate', label: 'Доля', format: L.percent },
      { key: 'maturity', label: 'Зрелость', format: L.humanize },
    ], revenue.monthlyRenewal, 'Зрелых когорт продления пока нет.') + '</section>';
    html += '<section class="pa-section"><h3>LTV подписочной цепочки</h3>' + L.table([
      { key: 'windowDays', label: 'Окно', format: function (value) { return value == null ? '—' : value + ' дней'; } },
      { key: 'maturePaidChains', label: 'Зрелые цепочки', format: L.number },
      { key: 'ltvGrossUsdMicros', label: 'Средний gross LTV', format: L.moneyMicros },
      { key: 'maturity', label: 'Зрелость', format: L.humanize },
    ], revenue.ltv, 'Зрелых LTV-когорт пока нет.') + '</section>';
    if (Array.isArray(data.limitations) && data.limitations.length) {
      html += '<section class="pa-section"><details><summary>Ограничения интерпретации данных</summary><ul class="pa-note">'
        + data.limitations.map(function (item) { return '<li>' + L.escapeHtml(L.humanize(item)) + '</li>'; }).join('')
        + '</ul></details></section>';
    }
    if (metrics.truncated || revenue.status === 'truncated_not_decision_grade') {
      html = '<div class="pa-warning">Достигнут лимит чтения. Эти данные нельзя использовать как окончательные для решения.</div>' + html;
    }
    var content = element('subscription-analytics-content');
    if (content) content.innerHTML = html;
    var through = data.dataThroughMs ? ' Данные по ' + L.dateTime(data.dataThroughMs) + '.' : ' Дата последнего события пока не определена.';
    setStatus('Готово: ' + L.number(data.rangeDays) + ' дней, магазин: ' + L.humanize(data.store) + '.' + through, false);
  }

  window.loadSubscriptionAnalytics = function loadSubscriptionAnalytics(force) {
    if (inFlight) return inFlight;
    var rangeDays = Number(selected('subscription-analytics-range', '28')) || 28;
    var store = selected('subscription-analytics-store', 'all');
    var key = rangeDays + ':' + store;
    var cached = cache.get(key);
    if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
      render(cached.data);
      return Promise.resolve(cached.data);
    }
    if (typeof window.callAdminSubscriptionAnalytics !== 'function') {
      setStatus('Функция загрузки подписок недоступна. Обновите страницу.', true);
      return Promise.resolve(null);
    }
    setBusy(true);
    setStatus('Обновляем серверные платежные события…', false);
    inFlight = Promise.resolve(window.callAdminSubscriptionAnalytics({ rangeDays: rangeDays, store: store }))
      .then(unwrap)
      .then(function (data) {
        if (!data || !data.metrics || !data.revenue) throw new Error('Сервер вернул неполный ответ подписок.');
        cache.set(key, { savedAt: Date.now(), data: data });
        if (cache.size > 12) cache.delete(cache.keys().next().value);
        render(data);
        return data;
      })
      .catch(function (error) {
        setStatus('Не удалось обновить: ' + errorText(error) + ' Уже показанные данные сохранены.', true);
        return null;
      })
      .finally(function () { setBusy(false); inFlight = null; });
    return inFlight;
  };
})();
