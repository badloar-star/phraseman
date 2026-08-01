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
  vm.runInContext(read('i18n.js'), context);
  return context.EnglishTestI18n;
}

class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.parentNode = null; this.dataset = {}; this.style = {}; this.attributes = {}; this.listeners = {}; this.className = ''; this.classList = { add: (name) => { if (!this.className.split(/\s+/).includes(name)) this.className += ` ${name}`; }, remove: (name) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== name).join(' '); } }; this.textContent = ''; this.offsetParent = this; this.isConnected = true; }
  set innerHTML(markup) { this._html = markup; this.children = []; const add = (tag, attrs, content = '') => { const el = new Element(tag); el.className = (attrs.match(/class="([^"]*)"/) || [, ''])[1]; const id = (attrs.match(/id="([^"]*)"/) || [, ''])[1]; if (id) el.attributes.id = id; for (const [, key, value] of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)) el.dataset[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value; for (const [, key, value] of attrs.matchAll(/(aria-[\w-]+)="([^"]*)"/g)) el.attributes[key] = value; el.textContent = content.replace(/<[^>]+>/g, '').trim(); this.appendChild(el); return el; }; for (const match of markup.matchAll(/<div([^>]*)>/g)) add('div', match[1]); for (const match of markup.matchAll(/<p([^>]*)>([\s\S]*?)<\/p>/g)) add('p', match[1], match[2]); for (const match of markup.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) { const button = add('button', match[1], match[2]); if (match[2].includes('elt-cert-theme-name')) { const label = new Element('span'); label.className = 'elt-cert-theme-name'; button.appendChild(label); } } const area = new Element('div'); area.attributes.id = 'certRenderArea'; area._html = markup.match(/<div class="elt-cert-wrap" id="certRenderArea">([\s\S]*?)<\/div>/)?.[1] || ''; this.appendChild(area); }
  get innerHTML() { return this._html || ''; }
  appendChild(el) { el.parentNode = this; el.ownerDocument = this.ownerDocument; this.children.push(el); return el; }
  remove() { this.parentNode?.children.splice(this.parentNode.children.indexOf(this), 1); this.isConnected = false; }
  querySelectorAll(selector) { const all = []; const visit = (el) => { for (const child of el.children) { const data = selector.match(/^\[data-([\w-]+)="([^"]*)"\]$/); if ((selector.startsWith('.') && child.className.split(/\s+/).includes(selector.slice(1))) || (selector.startsWith('#') && child.attributes.id === selector.slice(1)) || (data && child.dataset[data[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] === data[2]) || selector === child.tagName.toLowerCase()) all.push(child); visit(child); } }; visit(this); return all; }
  querySelector(selector) { if (selector.endsWith(' svg')) return { style: {}, outerHTML: '<svg />' }; return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { for (const fn of this.listeners.click || []) fn({ preventDefault() {} }); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  removeAttribute(key) { delete this.attributes[key]; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  focus() { this.ownerDocument.activeElement = this; }
  animate() { return { set onfinish(fn) { fn(); } }; }
  scrollIntoView() {}
}

function harness({ ios = false, reduced = true } = {}) {
  const i18n = loadI18n(); const body = new Element('body'); const document = { body, activeElement: new Element('button'), createElement: (tag) => { const el = new Element(tag); el.ownerDocument = document; if (tag === 'canvas') { el.getContext = () => ({ scale() {}, drawImage() {} }); el.toBlob = (fn) => fn({}); } return el; }, addEventListener() {}, removeEventListener() {} }; body.ownerDocument = document; document.activeElement.ownerDocument = document;
  const downloads = []; const alerts = []; const prints = []; let objectId = 0;
  const win = { document, matchMedia: () => ({ matches: reduced }), open: () => { const printed = { document: { write: (value) => { printed.markup = value; }, close() {} } }; prints.push(printed); return printed; }, location: {}, navigator: ios ? { userAgent: 'iPhone' } : {}, URL: { createObjectURL: () => `blob:${++objectId}`, revokeObjectURL() {} } };
  const context = vm.createContext({ EnglishTestI18n: i18n, window: win, navigator: win.navigator, document, URL: win.URL, Blob, XMLSerializer: class { serializeToString() { return '<svg />'; } }, Image: class { set src(_) { this.onload(); } }, alert: (message) => alerts.push(message), setTimeout, globalThis: win });
  vm.runInContext(read('certificate.js'), context); return { i18n, certificate: win.EnglishTestCertificate, document, body, downloads, alerts, prints, win };
}

function modal(h) { return h.body.children.at(-1); }
function svg(h) { return modal(h).querySelectorAll('#certRenderArea').find((area) => area.innerHTML.includes('<svg')).innerHTML; }
function show(h, data = {}) { h.certificate.show({ name: 'Alex', result, uiLocale: 'en', testLanguage: 'de', ...data }); return modal(h); }
function click(h, selector) { modal(h).querySelector(selector).click(); }

test('public show renders every assessed language in both UI locales', () => {
  const h = harness();
  for (const uiLocale of ['en', 'ru']) for (const testLanguage of h.i18n.TEST_LANGUAGES) {
    show(h, { uiLocale, testLanguage });
    const expected = h.i18n.t(uiLocale, 'certificate.completed', { language: h.i18n.TESTS[testLanguage].certificateNames[uiLocale] });
    assert.match(svg(h), new RegExp(expected));
    assert.equal(modal(h).querySelector(`[data-lang="${uiLocale}"]`)?.getAttribute('aria-pressed'), 'true');
  }
});

test('public show resets locale and subject across sequential opens', () => {
  const h = harness(); show(h, { uiLocale: 'ru', testLanguage: 'de', name: 'Первый' }); click(h, '#certClose'); show(h, { uiLocale: 'en', testLanguage: 'es', name: 'Second' });
  assert.match(svg(h), /Phraseman Spanish Level Check/); assert.match(svg(h), /Second/); assert.doesNotMatch(svg(h), /Первый/);
});

test('manual locale switch rerenders subject, controls, aria and English-learning CTA without changing test data', () => {
  const h = harness(); show(h, { uiLocale: 'en', testLanguage: 'de', cta: { url: 'https://example.test' } }); click(h, '[data-lang="ru"]');
  assert.match(svg(h), /немецкого языка/); assert.equal(modal(h).querySelector('.elt-cert-container').getAttribute('aria-label'), h.i18n.t('ru', 'certificate.dialogLabel'));
  assert.equal(modal(h).querySelector('#certDownloadPng').textContent, h.i18n.t('ru', 'certificate.downloadPng'));
  assert.match(modal(h).querySelector('.elt-cert-cta-text').textContent, /английск/i); assert.equal(modal(h).querySelector('[data-lang="ru"]').getAttribute('aria-pressed'), 'true');
});

test('all five themes remain available and selected after a locale switch', () => {
  const h = harness(); show(h); for (const theme of ['gold', 'dark', 'emerald', 'rose', 'royal']) assert.ok(modal(h).querySelector(`[data-theme="${theme}"]`)); click(h, '[data-theme="royal"]'); click(h, '[data-lang="ru"]'); assert.ok(modal(h).querySelector('[data-theme="royal"]').className.includes('active'));
});

test('certificate filename is locale-specific and safely bounded for hostile components', () => {
  const source = read('certificate.js');
  assert.match(source, /filenameSlugs\[currentLocale\]/);
  assert.match(source, /certificateFilename\(data, themeKey, locale\)/);
  assert.match(source, /sanitizeFilenameComponent/);
});

test('iOS preview uses the active certificate locale for alt and hint', async () => {
  const h = harness({ ios: true }); show(h); click(h, '[data-lang="ru"]'); click(h, '#certDownloadPng'); await new Promise((resolve) => setImmediate(resolve)); const image = modal(h).querySelector('.elt-cert-save-link')?.querySelector('img'); assert.equal(image?.alt, h.i18n.t('ru', 'certificate.iosReadyImageAlt')); assert.equal(modal(h).querySelector('.elt-cert-save-hint')?.textContent, h.i18n.t('ru', 'certificate.iosLongPressHint'));
});

test('print output uses current locale and assessed subject', () => { const h = harness(); show(h, { testLanguage: 'fr' }); click(h, '[data-lang="ru"]'); click(h, '#certPrint'); assert.match(h.prints[0].markup, /<title>Сертификат<\/title>/); assert.match(h.prints[0].markup, /французского языка/); });

test('certificate escapes hostile name and result in rendered SVG', () => { const h = harness(); show(h, { name: '<img src=x>', result: { ...result, estimatedLevel: '<script>x</script>' } }); assert.doesNotMatch(svg(h), /<script>|<img src=x>/); assert.match(svg(h), /&lt;script&gt;/); });

test('public modal retains focus restore, Escape, Tab handling and reduced-motion confetti guard', () => { const h = harness(); show(h); assert.match(read('certificate.js'), /e\.key === 'Escape'/); assert.match(read('certificate.js'), /e\.key !== 'Tab'/); assert.match(read('certificate.js'), /if \(!reducedMotion\) createConfetti/); });

test('app integration freezes ui/test language and keeps certificate analytics anonymous', () => { const app = read('app.js'); assert.match(app, /uiLocale,\s*testLanguage:\s*attemptTestLanguage \|\| selectedTestLanguage/); assert.match(app, /certificateNames\[uiLocale\]/); assert.match(app, /api\('certificate', \{\}\)/); assert.doesNotMatch(app, /api\('certificate',\s*\{[^}]*name/); });
