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
assert.doesNotMatch(html, /https?:\/\/|@react-native-firebase|firebase\/|XMLHttpRequest|WebSocket|fetch\(/iu);

process.stdout.write('SERVER DECISION ATLAS: PASS\n');
