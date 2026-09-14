# Phraseman Server Decision Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a local-only interactive HTML atlas that inventories every server-related source route, explains it in plain Russian, and lets the owner stage safe policy choices without modifying the app.

**Architecture:** A Node-only inventory builder scans the selected source roots and emits normalized records with exact source evidence. A static renderer serializes the records into one self-contained HTML file; browser JavaScript provides search, filters, glossary, choice staging, local persistence and export. The renderer is offline-only: it has no Firebase SDK, fetch call or external API dependency.

**Tech Stack:** Node.js ESM, `node:fs`, `node:path`, `node:assert`, static HTML/CSS/vanilla JavaScript, existing npm script conventions.

---

## File structure

- Create `scripts/server_decision_atlas/inventory.mjs` — deterministic source scan, server/client/test evidence extraction and conservative behavior markers.
- Create `scripts/server_decision_atlas/catalog.mjs` — plain-Russian names, categories, glossary, authority/safety classification and output bundle validation.
- Create `scripts/server_decision_atlas/render.mjs` — self-contained accessible HTML renderer and browser-local decision console.
- Create `scripts/build_server_decision_atlas.mjs` — writes `.codex-tmp/server-decision-atlas/index.html` from the current checkout.
- Modify `package.json` — adds narrow `server-atlas:build` and `server-atlas:check` scripts.
- Create `tests/server_decision_atlas_contract.mjs` — unit/contract test for scan coverage, safety labels, plain-language fields and renderer isolation.

## Task 1: Define the contract and write red tests

**Files:**
- Create: `tests/server_decision_atlas_contract.mjs`
- Create: `scripts/server_decision_atlas/inventory.mjs`
- Create: `scripts/server_decision_atlas/catalog.mjs`
- Create: `scripts/server_decision_atlas/render.mjs`

- [ ] **Step 1: Write a failing contract test for the public bundle shape.**

```js
import assert from 'node:assert/strict';
import { buildServerDecisionAtlas } from '../scripts/server_decision_atlas/catalog.mjs';
import { renderServerDecisionAtlas } from '../scripts/server_decision_atlas/render.mjs';

const bundle = buildServerDecisionAtlas(process.cwd());
assert.equal(bundle.schemaVersion, 'server-decision-atlas.v1');
assert.ok(bundle.records.length > 0, 'the atlas needs at least one record');
assert.ok(bundle.records.some((record) => record.routeType === 'callable'));
assert.ok(bundle.records.some((record) => record.routeType === 'schedule'));
assert.ok(bundle.records.every((record) => record.plainWhat.trim().length > 0));
assert.ok(bundle.records.every((record) => record.evidence.length > 0));

const html = renderServerDecisionAtlas(bundle);
assert.match(html, /<!doctype html>/iu);
assert.match(html, /Словарь простыми словами/u);
assert.match(html, /localStorage/u);
assert.doesNotMatch(html, /https?:\/\/|firebase|fetch\(/iu);
```

- [ ] **Step 2: Run the red test.**

Run: `node tests/server_decision_atlas_contract.mjs`

Expected: exit non-zero because the imported builder and renderer do not exist yet.

- [ ] **Step 3: Add the minimal module exports.**

```js
// scripts/server_decision_atlas/inventory.mjs
export function scanServerDecisionAtlasSources() { return []; }

// scripts/server_decision_atlas/catalog.mjs
export function buildServerDecisionAtlas() {
  return { schemaVersion: 'server-decision-atlas.v1', records: [], glossary: [] };
}

// scripts/server_decision_atlas/render.mjs
export function renderServerDecisionAtlas() { return '<!doctype html><html><body></body></html>'; }
```

- [ ] **Step 4: Re-run the red test and confirm the next missing contract assertion.**

Run: `node tests/server_decision_atlas_contract.mjs`

Expected: exit non-zero at the first missing record/assertion, proving the test checks content rather than only imports.

## Task 2: Implement deterministic inventory extraction

**Files:**
- Modify: `scripts/server_decision_atlas/inventory.mjs`
- Modify: `tests/server_decision_atlas_contract.mjs`

- [ ] **Step 1: Add a fixture-level assertion for all route families.**

```js
const types = new Set(bundle.records.map((record) => record.routeType));
for (const required of ['callable', 'http', 'schedule', 'firestore-trigger', 'client-callable', 'client-firestore']) {
  assert.ok(types.has(required), `missing route type: ${required}`);
}
assert.ok(bundle.metrics.serverExports >= bundle.records.filter((r) => ['callable', 'http', 'schedule', 'firestore-trigger'].includes(r.routeType)).length);
```

- [ ] **Step 2: Implement recursive source discovery with deterministic exclusions.**

```js
const SOURCE_ROOTS = ['app', 'modules', 'components', 'functions/src', 'admin/v2'];
const TEST_ROOTS = ['tests', 'functions/src'];
const EXCLUDED_SEGMENTS = new Set(['node_modules', '.git', '.codex-tmp', '.superpowers', 'build', 'dist']);

function walk(root, relative = '') {
  return readdirSync(join(root, relative), { withFileTypes: true })
    .flatMap((entry) => {
      if (EXCLUDED_SEGMENTS.has(entry.name)) return [];
      const child = join(relative, entry.name);
      return entry.isDirectory() ? walk(root, child) : /\.(?:[cm]?js|tsx?|html)$/u.test(entry.name) ? [child] : [];
    });
}
```

- [ ] **Step 3: Extract conservative records with exact line evidence.**

```js
const SERVER_PATTERNS = [
  ['callable', /(?:export\s+(?:const|function)\s+|exports\.)([A-Za-z0-9_]+)[\s\S]{0,500}?\b(?:onCall|https\.onCall)\s*\(/gu],
  ['http', /(?:export\s+(?:const|function)\s+|exports\.)([A-Za-z0-9_]+)[\s\S]{0,500}?\bonRequest\s*\(/gu],
  ['schedule', /(?:export\s+(?:const|function)\s+|exports\.)([A-Za-z0-9_]+)[\s\S]{0,500}?\bonSchedule\s*\(/gu],
  ['firestore-trigger', /(?:export\s+(?:const|function)\s+|exports\.)([A-Za-z0-9_]+)[\s\S]{0,500}?\bonDocument(?:Created|Updated|Written|Deleted)\s*\(/gu],
];
const CLIENT_CALLABLE = /httpsCallable\([^,]+,\s*['"]([A-Za-z0-9_]+)['"]/gu;
const CLIENT_FIRESTORE = /\b(getDoc|getDocs|setDoc|updateDoc|deleteDoc|addDoc|onSnapshot|runTransaction|writeBatch)\s*\(/gu;
```

For each match, store stable `id`, `routeType`, `name`, `sourcePath`, `line`, `snippet`, `markers`, and `evidence`. Use `lineAt(source, index)` for one-based source positions. Emit client Firestore records per source file and operation type, not inferred endpoint names.

- [ ] **Step 4: Attach marker evidence without turning absence into a false claim.**

```js
const MARKERS = {
  optimistic: /\boptimistic\b/iu,
  offline: /\boffline\b|NetInfo|network.*(?:unavailable|failure)/iu,
  queue: /\bqueue(?:d|ing)?\b|outbox/iu,
  retry: /\bretry\b|attempts?/iu,
  idempotency: /idempotency(?:Key)?|idempotent/iu,
  receipt: /\breceipt\b/iu,
};
```

Each marker becomes either `{ state: 'evidence-found', sourcePath, line }` or `{ state: 'not-established-by-static-scan' }`.

- [ ] **Step 5: Run the contract test.**

Run: `node tests/server_decision_atlas_contract.mjs`

Expected: exit zero for inventory coverage assertions.

## Task 3: Build owner-readable catalog records and safety classification

**Files:**
- Modify: `scripts/server_decision_atlas/catalog.mjs`
- Modify: `tests/server_decision_atlas_contract.mjs`

- [ ] **Step 1: Add tests for plain language, glossary and locked economy policy.**

```js
assert.ok(bundle.glossary.some((item) => item.term === 'Контракт'));
assert.ok(bundle.glossary.every((item) => item.simpleMeaning.length >= 20));
assert.ok(bundle.records.some((record) => record.safety.lockedReason?.includes('личный прогресс')));
assert.ok(bundle.records.every((record) => ['client', 'server', 'shared', 'external', 'not-established'].includes(record.authority.kind)));
```

- [ ] **Step 2: Add a deterministic plain-Russian namer and category classifier.**

```js
const CATEGORY_RULES = [
  [/rune|shard|xp|level|reward|spin|chest/iu, 'Прогресс и награды'],
  [/premium|purchase|payment|revenue|wallet|access|gift/iu, 'Экономика и доступ'],
  [/learning|lesson|content|phrase/iu, 'Уроки и контент'],
  [/league|arena|tournament|friend|leaderboard/iu, 'Социальное и игры'],
  [/voice|max|audio/iu, 'Voice и MAX'],
  [/auth|account|delete|consent|privacy/iu, 'Аккаунт и приватность'],
  [/admin|jarvis|support|analytics/iu, 'Операционный контур'],
];

function plainTitle(name) {
  return name.replace(/([a-z0-9])([A-Z])/gu, '$1 $2').replace(/_/gu, ' ').trim();
}
```

- [ ] **Step 3: Apply authority and choice rules conservatively.**

```js
const AUTHORITY_POLICY = [
  { match: /^(practiceRuneGrant|progressSubmitEvent|submitLearningV2.*Completion)$/u, kind: 'client', explanation: 'Для этого личного прогресса проектный контракт назначает приложение источником результата; сервер хранит неизменяемую запись и синхронизирует её.' },
  { match: /webhook|stripe|paypal|revenuecat|telegram/iu, kind: 'external', explanation: 'Решение подтверждает внешний сервис; Phraseman сохраняет его результат.' },
  { match: /^(admin|auth|accountDelete|webCheckout|premium|voiceMinute)/u, kind: 'server', explanation: 'Это действие проверяет сервер, потому что затрагивает доступ, безопасность или внешнее подтверждение.' },
];
function classifyAuthority(record) {
  const policy = AUTHORITY_POLICY.find((item) => item.match.test(record.name));
  return policy ?? { kind: 'not-established', explanation: 'Статический разбор нашёл маршрут, но не доказывает, кто решает итог во всех сценариях.' };
}
```

Set `lockedReason` for security, permission, deletion, payment, identity, external confirmation and ordinary economy-projection routes. The locked reason must explain the rule in simple Russian and not assert that an unsupported alternative is safe.

- [ ] **Step 4: Calculate only auditable metrics.**

```js
const metrics = {
  totalRecords: records.length,
  byRouteType: countBy(records, (record) => record.routeType),
  withTestEvidence: records.filter((record) => record.evidence.some((e) => e.kind === 'test-source')).length,
  withContractEvidence: records.filter((record) => record.evidence.some((e) => e.kind === 'contract-source')).length,
  staticBehaviorEstablished: records.filter((record) => record.markers.some((marker) => marker.state === 'evidence-found')).length,
};
```

- [ ] **Step 5: Run the contract test.**

Run: `node tests/server_decision_atlas_contract.mjs`

Expected: exit zero, including glossary and locked-policy assertions.

## Task 4: Render the interactive offline decision atlas

**Files:**
- Modify: `scripts/server_decision_atlas/render.mjs`
- Modify: `tests/server_decision_atlas_contract.mjs`

- [ ] **Step 1: Add renderer interaction assertions.**

```js
for (const required of ['atlas-search', 'atlas-category', 'atlas-glossary', 'atlas-decisions', 'atlas-export', 'atlas-reset']) {
  assert.match(html, new RegExp(`id=["']${required}["']`, 'u'));
}
assert.match(html, /aria-live=["']polite["']/u);
assert.match(html, /prefers-reduced-motion/u);
assert.match(html, /Контракт — это фиксированное правило/u);
```

- [ ] **Step 2: Render a self-contained page with escaped embedded data.**

```js
const serialized = JSON.stringify(bundle).replace(/</gu, '\\u003c');
return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phraseman · Server Decision Atlas</title><style>${CSS}</style></head><body><main id="atlas-app"></main><script>const ATLAS=${serialized};${BROWSER_APP}</script></body></html>`;
```

- [ ] **Step 3: Implement browser behavior with no network operations.**

```js
const STORAGE_KEY = 'phraseman.server-decision-atlas.v1';
const state = { query: '', category: 'Все', selectedOnly: false, decisions: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.decisions)); }
function exportDraft() { navigator.clipboard?.writeText(JSON.stringify(state.decisions, null, 2)); }
function resetDraft() { state.decisions = {}; save(); render(); }
```

Render each card’s ten information fields, its evidence links, marker state, glossary button, route timeline, and allowed choices. A locked choice is a disabled button with its `lockedReason`; a normal choice creates a browser-local decision record containing `recordId`, baseline, proposed value, consequence and affected source paths.

- [ ] **Step 4: Ensure accessibility and responsive behavior in markup/CSS.**

Use real `<button>` and `<label>` elements, visible `:focus-visible` outlines, an `aria-live="polite"` selection status, 44px controls, a no-horizontal-scroll mobile breakpoint and `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 5: Run the contract test.**

Run: `node tests/server_decision_atlas_contract.mjs`

Expected: `SERVER DECISION ATLAS: PASS`.

## Task 5: Build command, generated preview and final verification

**Files:**
- Create: `scripts/build_server_decision_atlas.mjs`
- Modify: `package.json`
- Modify: `tests/server_decision_atlas_contract.mjs`

- [ ] **Step 1: Add a build script that writes only an ignored preview.**

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildServerDecisionAtlas } from './server_decision_atlas/catalog.mjs';
import { renderServerDecisionAtlas } from './server_decision_atlas/render.mjs';

const output = resolve(process.cwd(), '.codex-tmp', 'server-decision-atlas', 'index.html');
await mkdir(resolve(output, '..'), { recursive: true });
const bundle = buildServerDecisionAtlas(process.cwd());
await writeFile(output, renderServerDecisionAtlas(bundle), 'utf8');
process.stdout.write(`SERVER DECISION ATLAS: BUILT records=${bundle.records.length} path=${output}\n`);
```

- [ ] **Step 2: Add narrow package scripts.**

```json
"server-atlas:build": "node scripts/build_server_decision_atlas.mjs",
"server-atlas:check": "node tests/server_decision_atlas_contract.mjs && node scripts/build_server_decision_atlas.mjs"
```

- [ ] **Step 3: Extend the contract test to build into a temporary directory and assert no network SDK.**

```js
assert.doesNotMatch(html, /@react-native-firebase|firebase\/|XMLHttpRequest|WebSocket|fetch\(/iu);
assert.match(html, /Мои решения/u);
assert.match(html, /Нужно проверить вручную/u);
```

- [ ] **Step 4: Run focused verification.**

Run: `npm run server-atlas:check`

Expected: exit 0, one generated `.codex-tmp/server-decision-atlas/index.html`, a non-zero real record count, and no Firebase/network marker in the output.

- [ ] **Step 5: Open the generated page in the existing local visual companion and test: search, one allowed choice, one locked choice, “Мои решения”, export, reset and glossary.**

Expected: choices persist locally until reset; locked controls explain the governing rule; no browser network call is made by the generated page.

- [ ] **Step 6: Commit.**

```bash
git add scripts/server_decision_atlas scripts/build_server_decision_atlas.mjs tests/server_decision_atlas_contract.mjs package.json docs/superpowers/plans/2026-09-03-server-decision-atlas.md
git commit -m "feat: add server decision atlas"
```

## Plan self-review

- Coverage: Tasks 2–3 implement exhaustive route evidence, plain language, safety classifications and metrics; Task 4 implements the interactive owner UI; Task 5 proves static/offline behavior and builds the visual artifact.
- No placeholders: every generated record uses a conservative `not-established-by-static-scan` state instead of guessing. Every claimed behavior must retain a source/evidence path.
- Type consistency: `ServerDecisionAtlasBundle`, record identifiers, `routeType`, `authority.kind`, markers and decisions are declared once in the inventory/catalog boundary and used unchanged by the renderer and test.
