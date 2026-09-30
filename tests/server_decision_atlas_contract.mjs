import assert from 'node:assert/strict';

import { buildServerDecisionAtlas } from '../scripts/server_decision_atlas/catalog.mjs';
import { classifyD66 } from '../scripts/server_decision_atlas/d66_policy.mjs';
import { renderServerDecisionAtlas } from '../scripts/server_decision_atlas/render.mjs';

assert.deepEqual(
  classifyD66({ routeType: 'client-firestore', name: 'onSnapshot', sourcePath: 'app/firestore_friend_requests.ts' }),
  {
    kind: 'retire-or-replace',
    service: null,
    reason: 'Постоянная лента друзей не относится к разрешённым сервисам D66; заменить чтением по фокусу с TTL и локальным SWR-кешем.',
  },
);
assert.equal(
  classifyD66({ routeType: 'client-firestore', name: 'onSnapshot', sourcePath: 'components/PremiumContext.tsx' }).service,
  'subscription',
);
assert.equal(
  classifyD66({ routeType: 'client-firestore', name: 'onSnapshot', sourcePath: 'app/app_messages.ts' }).service,
  'notification',
);
assert.equal(
  classifyD66({ routeType: 'client-callable', name: 'unknownRoute', sourcePath: 'app/example.ts' }).kind,
  'manual-review',
);

const bundle = buildServerDecisionAtlas(process.cwd());

assert.equal(
  bundle.records.some((record) => record.sourcePath === 'app/arena_client.ts' && record.name === 'onSnapshot'),
  false,
  'Arena must not keep a permanent Firestore listener',
);

assert.equal(bundle.schemaVersion, 'server-decision-atlas.v1');
assert.ok(bundle.records.length > 0, 'the atlas needs at least one record');
assert.ok(bundle.records.some((record) => record.routeType === 'callable'));
assert.ok(bundle.records.some((record) => record.routeType === 'schedule'));
assert.ok(bundle.records.every((record) => record.plainWhat.trim().length > 0));
assert.ok(bundle.records.every((record) => record.evidence.length > 0));

const types = new Set(bundle.records.map((record) => record.routeType));
for (const required of ['callable', 'http', 'schedule', 'firestore-trigger', 'client-callable', 'client-firestore', 'client-http']) {
  assert.ok(types.has(required), `missing route type: ${required}`);
}
assert.ok(bundle.metrics.serverExports >= bundle.records.filter((record) => ['callable', 'http', 'schedule', 'firestore-trigger'].includes(record.routeType)).length);
assert.ok(bundle.glossary.some((item) => item.term === 'Контракт'));
assert.ok(bundle.glossary.every((item) => item.simpleMeaning.length >= 20));
assert.ok(bundle.records.some((record) => record.safety.lockedReason?.includes('личный прогресс')));
assert.ok(bundle.records.every((record) => ['client', 'server', 'shared', 'external', 'not-established'].includes(record.authority.kind)));
assert.ok(bundle.records.filter((record) => record.safety.lockedReason).every((record) => record.choices.some((choice) => choice.key === 'visibility' && !choice.locked)));
assert.ok(bundle.records.every((record) => record.d66 && ['allowed-service', 'retire-or-replace', 'manual-review'].includes(record.d66.kind)));
// A fully cleaned client may legitimately have no remaining permanent
// connection to retire; keep the enum contract without requiring a debt.
assert.ok(bundle.records.some((record) => record.d66.service === 'subscription'));
assert.equal(
  bundle.metrics.d66['retire-or-replace'] ?? 0,
  bundle.records.filter((record) => record.d66.kind === 'retire-or-replace').length,
);

const html = renderServerDecisionAtlas(bundle);
assert.match(html, /<!doctype html>/iu);
assert.match(html, /Словарь простыми словами/u);
assert.match(html, /localStorage/u);
for (const required of ['atlas-search', 'atlas-category', 'atlas-glossary', 'atlas-decisions', 'atlas-export', 'atlas-reset', 'atlas-records', 'atlas-more']) {
  assert.match(html, new RegExp(`id=["']${required}["']`, 'u'));
}
assert.match(html, /aria-live=["']polite["']/u);
assert.match(html, /prefers-reduced-motion/u);
assert.match(html, /Контракт — это фиксированное правило/u);
assert.match(html, /Мои решения/u);
assert.match(html, /Нужно проверить вручную/u);
assert.match(html, /const d66Names=\{'allowed-service':'разрешённый сервис','retire-or-replace':'заменить или удалить','manual-review':'проверить вручную'\}/u);
assert.match(html, /r\.d66\.kind/u);
assert.doesNotMatch(html, /https?:\/\/|@react-native-firebase|firebase\/|XMLHttpRequest|WebSocket|fetch\(/iu);

process.stdout.write('SERVER DECISION ATLAS: PASS\n');
