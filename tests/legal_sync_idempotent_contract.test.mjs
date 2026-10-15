import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeLegalIntoPage } from '../scripts/sync-legal-html.mjs';
import { readSource } from './helpers/read_source_esm.mjs';

// зачем (координатор 15.10): `npm run legal:sync` переписывал текст юр-страниц сайта без оглавления, якорей id="s…" и обёртки .prose
// (−~60 строк на страницу). Сторож: sync на текущем HEAD не меняет страницы ни на байт, а правка текста раздела меняет только его текст
// (и якорь/ссылку оглавления, если поменялся заголовок). Файлы не трогаем — проверяем чистую часть sync.

// LF-нормализация (сторож source_guard_eol): на ПК с core.autocrlf рабочая копия бывает в CRLF, sync пишет LF
const read = (p) => readSource(p);
const json = (p) => JSON.parse(read(p));
const dateOf = (sections) => (sections[0]?.body?.split('\n\n')[0] || '').match(/Last updated:\s*([^\n]+)/i)?.[1].trim() ?? '';

const PAGES = [
  { page: 'knowly-www/legal/privacy/index.html', doc: 'legal/privacy_policy_en.json', title: 'Privacy Policy - Phraseman by Knowly', siteTitle: 'Privacy Policy · Phraseman' },
  { page: 'knowly-www/legal/privacy-ios/index.html', doc: 'legal/privacy_policy_en_ios.json', title: 'Privacy Policy (iOS) - Phraseman by Knowly', siteTitle: 'Privacy Policy (iOS) · Phraseman' },
  { page: 'knowly-www/legal/terms/index.html', doc: 'legal/terms_of_use_en.json', title: 'Terms of Use - Phraseman by Knowly', siteTitle: 'Terms of Use · Phraseman' },
];

for (const { page, doc, title, siteTitle } of PAGES) {
  const current = read(page);
  const sections = json(doc);
  const input = { title, sections, date: dateOf(sections), siteTitle };

  test(`${page}: sync on the current text changes nothing (idempotent)`, () => {
    const merged = mergeLegalIntoPage(current, input);
    assert.equal(merged.ok, true, merged.reason);
    assert.equal(merged.html, current);
  });

  test(`${page}: the page keeps the table of contents, section anchors and prose wrapper`, () => {
    const { html } = mergeLegalIntoPage(current, input);
    assert.match(html, /<details class="toc" open data-toc><summary>Содержание<\/summary><nav aria-label="Содержание">/);
    assert.match(html, /<div class="prose">/);
    const anchors = [...html.matchAll(/<h2 id="(s\d+[^"]*)">/g)].map((m) => m[1]);
    const links = [...html.matchAll(/<a href="#(s\d+[^"]*)">/g)].map((m) => m[1]);
    assert.equal(anchors.length, sections.length);
    assert.deepEqual(links, anchors);
    assert.match(html, /<div class="legal-document" lang="en">/);
    assert.match(html, new RegExp(`<title>${siteTitle.replace(/[()]/g, '\\$&')}</title>`));
  });

  test(`${page}: a changed paragraph changes only that paragraph`, () => {
    const edited = sections.map((s, i) => (i === 3 ? { ...s, body: `${s.body}\n\nSYNC-GUARD-PARAGRAPH` } : s));
    const { html } = mergeLegalIntoPage(current, { ...input, sections: edited });
    const before = current.split('\n');
    const after = html.split('\n');
    const added = after.filter((line) => !before.includes(line));
    const removed = before.filter((line) => !after.includes(line));
    assert.deepEqual(added, ['        <p>SYNC-GUARD-PARAGRAPH</p>']);
    assert.deepEqual(removed, []);
  });
}

test('a page without the document container is reported, not silently merged', () => {
  const merged = mergeLegalIntoPage('<html><main><p>no doc</p></main></html>', { title: 't', sections: [], date: '', siteTitle: 's' });
  assert.deepEqual(merged, { ok: false, reason: 'no_legal_document_container' });
});
