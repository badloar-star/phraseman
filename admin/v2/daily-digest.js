(function dailyDigestAdminV2() {
  'use strict';

  const STYLE_ID = 'admin-v2-daily-digest-styles';
  const STYLE_TEXT = `
    #tab-daily-digest .dd-summary-sections { display:grid; gap:10px; min-width:0; }
    #tab-daily-digest .dd-summary-section {
      --dd-accent:#60a5fa;
      --dd-surface:rgba(96,165,250,.07);
      min-width:0;
      padding:15px 17px;
      overflow-wrap:anywhere;
      background:var(--dd-surface);
      border:1px solid rgba(148,163,184,.18);
      border-left:3px solid var(--dd-accent);
      border-radius:10px;
    }
    #tab-daily-digest .dd-summary-section h3 {
      margin:0 0 7px;
      color:var(--dd-accent);
      font-size:13px;
      font-weight:800;
      letter-spacing:.035em;
      text-transform:uppercase;
    }
    #tab-daily-digest .dd-summary-section p {
      margin:0;
      max-width:82ch;
      color:#dbe4f0;
      font-size:14.5px;
      line-height:1.7;
      white-space:pre-line;
    }
    #tab-daily-digest .digest-summary--growth { --dd-accent:#5eead4; --dd-surface:rgba(45,212,191,.07); }
    #tab-daily-digest .digest-summary--quality { --dd-accent:#a78bfa; --dd-surface:rgba(167,139,250,.07); }
    #tab-daily-digest .digest-summary--risk { --dd-accent:#f87171; --dd-surface:rgba(248,113,113,.07); }
    #tab-daily-digest .digest-summary--action { --dd-accent:#fbbf24; --dd-surface:rgba(251,191,36,.07); }
    #tab-daily-digest .digest-summary--blind { --dd-accent:#94a3b8; --dd-surface:rgba(148,163,184,.06); }
    #tab-daily-digest .digest-summary--neutral { --dd-accent:#60a5fa; --dd-surface:rgba(96,165,250,.06); }
  `;

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseSummarySections(summary) {
    const text = String(summary || '').replace(/\r\n?/g, '\n').trim();
    if (!text) return [];
    const definitions = [
      { key: 'neutral', title: 'Главное', labels: ['ГЛАВНОЕ', 'КРАТКО', 'СВОДКА'] },
      { key: 'growth', title: 'Рост и деньги', labels: ['РОСТ И ДЕНЬГИ', 'РОСТ И ВЫРУЧКА'] },
      { key: 'quality', title: 'Качество и пользователи', labels: ['КАЧЕСТВО И ПОЛЬЗОВАТЕЛИ', 'КАЧЕСТВО И РИСКИ'] },
      { key: 'risk', title: 'Риски и очереди', labels: ['РИСКИ И ОЧЕРЕДИ', 'РИСКИ'] },
      { key: 'action', title: 'Что сделать', labels: ['ЧТО СДЕЛАТЬ', 'ДЕЙСТВИЯ'] },
      { key: 'blind', title: 'Слепые зоны', labels: ['СЛЕПЫЕ ЗОНЫ', 'НЕТ ДАННЫХ'] },
    ];
    const byLabel = new Map();
    definitions.forEach((definition) => definition.labels.forEach((label) => byLabel.set(label, definition)));
    const labelPattern = Array.from(byLabel.keys())
      .sort((a, b) => b.length - a.length)
      .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const headingPattern = new RegExp(`^\\s*(${labelPattern})(?:\\s*:\\s*|\\s+|\\s*$)(.*)$`, 'i');
    const sections = [];
    let current = null;
    let recognized = false;
    text.split('\n').forEach((line) => {
      const match = line.match(headingPattern);
      if (match) {
        const definition = byLabel.get(String(match[1]).toUpperCase());
        current = { key: definition.key, title: definition.title, lines: [] };
        sections.push(current);
        recognized = true;
        if (match[2]) current.lines.push(match[2]);
        return;
      }
      if (!current) {
        current = { key: 'neutral', title: 'Главное', lines: [] };
        sections.push(current);
      }
      current.lines.push(line);
    });
    if (!recognized) return [{ key: 'neutral', title: 'Главное', body: text }];
    return sections
      .map((section) => ({ key: section.key, title: section.title, body: section.lines.join('\n').trim() }))
      .filter((section) => section.body);
  }

  function renderSummarySections(summary) {
    const sections = parseSummarySections(summary);
    if (!sections.length) return '<div class="dd-summary-sections"><section class="dd-summary-section digest-summary--neutral"><h3>Главное</h3><p>Пусто</p></section></div>';
    return `<div class="dd-summary-sections">${sections.map((section) => `
      <section class="dd-summary-section digest-summary--${section.key}">
        <h3>${esc(section.title)}</h3>
        <p>${esc(section.body)}</p>
      </section>`).join('')}</div>`;
  }

  function installStyles() {
    if (!document?.head || document.getElementById?.(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
  }

  installStyles();
  window.AdminDailyDigestV2 = Object.freeze({ parseSummarySections, renderSummarySections });
})();
