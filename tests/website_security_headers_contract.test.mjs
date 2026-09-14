import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const firebase = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const hosting = firebase.hosting.find((entry) => entry.target === 'knowlywww');

function headersFor(source) {
  const block = hosting?.headers?.find((entry) => entry.source === source);
  return new Map((block?.headers ?? []).map(({ key, value }) => [key, value]));
}

test('knowlywww has the report-only security header baseline', () => {
  assert.ok(hosting, 'knowlywww hosting target must exist');
  const headers = headersFor('**');
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(), payment=()');
  assert.ok(headers.has('Content-Security-Policy-Report-Only'));
  assert.equal(headers.has('Content-Security-Policy'), false, 'CSP must remain report-only until reviewed');
});

test('report-only CSP uses a minimal safe baseline and explicit website origins', () => {
  const csp = headersFor('**').get('Content-Security-Policy-Report-Only') ?? '';
  for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
    assert.match(csp, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const origin of [
    'https://connect.facebook.net',
    'https://www.paypal.com',
    'https://us-central1-phraseman-ea0b3.cloudfunctions.net',
  ]) {
    assert.match(csp, new RegExp(origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(csp, /frame-ancestors 'self'/);
});
