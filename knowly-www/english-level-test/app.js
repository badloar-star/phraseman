/* global EnglishTestEngine, EnglishTestI18n */

/**
 * English Level Test — App v3
 * Selling Landing → Test → Result → Certificate → CTA (store install)
 * Cross-fade transitions, stagger, elastic progress, count-up, magnetic hover.
 */
(function () {
  'use strict';

  const API_BASE = '/api/english-test';

  const STORE_URL_IOS = 'https://apps.apple.com/app/id6764800879';
  const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=app.phraseman';
  const STORE_URL_DESKTOP = '/download/';

  // зачем: после карантина языковых тестов публичный счётчик относится только
  // к английскому тесту. Реальные завершения хранит сервер. Держим базу в паре
  // с сервером (functions-english-test/completion_counter.js BASELINE_COMPLETED_BY_LANGUAGE).
  const SOCIAL_PROOF_BASELINE_BY_LANGUAGE = { en: 0, de: 0, fr: 0, it: 0, es: 0 };
  function socialProofBaseline(language) {
    return Object.prototype.hasOwnProperty.call(SOCIAL_PROOF_BASELINE_BY_LANGUAGE, language)
      ? SOCIAL_PROOF_BASELINE_BY_LANGUAGE[language]
      : SOCIAL_PROOF_BASELINE_BY_LANGUAGE.en;
  }
  const COMPLETION_LEGACY_OUTBOX_KEY = 'english_test_completion_outbox_v1';
  const COMPLETION_PENDING_PREFIX = 'english_test_completion_pending_v1:';
  const COMPLETION_ID_PATTERN = /^[a-f0-9]{48}$/;
  const ANALYTICS_BROWSER_ID_KEY = 'english_test_analytics_browser_id_v1';
  const ANALYTICS_BROWSER_ID_PATTERN = /^[a-f0-9]{48}$/;
  const COUNTER_REFRESH_MS = 30000;
  const MAX_BANK_VERSION_LENGTH = 32;
  const BANK_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}\.\d+$/;
  const REPORT_COMMENT_MIN_LENGTH = 10;

  const hasI18n = typeof EnglishTestI18n !== 'undefined';
  const readStoredLocale = hasI18n ? EnglishTestI18n.readStoredLocale : () => null;
  let uiLocale = 'en';
  let selectedTestLanguage = 'en';
  if (hasI18n) {
    uiLocale = EnglishTestI18n.resolveUiLocale({ search: location.search, stored: readStoredLocale(), navigatorLanguage: navigator.language });
    selectedTestLanguage = EnglishTestI18n.resolveTestLanguage(location.search);
  }
  let attemptTestLanguage = null;
  const bankCache = new Map();
  let startPromise = null;

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

  let questions = [];
  let bankVersion = null;
  let engine = null;
  let currentQuestion = null;
  let selectedAnswerIndex = null;
  let answerLocked = false;
  // зачем: владелец 2026-07-26 — «каждый тест должен иметь отсчёт, иначе можно
  // загуглить». Дедлайн по настенным часам: фоновая вкладка не ставит таймер
  // на паузу, уход «погуглить» съедает время. Таймаут = существующий путь
  // «Не знаю» (skip), который корректно учитывает адаптивный движок.
  const QUESTION_SECONDS = 45;
  let questionDeadline = 0;
  let questionTimerId = 0;
  let attemptToken = null;
  let clientHash = null;
  let siteReportClientHash = null;
  let consent = false;
  let questionStartTime = 0;
  let lastProgress = 0;
  let keydownBound = false;
  let currentView = null;
  // Tracks whether the very first screen has mounted — the entrance cascade
  // (viewEnter + staggered fadeInUp) plays only once, on that first paint.
  let hasMountedFirstView = false;
  // The rendered node is disposable; attempt state lives in this explicit view model.
  let activeView = { kind: 'landing', data: null };
  let lastCertName = null; // имя последнего созданного сертификата (для повторного скачивания)
  let completionFlushPromise = null;
  let landingCounterNode = null;
  let landingCounterTimer = null;
  let landingCounterRequest = null;
  let activeReportDialog = null;

  const app = document.getElementById('app');
  const countAnimations = new WeakMap();
  const completionMemoryOutbox = new Map(); // completionId → testLanguage
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

  function returnToLanding() {
    attemptTestLanguage = null;
    renderLanding();
  }

  function setUiLocale(locale) {
    if (!EnglishTestI18n.UI_LOCALES.includes(locale) || locale === uiLocale) return;
    uiLocale = locale;
    EnglishTestI18n.persistLocale(uiLocale);
    updatePageLocale();
    updateUrlSelection();
    rerenderForUiLocale();
  }

  // зачем: панель закрывается кликом снаружи/Escape независимо от того, на
  // каком экране она открыта — один глобальный слушатель вместо дублирования
  // на каждый из 6 мест, где рендерится brandHeader().
  let openUiLocaleMenu = null;

  function closeUiLocaleMenu() {
    if (!openUiLocaleMenu) return;
    const { trigger, panel } = openUiLocaleMenu;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    openUiLocaleMenu = null;
  }

  document.addEventListener('click', (e) => {
    if (!openUiLocaleMenu) return;
    if (openUiLocaleMenu.root.contains(e.target)) return;
    closeUiLocaleMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openUiLocaleMenu) {
      const { trigger } = openUiLocaleMenu;
      closeUiLocaleMenu();
      trigger.focus();
    }
  });

  function bindUiLocaleSelector(node) {
    const root = node.querySelector('[data-ui-locale-menu]');
    const trigger = node.querySelector('[data-ui-locale-trigger]');
    const panel = node.querySelector('[data-ui-locale-panel]');
    if (!root || !trigger || !panel) return;

    trigger.addEventListener('click', () => {
      if (openUiLocaleMenu) {
        closeUiLocaleMenu();
        return;
      }
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      openUiLocaleMenu = { root, trigger, panel };
      panel.querySelector('.elt-ui-locale-option--active')?.focus?.();
    });

    panel.querySelectorAll('[data-ui-locale-option]').forEach((option) => {
      option.setAttribute('tabindex', '-1');
      option.addEventListener('click', () => {
        const locale = option.dataset.uiLocaleOption;
        closeUiLocaleMenu();
        setUiLocale(locale);
      });
    });

    panel.addEventListener('keydown', (e) => {
      const options = Array.from(panel.querySelectorAll('[data-ui-locale-option]'));
      const currentIndex = options.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        options[Math.min(currentIndex + 1, options.length - 1)]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        options[Math.max(currentIndex - 1, 0)]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        document.activeElement?.dispatchEvent?.(new MouseEvent('click'));
      }
    });
  }

  function setActiveView(kind, data) {
    activeView = { kind, data };
  }

  function rerenderForUiLocale() {
    if (activeView.kind === 'question') return renderQuestion(activeView.data, { preserveAttempt: true });
    if (activeView.kind === 'result') return renderResult(activeView.data, { preserveAttempt: true });
    if (activeView.kind === 'cta') return renderCTA(activeView.data, { preserveAttempt: true });
    if (activeView.kind === 'loading') return renderLoading();
    if (activeView.kind === 'error') return renderError();
    return renderLanding();
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

  function getSiteReportClientHash() {
    if (!siteReportClientHash) siteReportClientHash = generateToken();
    return siteReportClientHash;
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
        testLanguage: attemptTestLanguage || selectedTestLanguage,
        uiLocale,
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

  function buildReportQuestionText(q, displayedQuestion) {
    const lines = [
      `Displayed scenario: ${displayedQuestion.scenario || ''}`,
      `Displayed instruction: ${displayedQuestion.instruction || ''}`,
      `Canonical scenario: ${q.scenario || ''}`,
      `Canonical instruction: ${q.prompt || ''}`,
    ];
    if (q.stimulus) lines.push(`Stimulus: ${q.stimulus}`);
    q.options.forEach((option, index) => {
      lines.push(`${String.fromCharCode(65 + index)}. ${option}`);
    });
    return lines.join('\n').slice(0, 2500);
  }

  async function submitSiteReport(snapshot, comment) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'report_error',
        source: 'site',
        questionId: snapshot.questionId,
        position: snapshot.position,
        testLanguage: snapshot.testLanguage,
        uiLocale: snapshot.uiLocale,
        bankVersion: snapshot.bankVersion,
        comment,
        dataText: snapshot.dataText,
        userAnswer: snapshot.userAnswer,
        clientHash: getSiteReportClientHash(),
        attemptToken: snapshot.attemptToken,
      }),
    });
    if (!response.ok) throw new Error(response.status === 429 ? 'rate_limited' : 'report_failed');
    return response.json();
  }

  function openReportDialog(q, displayedQuestion, position, trigger) {
    if (activeReportDialog) activeReportDialog.close(false);
    const testLanguage = attemptTestLanguage || selectedTestLanguage;
    const snapshot = Object.freeze({
      questionId: q.id,
      position,
      testLanguage,
      uiLocale,
      bankVersion,
      attemptToken,
      dataText: buildReportQuestionText(q, displayedQuestion),
      userAnswer: Number.isInteger(selectedAnswerIndex) && selectedAnswerIndex >= 0
        ? q.options[selectedAnswerIndex]
        : '',
    });
    const modal = el(`
      <div class="elt-report-modal" role="dialog" aria-modal="true" aria-labelledby="reportTitle" aria-describedby="reportSubtitle">
        <button type="button" class="elt-report-backdrop" tabindex="-1" aria-hidden="true"></button>
        <section class="elt-report-panel">
          <button type="button" class="elt-report-close" aria-label="${escapeHtml(copy('report.closeLabel'))}">×</button>
          <div class="elt-report-form-view">
            <h2 id="reportTitle">${escapeHtml(copy('report.title'))}</h2>
            <p id="reportSubtitle">${escapeHtml(copy('report.subtitle'))}</p>
            <form class="elt-report-form" novalidate>
              <label class="elt-report-label" for="reportComment">${escapeHtml(copy('report.placeholder'))}</label>
              <textarea id="reportComment" class="elt-report-input" rows="5" placeholder="${escapeHtml(copy('report.placeholder'))}" aria-describedby="reportHint reportError"></textarea>
              <p class="elt-report-hint" id="reportHint">${escapeHtml(copy('report.hint', { count: REPORT_COMMENT_MIN_LENGTH }))}</p>
              <p class="elt-report-error" id="reportError" role="alert" hidden></p>
              <div class="elt-report-actions">
                <button type="button" class="elt-report-cancel">${escapeHtml(copy('report.cancel'))}</button>
                <button type="submit" class="elt-report-submit">${escapeHtml(copy('report.submit'))}</button>
              </div>
            </form>
          </div>
          <div class="elt-report-status" role="status" aria-live="polite" hidden>
            <h2 class="elt-report-status-title"></h2>
            <p class="elt-report-status-text"></p>
            <button type="button" class="elt-report-status-close">${escapeHtml(copy('report.close'))}</button>
          </div>
        </section>
      </div>
    `);
    const textarea = modal.querySelector('#reportComment');
    const form = modal.querySelector('.elt-report-form');
    const submit = modal.querySelector('.elt-report-submit');
    const error = modal.querySelector('#reportError');
    const formView = modal.querySelector('.elt-report-form-view');
    const status = modal.querySelector('.elt-report-status');
    const statusTitle = modal.querySelector('.elt-report-status-title');
    const statusText = modal.querySelector('.elt-report-status-text');
    const previousOverflow = document.body.style.overflow;
    textarea.maxLength = 500;

    const close = (restoreFocus = true) => {
      modal.remove();
      document.body.style.overflow = previousOverflow;
      if (activeReportDialog && activeReportDialog.modal === modal) activeReportDialog = null;
      if (restoreFocus && trigger?.isConnected) trigger.focus();
    };
    activeReportDialog = { modal, close };

    const showFailure = () => {
      error.textContent = copy('report.errorText');
      error.hidden = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = copy('report.submit');
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const comment = textarea.value.trim();
      if (comment.length < REPORT_COMMENT_MIN_LENGTH) {
        error.textContent = copy('report.tooShort', { count: REPORT_COMMENT_MIN_LENGTH });
        error.hidden = false;
        textarea.setAttribute('aria-invalid', 'true');
        textarea.focus();
        return;
      }
      error.hidden = true;
      textarea.removeAttribute('aria-invalid');
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = copy('report.sending');
      try {
        await submitSiteReport(snapshot, comment);
        formView.hidden = true;
        statusTitle.textContent = copy('report.successTitle');
        statusText.textContent = copy('report.successText');
        status.hidden = false;
        modal.querySelector('.elt-report-status-close').focus();
      } catch (_) {
        showFailure();
      }
    });

    modal.querySelector('.elt-report-backdrop').addEventListener('click', () => close());
    modal.querySelector('.elt-report-close').addEventListener('click', () => close());
    modal.querySelector('.elt-report-cancel').addEventListener('click', () => close());
    modal.querySelector('.elt-report-status-close').addEventListener('click', () => close());
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled])')]
        .filter((node) => !node.closest('[hidden]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.body.style.overflow = 'hidden';
    document.body.appendChild(modal);
    textarea.focus();
  }

  function pendingCompletionKey(completionId) {
    return COMPLETION_PENDING_PREFIX + completionId;
  }

  // Legacy array entries predate multilingual tests and are known-English.
  // Explicit keyed entries keep their stored language so quarantined language
  // completions can be discarded instead of corrupting the English counter.
  function normalizeCompletionLanguage(value) {
    return hasI18n && EnglishTestI18n.TEST_LANGUAGES.includes(value) ? value : null;
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
      completionMemoryOutbox.set(completionId, 'en');
      try {
        localStorage.setItem(pendingCompletionKey(completionId), 'en');
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

  function pendingCompletions() {
    migrateLegacyCompletionOutbox();
    const pending = new Map(
      [...completionMemoryOutbox].filter(([completionId, language]) => (
        normalizeCompletionLanguage(language) !== null && !acceptedCompletionIds.has(completionId)
      )),
    );
    try {
      const storedKeys = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (typeof key === 'string' && key.startsWith(COMPLETION_PENDING_PREFIX)) storedKeys.push(key);
      }
      for (const key of storedKeys) {
        const completionId = key.slice(COMPLETION_PENDING_PREFIX.length);
        if (COMPLETION_ID_PATTERN.test(completionId) && !acceptedCompletionIds.has(completionId)) {
          const language = normalizeCompletionLanguage(localStorage.getItem(key));
          if (language) {
            pending.set(completionId, language);
          } else {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      // In-memory entries remain retryable while this page is alive.
    }
    return [...pending];
  }

  function pendingCompletionIds() {
    return pendingCompletions().map(([completionId]) => completionId);
  }

  function queueCompletion(completionId, testLanguage) {
    if (typeof completionId !== 'string' || !COMPLETION_ID_PATTERN.test(completionId)) return false;
    if (acceptedCompletionIds.has(completionId)) return false;
    const language = normalizeCompletionLanguage(testLanguage);
    if (!language) return false;
    migrateLegacyCompletionOutbox();
    completionMemoryOutbox.set(completionId, language);
    try {
      localStorage.setItem(pendingCompletionKey(completionId), language);
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
        const pending = pendingCompletions();
        const entry = pending[0];
        if (!entry) return;
        const [completionId, testLanguage] = entry;
        try {
          const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'count_complete', completionId, testLanguage }),
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
    if (!queueCompletion(attemptToken, attemptTestLanguage)) return;
    void flushCompletionOutbox();
  }

  function normalizePublicCompleted(language, value) {
    const baseline = socialProofBaseline(language);
    return Number.isSafeInteger(value) && value >= baseline ? value : baseline;
  }

  // зачем: владельцу мешала двухфазная анимация счётчика — сначала докрутка до
  // заглушки, пауза, потом второй прогон до серверного числа. Храним последнее
  // реальное значение и целимся сразу в него: один плавный заход без скачка.
  const COMPLETED_CACHE_KEY = 'english_test_completed_cache_by_language_v1';
  let bestCompletedByLanguage = { ...SOCIAL_PROOF_BASELINE_BY_LANGUAGE };
  let completedFetchedAt = 0;

  function hydrateCompletedCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(COMPLETED_CACHE_KEY));
      if (!parsed || typeof parsed !== 'object') return;
      const values = parsed.values && typeof parsed.values === 'object' ? parsed.values : {};
      const next = { ...SOCIAL_PROOF_BASELINE_BY_LANGUAGE };
      for (const language of Object.keys(SOCIAL_PROOF_BASELINE_BY_LANGUAGE)) {
        if (Number.isSafeInteger(values[language])) next[language] = normalizePublicCompleted(language, values[language]);
      }
      bestCompletedByLanguage = next;
    } catch (e) {
      // Базовые значения по языку остаются отправной точкой.
    }
  }

  function rememberCompleted(completedByLanguage) {
    const next = { ...bestCompletedByLanguage };
    for (const language of Object.keys(SOCIAL_PROOF_BASELINE_BY_LANGUAGE)) {
      if (Number.isSafeInteger(completedByLanguage?.[language])) {
        next[language] = normalizePublicCompleted(language, completedByLanguage[language]);
      }
    }
    bestCompletedByLanguage = next;
    completedFetchedAt = Date.now();
    try {
      localStorage.setItem(COMPLETED_CACHE_KEY, JSON.stringify({ values: bestCompletedByLanguage, at: completedFetchedAt }));
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
      return data?.ok === true && data.completedByLanguage && typeof data.completedByLanguage === 'object'
        ? data.completedByLanguage
        : null;
    } catch (e) {
      return null;
    }
  }

  function applyCompletedCount(landing, language, value) {
    const completed = normalizePublicCompleted(language, value);
    const counter = landing?.querySelector('#proofCounter');
    const wrapper = landing?.querySelector('.elt-counter');
    const localeTag = EnglishTestI18n.LOCALE_META[uiLocale].bcp47;
    const formattedCompleted = completed.toLocaleString(localeTag);
    countUp(counter, completed, {
      duration: 900,
      format: (current) => Math.round(current).toLocaleString(localeTag),
    });
    if (wrapper) {
      wrapper.setAttribute('aria-label', copy('socialProof.text', { count: formattedCompleted }));
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
      const completedByLanguage = await fetchPublicCompleted();
      if (completedByLanguage !== null && isLandingCounterActive(node)) {
        rememberCompleted(completedByLanguage);
        applyCompletedCount(node, selectedTestLanguage, bestCompletedByLanguage[selectedTestLanguage]);
      }
      scheduleLandingCounterRefresh(node);
    }, COUNTER_REFRESH_MS);
  }

  function refreshLandingCounter(node) {
    // Свежее значение (моложе 30с) не перезапрашиваем — и дешевле по функциям,
    // и счётчик не дёргается вторым прогоном при возврате на лендинг.
    if (Date.now() - completedFetchedAt < COUNTER_REFRESH_MS) {
      if (isLandingCounterActive(node)) applyCompletedCount(node, selectedTestLanguage, bestCompletedByLanguage[selectedTestLanguage]);
      return Promise.resolve();
    }
    if (landingCounterRequest?.node === node) return landingCounterRequest.promise;
    const request = { node, promise: null };
    request.promise = (async () => {
      const completedByLanguage = await fetchPublicCompleted();
      if (completedByLanguage === null) return;
      rememberCompleted(completedByLanguage);
      if (isLandingCounterActive(node)) applyCompletedCount(node, selectedTestLanguage, bestCompletedByLanguage[selectedTestLanguage]);
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

  // зачем: владелец 2026-08-02 — переключение языка теста/интерфейса на ТОМ
  // ЖЕ экране (например лендинг→лендинг из-за клика по флагу) заново
  // проигрывало весь секундный каскад появления (заголовок, флаги, шаги,
  // превью сертификата — 12+ элементов с накопленными задержками), выглядело
  // как повторная загрузка/мигание. Каскад уместен только при первой загрузке
  // страницы или реальной смене типа экрана (landing→question и т.п.) —
  // вызывающая функция явно передаёт sameScreen:true для "тихого" перерендера
  // (например renderQuestion с options.preserveAttempt, renderLanding вне
  // самой первой загрузки) — hasMountedFirstView гарантирует, что первая
  // загрузка страницы всегда получает полный каскад независимо от sameScreen.
  function mountView(node, { sameScreen = false } = {}) {
    stopLandingCounterRefresh();
    const old = currentView;
    const instant = sameScreen && hasMountedFirstView;
    // зачем: фокус мог быть не только на самой кнопке-триггере, но и на
    // опции внутри открытой панели (клавиатурная навигация стрелками перед
    // выбором) — оба случая "владели" фокусом меню локали и после ререндера
    // должны вернуть фокус на новый триггер, а не потерять его в пустоту.
    const restoreLocaleToggleFocus = Boolean(
      document.activeElement
      && typeof document.activeElement.matches === 'function'
      && (document.activeElement.matches('.elt-ui-locale-trigger') || document.activeElement.matches('.elt-ui-locale-option')),
    );
    node.classList.add(instant ? 'elt-view--instant' : 'elt-view');
    app.appendChild(node);
    currentView = node;
    hasMountedFirstView = true;
    initMagnets(node);
    if (!instant) window.scrollTo(0, 0);
    if (old) {
      unbindQuestionKeys();
      if (instant) {
        old.remove();
      } else {
        old.classList.add('elt-view--exit');
        old.setAttribute('aria-hidden', 'true');
        setTimeout(() => old.remove(), 420);
      }
    }
    if (restoreLocaleToggleFocus) node.querySelector('.elt-ui-locale-trigger')?.focus?.();
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

  // зачем: владелец 2026-08-02 — нативный <select> для языка интерфейса
  // открывал системное меню ОС (некрасиво, не в стиле сайта). Кастомная
  // кнопка + выпадающая панель с флагом и названием каждого языка, в стиле
  // остальных элементов сайта (без обводки, золотой акцент на выборе).
  function uiLocaleMenuHtml() {
    const currentMeta = EnglishTestI18n.LOCALE_META[uiLocale];
    return `
      <div class="elt-ui-locale-control" data-ui-locale-menu>
        <button type="button" class="elt-ui-locale-trigger" data-ui-locale-trigger aria-haspopup="listbox" aria-expanded="false" aria-label="${copy('aria.localeToggle')}" title="${copy('aria.localeToggle')}">
          <span class="elt-ui-locale-flag"><img src="./assets/flags/${uiLocale}.webp" alt="" width="22" height="22" /></span>
          <span class="elt-ui-locale-code">${currentMeta.shortLabel}</span>
          <svg class="elt-ui-locale-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <ul class="elt-ui-locale-panel" data-ui-locale-panel role="listbox" aria-label="${copy('aria.localeToggle')}" hidden>
          ${EnglishTestI18n.UI_LOCALES.map((locale) => {
            const meta = EnglishTestI18n.LOCALE_META[locale];
            const active = locale === uiLocale;
            return `
              <li class="elt-ui-locale-option${active ? ' elt-ui-locale-option--active' : ''}" data-ui-locale-option="${locale}" role="option" aria-selected="${active}">
                <span class="elt-ui-locale-flag"><img src="./assets/flags/${locale}.webp" alt="" width="22" height="22" /></span>
                <span>${meta.label}</span>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }

  function brandHeader() {
    return `
      <header class="elt-brand">
        <a class="elt-brand-link" href="/" aria-label="${copy('header.brandHomeAria')}">
          <img class="elt-brand-icon" src="/assets/phraseman-icon-128.png" alt="" width="34" height="34" />
          <span class="elt-brand-text"><b>Phraseman</b><small>${attemptTestLanguage === null ? selectedLandingLanguageName() : copy('header.brandSubtitle')}</small></span>
        </a>
        ${uiLocaleMenuHtml()}
      </header>
    `;
  }

  function siteFooter() {
    return `
      <footer class="elt-footer">
        <a href="/">${copy('footer.about')}</a>
        <a href="/legal/privacy/">${copy('footer.privacy')}</a>
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
        <a class="elt-store-badge" data-magnet href="${STORE_URL_IOS}" rel="noopener noreferrer" aria-label="${copy('storeBadges.appStoreAria')}">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16.64 12.22c-.02-2.1 1.72-3.12 1.8-3.17-1-.1-1.53-2.15-3.92-2.18-1.65-.17-3.22.98-4.06.98-.85 0-2.15-.95-3.54-.92-1.82.03-3.5 1.06-4.44 2.7-1.9 3.3-.49 8.2 1.37 10.88.9 1.3 1.98 2.77 3.4 2.72 1.36-.06 1.87-.88 3.52-.88 1.64 0 2.1.88 3.54.85 1.46-.03 2.38-1.33 3.27-2.64 1.04-1.52 1.47-3 1.5-3.07-.03-.01-2.4-.92-2.44-3.27ZM13.44 5.14c.75-.9 1.25-2.16 1.11-3.41-1.07.04-2.37.72-3.14 1.62-.69.8-1.3 2.09-1.13 3.32 1.2.1 2.41-.62 3.16-1.53Z" /></svg>
          <span><small>${copy('storeBadges.appStore')}</small><b>App Store</b></span>
        </a>
        <a class="elt-store-badge" data-magnet href="${STORE_URL_ANDROID}" rel="noopener noreferrer" aria-label="${copy('storeBadges.googlePlayAria')}">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.62 2.33c-.38.4-.62 1.02-.62 1.82v15.7c0 .8.24 1.42.63 1.82l.06.05 8.8-9.62v-.2L3.68 2.28l-.06.05Zm11.8 6.55-2.93 3.02v.2l2.93 3.02.06-.03 3.48-2c1-.56 1-1.5 0-2.07l-3.48-2.02-.06-.12Zm.06 6.21-2.99-3.09-8.87 9.67c.6.64 1.58.72 2.7.08l9.16-6.66Zm0-6.18L6.32 2.25c-1.12-.64-2.1-.56-2.7.08l8.87 9.67 2.99-3.09Z" /></svg>
          <span><small>${copy('storeBadges.googlePlay')}</small><b>Google Play</b></span>
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
    setActiveView('landing', null);
    lastProgress = 0;
    const node = el(`
      <div class="elt-landing">
        ${brandHeader()}

        <section class="elt-hero" aria-labelledby="elt-hero-title">
          <p class="elt-kicker">${copy('landing.eyebrow')}</p>
          <h1 id="elt-hero-title">${copy('landing.title', { language: selectedLandingLanguageName() })}</h1>
          <p class="elt-lead">${copy('landing.subtitle')}</p>

          <section class="elt-language-selector" aria-label="${copy('aria.testSelector')}">
            <p class="elt-language-selector-title">${copy('languageSelector.testLanguage')}</p>
            <div class="elt-language-options" role="group" aria-label="${copy('aria.testSelector')}">
              ${EnglishTestI18n.TEST_LANGUAGES.map((code) => `
                <button class="elt-language-option${code === selectedTestLanguage ? ' elt-language-option--active' : ''}" type="button" data-test-language="${code}" aria-pressed="${code === selectedTestLanguage}">
                  <span class="elt-language-flag"><img src="./assets/flags/${code}.webp" alt="" width="56" height="56" /></span>
                  <span class="elt-language-name">${EnglishTestI18n.TESTS[code].nativeLabel}</span>
                </button>
              `).join('')}
            </div>
          </section>

          <div class="elt-counter" role="status" aria-atomic="true" aria-label="${copy('socialProof.text', { count: bestCompletedByLanguage[selectedTestLanguage].toLocaleString(EnglishTestI18n.LOCALE_META[uiLocale].bcp47) })}">
            <span class="elt-counter-value" aria-hidden="true"><span id="proofCounter">0</span>+</span>
            <span class="elt-counter-label">${copy('socialProof.text', { count: bestCompletedByLanguage[selectedTestLanguage].toLocaleString(EnglishTestI18n.LOCALE_META[uiLocale].bcp47) })}</span>
          </div>

          <button class="elt-btn elt-btn-primary elt-btn-hero" data-magnet id="startBtn">${copy('landing.start')}</button>
          <p class="elt-timer-note">${copy('landing.timerNote')}</p>

          <label class="elt-consent">
            <input type="checkbox" id="consentCheckbox"${consent ? ' checked' : ''} />
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

        ${siteFooter()}
      </div>
    `);

    mountView(node, { sameScreen: true });
    hideBrokenBrandIcons(node);
    bindUiLocaleSelector(node);
    node.querySelectorAll('[data-test-language]').forEach((button) => {
      button.addEventListener('click', () => selectTestLanguage(button.dataset.testLanguage));
    });

    applyCompletedCount(node, selectedTestLanguage, bestCompletedByLanguage[selectedTestLanguage]);
    startLandingCounterRefresh(node);
    void flushCompletionOutbox();

    const readConsent = () => {
      consent = node.querySelector('#consentCheckbox').checked;
    };
    node.querySelector('#consentCheckbox').addEventListener('change', readConsent);
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

  function isAllowedTestLanguage(language) {
    return hasI18n && EnglishTestI18n.TEST_LANGUAGES.includes(language);
  }

  function validateBank(language, bank) {
    if (!bank || typeof bank !== 'object' || Array.isArray(bank)
      || bank.language !== language
      || !Array.isArray(bank.questions)
      || bank.questions.length !== 240
      || !isValidBankVersion(bank.bankVersion)) {
      throw new Error('bank_contract_mismatch');
    }
    return bank;
  }

  function isValidBankVersion(bankVersion) {
    return typeof bankVersion === 'string'
      && bankVersion.length <= MAX_BANK_VERSION_LENGTH
      && BANK_VERSION_PATTERN.test(bankVersion);
  }

  function loadBank(language) {
    if (!isAllowedTestLanguage(language)) return Promise.reject(new Error('bank_contract_mismatch'));
    const cached = bankCache.get(language);
    if (cached) return cached;

    const request = (async () => {
      const res = await fetch(EnglishTestI18n.TESTS[language].bankUrl);
      if (!res.ok) throw new Error('bank_contract_mismatch');
      let bank;
      try {
        bank = await res.json();
      } catch (_) {
        throw new Error('bank_contract_mismatch');
      }
      return validateBank(language, bank);
    })();
    bankCache.set(language, request);
    request.catch(() => {
      if (bankCache.get(language) === request) bankCache.delete(language);
    });
    return request;
  }

  function startTest() {
    if (startPromise) return startPromise;
    if (attemptTestLanguage === null) attemptTestLanguage = selectedTestLanguage;
    const language = attemptTestLanguage;
    const request = (async () => {
      renderLoading();
      try {
        const bank = await loadBank(language);
        bankVersion = bank.bankVersion;
        questions = bank.questions;
      } catch (e) {
        renderError();
        console.error('Bank load failed:', e);
        return;
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
    })();
    startPromise = request;
    request.finally(() => {
      if (startPromise === request) startPromise = null;
    });
    return request;
  }

  function renderLoading() {
    setActiveView('loading', null);
    const node = el(`<div class="elt-loading" role="status">${brandHeader()}<h1>${copy('loading.title')}</h1><p>${copy('loading.text')}</p></div>`);
    mountView(node);
    bindUiLocaleSelector(node);
  }

  function renderError() {
    setActiveView('error', null);
    const node = el(`<div class="elt-error" role="alert">${brandHeader()}<h1>${copy('error.title')}</h1><p>${copy('error.text')}</p><button type="button" class="elt-btn elt-btn-primary" id="retryBtn" title="${copy('error.retryTitle')}">${copy('error.retry')}</button></div>`);
    mountView(node);
    bindUiLocaleSelector(node);
    node.querySelector('#retryBtn').addEventListener('click', startTest);
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
    selectedAnswerIndex = null;
    answerLocked = false;
    renderQuestion(currentQuestion);
    if (consent) {
      api('view', { questionId: currentQuestion.id, position: engine.history.length + 1 });
    }
  }

  function renderQuestion(q, options = {}) {
    setActiveView('question', q);
    const position = engine.history.length + 1;
    const progress = Math.min((position / 20) * 100, 100);
    const testLanguage = attemptTestLanguage || selectedTestLanguage;
    const questionLanguage = EnglishTestI18n.TESTS[testLanguage].bcp47;
    const serviceQuestion = uiLocale === 'ru'
      ? { scenario: q.scenarioRu, instruction: q.instructionRu, language: 'ru' }
      : uiLocale === 'en'
        ? { scenario: q.scenario, instruction: q.prompt, language: 'en' }
        : testLanguage === 'en'
          ? { scenario: q.scenario, instruction: q.prompt, language: 'en' }
          : { scenario: copy('question.context'), instruction: copy('question.contextInstruction'), language: uiLocale };
    const timerLeftMs = options.preserveAttempt ? Math.max(0, questionDeadline - Date.now()) : QUESTION_SECONDS * 1000;
    const timerSeconds = Math.ceil(timerLeftMs / 1000);
    const timerOffset = (TIMER_CIRCUMFERENCE * (1 - timerLeftMs / (QUESTION_SECONDS * 1000))).toFixed(1);

    const node = el(`
      <div class="elt-test">
        ${brandHeader()}
        <div class="elt-progress-bar"><div class="elt-progress-fill"></div></div>
        <div class="elt-question-meta">
          <span>${copy('question.number', { count: position })}</span>
          <span class="elt-timer" id="qTimer" role="timer" aria-live="off" aria-label="${copy('question.timerRemaining')}">
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle class="elt-timer-track" cx="18" cy="18" r="15.5"></circle>
              <circle class="elt-timer-ring" id="qTimerRing" cx="18" cy="18" r="15.5" style="stroke-dashoffset:${timerOffset}"></circle>
            </svg>
            <b id="qTimerNum">${timerSeconds}</b>
          </span>
        </div>
        <div class="elt-scenario" lang="${serviceQuestion.language}">${escapeHtml(serviceQuestion.scenario)}</div>
        <div class="elt-instruction" lang="${serviceQuestion.language}">${escapeHtml(serviceQuestion.instruction)}</div>
        ${q.stimulus
          ? `<div class="elt-stimulus" lang="${questionLanguage}">${escapeHtml(q.stimulus)}</div>`
          : ''}
        <div class="elt-options" role="radiogroup" aria-label="${copy('question.answerGroup')}">
          ${q.options
            .map(
              (opt, i) => `
            <button class="elt-option${selectedAnswerIndex === i ? ' elt-option--picked' : ''}" data-index="${i}" role="radio" aria-checked="${selectedAnswerIndex === i}" tabindex="${i === 0 ? '0' : '-1'}"${answerLocked ? ' disabled' : ''}>
              <span class="elt-option-letter">${String.fromCharCode(65 + i)}</span>
              <span class="elt-option-text" lang="${questionLanguage}">${escapeHtml(opt)}</span>
            </button>
          `
            )
            .join('')}
        </div>
        <div class="elt-actions">
          <button class="elt-btn elt-btn-secondary" id="skipBtn">${copy('question.skip')}</button>
          <button class="elt-btn elt-btn-ghost" id="exitBtn">${copy('question.exit')}</button>
        </div>
        <div class="elt-report-trigger-wrap">
          <button type="button" class="elt-report-trigger" id="reportErrorBtn">${copy('report.trigger')}</button>
        </div>
      </div>
    `);

    mountView(node, { sameScreen: options.preserveAttempt });

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
        selectAnswer(q, btn);
      });
    });

    bindUiLocaleSelector(node);
    bindQuestionKeys();
    node.querySelector('#skipBtn').addEventListener('click', () => {
      if (answerLocked) return;
      selectedAnswerIndex = -1;
      answerLocked = true;
      answerQuestion(q, -1, true);
    });
    node.querySelector('#exitBtn').addEventListener('click', confirmExit);
    node.querySelector('#reportErrorBtn').addEventListener('click', (event) => {
      openReportDialog(q, serviceQuestion, position, event.currentTarget);
    });
    if (!options.preserveAttempt) startQuestionTimer();
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
        if (!answerLocked) {
          selectedAnswerIndex = -1;
          answerLocked = true;
          answerQuestion(currentQuestion, -1, true);
        }
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

  function selectAnswer(question, button) {
    const currentButtons = currentView ? Array.from(currentView.querySelectorAll('.elt-option')) : [];
    const currentIndex = currentButtons.indexOf(button);
    if (answerLocked || question !== currentQuestion || currentIndex < 0) return false;
    selectedAnswerIndex = currentIndex;
    answerLocked = true;
    button.classList.add('elt-option--picked');
    button.setAttribute('aria-checked', 'true');
    setTimeout(() => answerQuestion(question, currentIndex, false), 200);
    return true;
  }

  function setRovingOptionFocus(buttons, targetIndex) {
    buttons.forEach((button, index) => {
      button.tabIndex = index === targetIndex ? 0 : -1;
    });
    buttons[targetIndex]?.focus();
  }

  function handleQuestionKeydown(e) {
    const view = currentView && currentView.classList.contains('elt-test') ? currentView : null;
    if (!view) return;
    const buttons = view.querySelectorAll('.elt-option');
    if (!buttons.length) return;
    const focused = document.activeElement;
    let idx = Array.from(buttons).indexOf(focused);
    const q = currentQuestion;

    if ((e.key === 'Enter' || e.key === ' ') && focused?.classList?.contains('elt-option')) {
      e.preventDefault();
      if (!answerLocked && idx >= 0) selectAnswer(q, buttons[idx]);
      return;
    }

    if (answerLocked) return;

    if (e.key >= '1' && e.key <= '4') {
      const i = parseInt(e.key, 10) - 1;
      if (buttons[i]) {
        e.preventDefault();
        setRovingOptionFocus(buttons, i);
        selectAnswer(q, buttons[i]);
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = idx < 0 ? 0 : Math.min(idx + 1, buttons.length - 1);
      setRovingOptionFocus(buttons, nextIndex);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const previousIndex = idx < 0 ? buttons.length - 1 : Math.max(idx - 1, 0);
      setRovingOptionFocus(buttons, previousIndex);
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
    if (!confirm(`${copy('exitConfirm.title')}\n\n${copy('exitConfirm.text')}`)) return;
    clearQuestionTimer();
    unbindQuestionKeys();
    currentQuestion = null; // отменяет отложенные ответы (setTimeout 200 мс)
    if (consent && engine) {
      api('abandon', { lastPosition: engine.history.length });
    }
    returnToLanding();
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

  function renderResult(result, options = {}) {
    const preservedName = options.preserveAttempt ? sanitizeName(currentView?.querySelector('#certName')?.value || '') : '';
    setActiveView('result', result);
    const cta = ctaContentFor(result.estimatedLevel);
    const node = el(`
      <div class="elt-result">
        ${brandHeader()}
        <div class="elt-result-card">
          <div class="elt-level-badge">${escapeHtml(result.estimatedLevel)}</div>
          <h2>${copy('result.level', { level: escapeHtml(result.estimatedLevel) })}</h2>
          <div class="elt-result-details" aria-live="off">
            <div class="elt-stat"><span class="elt-stat-value"><span id="statCorrect">0</span>/${result.answered}</span><span class="elt-stat-label">${copy('stats.correct')}</span></div>
            <div class="elt-stat"><span class="elt-stat-value"><span id="statAnswered">0</span>/${result.totalQuestions}</span><span class="elt-stat-label">${copy('stats.answered')}</span></div>
            <div class="elt-stat"><span class="elt-stat-value" id="statSkipped">0</span><span class="elt-stat-label">${copy('stats.skipped')}</span></div>
          </div>
          <div class="elt-name-section">
            <label for="certName">${copy('name.label')}</label><input type="text" id="certName" maxlength="60" value="${escapeHtml(preservedName)}" placeholder="${copy('name.placeholder')}" autocomplete="name" />
            <button class="elt-btn elt-btn-primary" data-magnet id="certBtn">${copy('certificate.create')}</button>
          </div>
          <div class="elt-pitch">
            <div class="elt-pitch-head">
              <img class="elt-brand-icon elt-pitch-icon" src="/assets/phraseman-icon-128.png" alt="" width="40" height="40" />
              <div class="elt-pitch-title"><b>Phraseman</b><small>${copy('result.pitchSubtitle')}</small></div>
            </div>
            <p class="elt-pitch-text">${cta.text}</p>
            <ul class="elt-pitch-list">
              <li>${copy('result.benefit1')}</li><li>${copy('result.benefit2')}</li><li>${copy('result.benefit3')}</li>
            </ul>
            ${storeBadgesHtml('elt-store-badges--compact')}
          </div>
          <div class="elt-share">
            <button class="elt-btn elt-btn-ghost" id="shareBtn">${copy('sharing.title')}</button>
            <button class="elt-btn elt-btn-ghost" id="restartBtn">${copy('sharing.restart')}</button>
          </div>
        </div>
      </div>
    `);

    mountView(node, { sameScreen: options.preserveAttempt });
    hideBrokenBrandIcons(node);
    bindUiLocaleSelector(node);

    if (!options.preserveAttempt) {
      countUp(node.querySelector('#statCorrect'), result.correct, { delay: 250 });
      countUp(node.querySelector('#statAnswered'), result.answered, { delay: 350 });
      countUp(node.querySelector('#statSkipped'), result.skipped, { delay: 450 });
    } else {
      node.querySelector('#statCorrect').textContent = String(result.correct);
      node.querySelector('#statAnswered').textContent = String(result.answered);
      node.querySelector('#statSkipped').textContent = String(result.skipped);
    }

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
        alert(copy('alerts.nameRequired'));
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
    node.querySelector('#restartBtn').addEventListener('click', returnToLanding);
  }

  function generateCertificate(name, result) {
    const certData = {
      name,
      result,
      uiLocale,
      testLanguage: attemptTestLanguage || selectedTestLanguage,
      onClose: () => renderCTA(result),
      cta: {
        text: EnglishTestI18n.t(uiLocale, 'certificate.ctaText'),
        label: EnglishTestI18n.t(uiLocale, 'certificate.ctaButton'),
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
      if (!win) {
        return;
      }
      win.document.write(`
        <html><head><title>${copy('certificate.printTitle')}</title>
        <style>body{font-family:Georgia,serif;text-align:center;padding:40px;background:#0c0c0e;color:#e6e6e6} .cert{border:2px solid #2a9d5c;padding:60px;max-width:600px;margin:0 auto;border-radius:16px}</style>
        </head><body>
        <div class="cert">
          <h1>${copy('certificate.bodyTitle')}</h1>
          <p><strong>${escapeHtml(name)}</strong></p>
          <p>${copy('certificate.completed', { language: EnglishTestI18n.TESTS[certData.testLanguage].certificateNames[uiLocale] })}</p>
          <p>${copy('result.level', { level: escapeHtml(result.estimatedLevel) })}</p>
          <p>${copy('certificate.summary', { correct: result.correct, answered: result.answered })}</p>
          <p><small>${copy('certificate.informal')}</small></p>
        </div>
        </body></html>
      `);
      win.document.close();
      renderCTA(result);
    }
  }

  async function shareResult(result) {
    const language = EnglishTestI18n.TESTS[attemptTestLanguage || selectedTestLanguage].resultNames[uiLocale];
    const text = copy('sharing.resultPayload', { language, level: result.estimatedLevel });
    const url = new URL('https://knowlyapps.com/english-level-test/');
    url.searchParams.set('test', attemptTestLanguage || selectedTestLanguage);
    url.searchParams.set('ui', uiLocale);
    const shareUrl = url.toString();
    if (consent) api('share', { channel: 'web_share_api_attempted' });
    if (navigator.share) {
      try {
        await navigator.share({ title: copy('sharing.webShareTitle'), text, url: shareUrl });
        if (consent) api('share', { channel: 'web_share_api_success' });
        return;
      } catch (e) { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(text + ' ' + shareUrl);
      alert(copy('alerts.copySuccess'));
      if (consent) api('share', { channel: 'clipboard_copy' });
    } catch (e) {
      prompt(copy('sharing.clipboardPrompt'), text + ' ' + shareUrl);
    }
  }

  // ---------- CTA (install Phraseman) ----------

  function ctaContentFor(level) {
    const locale = uiLocale;
    const band = String(level || '').slice(0, 2).toUpperCase();
    const key = band === 'PR' || band === 'A1' || band === 'A2' ? 'low' : (band === 'B1' || band === 'B2' ? 'mid' : 'high');
    return {
      title: EnglishTestI18n.t(locale, `resultCta.${key}.title`),
      text: EnglishTestI18n.t(locale, `resultCta.${key}.text`),
      button: EnglishTestI18n.t(locale, `resultCta.${key}.button`),
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

  function renderCTA(result, options = {}) {
    setActiveView('cta', result);
    const cta = ctaContentFor(result.estimatedLevel);
    if (!options.preserveAttempt && consent) api('cta_view', { level: result.estimatedLevel });

    const node = el(`
      <div class="elt-cta">
        ${brandHeader()}
        <div class="elt-cta-main">
          <div class="elt-cta-level" aria-label="${copy('aria.resultLevel')}">${escapeHtml(result.estimatedLevel)}</div>
          <h1>${cta.title}</h1>
          <p class="elt-cta-text">${cta.text}</p>
          <button class="elt-btn elt-btn-primary elt-btn-hero" data-magnet id="ctaPrimary">${cta.button}</button>
          ${storeBadgesHtml()}
          <div class="elt-cta-secondary">
            ${lastCertName ? `<button class="elt-btn elt-btn-secondary" id="ctaCert">${copy('certificate.download')}</button>` : ''}
            <button class="elt-btn elt-btn-ghost" id="ctaShare">${copy('sharing.title')}</button>
            <button class="elt-btn elt-btn-ghost" id="ctaRetake">${copy('sharing.restart')}</button>
          </div>
        </div>
        ${siteFooter()}
      </div>
    `);

    mountView(node, { sameScreen: options.preserveAttempt });
    hideBrokenBrandIcons(node);
    bindUiLocaleSelector(node);

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
