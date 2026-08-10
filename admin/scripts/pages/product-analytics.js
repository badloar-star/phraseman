(function () {
  'use strict';

  var CACHE_TTL_MS = 60000;
  var cache = new Map();
  var inFlight = null;

  function element(id) { return document.getElementById(id); }
  function selected(id, fallback) {
    var control = element(id);
    return control && control.value ? control.value : fallback;
  }
  function setHtml(id, html) {
    var target = element(id);
    if (target) target.innerHTML = html;
  }
  function setStatus(message, isError) {
    var target = element('product-analytics-status');
    if (!target) return;
    target.textContent = message;
    target.style.color = isError ? '#fca5a5' : '#94a3b8';
  }
  function setBusy(busy) {
    var panel = element('product-analytics-panel');
    var button = panel && panel.querySelector ? panel.querySelector('.analytics-detail-controls button') : null;
    if (button) {
      button.disabled = busy;
      button.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
  }
  function unwrap(response) {
    return response && response.data && typeof response.data === 'object' ? response.data : response;
  }
  function errorText(error) {
    var code = String(error && error.code || '');
    if (code.indexOf('permission-denied') !== -1) return 'Нет права money.read для просмотра аналитики.';
    return String(error && error.message || error || 'Неизвестная ошибка загрузки.').slice(0, 240);
  }

  function renderScreens(rows) {
    var L = window.AdminAnalyticsLanguage;
    return L.table([
      { key: 'screen_id', label: 'Экран', format: L.humanize },
      { key: 'views', label: 'Показы', format: L.number },
      { key: 'app_instances', label: 'Установки', format: L.number },
      { key: 'exit_rate', label: 'Последний в сессии', format: L.percent },
      { key: 'p50_duration_ms', label: 'Медиана времени', format: L.duration },
      { key: 'p90_duration_ms', label: 'P90 времени', format: L.duration },
    ], Array.isArray(rows) ? rows.slice(0, 80) : [], 'Просмотров экранов за период нет.');
  }

  function renderLessons(rows) {
    var L = window.AdminAnalyticsLanguage;
    return L.table([
      { key: 'lesson_id', label: 'Урок', format: L.number },
      { key: 'starts', label: 'Старты', format: L.number },
      { key: 'completes', label: 'Завершения', format: L.number },
      { key: 'completion_rate', label: 'Доля завершений', format: L.percent },
      { key: 'abandons', label: 'Явные выходы', format: L.number },
      { key: 'avg_abandon_phrase', label: 'Средняя фраза выхода', format: L.number },
    ], Array.isArray(rows) ? rows : [], 'Событий уроков за период нет.');
  }

  function renderQuality(data) {
    var L = window.AdminAnalyticsLanguage;
    var quality = data && typeof data === 'object' ? data : {};
    if (quality.export_status === 'waiting_for_first_daily_export') {
      return '<div class="pa-warning">Первая ежедневная выгрузка Firebase Analytics ещё не появилась. Нули не считаются подтверждёнными данными.</div>';
    }
    return L.cards([
      { label: 'Неизвестные экраны', value: L.percent(quality.unknown_screen_rate) },
      { label: 'Без event_id', value: L.number(quality.missing_event_ids) },
      { label: 'Без session_id', value: L.number(quality.missing_session_ids) },
      { label: 'Дубликаты', value: L.number(quality.duplicate_events) },
      { label: 'Неверная схема', value: L.number(quality.invalid_schema_events) },
    ]);
  }

  function render(data) {
    var L = window.AdminAnalyticsLanguage;
    var quality = data.quality || {};
    var sessions = data.sessions || {};
    var panel = element('product-analytics-panel');
    var summary = {
      instances: quality.consented_app_instances,
      sessions: quality.sessions != null ? quality.sessions : sessions.observed,
      views: quality.screen_views,
      unknown: quality.unknown_screen_views,
    };
    if (panel && panel.querySelectorAll) {
      Object.keys(summary).forEach(function (key) {
        panel.querySelectorAll('[data-pa="' + key + '"]').forEach(function (node) {
          node.textContent = L.number(summary[key]);
        });
      });
    }
    setHtml('product-analytics-sessions', '<h3>Сессии использования приложения</h3>' + window.renderProductSessions(sessions));
    setHtml('product-analytics-screens', renderScreens(data.screens));
    setHtml('product-analytics-lessons', renderLessons(data.lessons));
    setHtml('product-analytics-learning-dropoff', window.renderLearningDiagnostics(data.learningDropoff));
    setHtml('product-analytics-learning-outcomes', window.renderLearningOutcomes(data.learningOutcomes));
    setHtml('product-analytics-conversion', window.renderConversionDiagnostics(data.behavioralConversion));
    setHtml('product-analytics-retention', window.renderRetentionDiagnostics({
      activation: data.activation,
      trueRetention: data.trueRetention,
      observedReturn: data.observedReturn,
      acquisition: data.acquisition,
    }));
    var experimentAndReliability = window.renderExperimentsAndReliability(data);
    setHtml('product-analytics-experiments', experimentAndReliability.experiments);
    setHtml('product-analytics-reliability', experimentAndReliability.reliability);
    setHtml('product-analytics-quality', renderQuality(quality));
    var lag = L.finite(data.dataLagMs);
    var through = data.dataThroughMs ? ' Данные по ' + L.dateTime(data.dataThroughMs) + '.' : '';
    var lagText = lag != null ? ' Задержка выгрузки: ' + L.duration(lag) + '.' : '';
    setStatus('Готово: ' + L.number(data.rangeDays) + ' дней, платформа: ' + L.humanize(data.platform) + '.' + through + lagText, false);
  }

  window.loadProductAnalytics = function loadProductAnalytics(force) {
    if (inFlight) return inFlight;
    var rangeDays = Number(selected('product-analytics-range', '28')) || 28;
    var platform = selected('product-analytics-platform', 'all');
    var key = rangeDays + ':' + platform;
    var cached = cache.get(key);
    if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
      render(cached.data);
      return Promise.resolve(cached.data);
    }
    if (typeof window.callAdminProductAnalytics !== 'function') {
      setStatus('Функция загрузки аналитики недоступна. Обновите страницу.', true);
      return Promise.resolve(null);
    }
    setBusy(true);
    setStatus('Обновляем данные без замены уже показанного содержимого…', false);
    inFlight = Promise.resolve(window.callAdminProductAnalytics({ rangeDays: rangeDays, platform: platform }))
      .then(unwrap)
      .then(function (data) {
        if (!data || data.ok === false) throw new Error('Сервер вернул неполный ответ аналитики.');
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
