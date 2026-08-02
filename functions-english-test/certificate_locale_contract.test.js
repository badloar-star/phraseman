const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const CLIENT_DIR = path.dirname(require.resolve('../knowly-www/english-level-test/certificate.js'));
const read = (file) => fs.readFileSync(path.join(CLIENT_DIR, file), 'utf8');
const result = { estimatedLevel: 'B2', correct: 8, answered: 10 };

function loadI18n() {
  const context = vm.createContext({ URL, URLSearchParams });
  vm.runInContext(read('i18n.locales.js'), context);
  vm.runInContext(read('i18n.js'), context);
  return context.EnglishTestI18n;
}

class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.parentNode = null; this.dataset = {}; this.style = {}; this.attributes = {}; this.listeners = {}; this.className = ''; this.classList = { add: (name) => { if (!this.className.split(/\s+/).includes(name)) this.className += ` ${name}`; }, remove: (name) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== name).join(' '); } }; this.textContent = ''; this.offsetParent = this; this.isConnected = true; }
  set innerHTML(markup) { this._html = markup; this.children = []; const add = (tag, attrs, content = '') => { const el = new Element(tag); el.className = (attrs.match(/class="([^"]*)"/) || [, ''])[1]; const id = (attrs.match(/id="([^"]*)"/) || [, ''])[1]; const title = (attrs.match(/title="([^"]*)"/) || [, ''])[1]; if (id) el.attributes.id = id; if (title) el.attributes.title = title; for (const [, key, value] of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)) el.dataset[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value; for (const [, key, value] of attrs.matchAll(/(aria-[\w-]+)="([^"]*)"/g)) el.attributes[key] = value; el.textContent = content.replace(/<[^>]+>/g, '').trim(); this.appendChild(el); return el; }; for (const match of markup.matchAll(/<div([^>]*)>/g)) add('div', match[1]); for (const match of markup.matchAll(/<p([^>]*)>([\s\S]*?)<\/p>/g)) add('p', match[1], match[2]); for (const match of markup.matchAll(/<span([^>]*)>/g)) add('span', match[1]); for (const match of markup.matchAll(/<input([^>]*)>/g)) { const input = add('input', match[1]); input.value = (match[1].match(/value="([^"]*)"/) || [, ''])[1]; } for (const match of markup.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) { const button = add('button', match[1], match[2]); if (match[2].includes('elt-cert-theme-name')) { const label = new Element('span'); label.className = 'elt-cert-theme-name'; button.appendChild(label); } } const area = new Element('div'); area.attributes.id = 'certRenderArea'; area._html = markup.match(/<div class="elt-cert-wrap" id="certRenderArea">([\s\S]*?)<\/div>/)?.[1] || ''; this.appendChild(area); }
  get innerHTML() { return this._html || ''; }
  appendChild(el) { el.parentNode = this; el.ownerDocument = this.ownerDocument; this.children.push(el); return el; }
  remove() { const contains = (node, target) => node === target || node.children.some((child) => contains(child, target)); const disconnect = (node) => { node.isConnected = false; for (const child of node.children) disconnect(child); }; if (this.ownerDocument?.activeElement && contains(this, this.ownerDocument.activeElement)) this.ownerDocument.activeElement = this.ownerDocument.body; this.parentNode?.children.splice(this.parentNode.children.indexOf(this), 1); disconnect(this); }
  querySelectorAll(selector) { const all = []; const focusable = selector.startsWith('button:not('); const visit = (el) => { for (const child of el.children) { const data = selector.match(/^\[data-([\w-]+)="([^"]*)"\]$/); if ((focusable && ['button', 'a', 'input'].includes(child.tagName.toLowerCase())) || (selector.startsWith('.') && child.className.split(/\s+/).includes(selector.slice(1))) || (selector.startsWith('#') && child.attributes.id === selector.slice(1)) || (data && child.dataset[data[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] === data[2]) || selector === child.tagName.toLowerCase()) all.push(child); visit(child); } }; visit(this); return all; }
  querySelector(selector) { if (selector.endsWith(' svg')) return { style: {}, outerHTML: '<svg />' }; return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { if (this.tagName === 'a' && this.ownerDocument?.downloads) this.ownerDocument.downloads.push(this.download); for (const fn of this.listeners.click || []) fn({ preventDefault() {} }); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  removeAttribute(key) { delete this.attributes[key]; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  focus() { this.ownerDocument.activeElement = this; }
  animate() { const callbacks = this.ownerDocument?.deferredAnimationCallbacks; return { set onfinish(fn) { if (callbacks) callbacks.push(fn); else fn(); } }; }
  scrollIntoView() {}
}

function harness({ ios = false, reduced = true, pngFailure = false, fixedDate, deferAnimations = false } = {}) {
  const i18n = loadI18n(); const body = new Element('body'); const document = { body, activeElement: new Element('button'), downloads: [], listeners: {}, deferredAnimationCallbacks: deferAnimations ? [] : null, createElement: (tag) => { const el = new Element(tag); el.ownerDocument = document; if (tag === 'canvas') { el.getContext = () => ({ scale() {}, drawImage() {} }); el.toBlob = (fn) => fn(pngFailure ? null : {}); } return el; }, addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }, removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((listener) => listener !== fn); }, dispatch(type, event) { for (const fn of this.listeners[type] || []) fn(event); } }; body.ownerDocument = document; document.activeElement.ownerDocument = document;
  const downloads = document.downloads; const alerts = []; const prints = []; let objectId = 0;
  const win = { document, matchMedia: () => ({ matches: reduced }), open: () => { const printed = { document: { write: (value) => { printed.markup = value; }, close() {} } }; prints.push(printed); return printed; }, location: {}, navigator: ios ? { userAgent: 'iPhone' } : {}, URL: { createObjectURL: () => `blob:${++objectId}`, revokeObjectURL() {} } };
  const DateForCertificate = fixedDate ? class extends Date { constructor(...args) { super(...(args.length ? args : [fixedDate])); } static now() { return new Date(fixedDate).valueOf(); } } : Date;
  const context = vm.createContext({ EnglishTestI18n: i18n, window: win, navigator: win.navigator, document, URL: win.URL, Blob, Date: DateForCertificate, XMLSerializer: class { serializeToString() { return '<svg />'; } }, Image: class { set src(_) { this.onload(); } }, alert: (message) => alerts.push(message), setTimeout: () => 0, globalThis: win });
  vm.runInContext(read('certificate.js'), context); return { i18n, certificate: win.EnglishTestCertificate, document, body, downloads, alerts, prints, win, animationCallbacks: document.deferredAnimationCallbacks };
}

function modal(h) { return h.body.children.at(-1); }
function svg(h) { return modal(h).querySelectorAll('#certRenderArea').find((area) => area.innerHTML.includes('<svg')).innerHTML; }
function show(h, data = {}) { h.certificate.show({ name: 'Alex', result, uiLocale: 'en', testLanguage: 'de', ...data }); return modal(h); }
function click(h, selector) { modal(h).querySelector(selector).click(); }
function assertCertificateSurface(h, uiLocale, testLanguage, data = {}) {
  const expectedResult = data.result || result; const expectedName = data.name || 'Alex'; const copy = (key, vars) => h.i18n.t(uiLocale, key, vars); const certificate = svg(h); const language = h.i18n.TESTS[testLanguage].certificateNames[uiLocale];
  for (const text of [copy('certificate.bodyTitle'), copy('certificate.certifies'), expectedName, copy('certificate.completed', { language }), copy('certificate.received'), expectedResult.estimatedLevel, copy('certificate.summary', { correct: expectedResult.correct, answered: expectedResult.answered }), copy('certificate.informal')]) assert.ok(certificate.includes(text), `certificate body must include ${text}`);
  for (const [selector, text] of [['#certDownloadPng', copy('certificate.downloadPng')], ['#certPrint', copy('certificate.printPdf')], ['#certClose', copy('certificate.close')], ['.elt-cert-cta-text', copy('certificate.ctaText')], ['#certCtaBtn', copy('certificate.ctaButton')]]) assert.equal(modal(h).querySelector(selector).textContent, text);
  for (const [selector, text] of [['.elt-cert-container', copy('certificate.dialogLabel')], ['.elt-cert-close', copy('certificate.closeLabel')], ['.elt-cert-langs', copy('certificate.languageGroup')], ['.elt-cert-themes', copy('certificate.themeGroup')]]) assert.equal(modal(h).querySelector(selector).getAttribute('aria-label'), text);
  for (const theme of ['gold', 'dark', 'emerald', 'rose', 'royal']) { const button = modal(h).querySelector(`[data-theme="${theme}"]`); const label = copy(`certificate.themes.${theme}`); assert.equal(button.querySelector('.elt-cert-theme-name').textContent, label); assert.equal(button.title, label); }
  assert.equal(modal(h).querySelector(`[data-lang="${uiLocale}"]`).getAttribute('aria-pressed'), 'true');
}
const THEME_PALETTES = { gold: { bg: '#faf8f3', ribbon: '#c9a96e' }, dark: { bg: '#0a0f1c', ribbon: '#38bdf8' }, emerald: { bg: '#ecfdf5', ribbon: '#22c55e' }, rose: { bg: '#fff1f2', ribbon: '#f43f5e' }, royal: { bg: '#1e1b4b', ribbon: '#6366f1' } };

test('public show renders the complete localized certificate surface for every assessed language', () => {
  const fixedDate = '2025-01-02T12:00:00.000Z'; const h = harness({ fixedDate });
  for (const uiLocale of ['en', 'ru']) for (const testLanguage of h.i18n.TEST_LANGUAGES) {
    show(h, { uiLocale, testLanguage, cta: { url: 'https://example.test' } }); assertCertificateSurface(h, uiLocale, testLanguage); assert.ok(svg(h).includes(new Date(fixedDate).toLocaleDateString(uiLocale === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })));
  }
});

test('public show resets locale and subject across sequential opens', () => {
  const h = harness(); show(h, { uiLocale: 'ru', testLanguage: 'de', name: 'Первый' }); click(h, '#certClose'); show(h, { uiLocale: 'en', testLanguage: 'es', name: 'Second' });
  assert.match(svg(h), /Phraseman Spanish Level Check/); assert.match(svg(h), /Second/); assert.doesNotMatch(svg(h), /Первый/);
});

test('rapid public show supersedes stale modal lifecycle and restores the original launch focus', () => {
  const h = harness({ deferAnimations: true }); const launch = h.document.activeElement; let staleCloses = 0; let latestCloses = 0; show(h, { name: 'First', onClose: () => { staleCloses++; } }); show(h, { name: 'Second', onClose: () => { staleCloses++; } }); show(h, { name: 'Third', onClose: () => { latestCloses++; } }); const latest = modal(h); const latestClose = latest.querySelector('.elt-cert-close');
  assert.equal(h.body.children.length, 1); assert.equal(latest.querySelector('.elt-cert-container').getAttribute('aria-modal'), 'true'); assert.equal(h.document.activeElement, latestClose);
  for (const finish of h.animationCallbacks.splice(0)) finish(); assert.equal(h.body.children.length, 1); assert.equal(h.document.activeElement, latestClose); assert.equal(staleCloses, 0); assert.equal(latestCloses, 0);
  click(h, '#certClose'); for (const finish of h.animationCallbacks.splice(0)) finish(); assert.equal(h.body.children.length, 0); assert.equal(latestCloses, 1); assert.equal(staleCloses, 0); assert.equal(h.document.activeElement, launch);
});

test('manual RU and EN locale switches update every localized surface without changing certificate data', () => {
  const h = harness(); h.document.documentElement = { lang: 'en', setAttribute(_, value) { this.lang = value; } }; const data = { name: 'Ada', result: { ...result, estimatedLevel: 'C1' }, uiLocale: 'en', testLanguage: 'es', cta: { url: 'https://example.test' } };
  show(h, data); click(h, '[data-theme="rose"]'); assertCertificateSurface(h, 'en', 'es', data); click(h, '[data-lang="ru"]'); assertCertificateSurface(h, 'ru', 'es', data); assert.ok(svg(h).includes('Ada')); assert.ok(svg(h).includes('C1')); assert.ok(svg(h).includes(h.i18n.t('ru', 'certificate.completed', { language: h.i18n.TESTS.es.certificateNames.ru }))); assert.ok(modal(h).querySelector('[data-theme="rose"]').className.includes('active')); assert.equal(h.document.documentElement.lang, 'en');
  click(h, '[data-lang="en"]'); assertCertificateSurface(h, 'en', 'es', data); assert.ok(svg(h).includes('Ada')); assert.ok(svg(h).includes('C1')); assert.ok(svg(h).includes(h.i18n.t('en', 'certificate.completed', { language: h.i18n.TESTS.es.certificateNames.en }))); assert.ok(modal(h).querySelector('[data-theme="rose"]').className.includes('active')); assert.equal(h.document.documentElement.lang, 'en');
});

test('all five themes remain available and selected after a locale switch', () => {
  const h = harness(); show(h); for (const theme of ['gold', 'dark', 'emerald', 'rose', 'royal']) assert.ok(modal(h).querySelector(`[data-theme="${theme}"]`)); click(h, '[data-theme="royal"]'); click(h, '[data-lang="ru"]'); assert.ok(modal(h).querySelector('[data-theme="royal"]').className.includes('active'));
});

test('each public theme selection renders and downloads its distinct palette', async () => {
  const h = harness(); show(h, { name: 'Alex' }); for (const [theme, palette] of Object.entries(THEME_PALETTES)) { click(h, `[data-theme="${theme}"]`); assert.ok(svg(h).includes(`stop-color:${palette.bg};stop-opacity:1`)); assert.ok(svg(h).includes(`fill="${palette.ribbon}"`)); click(h, '#certDownloadPng'); await new Promise((resolve) => setImmediate(resolve)); assert.equal(h.downloads.at(-1), `phraseman-german-level-b2-alex-${theme}.png`); }
});

test('normal PNG download has exact locale filename in English and Russian', async () => {
  for (const uiLocale of ['en', 'ru']) {
    const h = harness(); show(h, { uiLocale, testLanguage: 'fr', name: 'Alex' }); click(h, '#certDownloadPng'); await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.downloads.at(-1), `phraseman-${h.i18n.TESTS.fr.filenameSlugs[uiLocale]}-level-b2-alex-gold.png`);
  }
});

test('normal PNG download uses active locale slug, Unicode learner name, level and selected theme', async () => {
  const h = harness(); show(h, { testLanguage: 'de', name: 'Алексей 张伟 Élodie' }); click(h, '[data-theme="royal"]'); click(h, '[data-lang="ru"]'); click(h, '#certDownloadPng'); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(h.downloads.at(-1), 'phraseman-nemetskiy-yazyk-level-b2-алексей-张伟-élodie-royal.png');
  assert.match(h.downloads.at(-1), /^phraseman-[\p{L}\p{N}-]+-level-(?:pre-a1|a1|a2|b1|b2|c1|c2|unknown)-[\p{L}\p{N}\p{M}-]+-(?:gold|dark|emerald|rose|royal)\.png$/u);
});

test('public download rejects hostile name, level, and theme components while preserving normal Unicode names', async () => {
  const hostileThemeSource = read('certificate.js').replace('currentTheme = btn.dataset.theme;', "currentTheme = '../evil';"); const hostile = harnessWithSource(hostileThemeSource); show(hostile, { testLanguage: 'de', name: '../\\\u0000"<>', result: { ...result, estimatedLevel: '../<script>' } }); click(hostile, '[data-theme="rose"]'); click(hostile, '#certDownloadPng'); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(hostile.downloads.at(-1), 'phraseman-german-level-unknown-learner-gold.png'); assert.doesNotMatch(hostile.downloads.at(-1), /[\\/<>"\u0000]|evil|script|\.\./);
  const unicode = harness(); show(unicode, { testLanguage: 'de', name: 'Алексей 张伟 Élodie' }); click(unicode, '[data-theme="royal"]'); click(unicode, '[data-lang="ru"]'); click(unicode, '#certDownloadPng'); await new Promise((resolve) => setImmediate(resolve)); assert.equal(unicode.downloads.at(-1), 'phraseman-nemetskiy-yazyk-level-b2-алексей-张伟-élodie-royal.png');
});

test('actual PNG failure alerts in the currently selected locale', async () => {
  const h = harness({ pngFailure: true }); show(h); click(h, '[data-lang="ru"]'); click(h, '#certDownloadPng'); await new Promise((resolve) => setImmediate(resolve)); assert.deepEqual(h.alerts, [h.i18n.t('ru', 'certificate.pngFailure')]);
});

test('unknown show inputs fall back to English and Escape removes the modal and restores focus', () => {
  const h = harness(); const before = h.document.activeElement; show(h, { uiLocale: 'unknown', testLanguage: 'unknown' }); assert.match(svg(h), /Phraseman English Level Check/); assert.equal(h.document.activeElement.className, 'elt-cert-close'); h.document.dispatch('keydown', { key: 'Escape', preventDefault() {} }); assert.equal(h.body.children.length, 0); assert.equal(h.document.activeElement, before);
});

test('iOS preview uses the active certificate locale for alt and hint', async () => {
  const h = harness({ ios: true }); show(h); click(h, '[data-lang="ru"]'); click(h, '#certDownloadPng'); await new Promise((resolve) => setImmediate(resolve)); const link = modal(h).querySelector('.elt-cert-save-link'); const image = link?.querySelector('img'); assert.equal(image?.alt, h.i18n.t('ru', 'certificate.iosReadyImageAlt')); assert.equal(modal(h).querySelector('.elt-cert-save-hint')?.textContent, h.i18n.t('ru', 'certificate.iosLongPressHint')); assert.equal(link?.download, 'phraseman-nemetskiy-yazyk-level-b2-alex-gold.png');
});

test('print output uses current locale, assessed subject, and selected theme palette', () => { const h = harness(); show(h, { testLanguage: 'fr' }); click(h, '[data-lang="ru"]'); click(h, '[data-theme="royal"]'); click(h, '#certPrint'); assert.match(h.prints[0].markup, /<title>Сертификат<\/title>/); assert.match(h.prints[0].markup, /французского языка/); assert.ok(h.prints[0].markup.includes('stop-color:#1e1b4b;stop-opacity:1')); assert.ok(h.prints[0].markup.includes('fill="#6366f1"')); });

test('certificate escapes hostile name and result in rendered SVG', () => { const h = harness(); show(h, { name: '<img src=x>', result: { ...result, estimatedLevel: '<script>x</script>' } }); assert.doesNotMatch(svg(h), /<script>|<img src=x>/); assert.match(svg(h), /&lt;script&gt;/); });

test('Tab and Shift+Tab wrap inside the live modal and close removes its listener', () => {
  const h = harness(); const before = h.document.activeElement; show(h); const first = modal(h).querySelector('.elt-cert-close'); const buttons = modal(h).querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'); const last = buttons.at(-1);
  last.focus(); h.document.dispatch('keydown', { key: 'Tab', preventDefault() {} }); assert.equal(h.document.activeElement, first);
  first.focus(); h.document.dispatch('keydown', { key: 'Tab', shiftKey: true, preventDefault() {} }); assert.equal(h.document.activeElement, last);
  h.document.dispatch('keydown', { key: 'Escape', preventDefault() {} }); assert.equal(h.document.listeners.keydown.length, 0); assert.equal(h.document.activeElement, before);
});

test('reduced motion creates zero confetti while ordinary motion creates confetti', () => {
  const reduced = harness({ reduced: true }); show(reduced); assert.equal(modal(reduced).children.filter((node) => node.style.cssText).length, 0);
  const moving = harness({ reduced: false }); show(moving); assert.equal(modal(moving).children.filter((node) => node.style.cssText).length, 60);
});

test('runtime mutation runner rejects each required certificate regression', async () => {
  const scenarios = [
    ['wrong body title', (s) => s.replace("'certificate.bodyTitle'", "'certificate.close'"), (h) => assert.match(svg(h), /Certificate of Completion/)],
    ['RU close English', (s) => s.replace("text('certificate.close')", "certificateCopy('en', 'certificate.close')"), (h) => { click(h, '[data-lang="ru"]'); assert.equal(modal(h).querySelector('#certClose').textContent, h.i18n.t('ru', 'certificate.close')); }],
    ['Shift Tab removed', (s) => s.replace("if (e.shiftKey && document.activeElement === first)", 'if (false)'), (h) => { const first = modal(h).querySelector('.elt-cert-close'); first.focus(); h.document.dispatch('keydown', { key: 'Tab', shiftKey: true, preventDefault() {} }); assert.equal(h.document.activeElement, modal(h).querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])').at(-1)); }],
    ['reduced confetti', (s) => s.replace('if (!reducedMotion) createConfetti(container);', 'createConfetti(container);'), (h) => assert.equal(modal(h).children.filter((node) => node.style.cssText).length, 0)],
    ['raw hostile filename component', (s) => s.replace("const level = CERTIFICATE_LEVELS.has(data.result?.estimatedLevel) ? data.result.estimatedLevel.toLowerCase() : 'unknown';", "const level = data.result?.estimatedLevel || 'unknown';"), async (h) => { show(h, { result: { ...result, estimatedLevel: '../X' } }); click(h, '#certDownloadPng'); await new Promise((r) => setImmediate(r)); assert.doesNotMatch(h.downloads.at(-1), /[\\/]/); }],
  ];
  for (const [, mutate, verify] of scenarios) {
    const h = harnessWithSource(mutate(read('certificate.js'))); show(h); await assert.rejects(async () => verify(h), undefined, 'mutation must violate live contract');
  }
});

test('each theme changes live certificate paint without changing learner data', () => {
  const h = harness(); show(h, { name: 'Alex', testLanguage: 'it' }); const subject = svg(h).match(/Phraseman [^<]+ Level Check/)?.[0];
  for (const theme of ['gold', 'dark', 'emerald', 'rose', 'royal']) { click(h, `[data-theme="${theme}"]`); assert.match(svg(h), new RegExp(subject)); assert.ok(modal(h).querySelector(`[data-theme="${theme}"]`).className.includes('active')); }
});

test('manual locale switch keeps learner, result, theme and document language independent', () => {
  const h = harness(); h.document.documentElement = { lang: 'en', setAttribute(_, value) { this.lang = value; } }; show(h, { name: 'Ada', testLanguage: 'es', result: { ...result, estimatedLevel: 'C1' } }); click(h, '[data-theme="rose"]'); const before = svg(h); click(h, '[data-lang="ru"]'); assert.match(svg(h), /Ada/); assert.match(svg(h), /C1/); assert.match(before, /Spanish/); assert.ok(modal(h).querySelector('[data-theme="rose"]').className.includes('active')); assert.equal(h.document.documentElement.lang, 'en');
});

test('CTA click opens its supplied safe URL and invokes callback once', () => { const h = harness(); let clicks = 0; show(h, { cta: { text: 'CTA', label: 'Go', url: 'https://example.test', onClick: () => { clicks++; } } }); click(h, '#certCtaBtn'); assert.equal(clicks, 1); });

test('sequential show closes stale modal before rendering new data', () => { const h = harness(); show(h, { name: 'First', testLanguage: 'de' }); show(h, { name: 'Second', testLanguage: 'fr' }); assert.equal(h.body.children.length, 1); assert.match(svg(h), /Second/); assert.match(svg(h), /French/); });

test('hostile CTA is text, not executable markup', () => { const h = harness(); show(h, { cta: { text: '<img src=x onerror=boom>', label: '<script>bad</script>', url: 'https://example.test' } }); assert.equal(modal(h).querySelector('.elt-cert-cta-text').textContent, h.i18n.t('en', 'certificate.ctaText')); assert.doesNotMatch(modal(h).innerHTML, /<img src=x|<script>bad/); assert.match(modal(h).innerHTML, /&lt;img src=x onerror=boom&gt;/); });

test('print re-renders each locale title and does not include hostile learner markup', () => { for (const uiLocale of ['en', 'ru']) { const h = harness(); show(h, { uiLocale, name: '<svg onload=bad>' }); click(h, '#certPrint'); assert.match(h.prints[0].markup, new RegExp(h.i18n.t(uiLocale, 'certificate.printTitle'))); assert.doesNotMatch(h.prints[0].markup, /<svg onload=bad>/); } });

test('PNG download disables only during generation then restores its control state', async () => { const h = harness(); show(h); const button = modal(h).querySelector('#certDownloadPng'); click(h, '#certDownloadPng'); await new Promise((resolve) => setImmediate(resolve)); assert.equal(button.disabled, false); assert.equal(button.getAttribute('aria-busy'), null); });

function harnessWithSource(source, options = {}) { const h = harness(options); const context = vm.createContext({ EnglishTestI18n: h.i18n, window: h.win, navigator: h.win.navigator, document: h.document, URL: h.win.URL, Blob, XMLSerializer: class { serializeToString() { return '<svg />'; } }, Image: class { set src(_) { this.onload(); } }, alert: (message) => h.alerts.push(message), setTimeout: () => 0, globalThis: h.win }); vm.runInContext(source, context); h.certificate = h.win.EnglishTestCertificate; return h; }

function appHarness(source = read('app.js'), withCertificate = true, interactive = false) {
  const i18n = loadI18n(); const app = new Element('main'); const writes = []; const certCalls = []; const requests = []; const document = { getElementById: () => app, createElement: (tag) => { const el = new Element(tag); el.ownerDocument = document; if (interactive && tag === 'template') { const root = new Element('div'); root.ownerDocument = document; Object.defineProperty(el, 'content', { get: () => { root.children = el.children; for (const child of root.children) child.parentNode = root; return { firstElementChild: root }; } }); } return el; }, documentElement: { setAttribute() {} }, querySelector: () => null, addEventListener() {}, title: '' };
  const win = { matchMedia: () => ({ matches: true }), EnglishTestCertificate: withCertificate ? { show: (data) => certCalls.push(data) } : null, open: () => ({ document: { write: (html) => writes.push(html), close() {} } }), location: {}, navigator: { language: 'ru-RU', userAgent: '' }, scrollTo() {} };
  const tail = source.replace('      renderCTA(result);', '      /* fallback captured without mounting CTA */').replace(/  \/\/ ---------- Init ----------[\s\S]*/, '  window.__appCapture = { generateCertificate, renderResult, acceptConsent: () => { consent = true; } };\n})();');
  vm.runInContext(tail, vm.createContext({ EnglishTestI18n: i18n, window: win, document, navigator: win.navigator, location: { search: '?ui=ru&test=de' }, localStorage: { getItem: () => null, setItem() {} }, crypto: { getRandomValues() {} }, URL, URLSearchParams, setTimeout: () => 0, clearTimeout() {}, fetch: async (url, init) => { requests.push({ url, init }); return { ok: true, json: async () => ({}) }; } }));
  return { app, i18n, win, writes, certCalls, requests };
}

test('executed app generateCertificate freezes locale and attempt language for module and localized fallback', () => {
  const module = appHarness(); module.win.__appCapture.generateCertificate('Alex', result); assert.deepEqual(module.certCalls[0].uiLocale, 'ru'); assert.equal(module.certCalls[0].testLanguage, 'de');
  const fallback = appHarness(read('app.js'), false); fallback.win.__appCapture.generateCertificate('<img>', result); assert.match(fallback.writes[0], new RegExp(fallback.i18n.t('ru', 'certificate.bodyTitle'))); assert.match(fallback.writes[0], /немецкого языка/); assert.doesNotMatch(fallback.writes[0], /<img>/);
});

test('app mutation runner catches forced English module inputs and English fallback', () => {
  const scenarios = [
    ['forced English module inputs', (s) => s.replace(/uiLocale,\s+testLanguage: attemptTestLanguage \|\| selectedTestLanguage/, "uiLocale: 'en',\n      testLanguage: 'en'"), true, (h) => { h.win.__appCapture.generateCertificate('Alex', result); assert.equal(h.certCalls[0].uiLocale, 'ru'); assert.equal(h.certCalls[0].testLanguage, 'de'); }],
    ['English fallback', (s) => s.replace("<h1>${copy('certificate.bodyTitle')}</h1>", '<h1>Certificate of Completion</h1>'), false, (h) => { h.win.__appCapture.generateCertificate('Alex', result); assert.doesNotMatch(h.writes[0], /Certificate of Completion/); }],
  ];
  for (const [label, mutate, withCertificate, verify] of scenarios) { const h = appHarness(mutate(read('app.js')), withCertificate); assert.throws(() => verify(h), undefined, label); }
});

test('executed certificate creation posts a PII-free /api/english-test analytics event and kills name leakage', async () => {
  async function assertCertificateAnalytics(source) {
    const h = appHarness(source, true, true); h.win.__appCapture.acceptConsent(); h.win.__appCapture.renderResult(result, { preserveAttempt: true });
    h.app.querySelector('#certName').value = 'Ada Lovelace'; h.app.querySelector('#certBtn').click(); await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.requests.length, 1); assert.equal(h.requests[0].url, '/api/english-test'); assert.equal(h.requests[0].init.method, 'POST');
    const body = JSON.parse(h.requests[0].init.body); assert.deepEqual(Object.keys(body).sort(), ['action', 'attemptToken', 'clientHash', 'testLanguage', 'timestamp', 'uiLocale']); assert.equal(body.action, 'certificate'); assert.equal(body.testLanguage, 'de'); assert.equal(body.uiLocale, 'ru'); assert.equal(Object.hasOwn(body, 'name'), false);
  }

  await assertCertificateAnalytics(read('app.js'));
  await assert.rejects(() => assertCertificateAnalytics(read('app.js').replace("api('certificate', {})", "api('certificate', { name })")));
});
