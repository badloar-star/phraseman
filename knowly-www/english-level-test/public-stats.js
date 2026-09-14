/* Public level-test completion totals for the visible production landing. */
(function () {
  'use strict';

  const API_URL = '/api/english-test';
  const CACHE_KEY = 'english_test_completed_cache_by_language_v1';
  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'es', label: 'Español' },
  ];

  const stats = document.getElementById('certificate-stats');
  if (!stats) return;
  const status = document.getElementById('certificate-stats-status');
  let currentValues = null;

  function activeLocale() {
    return document.documentElement.lang === 'en' ? 'en-US' : 'ru-RU';
  }

  function translated(key, fallback) {
    const language = document.documentElement.lang === 'en' ? 'en' : 'ru';
    return window.I18N?.[language]?.[key] || fallback;
  }

  function normalize(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  function normalizeMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return LANGUAGES.reduce((result, language) => {
      result[language.code] = normalize(value[language.code]);
      return result;
    }, {});
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      return normalizeMap(cached?.values);
    } catch (_) {
      return null;
    }
  }

  function writeCache(values) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ values, at: Date.now() }));
    } catch (_) {
      // The live response remains available when storage is blocked.
    }
  }

  function render(values) {
    currentValues = values;
    const localeTag = activeLocale();
    LANGUAGES.forEach((language) => {
      const card = stats.querySelector(`[data-certificate-language="${language.code}"]`);
      const count = card?.querySelector('[data-certificate-count]');
      if (!card || !count) return;
      const value = values?.[language.code];
      const formatted = value === undefined ? '—' : value.toLocaleString(localeTag);
      count.textContent = formatted;
      card.setAttribute('aria-label', `${language.label}: ${formatted}`);
    });
  }

  function finishLoading() {
    stats.setAttribute('aria-busy', 'false');
  }

  function showError() {
    finishLoading();
    if (!status) return;
    status.textContent = translated('approved.115', 'Статистика временно недоступна.');
    status.hidden = false;
  }

  async function refresh() {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('public_stats_request_failed');
      const data = await response.json();
      const values = normalizeMap(data?.completedByLanguage);
      if (data?.ok !== true || !values) throw new Error('public_stats_payload_invalid');
      render(values);
      writeCache(values);
      if (status) status.hidden = true;
      finishLoading();
    } catch (_) {
      showError();
    }
  }

  const cached = readCache();
  render(cached || {});
  stats.setAttribute('aria-busy', 'true');
  document.addEventListener('pm:lang', () => {
    if (currentValues) render(currentValues);
    if (status && !status.hidden) status.textContent = translated('approved.115', 'Статистика временно недоступна.');
  });
  void refresh();
})();
