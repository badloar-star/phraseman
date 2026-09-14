import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routes = [
  'index.html', 'app/index.html', 'download/index.html', 'start/index.html',
  'gift/index.html', 'contact/index.html', 'faq/index.html',
].map((file) => `knowly-www/${file}`);
const css = [
  'knowly-www/assets/approved/site.css',
  'knowly-www/assets/approved/edition.css',
  'knowly-www/assets/approved/runtime-components.css',
].map((file) => fs.readFileSync(file, 'utf8')).join('\n');

test('primary routes expose keyboard entry and one primary heading', () => {
  for (const file of routes) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /class="skip"[^>]*href="#content"/i, `${file}: skip link`);
    assert.equal((source.match(/<h1\b/gi) || []).length, 1, `${file}: one h1`);
  }
});

test('interactive website surfaces retain focus and reduced-motion contracts', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  const faq = fs.readFileSync('knowly-www/faq/index.html', 'utf8');
  assert.match(faq, /<details\b/);
  assert.match(faq, /<summary\b/);
});

test('responsive CSS includes a narrow viewport escape hatch', () => {
  assert.match(css, /@media\s*\(max-width:\s*(?:760|700|600|480)px\)/);
  assert.match(css, /overflow-wrap|word-break|max-width:\s*100%/);
});
