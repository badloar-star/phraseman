(function () {
  'use strict';

  var HEADING_RULES = [
    { key: 'growth', title: 'Рост и деньги', pattern: /^(РОСТ И ДЕНЬГИ)$/i },
    { key: 'quality', title: 'Качество', pattern: /^(КАЧЕСТВО(?: И (?:РИСКИ|СТАБИЛЬНОСТЬ))?)$/i },
    { key: 'risk', title: 'Риски и очереди', pattern: /^(РИСКИ И ОЧЕРЕДИ)$/i },
    { key: 'action', title: 'Что сделать', pattern: /^(ЧТО СДЕЛАТЬ|ДЕЙСТВИЯ)$/i },
    { key: 'blind', title: 'Слепые зоны', pattern: /^(СЛЕПЫЕ ЗОНЫ)$/i },
  ];

  function escapeHtml(value) {
    if (window.AdminAnalyticsLanguage) return window.AdminAnalyticsLanguage.escapeHtml(value);
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function parseHeading(line) {
    var match = String(line || '').trim().match(/^([^:]{1,80})(?:\s*:\s*(.*))?$/);
    if (!match) return null;
    var heading = match[1].trim();
    for (var index = 0; index < HEADING_RULES.length; index += 1) {
      var rule = HEADING_RULES[index];
      if (rule.pattern.test(heading)) return { key: rule.key, title: rule.title, tail: (match[2] || '').trim() };
    }
    return null;
  }

  function parseSummarySections(value) {
    var text = String(value == null ? '' : value).replace(/\r\n?/g, '\n').trim();
    if (!text) return [];
    var sections = [];
    var current = { key: 'neutral', title: 'Главное', lines: [] };
    function flush() {
      var body = current.lines.join('\n').trim();
      if (body) sections.push({ key: current.key, title: current.title, body: body });
    }
    text.split('\n').forEach(function (line) {
      var heading = parseHeading(line);
      if (!heading) {
        current.lines.push(line);
        return;
      }
      flush();
      current = { key: heading.key, title: heading.title, lines: heading.tail ? [heading.tail] : [] };
    });
    flush();
    return sections.length ? sections : [{ key: 'neutral', title: 'Главное', body: text }];
  }

  function renderSummarySections(value) {
    var sections = parseSummarySections(value);
    if (!sections.length) return '';
    return '<section class="dd-summary-sections" aria-label="Главные выводы дайджеста">'
      + sections.map(function (section) {
        return '<article class="digest-summary digest-summary--' + escapeHtml(section.key) + '">'
          + '<h3>' + escapeHtml(section.title) + '</h3>'
          + '<p>' + escapeHtml(section.body).replace(/\n/g, '<br>') + '</p></article>';
      }).join('') + '</section>';
  }

  function installStyles() {
    if (typeof document === 'undefined' || document.getElementById('admin-root-daily-digest-styles')) return;
    var style = document.createElement('style');
    style.id = 'admin-root-daily-digest-styles';
    style.textContent = [
      '.dd-summary-sections{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin:12px 0}',
      '.digest-summary{padding:14px 16px;border:1px solid #2a3448;border-left:4px solid #64748b;border-radius:10px;background:#111722}',
      '.digest-summary h3{margin:0 0 7px;color:#f8fafc;font-size:14px}',
      '.digest-summary p{margin:0;color:#d5deea;font-size:13px;line-height:1.6}',
      '.digest-summary--growth{border-left-color:#60a5fa}',
      '.digest-summary--quality{border-left-color:#a78bfa}',
      '.digest-summary--risk{border-left-color:#f87171}',
      '.digest-summary--action{border-left-color:#4ade80}',
      '.digest-summary--blind{border-left-color:#fbbf24}',
      '@media(max-width:640px){.dd-summary-sections{grid-template-columns:1fr}.digest-summary{padding:13px 14px}}',
    ].join('');
    document.head.appendChild(style);
  }

  installStyles();
  window.AdminDailyDigestV2 = Object.freeze({
    parseSummarySections: parseSummarySections,
    renderSummarySections: renderSummarySections,
  });
})();
