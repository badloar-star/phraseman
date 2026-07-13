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

  window.loadProductAnalytics = async function loadProductAnalytics(force = false) {
    if (window._productAnalyticsLoading || (window._productAnalyticsLoaded && !force)) return;
    const status = document.getElementById('product-analytics-status');
    const screensEl = document.getElementById('product-analytics-screens');
    const lessonsEl = document.getElementById('product-analytics-lessons');
    const qualityEl = document.getElementById('product-analytics-quality');
    const softUpsellsEl = document.getElementById('product-analytics-soft-upsells');
    if (!status || !screensEl || !lessonsEl || !qualityEl || !softUpsellsEl) return;
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
      const softUpsells = data.softUpsells || {};

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
      const softHeaders = [
        ['Триггер', 'Точная причина показа мягкого предложения.'],
        ['Eligible events', 'Сколько раз триггер прошёл продуктовые условия до попытки показа.'],
        ['Eligible app instances', 'Сколько установок приложения с согласием на аналитику дали хотя бы одно eligible-событие. Это не обязательно уникальные люди.'],
        ['Показы', 'Уникальные soft_upsell_impression_id с фактическим показом.'],
        ['Клик soft CTA', 'Нажатия основной кнопки в мягком предложении.'],
        ['Закрыли', 'Цепочки, в которых пользователь выбрал «Не сейчас» или закрыл предложение.'],
        ['Открылся paywall', 'Количество открытий и reach: paywall shown / soft CTA.'],
        ['CTA paywall', 'Цепочки с нажатием кнопки покупки на paywall.'],
        ['Старт магазина', 'Цепочки, дошедшие до системного окна магазина.'],
        ['Ожидает', 'Покупка отправлена на подтверждение, но entitlement ещё не активен.'],
        ['Trial', 'Подтверждённый годовой семидневный trial.'],
        ['Оплачено', 'Подтверждённая платная подписка или lifetime без trial.'],
        ['Выбрали M/Y/L', 'Сколько цепочек содержали paywall_plan_select для monthly / yearly / lifetime.'],
        ['Купили M/Y/L', 'Подтверждённые purchase_completed по monthly / yearly / lifetime.'],
        ['Всего покупок', 'Подтверждённая активация trial или платной подписки.'],
        ['Конверсия', 'Покупки / фактические показы soft upsell.'],
      ];
      const renderSoftMode = (title, mode, warning) => {
        const rows = Array.isArray(softUpsells[mode]) ? softUpsells[mode] : [];
        return '<h4 style="margin:16px 0 8px">' + esc(title) + '</h4>' +
          (warning ? '<div class="notice warning">' + esc(warning) + '</div>' : '') +
          table(softHeaders, rows.map((row) => [
            row.trigger, number(row.eligible_events), number(row.eligible_app_instances), number(row.impressions) + ' · ' + percent(row.eligible_to_impression_rate), number(row.soft_cta_clicks) + ' · ' + percent(row.soft_cta_rate),
            number(row.dismissals) + ' · ' + percent(row.dismiss_rate),
            number(row.paywall_shows) + ' · ' + percent(row.paywall_reach_rate), number(row.paywall_cta_clicks), number(row.purchase_starts),
            number(row.pending_purchases), number(row.trials), number(row.paid_activations),
            [row.monthly_selections, row.yearly_selections, row.lifetime_selections].map(number).join(' / '),
            [row.monthly_activations, row.yearly_activations, row.lifetime_activations].map(number).join(' / '),
            number(row.purchases), percent(row.purchase_rate),
          ]));
      };
      const softDiagnosticsHeaders = [
        ['Триггер', 'Точная причина показа мягкого предложения.'],
        ['Закрыли paywall', 'Обычное закрытие paywall.'],
        ['Остались бесплатно', 'Явный выбор продолжить бесплатно.'],
        ['Close rate', 'Обычные закрытия / фактические показы paywall.'],
        ['Continue free rate', 'Явный выбор продолжить бесплатно / фактические показы paywall.'],
        ['Ошибка', 'Классифицированный отказ магазина или инфраструктуры.'],
        ['Отмена', 'Пользователь отменил системный диалог покупки.'],
        ['Trial / показы', 'Подтверждённые годовые trial / фактические показы.'],
        ['Покупки / soft CTA', 'Подтверждённые активации / нажатия soft CTA.'],
        ['До soft CTA', 'Медианное время от фактического показа до soft CTA.'],
        ['До результата', 'Медианное время от фактического показа до результата магазина.'],
      ];
      const renderSoftDiagnostics = (title, mode) => {
        const rows = Array.isArray(softUpsells[mode]) ? softUpsells[mode] : [];
        return '<h5 style="margin:12px 0 6px">' + esc(title) + ': причины потерь и скорость решения</h5>' +
          table(softDiagnosticsHeaders, rows.map((row) => [
            row.trigger, number(row.closes), number(row.continue_free), percent(row.paywall_close_rate), percent(row.continue_free_rate), number(row.failures), number(row.cancellations),
            percent(row.trial_rate), percent(row.cta_to_purchase_rate),
            duration(row.median_impression_to_cta_ms), duration(row.median_impression_to_result_ms),
          ]));
      };
      const softQuality = softUpsells.quality || {};
      const renderSelectedSoftMode = () => {
        const selectedMode = window._productAnalyticsSoftMode === 'test' ? 'test' : 'production';
        window._productAnalyticsSoftMode = selectedMode;
        const title = selectedMode === 'test' ? 'Test' : 'Production';
        const warning = selectedMode === 'test'
          ? 'Ручные проверки из админки. Эти данные полностью отделены от Production funnel.'
          : '';
        const controls = '<div role="tablist" aria-label="Режим soft upsell funnel" style="display:flex;gap:8px;margin:12px 0">' +
          ['production', 'test'].map((mode) => {
            const active = mode === selectedMode;
            const label = mode === 'production' ? 'Production' : 'Test';
            return '<button type="button" data-soft-mode="' + mode + '" aria-selected="' + String(active) + '" style="padding:8px 14px;border-radius:10px;border:1px solid ' + (active ? '#f5c76b' : '#334155') + ';background:' + (active ? '#2a2417' : '#111827') + ';color:' + (active ? '#f5c76b' : '#cbd5e1') + ';cursor:pointer">' + label + '</button>';
          }).join('') + '</div>';
        softUpsellsEl.innerHTML = controls + renderSoftMode(title, selectedMode, warning) +
          renderSoftDiagnostics(title, selectedMode) +
        '<p class="hint">RevenueCat остаётся источником истины по оплате; эта таблица показывает только согласованную in-app атрибуцию.</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">' +
        language.explain('Отклонено цепочек: ' + number(softQuality.rejected_chain_ids), 'ID с неполными, неверными или конфликтующими trigger/context/mode исключены целиком.', 'div') +
        language.explain('Конфликтующих ID: ' + number(softQuality.conflicting_chain_ids), 'Один ID сообщил разные режимы или метаданные; такая цепочка не считается.', 'div') +
        language.explain('CTA без показа: ' + number(softQuality.cta_without_impression), 'Soft CTA есть, но фактический impression не зафиксирован.', 'div') +
        language.explain('Paywall без soft CTA: ' + number(softQuality.paywall_without_soft_cta), 'Paywall получил ID цепочки без предшествующего soft CTA.', 'div') +
        language.explain('Результат без старта: ' + number(softQuality.outcome_without_purchase_start), 'Результат магазина есть, но purchase_started отсутствует.', 'div') +
        language.explain('Незавершённые цепочки: ' + number(softQuality.partial_open_chains), 'Показ зафиксирован, но пока нет ни CTA, ни закрытия.', 'div') + '</div>';
        softUpsellsEl.querySelectorAll('[data-soft-mode]').forEach((button) => {
          button.addEventListener('click', () => {
            window._productAnalyticsSoftMode = button.getAttribute('data-soft-mode') === 'test' ? 'test' : 'production';
            renderSelectedSoftMode();
          });
        });
      };
      renderSelectedSoftMode();
      qualityEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">' +
        language.explain('Нераспознанные экраны: ' + number(quality.unknown_screen_views), 'События просмотра, название экрана которых отсутствует в текущем справочнике.', 'div') +
        language.explain('Без номера события: ' + number(quality.missing_event_ids), 'События без уникального номера; их сложнее защитить от повторного подсчёта.', 'div') +
        language.explain('Soft-цепочки без event_id: ' + number(quality.missing_soft_event_ids), 'Такие события не входят в точную коммерческую воронку, пока их нельзя надёжно дедуплицировать.', 'div') +
        language.explain('Неверный режим soft-цепочки: ' + number(quality.invalid_soft_modes), 'Допустимы только Production или Test; неизвестные режимы исключаются.', 'div') +
        language.explain('Без номера сессии: ' + number(quality.missing_session_ids), 'События, которые нельзя надёжно объединить в одну сессию.', 'div') +
        language.explain('Повторные события: ' + number(quality.duplicate_events), 'Повторы с одинаковым номером события, исключённые из чистого подсчёта.', 'div') +
        language.explain('Неверный формат: ' + number(quality.invalid_schema_events), 'События, структура которых не соответствует ожидаемому формату.', 'div') +
        language.explain('Источник: ежедневная выгрузка', 'Данные обновляются после ежедневной выгрузки Firebase Analytics, а не мгновенно.', 'div') + '</div>';
      if (typeof window.renderProductSessions === 'function') window.renderProductSessions(data.sessions || {});
      if (typeof window.renderLearningDiagnostics === 'function') window.renderLearningDiagnostics(data.learningDropoff || {});
      if (typeof window.renderConversionDiagnostics === 'function') window.renderConversionDiagnostics(data.behavioralConversion || {});
      if (typeof window.renderRetentionDiagnostics === 'function') window.renderRetentionDiagnostics(data.observedReturn || {});

      const dataThrough = Number(data.dataThroughMs);
      const dataThroughText = Number.isFinite(dataThrough) && dataThrough > 0 ? new Date(dataThrough).toLocaleString('ru-RU') : 'выгруженных событий пока нет';
      const platformText = platform === 'all' ? 'все платформы' : platform;
      status.textContent = 'Данные по ' + dataThroughText + ' · ежедневная выгрузка · период ' + rangeDays + ' дней · ' + platformText;
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
