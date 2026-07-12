(function initAppCodex() {
  'use strict';
  let model = null;

  const KIND_LABELS = {
    screen: 'Экран', admin_tab: 'Раздел админки', firestore_path: 'Данные',
    callable: 'Серверная функция', event: 'Событие', metric: 'Метрика',
  };

  function escapeText(value) {
    const node = document.createElement('span');
    node.textContent = String(value == null ? '' : value);
    return node.innerHTML;
  }

  function installStyles() {
    if (document.getElementById('app-codex-styles')) return;
    const style = document.createElement('style');
    style.id = 'app-codex-styles';
    style.textContent = `
      #app-codex-freshness { margin-bottom:12px; padding:11px 13px; border:1px solid #282d38; border-radius:10px; background:#11141b; color:#d4d4d8; font-size:12px; line-height:1.55; }
      .app-codex-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:10px; }
      .app-codex-card { background:#11141b; border:1px solid #282d38; border-radius:10px; padding:14px; min-width:0; }
      .app-codex-kind { font-size:10px; color:#93c5fd; text-transform:uppercase; letter-spacing:.5px; font-weight:800; }
      .app-codex-name { margin-top:5px; color:#f4f4f5; font-size:14px; font-weight:800; overflow-wrap:anywhere; }
      .app-codex-description { margin-top:7px; color:#a1a1aa; font-size:12px; line-height:1.55; }
      .app-codex-tech { margin-top:9px; padding-top:8px; border-top:1px solid #282d38; color:#71717a; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:10px; overflow-wrap:anywhere; }
      .app-codex-empty { padding:24px; border:1px dashed #3f3f46; border-radius:10px; color:#a1a1aa; text-align:center; }
      @media (max-width:600px) { .app-codex-grid { grid-template-columns:1fr; } #app-codex-search { width:100%; } }
    `;
    document.head.appendChild(style);
  }

  function searchableText(entity) {
    return [entity.kind, entity.name, entity.route, entity.sourceFile, entity.description,
      ...(entity.firestorePaths || []), ...(entity.events || []), ...(entity.sourceIds || [])]
      .filter(Boolean).join(' ').toLocaleLowerCase('ru');
  }

  function render() {
    installStyles();
    const results = document.getElementById('app-codex-results');
    const count = document.getElementById('app-codex-count');
    const freshness = document.getElementById('app-codex-freshness');
    if (!results || !freshness || !model) return;
    const query = String(document.getElementById('app-codex-search')?.value || '').trim().toLocaleLowerCase('ru');
    const kind = String(document.getElementById('app-codex-kind')?.value || '');
    const filtered = (model.entities || []).filter((entity) => (!kind || entity.kind === kind) && (!query || searchableText(entity).includes(query)));
    if (count) count.textContent = `${filtered.length} / ${(model.entities || []).length}`;
    freshness.innerHTML = `<strong>Кодекс ${escapeText(model.schemaVersion || '')}</strong> · hash ${escapeText(String(model.sourceHash || '').slice(0, 12))} · экранов ${escapeText(model.stats?.screens || 0)} · разделов админки ${escapeText(model.stats?.adminTabs || 0)} · источников дайджеста ${escapeText(model.coverage?.digestSources?.length || 0)}. Обновляется командой <code>npm run codex:generate</code>.`;
    if (!filtered.length) {
      results.innerHTML = '<div class="app-codex-empty">По этому запросу ничего не найдено.</div>';
      return;
    }
    results.innerHTML = `<div class="app-codex-grid">${filtered.slice(0, 300).map((entity) => `<article class="app-codex-card">
      <div class="app-codex-kind">${escapeText(KIND_LABELS[entity.kind] || entity.kind)}</div>
      <div class="app-codex-name">${escapeText(entity.name)}</div>
      <div class="app-codex-description">${escapeText(entity.description || 'Описание формируется из исходного кода.')}</div>
      <div class="app-codex-tech">${escapeText(entity.route || entity.sourceFile || entity.id)}</div>
    </article>`).join('')}</div>`;
  }

  window.loadAppCodex = async function loadAppCodex(force) {
    if (model && !force) { render(); return; }
    const results = document.getElementById('app-codex-results');
    if (results) results.innerHTML = '<div class="reports-empty">Загрузка Кодекса…</div>';
    try {
      const response = await fetch(`generated/app-codex.json${force ? `?v=${Date.now()}` : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      model = await response.json();
      render();
    } catch (error) {
      if (results) results.innerHTML = `<div class="app-codex-empty">Не удалось загрузить Кодекс: ${escapeText(error?.message || error)}</div>`;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app-codex-search')?.addEventListener('input', render);
    document.getElementById('app-codex-kind')?.addEventListener('change', render);
  });
})();
