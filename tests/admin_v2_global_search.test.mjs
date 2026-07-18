import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSearchIndex,
  createQueryCancellation,
  normalizeQuery,
  rankSearchResult,
  searchIndex,
} from '../admin/v2/scripts/admin-v2-global-search.js';

const here = path.dirname(fileURLToPath(import.meta.url));

assert.equal(normalizeQuery('  ＦＯＯ\u00a0\tBAR  '), 'foo bar');
assert.equal(normalizeQuery(null), '');

const registry = [
  { id: 'overview', label: 'Обзор', description: 'Главная сводка', route: 'overview', nativeRoute: 'overview', legacyStatus: 'native' },
  { id: 'reports', label: 'Центр репортов', description: 'Очередь обращений', route: 'users', nativeRoute: 'report-center', legacyStatus: 'native' },
  { id: 'reports', label: 'Дубликат', route: 'users' },
  { id: 'retired', label: 'Старое', route: 'overview' },
  { id: 'excluded', label: 'Скрыто', route: 'overview' },
  { id: 'flagged', label: 'Только с правом', permission: 'reports.read', route: 'report-center', hidden: 'strip-me' },
  { id: 'denied', label: 'Недоступно', permission: 'reports.write', route: 'report-center' },
  { id: '', label: 'Нет id' },
  { id: 'no-label', label: '' },
  { id: 'local-excluded', label: 'Локально скрыто', excluded: true },
];

const index = buildSearchIndex(registry, {
  can: (permission) => permission === 'reports.read',
  excludedIds: new Set(['excluded']),
  retiredIds: new Set(['retired']),
});

assert.deepEqual(index.map((entry) => entry.id), ['overview', 'reports', 'flagged']);
assert.deepEqual(Object.keys(index[2]).sort(), ['description', 'id', 'label', 'legacyStatus', 'nativeRoute', 'route']);
assert.equal(index[1].label, 'Центр репортов');

const ranked = [
  { id: 'reports', label: 'Страница', description: '', route: 'users', nativeRoute: 'report-center', legacyStatus: '' },
  { id: 'one', label: 'Репорты', description: '', route: 'overview', nativeRoute: '', legacyStatus: '' },
  { id: 'two', label: 'Антирепортный обзор', description: '', route: 'overview', nativeRoute: '', legacyStatus: '' },
  { id: 'three', label: 'Журнал', description: 'Репорт команды', route: 'overview', nativeRoute: '', legacyStatus: '' },
  { id: 'four', label: 'Журнал', description: 'Репорт команды', route: 'overview', nativeRoute: '', legacyStatus: '' },
];

assert(rankSearchResult(ranked[0], ['reports']) > rankSearchResult(ranked[1], ['репорт']));
assert(rankSearchResult(ranked[1], ['репорт']) > rankSearchResult(ranked[2], ['репорт']));
assert(rankSearchResult(ranked[2], ['репорт']) > rankSearchResult(ranked[3], ['репорт']));
assert.deepEqual(searchIndex(ranked, 'репорт').map((entry) => entry.id), ['one', 'two', 'three', 'four']);
assert.deepEqual(searchIndex(ranked, 'ЖУРНАЛ', { limit: 99 }).map((entry) => entry.id), ['three', 'four']);
assert.deepEqual(searchIndex(ranked, '', { limit: 20 }), []);
assert.deepEqual(searchIndex(ranked, 'репорт', { limit: -1 }), []);
assert.equal(searchIndex([...Array(25)].map((_, number) => ({ id: `item-${number}`, label: 'Репорт', description: '', route: '', nativeRoute: '', legacyStatus: '' })), 'репорт', { limit: 99 }).length, 20);
assert.deepEqual(Object.keys(searchIndex(index, 'центр')[0]).sort(), ['description', 'id', 'label', 'legacyStatus', 'nativeRoute', 'route', 'score']);

const cancellation = createQueryCancellation();
const first = cancellation.nextToken();
const second = cancellation.nextToken();
assert.equal(first < second, true);
assert.equal(cancellation.isCurrent(first), false);
assert.equal(cancellation.isCurrent(second), true);

const source = fs.readFileSync(path.join(here, '..', 'admin', 'v2', 'scripts', 'admin-v2-global-search.js'), 'utf8').toLowerCase();
for (const forbidden of ['document', 'window', 'firebase', 'fetch(', 'http', 'network', 'users', 'email', 'uid', 'report', 'campaign']) {
  assert.equal(source.includes(forbidden), false, `forbidden source term: ${forbidden}`);
}

console.log('admin-v2-global-search: PASS');
