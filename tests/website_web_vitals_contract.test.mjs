import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('knowly-www/assets/js/web-vitals.js', 'utf8');
const home = fs.readFileSync('knowly-www/index.html', 'utf8');

test('home loads the consent-aware CWV observer', () => {
  assert.match(home, /\/assets\/js\/web-vitals\.js/);
  assert.match(source, /pm_consent/);
  assert.match(source, /consent\s*!==\s*['"]yes['"]/);
});

test('CWV payload is bounded and free of query/PII fields', () => {
  for (const metric of ['lcp', 'inp', 'cls']) assert.match(source, new RegExp(`send\\(['"]${metric}['"]`));
  assert.match(source, /webVitalsEndpoint/);
  assert.match(source, /location\.pathname/);
  assert.match(source, /search|hash/);
  assert.doesNotMatch(source, /\b(?:email|userId|uid)\b|navigator\.userAgent/);
  assert.match(source, /deviceClass/);
  assert.match(source, /release/);
});
