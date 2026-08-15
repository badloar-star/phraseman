(function (global) {
  'use strict';

  const STORAGE_KEY = 'knowly_site_locale_v1';
  const SUPPORTED = ['en', 'ru'];
  const CATALOG = global.KnowlySiteI18nCatalog || { en: {}, ru: {} };

  function queryLocale(search) {
    try {
      const value = new URLSearchParams(search || '').get('lang');
      return SUPPORTED.includes(value) ? value : null;
    } catch (_) {
      return null;
    }
  }

  function resolveLocale(input) {
    const options = input || {};
    const query = queryLocale(options.search);
    if (query) return query;
    if (SUPPORTED.includes(options.stored)) return options.stored;
    const languages = Array.isArray(options.languages) ? options.languages : [];
    return languages.some((value) => String(value).toLowerCase().startsWith('ru')) ? 'ru' : 'en';
  }

  function storedLocale() {
    try { return global.localStorage && global.localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }

  function currentLocale() {
    if (!global.location || !global.navigator) return 'en';
    return resolveLocale({
      search: global.location.search,
      stored: storedLocale(),
      languages: global.navigator.languages || [global.navigator.language],
    });
  }

  function get(object, key) {
    return String(key || '').split('.').reduce((value, part) => value && value[part], object);
  }

  function t(key, variables, locale) {
    const value = get(CATALOG[locale || currentLocale()], key);
    if (typeof value !== 'string') return '';
    return value.replace(/{{([a-zA-Z0-9_]+)}}/g, (_, name) => String(variables && variables[name] !== undefined ? variables[name] : ''));
  }

  function pageId() {
    return global.document && global.document.documentElement.dataset.i18nPage;
  }

  function translateValue(value, locale) {
    if (!SUPPORTED.includes(locale) || typeof value !== 'string') return value;
    const id = pageId();
    const sharedRuntime = id === 'premium' || id === 'gift' ? get(CATALOG.en, 'start.runtime') : null;
    const page = Object.assign({}, get(CATALOG.en, 'common.replace') || {}, get(CATALOG.en, 'common.runtime') || {}, get(CATALOG.en, id + '.replace') || {}, sharedRuntime || {}, get(CATALOG.en, id + '.runtime') || {});
    const translations = locale === 'en' ? page : Object.keys(page).reduce((inverse, source) => {
      if (!Object.prototype.hasOwnProperty.call(inverse, page[source])) inverse[page[source]] = source;
      return inverse;
    }, {});
    const normalized = value.replace(/\s+/g, ' ');
    return Object.keys(translations)
      .sort((left, right) => right.length - left.length)
      .reduce((translated, source) => translated.split(source).join(translations[source]), normalized);
  }

  function translateDocument(locale) {
    const document = global.document;
    if (!document || !SUPPORTED.includes(locale)) return;
    function translateTree(root) {
      if (!root) return;
      const walker = document.createTreeWalker(root, global.NodeFilter.SHOW_TEXT);
      const nodes = [];
      if (root.nodeType === 3) nodes.push(root);
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const parentTag = node.parentElement && node.parentElement.tagName;
        if (parentTag === 'SCRIPT' || parentTag === 'STYLE') return;
        const translated = translateValue(node.nodeValue, locale);
        const phraseExample = node.parentElement
          && node.parentElement.tagName === 'LI'
          && node.parentElement.querySelector('strong')
          && /[A-Za-z]/.test(node.parentElement.querySelector('strong').textContent || '');
        const nextValue = phraseExample && /[А-Яа-яЁё]/.test(translated) ? '' : translated;
        if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
      });
    }
    if (locale === 'en') translateTree(document.body);
    document.querySelectorAll('title, meta[content], [aria-label], [alt], [placeholder], [title]').forEach((element) => {
      if (element.tagName === 'TITLE') element.textContent = translateValue(element.textContent, locale);
      ['content', 'aria-label', 'alt', 'placeholder', 'title'].forEach((attribute) => {
        if (element.hasAttribute(attribute)) element.setAttribute(attribute, translateValue(element.getAttribute(attribute), locale));
      });
    });
    if (locale === 'en' && global.MutationObserver) {
      new global.MutationObserver((records) => {
        records.forEach((record) => {
          if (record.type === 'characterData') translateTree(record.target);
          record.addedNodes.forEach((node) => translateTree(node));
        });
      }).observe(document.body, { childList: true, characterData: true, subtree: true });
    }
  }

  function setLocale(locale) {
    if (!SUPPORTED.includes(locale) || !global.location) return;
    try { global.localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}
    const url = new URL(global.location.href);
    url.searchParams.set('lang', locale);
    global.location.assign(url.toString());
  }

  function placeSwitcher(mount) {
    const header = mount && mount.closest && mount.closest('header');
    const navigation = header && header.querySelector('nav');
    if (!navigation) return;
    const primaryAction = navigation.querySelector('.b, .km-cta, .btn, [data-primary-action]');
    if (primaryAction) navigation.insertBefore(mount, primaryAction);
    else navigation.appendChild(mount);
  }

  function makeSelector(mount, locale) {
    const document = global.document;
    if (!document || !mount) return;
    const shell = document.createElement('div');
    shell.className = 'site-language';
    shell.innerHTML = '<button class="site-language__button" type="button" aria-haspopup="menu" aria-expanded="false">'
      + '<svg class="site-language__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
      + '<span>' + locale.toUpperCase() + '</span></button>'
      + '<div class="site-language__menu" role="menu" hidden></div>';
    const button = shell.querySelector('.site-language__button');
    const menu = shell.querySelector('.site-language__menu');
    button.setAttribute('aria-label', t('common.language', null, locale) || 'Language');
    SUPPORTED.forEach((code) => {
      const option = document.createElement('button');
      option.className = 'site-language__option';
      option.type = 'button';
      option.role = 'menuitemradio';
      option.setAttribute('aria-current', String(code === locale));
      option.textContent = code === 'en' ? t('common.switchToEnglish', null, locale) : t('common.switchToRussian', null, locale);
      option.addEventListener('click', () => setLocale(code));
      menu.appendChild(option);
    });
    function close() { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); }
    button.addEventListener('click', () => {
      const open = menu.hidden;
      menu.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    });
    shell.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { close(); button.focus(); }
    });
    document.addEventListener('click', (event) => { if (!shell.contains(event.target)) close(); });
    mount.replaceChildren(shell);
  }

  function initialize() {
    const document = global.document;
    if (!document) return;
    const locale = currentLocale();
    document.documentElement.lang = locale;
    translateDocument(locale);
    document.querySelectorAll('[data-i18n-switcher]').forEach((mount) => {
      placeSwitcher(mount);
      makeSelector(mount, locale);
    });
  }

  const api = Object.freeze({ STORAGE_KEY, SUPPORTED, CATALOG, currentLocale, initialize, resolveLocale, setLocale, t, translateValue });
  global.KnowlySiteI18n = api;
  if (global.document) {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
  }
})(typeof window === 'undefined' ? globalThis : window);
