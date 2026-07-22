const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const CLIENT_DIR = path.join(__dirname, '..', 'knowly-www', 'english-level-test');
const read = (file) => fs.readFileSync(path.join(CLIENT_DIR, file), 'utf8');
const APP_SOURCE = read('app.js');

function loadAppFunction(name, context = {}) {
  const declaration = `${name === 'api' || name === 'getClientHash' ? 'async ' : ''}function ${name}`;
  const start = APP_SOURCE.indexOf(declaration);
  assert.ok(start >= 0, `${name} must be defined in app.js`);
  const bodyStart = APP_SOURCE.indexOf('{', start);
  let depth = 0;
  for (let cursor = bodyStart; cursor < APP_SOURCE.length; cursor += 1) {
    if (APP_SOURCE[cursor] === '{') depth += 1;
    if (APP_SOURCE[cursor] === '}') depth -= 1;
    if (depth === 0) {
      return vm.runInNewContext(`(${APP_SOURCE.slice(start, cursor + 1)})`, context);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

function createClientIdHarness({ stored, randomSeed = 1, throwRead = false, throwWrite = false } = {}) {
  const key = 'english_test_analytics_browser_id_v1';
  const values = new Map();
  if (stored !== undefined) values.set(key, stored);
  let randomCalls = 0;
  const localStorage = {
    getItem(storageKey) {
      if (throwRead) throw new Error('SecurityError');
      return values.get(storageKey) ?? null;
    },
    setItem(storageKey, value) {
      if (throwWrite) throw new Error('QuotaExceededError');
      values.set(storageKey, value);
    },
  };
  const crypto = {
    getRandomValues(bytes) {
      randomCalls += 1;
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = (randomSeed + index * 17) % 256;
      }
      return bytes;
    },
  };
  const generateToken = loadAppFunction('generateToken', { crypto, Uint8Array, Array });
  const context = {
    ANALYTICS_BROWSER_ID_KEY: key,
    ANALYTICS_BROWSER_ID_PATTERN: /^[a-f0-9]{48}$/,
    clientHash: null,
    generateToken,
    localStorage,
  };
  const getClientHash = loadAppFunction('getClientHash', context);
  return {
    getClientHash,
    randomCalls: () => randomCalls,
    stored: () => values.get(key),
  };
}

test('result and certificate remove unsupported index and confidence claims', () => {
  const app = read('app.js');
  const certificate = read('certificate.js');
  const combined = `${app}\n${certificate}`;

  assert.doesNotMatch(combined, /statConfidence|result\.confidence|Confidence|Уверенность/);
  assert.doesNotMatch(combined, /statIndex|result\.index|\bIndex\b|Индекс/);
  assert.match(app, /result\.correct/);
  assert.match(app, /result\.answered/);
  assert.match(app, /result\.totalQuestions/);
  assert.match(certificate, /Preliminary text-based assessment/);
});

test('landing honestly describes a 12–20 question preliminary text assessment', () => {
  const app = read('app.js');
  const html = read('index.html');
  const combined = `${app}\n${html}`;

  assert.match(combined, /12–20/);
  assert.match(combined, /предварительную текстовую оценку|предварительная текстовая оценка/i);
  assert.doesNotMatch(combined, /18–24/);
  assert.doesNotMatch(combined, /Точная оценка/);
  assert.match(app, /position \/ 20/);
});

test('Pre-A1 and insufficient-data result wording stays neutral', () => {
  const engine = read('engine.js');
  assert.match(engine, /Pre-A1/);
  assert.match(engine, /Недостаточно ответов для оценки/);
  assert.doesNotMatch(engine, /провал|слабый|плохой/i);
});

test('all client assets and the bank use one new revision', () => {
  const html = read('index.html');
  const app = read('app.js');
  const expectedRevision = '20260722-3';

  assert.equal((html.match(new RegExp(expectedRevision, 'g')) || []).length, 4);
  assert.match(app, new RegExp(`questions\\.en\\.json\\?v=${expectedRevision}`));
  assert.doesNotMatch(`${html}\n${app}`, /20260722-2/);
});

test('client sends the root bank version and bounded calibration evidence', () => {
  const app = read('app.js');

  assert.match(app, /bankVersion\s*=\s*data\.bankVersion/);
  assert.match(app, /api\('start',\s*\{\s*bankVersion\s*\}\)/);
  assert.match(app, /questionLevel:\s*question\.level/);
  assert.match(app, /correct:/);
  assert.match(app, /targetBefore/);
  assert.match(app, /targetAfter/);
  assert.match(app, /responseTimeMs/);
  assert.match(app, /stopReason:\s*result\.stopReason/);
  assert.doesNotMatch(app, /questions\[0\]\?\.bankVersion/);
});

test('certificate modal has dialog semantics and keyboard focus handling', () => {
  const certificate = read('certificate.js');

  assert.match(certificate, /role="dialog"/);
  assert.match(certificate, /aria-modal="true"/);
  assert.match(certificate, /<button[^>]+elt-cert-close[^>]+type="button"/);
  assert.match(certificate, /e\.key === 'Escape'/);
  assert.match(certificate, /e\.key (?:===|!==) 'Tab'/);
  assert.match(certificate, /previouslyFocused/);
  assert.match(certificate, /\.focus\(\)/);
});

test('consent and fallback certificate describe data and scope honestly', () => {
  const app = read('app.js');

  assert.match(app, /аналитику без имени и контактов/);
  assert.match(app, /Предварительная текстовая оценка/);
  assert.match(app, /не проверяет аудирование и говорение/);
});

test('reduced-motion certificate skips confetti and theme animation', () => {
  const certificate = read('certificate.js');

  assert.match(certificate, /if \(!reducedMotion\) createConfetti\(container\)/);
  assert.match(certificate, /if \(!reducedMotion\) \{\s*area\.animate/);
});

test('analytics browser ID reuses only a valid dedicated stored value', async () => {
  const storedId = 'a'.repeat(48);
  const harness = createClientIdHarness({ stored: storedId });

  assert.equal(await harness.getClientHash(), storedId);
  assert.equal(await harness.getClientHash(), storedId);
  assert.equal(harness.randomCalls(), 0);
});

test('fresh analytics browser IDs are distinct persisted lowercase 48-hex values', async () => {
  const first = createClientIdHarness({ randomSeed: 3 });
  const second = createClientIdHarness({ randomSeed: 7 });
  const firstId = await first.getClientHash();
  const secondId = await second.getClientHash();

  assert.match(firstId, /^[a-f0-9]{48}$/);
  assert.match(secondId, /^[a-f0-9]{48}$/);
  assert.notEqual(firstId, secondId);
  assert.equal(first.stored(), firstId);
  assert.equal(second.stored(), secondId);
  assert.equal(first.randomCalls(), 1);
  assert.equal(second.randomCalls(), 1);
});

test('invalid or unavailable analytics storage falls back to one stable in-memory ID', async () => {
  const invalidStored = createClientIdHarness({ stored: 'not-a-valid-id', randomSeed: 9 });
  const replacement = await invalidStored.getClientHash();
  assert.match(replacement, /^[a-f0-9]{48}$/);
  assert.equal(invalidStored.stored(), replacement);

  const unavailable = createClientIdHarness({
    randomSeed: 11,
    throwRead: true,
    throwWrite: true,
  });
  const first = await unavailable.getClientHash();
  const second = await unavailable.getClientHash();
  assert.match(first, /^[a-f0-9]{48}$/);
  assert.equal(second, first);
  assert.equal(unavailable.randomCalls(), 1);
});

test('analytics ID is created only behind consent api and never fingerprints device inputs', () => {
  const apiStart = APP_SOURCE.indexOf('async function api');
  const apiEnd = APP_SOURCE.indexOf('function pendingCompletionKey', apiStart);
  const apiSource = APP_SOURCE.slice(apiStart, apiEnd);
  const clientHashStart = APP_SOURCE.indexOf('async function getClientHash');
  const clientHashEnd = APP_SOURCE.indexOf('async function api', clientHashStart);
  const clientHashSource = APP_SOURCE.slice(clientHashStart, clientHashEnd);
  const consentGuard = apiSource.indexOf('if (!consent) return null');
  const idRead = apiSource.indexOf('getClientHash()');

  assert.ok(consentGuard >= 0 && consentGuard < idRead);
  assert.equal((APP_SOURCE.match(/getClientHash\(\)/g) || []).length, 2);
  assert.match(
    APP_SOURCE,
    /ANALYTICS_BROWSER_ID_KEY\s*=\s*'english_test_analytics_browser_id_v1'/,
  );
  assert.doesNotMatch(clientHashSource, /navigator\.userAgent|screen\.(?:width|height)/);
  assert.doesNotMatch(APP_SOURCE, /sha256|crypto\.subtle|SHA-256/);
});
