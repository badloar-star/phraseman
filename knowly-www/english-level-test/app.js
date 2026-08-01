/* global EnglishTestEngine, EnglishTestI18n */

/**
 * English Level Test — App v3
 * Selling Landing → Test → Result → Certificate → CTA (store install)
 * Cross-fade transitions, stagger, elastic progress, count-up, magnetic hover.
 */
(function () {
  'use strict';

  const API_BASE = '/api/english-test';
  const BANK_URL = './data/questions.en.json?v=20260801-1';

  const STORE_URL_IOS = 'https://apps.apple.com/app/id6764800879';
  const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=app.phraseman';
  const STORE_URL_DESKTOP = '/download/';

  const SOCIAL_PROOF_COUNT = 124000;
  const COMPLETION_LEGACY_OUTBOX_KEY = 'english_test_completion_outbox_v1';
  const COMPLETION_PENDING_PREFIX = 'english_test_completion_pending_v1:';
  const COMPLETION_ID_PATTERN = /^[a-f0-9]{48}$/;
  const ANALYTICS_BROWSER_ID_KEY = 'english_test_analytics_browser_id_v1';
  const ANALYTICS_BROWSER_ID_PATTERN = /^[a-f0-9]{48}$/;
  const COUNTER_REFRESH_MS = 30000;

  const hasI18n = typeof EnglishTestI18n !== 'undefined';
  const readStoredLocale = hasI18n ? EnglishTestI18n.readStoredLocale : () => null;
  let uiLocale = 'en';
  let selectedTestLanguage = 'en';
  if (hasI18n) {
    uiLocale = EnglishTestI18n.resolveUiLocale({ search: location.search, stored: readStoredLocale(), navigatorLanguage: navigator.language });
    selectedTestLanguage = EnglishTestI18n.resolveTestLanguage(location.search);
  }
  let attemptTestLanguage = null;

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

  let questions = [];
  let bankVersion = null;
  let engine = null;
  let currentQuestion = null;
  // зачем: владелец 2026-07-26 — «каждый тест должен иметь отсчёт, иначе можно
  // загуглить». Дедлайн по настенным часам: фоновая вкладка не ставит таймер
  // на паузу, уход «погуглить» съедает время. Таймаут = существующий путь
  // «Не знаю» (skip), который корректно учитывает адаптивный движок.
  const QUESTION_SECONDS = 45;
  let questionDeadline = 0;
  let questionTimerId = 0;
  let attemptToken = null;
  let clientHash = null;
  let consent = false;
  let questionStartTime = 0;
  let lastProgress = 0;
  let keydownBound = false;
  let currentView = null;
  let lastCertName = null; // имя последнего созданного сертификата (для повторного скачивания)
  let completionFlushPromise = null;
  let landingCounterNode = null;
  let landingCounterTimer = null;
  let landingCounterRequest = null;

  const app = document.getElementById('app');
  const countAnimations = new WeakMap();
  const completionMemoryOutbox = new Set();
  const acceptedCompletionIds = new Set();

  function copy(key, vars) {
    return hasI18n ? EnglishTestI18n.t(uiLocale, key, vars) : '';
  }

  function selectedLandingLanguageName() {
    if (!hasI18n) return 'English';
    const names = EnglishTestI18n.TESTS[selectedTestLanguage].names[uiLocale];
    return uiLocale === 'ru' ? names.genitive : names.nominative;
  }

  function updatePageLocale() {
    const root = document.documentElement;
    if (root && typeof root.setAttribute === 'function') root.setAttribute('lang', uiLocale);
    if (typeof document.querySelector === 'function') {
      const description = document.querySelector('meta[name="description"]');
      if (description && typeof description.setAttribute === 'function') description.setAttribute('content', copy('document.description'));
    }
    document.title = copy('document.title');
  }

  function updateUrlSelection() {
    if (typeof location === 'undefined') return;
    EnglishTestI18n.updateUrlSelection({
      locationObject: location,
      historyObject: typeof history !== 'undefined' && typeof history.replaceState === 'function' ? history : null,
      testLanguage: selectedTestLanguage,
      uiLocale,
    });
  }

  function selectTestLanguage(code) {
    if (attemptTestLanguage !== null || !EnglishTestI18n.TEST_LANGUAGES.includes(code)) return;
    selectedTestLanguage = code;
    updateUrlSelection();
    renderLanding();
  }

  function toggleUiLocale() {
    uiLocale = uiLocale === 'ru' ? 'en' : 'ru';
    EnglishTestI18n.persistLocale(uiLocale);
    updatePageLocale();
    updateUrlSelection();
    if (attemptTestLanguage === null) renderLanding();
  }

  function generateToken() {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function getClientHash() {
    if (clientHash) return clientHash;
    try {
      const stored = localStorage.getItem(ANALYTICS_BROWSER_ID_KEY);
      if (typeof stored === 'string' && ANALYTICS_BROWSER_ID_PATTERN.test(stored)) {
        clientHash = stored;
        return clientHash;
      }
    } catch (e) {
      // Memory remains available when storage access is blocked.
    }
    clientHash = generateToken();
    try {
      localStorage.setItem(ANALYTICS_BROWSER_ID_KEY, clientHash);
    } catch (e) {
      // Keep the generated ID stable in memory for this page session.
    }
    return clientHash;
  }

  async function api(action, payload) {
    if (!consent) return null;
    try {
      const body = {
        action,
        attemptToken,
        clientHash: await getClientHash(),
        timestamp: Date.now(),
        ...payload,
      };
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch (e) {
      return null;
    }
  }

  function pendingCompletionKey(completionId) {
    return COMPLETION_PENDING_PREFIX + completionId;
  }

  function migrateLegacyCompletionOutbox() {
    let parsed;
    try {
      const raw = localStorage.getItem(COMPLETION_LEGACY_OUTBOX_KEY);
      if (raw === null) return;
      parsed = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!Array.isArray(parsed)) return;

    const validIds = [...new Set(parsed.filter(
      (value) => typeof value === 'string'
        && COMPLETION_ID_PATTERN.test(value)
        && !acceptedCompletionIds.has(value),
    ))];
    let allPersisted = true;
    for (const completionId of validIds) {
      completionMemoryOutbox.add(completionId);
      try {
        localStorage.setItem(pendingCompletionKey(completionId), '1');
      } catch (e) {
        allPersisted = false;
      }
    }
    if (!allPersisted) return;
    try {
      localStorage.removeItem(COMPLETION_LEGACY_OUTBOX_KEY);
    } catch (e) {
      // Keep the legacy array as a redundant retry source when removal is unavailable.
    }
  }

  function pendingCompletionIds() {
    migrateLegacyCompletionOutbox();
    const pending = new Set(
      [...completionMemoryOutbox].filter((completionId) => !acceptedCompletionIds.has(completionId)),
    );
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (typeof key !== 'string' || !key.startsWith(COMPLETION_PENDING_PREFIX)) continue;
        const completionId = key.slice(COMPLETION_PENDING_PREFIX.length);
        if (COMPLETION_ID_PATTERN.test(completionId) && !acceptedCompletionIds.has(completionId)) {
          pending.add(completionId);
        }
      }
    } catch (e) {
      // In-memory entries remain retryable while this page is alive.
    }
    return [...pending];
  }

  function queueCompletion(completionId) {
    if (typeof completionId !== 'string' || !COMPLETION_ID_PATTERN.test(completionId)) return false;
    if (acceptedCompletionIds.has(completionId)) return false;
    migrateLegacyCompletionOutbox();
    completionMemoryOutbox.add(completionId);
    try {
      localStorage.setItem(pendingCompletionKey(completionId), '1');
    } catch (e) {
      // Memory is the fallback when storage is blocked or full.
    }
    return true;
  }

  function removeAcceptedCompletionFromLegacy(completionId) {
    try {
      const raw = localStorage.getItem(COMPLETION_LEGACY_OUTBOX_KEY);
      if (raw === null) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const remaining = parsed.filter((value) => value !== completionId);
      if (remaining.length === parsed.length) return;
      if (remaining.length === 0) {
        localStorage.removeItem(COMPLETION_LEGACY_OUTBOX_KEY);
      } else {
        localStorage.setItem(COMPLETION_LEGACY_OUTBOX_KEY, JSON.stringify(remaining));
      }
    } catch (e) {
      // The session tombstone below prevents requeue even when legacy storage is immutable.
    }
  }

  function removeAcceptedCompletion(completionId) {
    acceptedCompletionIds.add(completionId);
    completionMemoryOutbox.delete(completionId);
    try {
      localStorage.removeItem(pendingCompletionKey(completionId));
    } catch (e) {
      // The server receipt remains idempotent if storage cannot be cleaned up.
    }
    removeAcceptedCompletionFromLegacy(completionId);
  }

  function flushCompletionOutbox() {
    if (completionFlushPromise) return completionFlushPromise;
    completionFlushPromise = (async () => {
      while (true) {
        const pending = pendingCompletionIds();
        const completionId = pending[0];
        if (!completionId) return;
        try {
          const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'count_complete', completionId }),
          });
          const data = await response.json().catch(() => null);
          const accepted = response.ok
            && data?.ok === true
            && Number.isSafeInteger(data.completed)
            && typeof data.duplicate === 'boolean';
          if (!accepted) return;
          removeAcceptedCompletion(completionId);
        } catch (e) {
          return;
        }
      }
    })().finally(() => {
      completionFlushPromise = null;
    });
    return completionFlushPromise;
  }

  function reportTestCompletion() {
    if (!queueCompletion(attemptToken)) return;
    void flushCompletionOutbox();
  }

  function normalizePublicCompleted(value) {
    return Number.isSafeInteger(value) && value >= SOCIAL_PROOF_COUNT ? value : SOCIAL_PROOF_COUNT;
  }

  // зачем: владельцу мешала двухфазная анимация счётчика — сначала докрутка до
  // заглушки 124 000, пауза, потом второй прогон до серверного числа. Храним
  // последнее реальное значение и целимся сразу в него: один плавный заход.
  const COMPLETED_CACHE_KEY = 'english_test_completed_cache_v1';
  let bestCompleted = SOCIAL_PROOF_COUNT;
  let completedFetchedAt = 0;

  function hydrateCompletedCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(COMPLETED_CACHE_KEY));
      if (Number.isSafeInteger(parsed?.value)) bestCompleted = normalizePublicCompleted(parsed.value);
    } catch (e) {
      // Заглушка SOCIAL_PROOF_COUNT остаётся отправной точкой.
    }
  }

  function rememberCompleted(value) {
    bestCompleted = normalizePublicCompleted(value);
    completedFetchedAt = Date.now();
    try {
      localStorage.setItem(COMPLETED_CACHE_KEY, JSON.stringify({ value: bestCompleted, at: completedFetchedAt }));
    } catch (e) {
      // Значение в памяти страницы — достаточно для этой сессии.
    }
  }

  async function fetchPublicCompleted() {
    try {
      const response = await fetch(API_BASE, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.ok === true && Number.isSafeInteger(data.completed)
        ? normalizePublicCompleted(data.completed)
        : null;
    } catch (e) {
      return null;
    }
  }

  function applyCompletedCount(landing, value) {
    const completed = normalizePublicCompleted(value);
    const counter = landing?.querySelector('#proofCounter');
    const wrapper = landing?.querySelector('.elt-counter');
    countUp(counter, completed, {
      duration: 900,
      format: (current) => Math.round(current).toLocaleString('ru-RU'),
    });
    if (wrapper) {
      wrapper.setAttribute('aria-label', `${completed.toLocaleString('ru-RU')} тестов уже пройдено`);
    }
  }

  function isLandingCounterActive(node) {
    return landingCounterNode === node
      && currentView === node
      && node?.isConnected !== false
      && document.visibilityState !== 'hidden';
  }

  function stopLandingCounterRefresh() {
    if (landingCounterTimer !== null) clearTimeout(landingCounterTimer);
    landingCounterTimer = null;
    landingCounterNode = null;
  }

  function scheduleLandingCounterRefresh(node) {
    if (!isLandingCounterActive(node)) return;
    if (landingCounterTimer !== null) clearTimeout(landingCounterTimer);
    landingCounterTimer = setTimeout(async () => {
      landingCounterTimer = null;
      const completed = await fetchPublicCompleted();
      if (completed !== null && isLandingCounterActive(node)) applyCompletedCount(node, completed);
      scheduleLandingCounterRefresh(node);
    }, COUNTER_REFRESH_MS);
  }

  function refreshLandingCounter(node) {
    // Свежее значение (моложе 30с) не перезапрашиваем — и дешевле по функциям,
    // и счётчик не дёргается вторым прогоном при возврате на лендинг.
    if (Date.now() - completedFetchedAt < COUNTER_REFRESH_MS) {
      if (isLandingCounterActive(node)) applyCompletedCount(node, bestCompleted);
      return Promise.resolve();
    }
    if (landingCounterRequest?.node === node) return landingCounterRequest.promise;
    const request = { node, promise: null };
    request.promise = (async () => {
      const completed = await fetchPublicCompleted();
      if (completed === null) return;
      rememberCompleted(completed);
      if (isLandingCounterActive(node)) applyCompletedCount(node, bestCompleted);
    })().finally(() => {
      if (landingCounterRequest === request) landingCounterRequest = null;
    });
    landingCounterRequest = request;
    return request.promise;
  }

  function startLandingCounterRefresh(node) {
    stopLandingCounterRefresh();
    landingCounterNode = node;
    if (!isLandingCounterActive(node)) return;
    void refreshLandingCounter(node);
    scheduleLandingCounterRefresh(node);
  }

  function handleCounterVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      if (landingCounterTimer !== null) clearTimeout(landingCounterTimer);
      landingCounterTimer = null;
      return;
    }
    if (landingCounterNode && currentView === landingCounterNode) {
      void refreshLandingCounter(landingCounterNode);
      scheduleLandingCounterRefresh(landingCounterNode);
    }
  }

  // ---------- View machinery (cross-fade transitions) ----------

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function mountView(node) {
    stopLandingCounterRefresh();
    const old = currentView;
    node.classList.add('elt-view');
    app.appendChild(node);
    currentView = node;
    initMagnets(node);
    window.scrollTo(0, 0);
    if (old) {
      unbindQuestionKeys();
      old.classList.add('elt-view--exit');
      old.setAttribute('aria-hidden', 'true');
      setTimeout(() => old.remove(), 420);
    }
    return node;
  }

  function countUp(target, endValue, options) {
    const opts = options || {};
    const duration = opts.duration || 1100;
    const format = opts.format || ((v) => String(Math.round(v)));
    if (!target) return;
    const previous = countAnimations.get(target);
    if (previous) cancelAnimationFrame(previous.frameId);
    if (REDUCED_MOTION) {
      target.textContent = format(endValue);
      countAnimations.delete(target);
      return;
    }
    const parsedStart = Number(String(target.textContent || '').replace(/[^\d-]/g, ''));
    const startValue = Number.isFinite(parsedStart) ? parsedStart : 0;
    const start = performance.now();
    const delay = opts.delay || 0;
    const state = { frameId: 0 };
    countAnimations.set(target, state);
    function tick(now) {
      if (countAnimations.get(target) !== state) return;
      const t = Math.min(Math.max((now - start - delay) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      target.textContent = format(startValue + (endValue - startValue) * eased);
      if (t < 1) {
        state.frameId = requestAnimationFrame(tick);
      } else {
        countAnimations.delete(target);
      }
    }
    state.frameId = requestAnimationFrame(tick);
  }

  function initMagnets(root) {
    if (!FINE_POINTER || REDUCED_MOTION) return;
    root.querySelectorAll('[data-magnet]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const mx = Math.max(-8, Math.min(8, dx * 0.18));
        const my = Math.max(-6, Math.min(6, dy * 0.24));
        btn.style.transitionDuration = '0.08s';
        btn.style.transform = `translate(${mx}px, ${my}px)`;
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.transitionDuration = '';
        btn.style.transform = '';
      });
    });
  }

  // ---------- Shared fragments ----------

  function brandHeader(options) {
    const localized = options?.localized === true;
    return `
      <header class="elt-brand">
        <a class="elt-brand-link" href="/" aria-label="${localized ? copy('header.brandHomeAria') : 'Phraseman — на главную'}">
          <img class="elt-brand-icon" src="/assets/phraseman-icon-128.png" alt="" width="34" height="34" />
          <span class="elt-brand-text"><b>Phraseman</b><small>${localized ? selectedLandingLanguageName() : 'Живой английский'}</small></span>
        </a>
        ${attemptTestLanguage === null ? `<button class="elt-ui-locale-toggle" type="button" aria-label="${copy('aria.localeToggle')}" title="${copy('aria.localeToggle')}">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>${uiLocale.toUpperCase()}</span>
        </button>` : ''}
      </header>
    `;
  }

  function siteFooter(options) {
    const localized = options?.localized === true;
    return `
      <footer class="elt-footer">
        <a href="/">${localized ? copy('footer.about') : 'О приложении'}</a>
        <a href="/legal/privacy/">${localized ? copy('footer.privacy') : 'Privacy Policy'}</a>
        <a href="mailto:support@knowlyapps.com">support@knowlyapps.com</a>
      </footer>
    `;
  }

  function hideBrokenBrandIcons(node) {
    node.querySelectorAll('.elt-brand-icon').forEach((img) => {
      img.addEventListener('error', () => {
        img.style.display = 'none';
      });
    });
  }

  function storeBadgesHtml(extraClass) {
    return `
      <div class="elt-store-badges ${extraClass || ''}">
        <a class="elt-store-badge" data-magnet href="${STORE_URL_IOS}" rel="noopener noreferrer" aria-label="Скачать Phraseman в App Store">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16.64 12.22c-.02-2.1 1.72-3.12 1.8-3.17-1-.1-1.53-2.15-3.92-2.18-1.65-.17-3.22.98-4.06.98-.85 0-2.15-.95-3.54-.92-1.82.03-3.5 1.06-4.44 2.7-1.9 3.3-.49 8.2 1.37 10.88.9 1.3 1.98 2.77 3.4 2.72 1.36-.06 1.87-.88 3.52-.88 1.64 0 2.1.88 3.54.85 1.46-.03 2.38-1.33 3.27-2.64 1.04-1.52 1.47-3 1.5-3.07-.03-.01-2.4-.92-2.44-3.27ZM13.44 5.14c.75-.9 1.25-2.16 1.11-3.41-1.07.04-2.37.72-3.14 1.62-.69.8-1.3 2.09-1.13 3.32 1.2.1 2.41-.62 3.16-1.53Z" /></svg>
          <span><small>Загрузите в</small><b>App Store</b></span>
        </a>
        <a class="elt-store-badge" data-magnet href="${STORE_URL_ANDROID}" rel="noopener noreferrer" aria-label="Скачать Phraseman в Google Play">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.62 2.33c-.38.4-.62 1.02-.62 1.82v15.7c0 .8.24 1.42.63 1.82l.06.05 8.8-9.62v-.2L3.68 2.28l-.06.05Zm11.8 6.55-2.93 3.02v.2l2.93 3.02.06-.03 3.48-2c1-.56 1-1.5 0-2.07l-3.48-2.02-.06-.12Zm.06 6.21-2.99-3.09-8.87 9.67c.6.64 1.58.72 2.7.08l9.16-6.66Zm0-6.18L6.32 2.25c-1.12-.64-2.1-.56-2.7.08l8.87 9.67 2.99-3.09Z" /></svg>
          <span><small>Доступно в</small><b>Google Play</b></span>
        </a>
      </div>
    `;
  }

  function certPreviewSvg() {
    const certificateLanguage = hasI18n ? EnglishTestI18n.TESTS[selectedTestLanguage].certificateNames[uiLocale] : 'English';
    return `
      <svg viewBox="0 0 1100 780" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="prevBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#faf8f3;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e8d5a3;stop-opacity:0.5" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#prevBg)"/>
        <rect x="32" y="32" width="1036" height="716" fill="none" stroke="#b8941d" stroke-width="3" rx="10"/>
        <rect x="48" y="48" width="1004" height="684" fill="none" stroke="#e8d5a3" stroke-width="1.5" rx="6"/>
        <rect x="430" y="58" width="240" height="5" fill="#c9a96e" rx="2.5"/>
        <text x="550" y="155" text-anchor="middle" font-family="Georgia,serif" font-size="40" fill="#1a1a1a" font-weight="bold">${escapeHtml(copy('certificate.bodyTitle'))}</text>
        <text x="550" y="210" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="#333">${escapeHtml(copy('certificate.certifies'))}</text>
        <text x="550" y="295" text-anchor="middle" font-family="Georgia,serif" font-size="50" fill="#1a1a1a" font-weight="bold">${escapeHtml(copy('landing.previewSampleName'))}</text>
        <line x1="300" y1="320" x2="800" y2="320" stroke="#b8941d" stroke-width="2"/>
        <text x="550" y="370" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="#333">${escapeHtml(copy('certificate.completed', { language: certificateLanguage }))}</text>
        <text x="550" y="410" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="#333">${escapeHtml(copy('certificate.received'))}</text>
        <text x="550" y="500" text-anchor="middle" font-family="Georgia,serif" font-size="72" fill="#1a1a1a" font-weight="bold">B2</text>
        <rect x="430" y="590" width="240" height="5" fill="#c9a96e" rx="2.5"/>
        <text x="550" y="690" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#333">knowlyapps.com/english-level-test/</text>
      </svg>
    `;
  }

  // ---------- Landing ----------

  function renderLanding() {
    lastProgress = 0;
    const node = el(`
      <div class="elt-landing">
        ${brandHeader({ localized: true })}

        <section class="elt-hero" aria-labelledby="elt-hero-title">
          <p class="elt-kicker">${copy('landing.eyebrow')}</p>
          <h1 id="elt-hero-title">${copy('landing.title', { language: selectedLandingLanguageName() })}</h1>
          <p class="elt-lead">${copy('landing.subtitle')}</p>

          <section class="elt-language-selector" aria-label="${copy('aria.testSelector')}">
            <p class="elt-language-selector-title">${copy('languageSelector.testLanguage')}</p>
            <div class="elt-language-options" role="group" aria-label="${copy('aria.testSelector')}">
              ${EnglishTestI18n.TEST_LANGUAGES.map((code) => `<button class="elt-language-option${code === selectedTestLanguage ? ' elt-language-option--active' : ''}" type="button" data-test-language="${code}" aria-pressed="${code === selectedTestLanguage}"><span aria-hidden="true">${code === selectedTestLanguage ? '✓' : '○'}</span>${EnglishTestI18n.TESTS[code].nativeLabel}</button>`).join('')}
            </div>
          </section>

          <div class="elt-counter" role="status" aria-label="${copy('socialProof.text', { count: SOCIAL_PROOF_COUNT.toLocaleString(uiLocale === 'ru' ? 'ru-RU' : 'en-US') })}">
            <span class="elt-counter-value"><span id="proofCounter">0</span>+</span>
            <span class="elt-counter-label">${copy('socialProof.text', { count: SOCIAL_PROOF_COUNT.toLocaleString(uiLocale === 'ru' ? 'ru-RU' : 'en-US') })}</span>
          </div>

          <button class="elt-btn elt-btn-primary elt-btn-hero" data-magnet id="startBtn">${copy('landing.start')}</button>
          <p class="elt-timer-note">${copy('landing.timerNote')}</p>

          <label class="elt-consent">
            <input type="checkbox" id="consentCheckbox" />
            <span>${copy('consent.text')}</span>
          </label>
        </section>

        <section class="elt-steps" aria-label="${copy('landing.howItWorksLabel')}">
          <div class="elt-step">
            <div class="elt-step-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <h3>${copy('landing.step1Title')}</h3>
            <p>${copy('landing.step1Body')}</p>
          </div>
          <div class="elt-step">
            <div class="elt-step-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            </div>
            <h3>${copy('landing.step2Title')}</h3>
            <p>${copy('landing.step2Body')}</p>
          </div>
          <div class="elt-step">
            <div class="elt-step-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/></svg>
            </div>
            <h3>${copy('landing.step3Title')}</h3>
            <p>${copy('landing.step3Body')}</p>
          </div>
        </section>

        <section class="elt-preview" aria-label="${copy('landing.certificatePreviewLabel')}">
          <div class="elt-preview-card">
            <div class="elt-preview-cert">${certPreviewSvg()}</div>
          </div>
          <div class="elt-preview-text">
            <h2>${copy('landing.previewTitle')}</h2>
            <p>${copy('landing.previewBody')}</p>
          </div>
        </section>

        <ul class="elt-trust" aria-label="${copy('landing.trustLabel')}">
          <li><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${copy('landing.trustFree')}</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${copy('landing.trustNoRegistration')}</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${copy('landing.trustInstantResult')}</li>
        </ul>

        <section class="elt-final-cta">
          <h2>${copy('landing.finalCtaTitle')}</h2>
          <button class="elt-btn elt-btn-primary elt-btn-hero" data-magnet id="startBtn2">${copy('landing.finalCtaButton')}</button>
        </section>

        ${siteFooter({ localized: true })}
      </div>
    `);

    mountView(node);
    hideBrokenBrandIcons(node);
    node.querySelector('.elt-ui-locale-toggle')?.addEventListener('click', toggleUiLocale);
    node.querySelectorAll('[data-test-language]').forEach((button) => {
      button.addEventListener('click', () => selectTestLanguage(button.dataset.testLanguage));
    });

    applyCompletedCount(node, bestCompleted);
    startLandingCounterRefresh(node);
    void flushCompletionOutbox();

    const readConsent = () => {
      consent = node.querySelector('#consentCheckbox').checked;
    };
    node.querySelector('#startBtn').addEventListener('click', async () => {
      readConsent();
      await startTest();
    });
    node.querySelector('#startBtn2').addEventListener('click', async () => {
      readConsent();
      await startTest();
    });
  }

  // ---------- Test ----------

  async function startTest() {
    if (attemptTestLanguage === null) attemptTestLanguage = selectedTestLanguage;
    if (questions.length === 0) {
      mountView(el(`<div class="elt-loading">Загрузка…</div>`));
      try {
        const res = await fetch(BANK_URL);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        bankVersion = data.bankVersion;
        questions = data.questions;
        if (!questions || questions.length === 0) throw new Error('Empty bank');
      } catch (e) {
        mountView(el(`<div class="elt-error">Не удалось загрузить вопросы.<br>Пожалуйста, обновите страницу.</div>`));
        console.error('Bank load failed:', e);
        return;
      }
    }

    attemptToken = generateToken();
    engine = new EnglishTestEngine.Engine(questions, Date.now());
    lastProgress = 0;
    lastCertName = null; // новая попытка — старый сертификат не предлагаем

    if (consent) {
      api('landing', {});
      api('start', { bankVersion });
    }

    showNextQuestion();
  }

  function showNextQuestion() {
    if (engine.shouldFinish()) {
      finishTest();
      return;
    }
    currentQuestion = engine.pickNextQuestion();
    if (!currentQuestion) {
      finishTest();
      return;
    }
    questionStartTime = Date.now();
    renderQuestion(currentQuestion);
    startQuestionTimer();
    if (consent) {
      api('view', { questionId: currentQuestion.id, position: engine.history.length + 1 });
    }
  }

  function renderQuestion(q) {
    const position = engine.history.length + 1;
    const progress = Math.min((position / 20) * 100, 100);

    const node = el(`
      <div class="elt-test">
        <div class="elt-progress-bar"><div class="elt-progress-fill"></div></div>
        <div class="elt-question-meta">
          <span>Вопрос ${position}</span>
          <span class="elt-timer" id="qTimer" role="timer" aria-label="Осталось времени на вопрос">
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle class="elt-timer-track" cx="18" cy="18" r="15.5"></circle>
              <circle class="elt-timer-ring" id="qTimerRing" cx="18" cy="18" r="15.5"></circle>
            </svg>
            <b id="qTimerNum">${QUESTION_SECONDS}</b>
          </span>
        </div>
        <div class="elt-scenario" lang="ru">${escapeHtml(q.scenarioRu)}</div>
        <div class="elt-instruction" lang="ru">${escapeHtml(q.instructionRu)}</div>
        ${q.stimulus
          ? `<div class="elt-stimulus" lang="en">${escapeHtml(q.stimulus)}</div>`
          : ''}
        <div class="elt-options" role="radiogroup" aria-label="Варианты ответа">
          ${q.options
            .map(
              (opt, i) => `
            <button class="elt-option" data-index="${i}" role="radio" aria-checked="false" tabindex="0">
              <span class="elt-option-letter">${String.fromCharCode(65 + i)}</span>
              <span class="elt-option-text" lang="en">${escapeHtml(opt)}</span>
            </button>
          `
            )
            .join('')}
        </div>
        <div class="elt-actions">
          <button class="elt-btn elt-btn-secondary" id="skipBtn">Не знаю</button>
          <button class="elt-btn elt-btn-ghost" id="exitBtn">Выйти</button>
        </div>
      </div>
    `);

    mountView(node);

    // Elastic progress: animate from previous width to the new one.
    const fill = node.querySelector('.elt-progress-fill');
    fill.style.width = lastProgress + '%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.width = progress + '%';
      });
    });
    lastProgress = progress;

    const optionButtons = node.querySelectorAll('.elt-option');
    optionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        btn.classList.add('elt-option--picked');
        setTimeout(() => answerQuestion(q, idx, false), 200);
      });
    });

    bindQuestionKeys();
    node.querySelector('#skipBtn').addEventListener('click', () => answerQuestion(q, -1, true));
    node.querySelector('#exitBtn').addEventListener('click', confirmExit);
  }

  const TIMER_CIRCUMFERENCE = 2 * Math.PI * 15.5;

  function clearQuestionTimer() {
    if (questionTimerId) {
      clearInterval(questionTimerId);
      questionTimerId = 0;
    }
  }

  function startQuestionTimer() {
    clearQuestionTimer();
    questionDeadline = Date.now() + QUESTION_SECONDS * 1000;
    const tick = () => {
      const view = currentView;
      const num = view && view.querySelector('#qTimerNum');
      const ring = view && view.querySelector('#qTimerRing');
      const box = view && view.querySelector('#qTimer');
      const leftMs = questionDeadline - Date.now();
      if (leftMs <= 0) {
        clearQuestionTimer();
        if (num) num.textContent = '0';
        // Таймаут = «Не знаю»: адаптив уже умеет учитывать пропуск.
        answerQuestion(currentQuestion, -1, true);
        return;
      }
      const leftSec = Math.ceil(leftMs / 1000);
      if (num) num.textContent = String(leftSec);
      if (ring) {
        ring.style.strokeDashoffset = (TIMER_CIRCUMFERENCE * (1 - leftMs / (QUESTION_SECONDS * 1000))).toFixed(1);
      }
      if (box) box.classList.toggle('elt-timer--low', leftSec <= 10);
    };
    tick();
    questionTimerId = setInterval(tick, 250);
    activeTimerTick = tick;
  }

  // зачем: фоновые вкладки троттлят интервалы — по возвращении сразу
  // сверяемся с дедлайном, «погуглить в соседней вкладке» не выйдет.
  let activeTimerTick = null;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && questionTimerId && activeTimerTick) activeTimerTick();
  });

  function bindQuestionKeys() {
    if (keydownBound) return;
    app.addEventListener('keydown', handleQuestionKeydown);
    keydownBound = true;
  }

  function unbindQuestionKeys() {
    if (!keydownBound) return;
    app.removeEventListener('keydown', handleQuestionKeydown);
    keydownBound = false;
  }

  function handleQuestionKeydown(e) {
    const view = currentView && currentView.classList.contains('elt-test') ? currentView : null;
    if (!view) return;
    const buttons = view.querySelectorAll('.elt-option');
    if (!buttons.length) return;
    const focused = document.activeElement;
    let idx = Array.from(buttons).indexOf(focused);
    const q = currentQuestion;

    if (e.key >= '1' && e.key <= '4') {
      const i = parseInt(e.key, 10) - 1;
      if (buttons[i]) {
        e.preventDefault();
        buttons[i].focus();
        buttons[i].classList.add('elt-option--picked');
        setTimeout(() => answerQuestion(q, i, false), 200);
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = buttons[Math.min(idx + 1, buttons.length - 1)] || buttons[0];
      next.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = buttons[Math.max(idx - 1, 0)] || buttons[buttons.length - 1];
      prev.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (focused.classList && focused.classList.contains('elt-option')) {
        e.preventDefault();
        const i = parseInt(focused.dataset.index, 10);
        focused.classList.add('elt-option--picked');
        setTimeout(() => answerQuestion(q, i, false), 200);
      }
    }
  }

  function answerQuestion(question, selectedIndex, skipped) {
    // Защита от «протухших» вызовов: клик/клавиша ставят ответ в очередь
    // с задержкой 200 мс; за это время вопрос мог смениться или тест завершиться.
    if (!question || question !== currentQuestion) return;
    clearQuestionTimer();
    unbindQuestionKeys();
    const responseTime = Date.now() - questionStartTime;
    const responseTimeMs = Math.round(Math.min(120000, Math.max(0, responseTime)) / 250) * 250;
    const targetBefore = EnglishTestEngine.LEVELS[engine.targetLevelIndex];
    const correct = !skipped && selectedIndex === question.correctIndex;
    engine.recordAnswer(question, selectedIndex, skipped, responseTime);
    const targetAfter = EnglishTestEngine.LEVELS[engine.targetLevelIndex];

    // The outgoing question remains above the new one during the cross-fade.
    // Clear its tap feedback so the previous answer cannot look selected on the next question.
    currentView?.querySelectorAll('.elt-option--picked').forEach((option) => {
      option.classList.remove('elt-option--picked');
    });

    if (consent) {
      api('progress', {
        questionId: question.id,
        position: engine.history.length,
        selectedIndex,
        skipped,
        responseTimeMs,
        questionLevel: question.level,
        correct,
        targetBefore,
        targetAfter,
      });
    }

    showNextQuestion();
  }

  function confirmExit() {
    if (!confirm('Выйти? Прогресс будет потерян.')) return;
    clearQuestionTimer();
    unbindQuestionKeys();
    currentQuestion = null; // отменяет отложенные ответы (setTimeout 200 мс)
    if (consent && engine) {
      api('abandon', { lastPosition: engine.history.length });
    }
    renderLanding();
  }

  // ---------- Result ----------

  function finishTest() {
    currentQuestion = null; // отменяет отложенные ответы после финального вопроса
    const result = engine.computeResult();
    if (consent) {
      api('complete', {
        result: {
          estimatedLevel: result.estimatedLevel,
          correct: result.correct,
          answered: result.answered,
          totalQuestions: result.totalQuestions,
          assessmentScope: result.assessmentScope,
          stopReason: result.stopReason,
        },
      });
    }
    reportTestCompletion();
    renderResult(result);
  }

  function renderResult(result) {
    const cta = ctaContentFor(result.estimatedLevel);
    const node = el(`
      <div class="elt-result">
        <div class="elt-result-card">
          <div class="elt-level-badge">${escapeHtml(result.estimatedLevel)}</div>
          <h2>${escapeHtml(result.borderline)}</h2>
          <div class="elt-result-details">
            <div class="elt-stat"><span class="elt-stat-value"><span id="statCorrect">0</span>/${result.answered}</span><span class="elt-stat-label">Верно</span></div>
            <div class="elt-stat"><span class="elt-stat-value"><span id="statAnswered">0</span>/${result.totalQuestions}</span><span class="elt-stat-label">Отвечено</span></div>
            <div class="elt-stat"><span class="elt-stat-value" id="statSkipped">0</span><span class="elt-stat-label">Не знаю</span></div>
          </div>
          <div class="elt-name-section">
            <input type="text" id="certName" maxlength="60" placeholder="Имя для сертификата" autocomplete="name" />
            <button class="elt-btn elt-btn-primary" data-magnet id="certBtn">Создать сертификат</button>
          </div>
          <div class="elt-pitch">
            <div class="elt-pitch-head">
              <img class="elt-brand-icon elt-pitch-icon" src="/assets/phraseman-icon-128.png" alt="" width="40" height="40" />
              <div class="elt-pitch-title"><b>Phraseman</b><small>твой следующий шаг</small></div>
            </div>
            <p class="elt-pitch-text">${cta.text}</p>
            <ul class="elt-pitch-list">
              <li>10 000+ фраз из живой повседневной речи</li>
              <li>Короткие уроки по 5 минут в день</li>
              <li>Тренировка произношения и повторения</li>
            </ul>
            ${storeBadgesHtml('elt-store-badges--compact')}
          </div>
          <div class="elt-share">
            <button class="elt-btn elt-btn-ghost" id="shareBtn">Поделиться</button>
            <button class="elt-btn elt-btn-ghost" id="restartBtn">Ещё раз</button>
          </div>
        </div>
      </div>
    `);

    mountView(node);
    hideBrokenBrandIcons(node);

    countUp(node.querySelector('#statCorrect'), result.correct, { delay: 250 });
    countUp(node.querySelector('#statAnswered'), result.answered, { delay: 350 });
    countUp(node.querySelector('#statSkipped'), result.skipped, { delay: 450 });

    // зачем: Enter в поле имени = «Создать сертификат», без лишнего тапа по кнопке.
    node.querySelector('#certName').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        node.querySelector('#certBtn').click();
      }
    });
    node.querySelector('#certBtn').addEventListener('click', () => {
      const name = sanitizeName(node.querySelector('#certName').value);
      if (!name) {
        alert('Введите имя');
        return;
      }
      lastCertName = name;
      generateCertificate(name, result);
      if (consent) api('certificate', {});
    });

    node.querySelectorAll('.elt-store-badge').forEach((badge, i) => {
      badge.addEventListener('click', () => {
        if (consent) api('cta_click', { store: i === 0 ? 'ios' : 'android', level: result.estimatedLevel, source: 'result' });
      });
    });
    node.querySelector('#shareBtn').addEventListener('click', () => shareResult(result));
    node.querySelector('#restartBtn').addEventListener('click', () => renderLanding());
  }

  function generateCertificate(name, result) {
    const certData = {
      name,
      result,
      onClose: () => renderCTA(result),
      cta: {
        text: 'Живой английский каждый день — в приложении Phraseman',
        label: 'Скачать Phraseman бесплатно',
        url: primaryStoreUrl(),
        onClick: () => {
          // зачем: source разделяет в отчёте «скачал после теста» и «скачал после
          // сертификата» — владелец хочет видеть эти две воронки отдельно.
          if (consent) api('cta_click', { store: 'cert_modal', level: result.estimatedLevel, source: 'certificate' });
        },
      },
    };
    if (window.EnglishTestCertificate) {
      window.EnglishTestCertificate.show(certData);
    } else {
      const win = window.open('', '_blank');
      win.document.write(`
        <html><head><title>Сертификат</title>
        <style>body{font-family:Georgia,serif;text-align:center;padding:40px;background:#0c0c0e;color:#e6e6e6} .cert{border:2px solid #2a9d5c;padding:60px;max-width:600px;margin:0 auto;border-radius:16px}</style>
        </head><body>
        <div class="cert">
          <h1>Сертификат</h1>
          <p><strong>${escapeHtml(name)}</strong></p>
          <p>Предварительная текстовая оценка: <strong>${escapeHtml(result.estimatedLevel)}</strong></p>
          <p>${result.correct} верно из ${result.answered} отвеченных (${result.totalQuestions} заданий всего).</p>
          <p><small>Эта оценка не проверяет аудирование и говорение.</small></p>
        </div>
        </body></html>
      `);
      win.document.close();
      renderCTA(result);
    }
  }

  async function shareResult(result) {
    const text = `Моя предварительная текстовая оценка английского — ${result.estimatedLevel}. Проверь свою на knowlyapps.com`;
    const url = 'https://knowlyapps.com/english-level-test/';
    if (consent) api('share', { channel: 'web_share_api_attempted' });
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Мой уровень английского', text, url });
        if (consent) api('share', { channel: 'web_share_api_success' });
        return;
      } catch (e) { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      alert('Скопировано');
      if (consent) api('share', { channel: 'clipboard_copy' });
    } catch (e) {
      prompt('Скопируйте:', text + ' ' + url);
    }
  }

  // ---------- CTA (install Phraseman) ----------

  function ctaContentFor(level) {
    const band = String(level || '').slice(0, 2).toUpperCase();
    if (band === 'PR' || band === 'A1' || band === 'A2') {
      return {
        title: 'Начни с понятной базы',
        text: 'Phraseman поможет спокойно закрепить базовые фразы, короткие ответы и произношение — по несколько минут в день.',
        button: 'Начать обучение',
      };
    }
    if (band === 'B1' || band === 'B2') {
      return {
        title: 'У тебя уже хорошая база!',
        text: 'Phraseman поможет закрыть пробелы и выйти на C1 — интервальные повторения и разговорные тренировки.',
        button: 'Прокачать английский',
      };
    }
    return {
      title: 'Впечатляющий результат!',
      text: 'Поддерживай уровень с Phraseman — разговорная практика каждый день и новые фразы для уверенной речи.',
      button: 'Продолжить совершенствоваться',
    };
  }

  function primaryStoreUrl() {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      return STORE_URL_IOS;
    }
    if (/android/i.test(ua)) {
      return STORE_URL_ANDROID;
    }
    return STORE_URL_DESKTOP;
  }

  function renderCTA(result) {
    const cta = ctaContentFor(result.estimatedLevel);
    if (consent) api('cta_view', { level: result.estimatedLevel });

    const node = el(`
      <div class="elt-cta">
        ${brandHeader()}
        <div class="elt-cta-main">
          <div class="elt-cta-level" aria-label="Твой уровень">${escapeHtml(result.estimatedLevel)}</div>
          <h1>${cta.title}</h1>
          <p class="elt-cta-text">${cta.text}</p>
          <button class="elt-btn elt-btn-primary elt-btn-hero" data-magnet id="ctaPrimary">${cta.button}</button>
          ${storeBadgesHtml()}
          <div class="elt-cta-secondary">
            ${lastCertName ? '<button class="elt-btn elt-btn-secondary" id="ctaCert">Скачать сертификат</button>' : ''}
            <button class="elt-btn elt-btn-ghost" id="ctaShare">Поделиться результатом</button>
            <button class="elt-btn elt-btn-ghost" id="ctaRetake">Пройти тест ещё раз</button>
          </div>
        </div>
        ${siteFooter()}
      </div>
    `);

    mountView(node);
    hideBrokenBrandIcons(node);

    node.querySelector('#ctaPrimary').addEventListener('click', () => {
      // зачем: source:'result' — клик с экрана результата теста (не из сертификата).
      if (consent) api('cta_click', { store: 'primary', level: result.estimatedLevel, source: 'result' });
      window.location.href = primaryStoreUrl();
    });
    node.querySelectorAll('.elt-store-badge').forEach((badge, i) => {
      badge.addEventListener('click', () => {
        if (consent) api('cta_click', { store: i === 0 ? 'ios' : 'android', level: result.estimatedLevel, source: 'result' });
      });
    });
    node.querySelector('#ctaShare').addEventListener('click', () => shareResult(result));
    node.querySelector('#ctaRetake').addEventListener('click', () => startTest());

    // Возврат к сертификату: пользователь закрыл его, не скачав, или ушёл в стор.
    const ctaCertBtn = node.querySelector('#ctaCert');
    if (ctaCertBtn) {
      ctaCertBtn.addEventListener('click', () => {
        if (consent) api('cert_reopen', { level: result.estimatedLevel });
        generateCertificate(lastCertName, result);
      });
    }
  }

  // ---------- Utilities ----------

  function sanitizeName(input) {
    if (!input) return '';
    return input
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .replace(/[\u202A-\u202E]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Init ----------

  document.addEventListener?.('visibilitychange', handleCounterVisibilityChange);
  window.addEventListener('online', () => {
    void flushCompletionOutbox();
  });
  hydrateCompletedCache();
  updatePageLocale();
  renderLanding();
})();
