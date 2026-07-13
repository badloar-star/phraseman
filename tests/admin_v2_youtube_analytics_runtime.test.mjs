import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const moduleApi = require('../admin/v2/scripts/pages/youtube-analytics.js');

function snapshot(overrides = {}) {
  return {
    filters: { rangeDays: 7, platform: 'all' },
    window: { fromMicros: 1_000_000, toMicros: 2_000_000 },
    generatedAtMicros: 2_000_000,
    dataThroughMicros: 1_900_000,
    summary: {
      homeClicks: 3, catalogOpens: 3, videoSelects: 2, playerReady: 2, playbackStarts: 2,
      anonymousInstancesWithValidStart: 2, watchAttempts: 2, totalActiveWatchMs: 50_000,
      averageActiveWatchMs: 25_000, p50ActiveWatchMs: 20_000, p90ActiveWatchMs: 30_000,
      completed25: 2, completed50: 2, completed75: 1, completed95: 0,
      externalVideoOpens: 1, channelOpens: 1,
    },
    trend: [{ day: '2026-07-13', homeClicks: 3, catalogOpens: 3, videoSelects: 2, playbackStarts: 2, activeWatchMs: 50_000 }],
    funnel: [
      ['home', 3, null], ['catalog', 3, 1], ['select', 2, 2 / 3], ['start', 2, 1], ['completed25', 2, 1], ['completed75', 1, .5],
    ].map(([step, count, percentOfPrevious]) => ({ step, status: 'ready', count, percentOfPrevious })),
    videos: [
      { channelId: 'channel-1', videoId: 'video-b', title: '<img src=x onerror=1>', videoSelects: 1, playbackStarts: 2, anonymousInstances: 2, activeWatchMs: 50_000, averageActiveWatchMs: 25_000, p50ActiveWatchMs: 20_000, p90ActiveWatchMs: 30_000, completed25: 2, completed50: 2, completed75: 1, completed95: 0, externalVideoOpens: 1 },
      { channelId: 'channel-1', videoId: 'video-a', title: 'Alpha', videoSelects: 1, playbackStarts: 0, anonymousInstances: 0, activeWatchMs: 0, averageActiveWatchMs: null, p50ActiveWatchMs: null, p90ActiveWatchMs: null, completed25: 0, completed50: 0, completed75: 0, completed95: 0, externalVideoOpens: 0 },
    ],
    quality: {
      state: 'ready', totalEvents: 12, acceptedEvents: 12, validationRatio: 1,
      missingRequiredFields: 0, duplicates: 0, unknownSchema: 0, duplicateParameterKeys: 0,
      rowsWithoutStart: 0, conflictingVideo: 0, conflictingChannel: 0, duplicateStartAttempts: 0,
      invalidDurationAttempts: 0, unfinishedAttempts: 0, videosTruncated: false, videoRowsReturned: 2,
    },
    ...overrides,
  };
}

function installDocument() {
  const panel = { outerHTML: '' };
  const elements = {
    'youtube-analytics-panel': panel,
    'youtube-range': { value: '7' },
    'youtube-platform': { value: 'all' },
    'youtube-channel': { value: '' },
    'youtube-video': { value: '' },
  };
  globalThis.document = { getElementById: (id) => elements[id] || null };
  return panel;
}

test('escapes video titles and rejects an unknown response shape', () => {
  assert.equal(moduleApi.escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  assert.throws(() => moduleApi.validateSnapshot({ surprise: true }), /invalid_snapshot/);
  const html = moduleApi.renderPanel({ authorized: true, canRead: true });
  assert.match(html, /youtube-analytics-panel/);
});

test('sorts video rows deterministically in either direction', () => {
  const rows = snapshot().videos;
  assert.deepEqual(moduleApi.sortVideoRows(rows, { key: 'playbackStarts', direction: 'desc' }).map((row) => row.videoId), ['video-b', 'video-a']);
  assert.deepEqual(moduleApi.sortVideoRows(rows, { key: 'title', direction: 'asc' }).map((row) => row.videoId), ['video-b', 'video-a']);
});

test('renders loading, ready, partial, empty, and permission states without unsafe markup', async () => {
  moduleApi.reset();
  const panel = installDocument();
  moduleApi.renderPanel({ authorized: true, canRead: true });
  globalThis.callAdminYoutubeAnalytics = async () => ({ data: snapshot() });
  await moduleApi.load(true);
  assert.equal(moduleApi.inspectState().status, 'ready');
  assert.match(panel.outerHTML, /&lt;img src=x onerror=1&gt;/);
  assert.doesNotMatch(panel.outerHTML, /<img src=x/);

  globalThis.callAdminYoutubeAnalytics = async () => ({ data: snapshot({ quality: { ...snapshot().quality, state: 'partial', duplicates: 1 } }) });
  await moduleApi.load(true);
  assert.equal(moduleApi.inspectState().status, 'partial');
  assert.match(panel.outerHTML, /Данные частичные/);

  globalThis.callAdminYoutubeAnalytics = async () => ({ data: snapshot({ videos: [], quality: { ...snapshot().quality, state: 'empty', totalEvents: 0, acceptedEvents: 0, validationRatio: 0, videoRowsReturned: 0 } }) });
  await moduleApi.load(true);
  assert.equal(moduleApi.inspectState().status, 'empty');
  assert.match(panel.outerHTML, /Событий пока нет/);

  const forbidden = moduleApi.renderPanel({ authorized: true, canRead: false });
  assert.match(forbidden, /analytics\.read/);
  delete globalThis.document;
});

test('preserves the last successful snapshot after refresh and permission errors', async () => {
  moduleApi.reset();
  const panel = installDocument();
  moduleApi.renderPanel({ authorized: true, canRead: true });
  const good = snapshot();
  globalThis.callAdminYoutubeAnalytics = async () => ({ data: good });
  await moduleApi.load(true);
  assert.equal(moduleApi.inspectState().lastSnapshot, good);

  globalThis.callAdminYoutubeAnalytics = async () => { const error = new Error('denied'); error.code = 'functions/permission-denied'; throw error; };
  await moduleApi.load(true);
  assert.equal(moduleApi.inspectState().status, 'error');
  assert.equal(moduleApi.inspectState().lastSnapshot, good);
  assert.match(panel.outerHTML, /последний успешный снимок/i);
  assert.match(panel.outerHTML, /Недостаточно прав/);
  delete globalThis.document;
});
