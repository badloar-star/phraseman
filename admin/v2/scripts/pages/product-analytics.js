(function productAnalyticsAdminV2() {
  'use strict';

  const language = window.AdminAnalyticsLanguage;
  const esc = language.esc;

  function number(value) {
    if (value == null || value === '') return '–';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString('ru-RU') : '–';
  }

  function percent(value) {
    if (value == null || value === '') return '–';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? (parsed * 100).toFixed(1) + '%' : '–';
  }

  function duration(value) {
    if (value == null || value === '') return '–';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '–';
    return parsed < 60000 ? Math.round(parsed / 1000) + ' с' : (parsed / 60000).toFixed(1) + ' мин';
  }

  function table(headers, rows) {
    if (!rows.length) return '<div class="reports-empty">За выбранный период событий нет.</div>';
    return '<table style="width:100%;border-collapse:collapse;min-width:760px;font-size:12px">' +
      '<thead><tr>' + headers.map(([label, tip]) => language.header(label, tip)).join('') + '</tr></thead>' +
      '<tbody>' + rows.map((cells) => '<tr>' + cells.map((cell) => '<td style="padding:9px;border-bottom:1px solid #1f2937;color:#e5e7eb">' + esc(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }

  function setSummary(key, value) {
    const element = document.querySelector('#product-analytics-summary [data-pa="' + key + '"]');
    if (element) element.textContent = value;
  }

  window.renderExperimentsAndReliability = function renderExperimentsAndReliability(experiments, reliability) {
    const experimentsRoot = document.getElementById('product-analytics-experiments');
    const reliabilityRoot = document.getElementById('product-analytics-reliability');
    const exposures = Array.isArray(experiments?.exposures) ? experiments.exposures : [];
    const adoption = Array.isArray(reliability?.releaseAdoption) ? reliability.releaseAdoption : [];
    const failures = Array.isArray(reliability?.operationFailures) ? reliability.operationFailures : [];
    if (experimentsRoot) experimentsRoot.innerHTML =
      '<div class="notice warning">Экспозиция показывает фактический показ варианта, но сама по себе не доказывает эффект. Автоматический победитель отключён. Серверная выручка по вариантам недоступна без governed cross-source join.</div><div style="overflow:auto">' + table([
        ['Эксперимент', 'Неизменяемый ID паспорта.'], ['Версия', 'Версия определения.'], ['Вариант', 'Фактически показанный вариант.'], ['Контроль', 'Заранее заданная контрольная группа.'], ['Показы', 'Уникальные exposure ID.'], ['Выборка', 'Экземпляры приложения с согласием.'],
      ], exposures.map((row) => [row.experiment_id, number(row.definition_version), row.variant_id, row.control_variant_id, number(row.exposures), number(row.consented_app_instances)])) + '</div>';
    if (reliabilityRoot) reliabilityRoot.innerHTML =
      '<div class="notice warning">Crash-free users, crash-free sessions и ANR недоступны: официальный aggregate export Crashlytics не подключён. Отсутствие записанных ошибок не означает 100% стабильность.</div>' +
      '<h4>Принятие версий</h4><div style="overflow:auto">' + table([
        ['Версия', 'Версия приложения.'], ['Сборка', 'Номер сборки.'], ['Платформа', 'iOS или Android.'], ['Установки', 'Экземпляры приложения с согласием.'], ['Сессии', 'Наблюдаемые consented-сессии.'],
      ], adoption.map((row) => [row.app_version, row.build_number, row.platform, number(row.consented_app_instances), number(row.consented_sessions)])) + '</div>' +
      '<h4>Нормализованные сбои</h4><div style="overflow:auto">' + table([
        ['Версия', 'Версия и сборка.'], ['Функция', 'Allowlisted feature.'], ['Операция', 'Allowlisted operation.'], ['Код', 'Нормализованный код без raw error.'], ['Сбои', 'Количество событий.'], ['Затронуто', 'Consented app instances.'],
      ], failures.map((row) => [row.app_version + ' (' + row.build_number + ')', row.feature, row.operation, row.failure_code, number(row.failures), number(row.affected_consented_app_instances)])) + '</div>';
  };

  window.loadProductAnalytics = async function loadProductAnalytics(force = false) {
    if (window._productAnalyticsLoading || (window._productAnalyticsLoaded && !force)) return;
    const status = document.getElementById('product-analytics-status');
    const screensEl = document.getElementById('product-analytics-screens');
    const lessonsEl = document.getElementById('product-analytics-lessons');
    const qualityEl = document.getElementById('product-analytics-quality');
    if (!status || !screensEl || !lessonsEl || !qualityEl) return;
    if (typeof window.callAdminProductAnalytics !== 'function') {
      status.textContent = 'Сервис аналитики ещё запускается. Нажмите «Обновить данные» через несколько секунд.';
      return;
    }

    window._productAnalyticsLoading = true;
    status.textContent = 'Загружаем события пользователей, разрешивших аналитику…';
    status.style.color = '#94a3b8';
    try {
      const rangeDays = Number(document.getElementById('product-analytics-range')?.value || 28);
      const platform = document.getElementById('product-analytics-platform')?.value || 'all';
      const response = await window.callAdminProductAnalytics({ rangeDays, platform });
      const data = response?.data || {};
      const quality = data.quality || {};
      const screens = Array.isArray(data.screens) ? data.screens : [];
      const lessons = Array.isArray(data.lessons) ? data.lessons : [];

      setSummary('instances', number(quality.consented_app_instances));
      setSummary('sessions', number(quality.sessions));
      setSummary('views', number(quality.screen_views));
      setSummary('unknown', percent(quality.unknown_screen_rate));
      screensEl.innerHTML = table([
        ['Экран', 'Понятное название экрана приложения.'],
        ['Показы экрана', 'Сколько раз этот экран был открыт.'],
        ['Установки приложения', 'Сколько установок приложения открывали экран. Это не гарантированно уникальные люди.'],
        ['Последний экран в сессии', 'Сколько раз экран был последним полученным событием сессии. Это не доказывает закрытие или удаление приложения.'],
        ['Доля последних экранов', 'Доля показов, после которых мы не получили следующий экран в этой сессии.'],
        ['Среднее время', 'Среднее наблюдаемое время между открытием экрана и следующим событием.'],
        ['У половины', 'Половина наблюдаемых посещений экрана длилась не больше этого времени.'],
        ['У 90%', '90% наблюдаемых посещений экрана длились не больше этого времени.'],
      ], screens.map((row) => [language.label('screen', row.screen_id), number(row.views), number(row.app_instances), number(row.exits), percent(row.exit_rate), duration(row.avg_duration_ms), duration(row.p50_duration_ms), duration(row.p90_duration_ms)]));
      lessonsEl.innerHTML = table([
        ['Урок', 'Номер или внутреннее название урока.'],
        ['Начали', 'Сколько запусков урока было получено.'],
        ['Завершили', 'Сколько раз урок дошёл до события завершения.'],
        ['Явно вышли', 'Сколько раз пользователь явно вышел из незавершённого урока.'],
        ['Доля завершений', 'Какая доля начатых уроков была завершена.'],
        ['Средняя фраза выхода', 'Средняя позиция фразы, на которой пользователь явно вышел.'],
      ], lessons.map((row) => [number(row.lesson_id), number(row.starts), number(row.completes), number(row.abandons), percent(row.completion_rate), number(row.avg_abandon_phrase)]));
      qualityEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">' +
        language.explain('Нераспознанные экраны: ' + number(quality.unknown_screen_views), 'События просмотра, название экрана которых отсутствует в текущем справочнике.', 'div') +
        language.explain('Без номера события: ' + number(quality.missing_event_ids), 'События без уникального номера; их сложнее защитить от повторного подсчёта.', 'div') +
        language.explain('Без номера сессии: ' + number(quality.missing_session_ids), 'События, которые нельзя надёжно объединить в одну сессию.', 'div') +
        language.explain('Повторные события: ' + number(quality.duplicate_events), 'Повторы с одинаковым номером события, исключённые из чистого подсчёта.', 'div') +
        language.explain('Неверный формат: ' + number(quality.invalid_schema_events), 'События, структура которых не соответствует ожидаемому формату.', 'div') +
        language.explain('Источник: ежедневная выгрузка', 'Данные обновляются после ежедневной выгрузки Firebase Analytics, а не мгновенно.', 'div') + '</div>';
      if (typeof window.renderProductSessions === 'function') window.renderProductSessions(data.sessions || {});
      if (typeof window.renderLearningDiagnostics === 'function') window.renderLearningDiagnostics(data.learningDropoff || {});
      if (typeof window.renderConversionDiagnostics === 'function') window.renderConversionDiagnostics(data.behavioralConversion || {});
      if (typeof window.renderRetentionDiagnostics === 'function') window.renderRetentionDiagnostics(
        data.trueRetention || {},
        data.observedReturn || {},
        data.activation || {},
        data.acquisition || {},
        quality,
      );
      if (typeof window.renderExperimentsAndReliability === 'function') window.renderExperimentsAndReliability(data.experiments || {}, data.reliability || {});

      const dataThrough = Number(data.dataThroughMs);
      const dataThroughText = Number.isFinite(dataThrough) && dataThrough > 0
        ? 'Данные по ' + new Date(dataThrough).toLocaleString('ru-RU')
        : 'Первая ежедневная выгрузка ещё не готова';
      const platformText = platform === 'all' ? 'все платформы' : platform;
      status.textContent = dataThroughText + ' · период ' + rangeDays + ' дней · ' + platformText;
      status.style.color = '#4ade80';
      window._productAnalyticsLoaded = true;
    } catch (error) {
      const code = String(error?.code || '');
      console.error('[Admin product analytics]', error);
      status.textContent = code.includes('failed-precondition')
        ? 'Хранилище аналитики ещё не настроено. Обратитесь к разработчику или администратору Firebase.'
        : code.includes('permission-denied') || code.includes('unauthenticated')
          ? 'Недостаточно прав для просмотра аналитики. Войдите под учётной записью администратора.'
          : 'Не удалось загрузить аналитику продукта. Повторите попытку позже.';
      status.style.color = '#f87171';
    } finally {
      window._productAnalyticsLoading = false;
    }
  };
})();
