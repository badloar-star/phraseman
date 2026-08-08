/**
 * English Level Test Analytics — Admin V2 Page
 * Embedded inside admin router, uses existing auth.
 */

(function (global) {
  'use strict';

  let currentData = null;

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString('ru-RU');
  }

  function renderStats(data) {
    const funnel = data.funnel || {};
    const total = funnel.landing || 1;
    const ctaTracked = funnel.cta_view !== undefined || funnel.cta_click !== undefined || funnel.cert_reopen !== undefined;
    const stats = [
      { label: 'Landing', value: funnel.landing || 0 },
      { label: 'Start', value: funnel.start || 0 },
      { label: 'Вопрос 1', value: funnel.view1 || 0 },
      { label: 'Вопрос 5', value: funnel.view5 || 0 },
      { label: 'Вопрос 10', value: funnel.view10 || 0 },
      { label: 'Вопрос 15', value: funnel.view15 || 0 },
      { label: 'Вопрос 18', value: funnel.view18 || 0 },
      { label: 'Complete', value: funnel.complete || 0 },
      { label: 'Сертификат', value: funnel.certificate || 0 },
      { label: 'Увидели CTA', value: funnel.cta_view || 0 },
      { label: 'Клик по магазину', value: funnel.cta_click || 0 },
      { label: 'Вернулись за сертификатом', value: funnel.cert_reopen || 0 },
      { label: 'Share', value: funnel.share || 0 },
    ];

    let html = '<section class="metrics section">';
    for (const s of stats) {
      const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
      html += `
        <article class="card metric">
          <label>${escapeHtml(s.label)}</label>
          <strong>${formatNumber(s.value)}</strong>
          <span class="badge">${pct}%</span>
        </article>
      `;
    }
    html += '</section>';

    // Funnel table
    html += '<div class="card" style="margin-top:20px"><h3>Воронка</h3><table class="data-table"><thead><tr><th>Этап</th><th>Количество</th><th>От landing</th><th>От предыдущего</th></tr></thead><tbody>';
    let prev = 0;
    for (const s of stats) {
      const fromLanding = total > 0 ? Math.round((s.value / total) * 100) : 0;
      const fromPrev = prev > 0 ? Math.round((s.value / prev) * 100) : (s.value > 0 ? 100 : 0);
      html += `<tr><td>${escapeHtml(s.label)}</td><td>${formatNumber(s.value)}</td><td>${fromLanding}%</td><td>${fromPrev}%</td></tr>`;
      prev = s.value;
    }
    html += '</tbody></table></div>';

    if (!ctaTracked) {
      html += '<p class="hint" style="margin-top:12px">Этапы «Увидели CTA», «Клик по магазину» и «Вернулись за сертификатом» покажут числа, когда серверная агрегация начнёт считать события cta_view, cta_click и cert_reopen. Сайт уже отправляет их от пользователей, давших согласие на аналитику.</p>';
    }

    // Levels
    const levels = data.levels || {};
    html += '<div class="card" style="margin-top:20px"><h3>Распределение уровней</h3><table class="data-table"><thead><tr><th>Уровень</th><th>Количество</th></tr></thead><tbody>';
    for (const lv of ['A1','A2','B1','B2','C1','C2']) {
      html += `<tr><td>${lv}</td><td>${formatNumber(levels[lv])}</td></tr>`;
    }
    html += '</tbody></table></div>';

    if (data.truncated) {
      html += '<p style="color:var(--danger);font-size:0.85rem;margin-top:12px">⚠️ Данные частичные: достигнут лимит выборки.</p>';
    }

    return html;
  }

  async function loadData(period, force) {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = '<div class="notice" role="status">Загрузка…</div>';

    try {
      // Use existing admin callable infrastructure
      const fn = globalThis.callAdminFunction || globalThis.adminActions?.callFunction;
      if (!fn) {
        app.innerHTML = '<div class="notice warning">Авторизация требуется. Войдите в админку.</div>';
        return;
      }

      const result = await fn('adminEnglishTestAnalytics', { period, force });
      currentData = result?.data || result;

      let html = `
        <div class="section" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
          <label>Период:
            <select id="elt-period" style="margin-left:6px">
              <option value="7" ${period === 7 ? 'selected' : ''}>7 дней</option>
              <option value="28" ${period === 28 ? 'selected' : ''}>28 дней</option>
              <option value="90" ${period === 90 ? 'selected' : ''}>90 дней</option>
            </select>
          </label>
          <button class="button" id="elt-refresh" type="button">Обновить</button>
          <span style="color:#888;font-size:0.85rem">${escapeHtml(new Date().toLocaleString('ru-RU'))}</span>
        </div>
      `;
      html += renderStats(currentData);
      app.innerHTML = html;

      document.getElementById('elt-period')?.addEventListener('change', (e) => {
        loadData(Number(e.target.value), true);
      });
      document.getElementById('elt-refresh')?.addEventListener('click', () => {
        const p = Number(document.getElementById('elt-period')?.value || 28);
        loadData(p, true);
      });
    } catch (e) {
      app.innerHTML = `<div class="notice danger">Ошибка: ${escapeHtml(e.message || 'неизвестная ошибка')}</div>`;
    }
  }

  global.loadEnglishTestAnalytics = function () {
    loadData(28, false);
  };
})(typeof window !== 'undefined' ? window : globalThis);
