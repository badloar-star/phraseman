(function subscriptionAnalyticsAdminV2() {
  'use strict';

  const language = window.AdminAnalyticsLanguage;
  const esc = language.esc;
  const num = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU') : '–';
  const card = (label, value, note) => language.metricCard(label, num(value), note);
  const percent = (value) => value != null && Number.isFinite(Number(value)) ? (Number(value) * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%' : '–';
  const usdMicros = (value) => value != null && Number.isFinite(Number(value))
    ? (Number(value) / 1000000).toLocaleString('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    : 'Недоступно';
  const metric = (label, value, note) => language.metricCard(label, value, note);

  function breakdown(title, explanation, items, labelKind) {
    const body = (items || []).map((row) => '<tr><td style="padding:7px;border-bottom:1px solid #1f2937">' + esc(labelKind ? language.label(labelKind, row.id) : row.id || 'Не определено') + '</td><td style="padding:7px;border-bottom:1px solid #1f2937;text-align:right">' + esc(num(row.events)) + '</td></tr>').join('');
    return '<div class="chart-card" style="overflow:auto"><h3 title="' + esc(explanation) + '" tabindex="0" aria-label="' + esc(title + '. ' + explanation) + '">' + esc(title) + '</h3><table style="width:100%;font-size:12px"><thead><tr>' + language.header('Группа', explanation) + language.header('События', 'Количество серверных событий RevenueCat в этой группе.') + '</tr></thead><tbody>' + (body || '<tr><td colspan="2" class="reports-empty">Событий нет.</td></tr>') + '</tbody></table></div>';
  }

  function qualityItem(label, value, explanation) {
    return language.explain(label + ': ' + num(value), explanation, 'div');
  }

  window.loadSubscriptionAnalytics = async function loadSubscriptionAnalytics(force = false) {
    if (window._subscriptionAnalyticsLoading || (window._subscriptionAnalyticsLoaded && !force)) return;
    const status = document.getElementById('subscription-analytics-status');
    const content = document.getElementById('subscription-analytics-content');
    if (!status || !content) return;
    if (typeof window.callAdminSubscriptionAnalytics !== 'function') {
      status.textContent = 'Сервис данных о подписках ещё запускается. Нажмите «Обновить данные» через несколько секунд.';
      return;
    }
    window._subscriptionAnalyticsLoading = true;
    status.textContent = 'Загружаем серверные события RevenueCat…';
    try {
      const rangeDays = Number(document.getElementById('subscription-analytics-range')?.value || 28);
      const store = document.getElementById('subscription-analytics-store')?.value || 'all';
      const response = await window.callAdminSubscriptionAnalytics({ rangeDays, store });
      const data = response?.data || {};
      const m = data.metrics || {};
      const revenue = data.revenue || {};
      const money = revenue.money || {};
      const trial = revenue.trialToPaid || {};
      const renewals = Array.isArray(revenue.monthlyRenewal) ? revenue.monthlyRenewal : [];
      const ltv = Array.isArray(revenue.ltv) ? revenue.ltv : [];
      const coverage = revenue.coverage || {};
      const renewalCard = (offset) => {
        const row = renewals.find((item) => Number(item.monthOffset) === offset) || {};
        return metric('Продление M' + offset, percent(row.rate), 'Только зрелые цепочки месячной подписки: ' + num(row.renewedChains) + ' из ' + num(row.eligibleChains) + '. Годовые и пожизненные планы исключены.');
      };
      const ltvCard = (days) => {
        const row = ltv.find((item) => Number(item.windowDays) === days) || {};
        return metric('LTV цепочки подписки, ' + days + ' дней', usdMicros(row.ltvGrossUsdMicros), 'Signed gross RevenueCat, включая возвраты. Зрелые цепочки: ' + num(row.maturePaidChains) + '. Это не LTV человека.');
      };
      const financialWarning = revenue.status === 'truncated_not_decision_grade'
        ? '<div class="notice warning section"><strong>Финансовая выборка обрезана безопасным лимитом.</strong><br>Эти показатели имеют статус truncated_not_decision_grade и не подходят для продуктового решения.</div>'
        : '';
      const refundPlanSignal = !m.truncated && Number(m.undatedEvents) === 0 && Number(m.refunds) > 0 && Number.isFinite(Number(data.dataThroughMs))
        ? { metric: 'analytics_subscription_refunds', source: 'revenuecat_subscription_analytics', state: 'ready', count: Number(m.refunds), rangeDays, observedAtMs: Number(data.dataThroughMs) }
        : null;
      if (refundPlanSignal) await window.AdminV2HydrateAnalyticsPlanAction?.(refundPlanSignal);
      const refundPlanAction = refundPlanSignal ? window.AdminV2RenderAnalyticsPlanAction?.(refundPlanSignal) || '' : '';
      content.innerHTML = '<div style="padding:10px 12px;border:1px solid #293548;border-radius:9px;color:#cbd5e1;font-size:12px;line-height:1.55;margin:10px 0"><b>Отключение продления</b> означает, что следующего автоматического платежа не будет, но уже оплаченный доступ может продолжаться. <b>Окончание доступа</b> означает, что RevenueCat сообщил о завершении права доступа. Причины доступны только у новых серверных событий после выпуска этой детализации; старую историю восстановить нельзя. Мы не связываем отмену подписки с конкретным экраном приложения.</div>' +
        financialWarning +
        '<div class="chart-card" style="margin-bottom:12px"><h3 title="Серверно подтверждённые суммы RevenueCat" tabindex="0">Деньги и покрытие</h3><div class="an2-grid">' +
          metric('Подтверждённая gross-выручка', usdMicros(money.grossRevenueUsdMicros), 'Signed gross USD из production-вебхуков RevenueCat, включая отрицательные возвраты.') +
          metric('Оценочные поступления', usdMicros(money.estimatedProceedsUsdMicros), 'Gross минус оценочные налоги и комиссия RevenueCat. Это не чистая прибыль и не финальный отчёт магазина.') +
          metric('ARPPU цепочки подписки', usdMicros(money.arppuGrossUsdMicros), 'Signed gross на уникальную платящую цепочку подписки; не на человека.') +
          metric('Trial → paid', percent(trial.rate), 'Зрелые пробные цепочки: ' + num(trial.convertedTrialChains) + ' из ' + num(trial.eligibleTrialChains) + '; незрелые: ' + num(trial.immatureTrialChains) + '.') +
          metric('Возвраты по транзакциям', percent(money.refundTransactionRate), num(money.refundTransactionCount) + ' возвратов относительно ' + num(money.positiveTransactionCount) + ' положительных транзакций.') +
          metric('Возвраты по сумме', percent(money.refundAmountRate), 'Абсолютная сумма возвратов относительно положительной gross-суммы.') +
        '</div><p class="hint">Финансовое покрытие событий: полное — ' + esc(num(coverage.completeEvents)) + ', частичное — ' + esc(num(coverage.partialEvents)) + ', недоступно/историческое — ' + esc(num(coverage.unavailableEvents)) + '. Цепочки без начала внутри окна: ' + esc(num(revenue.leftTruncatedChains)) + '; они входят в деньги периода, но исключены из продлений и LTV. Финальные поступления магазина не импортированы. ARPU недоступен: нет совместимого знаменателя всей monetizable-аудитории.</p></div>' +
        '<div class="chart-card" style="margin-bottom:12px"><h3 title="Зрелые когорты RevenueCat" tabindex="0">Продления и LTV цепочки подписки</h3><p class="hint">Зрелые цепочки — только те, для которых источник данных уже прошёл конец измеряемого окна. Незрелые когорты не входят в знаменатель.</p><div class="an2-grid">' +
          renewalCard(1) + renewalCard(2) + renewalCard(3) + ltvCard(30) + ltvCard(60) + ltvCard(90) +
        '</div></div>' +
        '<div class="an2-grid" style="margin-bottom:12px">' +
          card('Начали подписку', m.purchases, 'Первые покупки возобновляемой подписки.') +
          card('Купили доступ навсегда', m.lifetimePurchases, 'Разовые покупки пожизненного доступа без продления.') +
          card('Продления', m.renewals, 'Успешные повторные списания по действующей подписке.') +
          card('Отключили будущее продление', m.cancellations, 'Автоматическое продление отключено, но оплаченный доступ может ещё действовать.') +
          card('Возобновили продление', m.uncancellations, 'Пользователь снова включил автоматическое продление.') +
          card('Проблемы со списанием', m.billingIssues, 'RevenueCat сообщил о проблеме при попытке очередного платежа.') +
          card('Доступ закончился', m.expirations, 'RevenueCat сообщил, что оплаченный доступ завершился.') +
          card('Возвраты денег', m.refunds, 'События полного или частичного возврата платежа.') + refundPlanAction +
          card('Переносы доступа', m.transfers, 'Перенос права доступа между идентификаторами. Не входит в разбивку по тарифам и магазинам.') + '</div>' +
        '<div class="chart-card" style="margin-bottom:12px"><h3 title="Насколько надёжно определено время серверных событий" tabindex="0" aria-label="Качество времени событий. Насколько надёжно определено время серверных событий">Качество времени событий</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;font-size:12px">' +
          qualityItem('Без времени самого события', m.missingEventTimestamp, 'RevenueCat не передал время события.') +
          qualityItem('Использовано время получения', m.usedCreatedAtFallback, 'Вместо отсутствующего времени события использовано время записи события сервером.') +
          qualityItem('Исключено событий без даты', m.undatedEvents, 'События без пригодной даты не вошли в расчёты выбранного периода.') + '</div></div>' +
        '<div class="chart-card" style="margin-bottom:12px"><h3 title="Для какой доли событий известна причина" tabindex="0" aria-label="Полнота причин. Для какой доли событий известна причина">Полнота причин</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;font-size:12px">' +
          qualityItem('Отключения продления с причиной', m.cancellationsWithReason, 'Новые события отключения продления, где RevenueCat передал причину.') +
          qualityItem('Причина отключения недоступна в старых данных', m.cancellationReasonUnavailable, 'Исторические события до добавления детализации причин.') +
          qualityItem('Окончания доступа с причиной', m.expirationsWithReason, 'Новые события окончания доступа, где RevenueCat передал причину.') +
          qualityItem('Причина окончания недоступна в старых данных', m.expirationReasonUnavailable, 'Исторические события до добавления детализации причин.') + '</div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:12px">' +
          breakdown('Причины отключения продления', 'Почему было отключено следующее автоматическое продление.', m.byCancellationReason, 'cancelReason') +
          breakdown('Причины окончания доступа', 'Почему RevenueCat сообщил об окончании оплаченного доступа.', m.byExpirationReason, 'expirationReason') + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">' +
          breakdown('По тарифу', 'Количество серверных событий по купленному тарифу.', m.byProduct, 'plan') +
          breakdown('По магазину', 'Количество серверных событий по магазину оплаты.', m.byStore, 'store') +
          breakdown('По типу периода', 'Количество серверных событий по обычному, пробному или льготному периоду.', m.byPeriodType, 'period') + '</div>';
      const through = Number(data.dataThroughMs);
      const completeness = m.truncated ? 'частичные данные: достигнут безопасный предел загрузки' : Number(m.undatedEvents) > 0 ? 'частичные данные: события без даты исключены' : 'все загруженные события периода учтены';
      status.textContent = 'Данные по ' + (Number.isFinite(through) && through > 0 ? new Date(through).toLocaleString('ru-RU') : 'событий с датой пока нет') + ' · ' + completeness;
      status.style.color = m.truncated || Number(m.undatedEvents) > 0 ? '#fbbf24' : '#4ade80';
      window._subscriptionAnalyticsLoaded = true;
    } catch (error) {
      const code = String(error?.code || '');
      console.error('[Admin subscription analytics]', error);
      status.textContent = code.includes('permission-denied') || code.includes('unauthenticated')
        ? 'Недостаточно прав для просмотра подписок. Войдите под учётной записью администратора.'
        : 'Не удалось загрузить историю подписок. Повторите попытку позже.';
      status.style.color = '#f87171';
    } finally {
      window._subscriptionAnalyticsLoading = false;
    }
  };
})();
