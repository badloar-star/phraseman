(function subscriptionAnalyticsAdminV2() {
  'use strict';

  const language = window.AdminAnalyticsLanguage;
  const esc = language.esc;
  const num = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU') : '–';
  const card = (label, value, note) => language.metricCard(label, num(value), note);

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
      content.innerHTML = '<div style="padding:10px 12px;border:1px solid #293548;border-radius:9px;color:#cbd5e1;font-size:12px;line-height:1.55;margin:10px 0"><b>Отключение продления</b> означает, что следующего автоматического платежа не будет, но уже оплаченный доступ может продолжаться. <b>Окончание доступа</b> означает, что RevenueCat сообщил о завершении права доступа. Причины доступны только у новых серверных событий после выпуска этой детализации; старую историю восстановить нельзя. Мы не связываем отмену подписки с конкретным экраном приложения.</div>' +
        '<div class="an2-grid" style="margin-bottom:12px">' +
          card('Начали подписку', m.purchases, 'Первые покупки возобновляемой подписки.') +
          card('Купили доступ навсегда', m.lifetimePurchases, 'Разовые покупки пожизненного доступа без продления.') +
          card('Продления', m.renewals, 'Успешные повторные списания по действующей подписке.') +
          card('Отключили будущее продление', m.cancellations, 'Автоматическое продление отключено, но оплаченный доступ может ещё действовать.') +
          card('Возобновили продление', m.uncancellations, 'Пользователь снова включил автоматическое продление.') +
          card('Проблемы со списанием', m.billingIssues, 'RevenueCat сообщил о проблеме при попытке очередного платежа.') +
          card('Доступ закончился', m.expirations, 'RevenueCat сообщил, что оплаченный доступ завершился.') +
          card('Возвраты денег', m.refunds, 'События полного или частичного возврата платежа.') +
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
