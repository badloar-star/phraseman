(function monthlyDecisionPackAdminV2() {
  'use strict';

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function formatBytes(value) {
    const bytes = Number(value);
    return Number.isFinite(bytes) ? (bytes / 1024).toFixed(1) + ' КиБ' : '—';
  }

  function decodeBase64(base64) {
    const binary = atob(String(base64 || ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function renderPreview(data) {
    const root = document.getElementById('monthly-decision-pack-preview');
    if (!root) return;
    const manifest = data?.manifestPreview || {};
    const windowInfo = manifest.reporting_window || {};
    const sources = Object.entries(manifest.sources || {});
    const unavailable = sources.filter(([, source]) => source?.status === 'unavailable');
    const truncated = sources.filter(([, source]) => source?.status === 'truncated_not_decision_grade');
    const warning = windowInfo.preliminary
      ? '<div class="notice warning">preliminary: текущий месяц ещё не завершён; выводы по нему нельзя сравнивать с полным календарным месяцем.</div>'
      : '';
    const gradeWarning = truncated.length
      ? '<div class="notice danger">truncated_not_decision_grade: один или несколько источников достигли лимита. Соответствующие показатели нельзя использовать для решения.</div>'
      : unavailable.length
        ? '<div class="notice warning">Пакет частичный: отсутствующие источники обозначены как unavailable и не считаются нулём.</div>'
        : '<div class="notice success">Все подключённые источники обработаны без известного усечения.</div>';
    root.innerHTML = warning + gradeWarning +
      '<div class="an2-grid" style="margin:12px 0"><article class="an2-card"><div class="an2-kicker">Период</div><div class="an2-value" style="font-size:18px">' + esc(windowInfo.month || '—') + '</div><div class="an2-note">' + esc(windowInfo.timezone || '') + '</div></article>' +
      '<article class="an2-card"><div class="an2-kicker">Размер ZIP</div><div class="an2-value" style="font-size:18px">' + esc(formatBytes(data.byteSize)) + '</div><div class="an2-note">SHA-256: ' + esc(String(data.sha256 || '').slice(0, 16)) + '…</div></article>' +
      '<article class="an2-card"><div class="an2-kicker">Файлы</div><div class="an2-value" style="font-size:18px">' + esc((data.fileList || []).length) + '</div><div class="an2-note">Агрегаты без сырых событий и свободного текста.</div></article></div>' +
      '<h3>Источники</h3><div class="table-scroll"><table style="width:100%;border-collapse:collapse;min-width:680px"><thead><tr><th>Источник</th><th>Статус</th><th>Watermark / причина</th></tr></thead><tbody>' +
      sources.map(([id, source]) => '<tr><td>' + esc(id) + '</td><td>' + esc(source?.status || 'unavailable') + '</td><td>' + esc(source?.reason || (source?.dataThroughMs ? new Date(source.dataThroughMs).toLocaleString('ru-RU') : '—')) + '</td></tr>').join('') +
      '</tbody></table></div><h3>Состав архива</h3><div class="data-list">' +
      (data.fileList || []).map((name) => '<div class="list-row"><code>' + esc(name) + '</code></div>').join('') + '</div>';
  }

  window.initializeMonthlyDecisionPack = function initializeMonthlyDecisionPack() {
    const month = document.getElementById('monthly-decision-pack-month');
    if (month && !month.max) month.max = new Date().toISOString().slice(0, 7);
  };

  window.generateMonthlyDecisionPack = async function generateMonthlyDecisionPack() {
    const status = document.getElementById('monthly-decision-pack-status');
    const button = document.getElementById('monthly-decision-pack-download');
    const month = document.getElementById('monthly-decision-pack-month')?.value || undefined;
    const timezone = document.getElementById('monthly-decision-pack-timezone')?.value || 'UTC';
    if (!status || !button) return;
    if (typeof window.callAdminMonthlyDecisionPack !== 'function') {
      status.textContent = 'Сервис месячной выгрузки ещё запускается. Повторите через несколько секунд.';
      return;
    }
    button.disabled = true;
    status.textContent = 'Собираем календарный месяц, отдельный 12-месячный baseline и проверяем приватность…';
    status.style.color = '#94a3b8';
    try {
      const response = await window.callAdminMonthlyDecisionPack({ month, timezone });
      const data = response?.data || {};
      const bytes = decodeBase64(data.base64);
      const blob = new Blob([bytes], { type: data.mimeType || 'application/zip' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = data.filename || 'phraseman-monthly-decision-pack.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      renderPreview(data);
      status.textContent = 'ZIP сформирован и передан браузеру: ' + (data.filename || '') + '.';
      status.style.color = '#4ade80';
    } catch (error) {
      const code = String(error?.code || '');
      console.error('[Admin monthly decision pack]', error);
      status.textContent = code.includes('resource-exhausted')
        ? 'Пакет превысил безопасный лимит размера. Источники не обрезаны молча; нужна серверная доставка через хранилище.'
        : code.includes('permission-denied') || code.includes('unauthenticated')
          ? 'Недостаточно прав money.read для формирования месячного пакета.'
          : 'Не удалось сформировать пакет. Никакие пользовательские данные не изменялись; повторите попытку позже.';
      status.style.color = '#f87171';
    } finally {
      button.disabled = false;
    }
  };
})();
