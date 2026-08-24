import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8');
const block = (start: string, end: string) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));

describe('Admin D1 truthful operational surfaces', () => {
  test('moderation queries every open source before a cap and reports partial/truncated truth', () => {
    const source = block('// ── Unified Moderation Queue', '// ── Refund / dispute center');
    expect(source).toContain("where('status', 'in', MQ_CONTENT_OPEN_STATUSES)");
    expect(source).toContain("where('status', 'in', MQ_USER_OPEN_STATUSES)");
    expect(source).toContain("where('status', '==', 'pending')");
    expect(source).toContain('limit(MOD_QUEUE_PAGE + 1)');
    expect(source).toContain('window._modQueueSourceHealth');
    expect(source).toContain('sourceFailures');
    expect(source).toMatch(/complete\s*:\s*sourceFailures\.length\s*===\s*0\s*&&\s*!truncated/);
    expect(source).not.toContain('catch(() => {})');
    expect(source).not.toContain('Пусто — очередь чиста');
  });

  test('archive filters closed statuses on the server before bounded reads and admits truncation', () => {
    const source = block('window.loadArchive = async function', 'window.filterArchive = function');
    expect(source).toContain("where('status', 'in', ['archived','banned'])");
    expect(source).toContain("where('status', 'in', ['fixed','archived'])");
    expect(source).toContain("orderBy('createdAt','desc')");
    expect(source).toContain('limit(ARCHIVE_PAGE + 1)');
    expect(source).toContain('window._archiveSourceHealth');
    expect(source).not.toContain('.filter(d =>');
    expect(html).toContain('Архив показан частично');
  });

  test('app health applies one stable period before every capped page and never calls partial GREEN', () => {
    const source = block('// App Health: production diagnostics', 'window.filterAppHealth = function');
    expect(source).toContain("where('createdAt', '>=', window._appHealthRangeSince)");
    expect(source).toContain('limit(APPHEALTH_PAGE + 1)');
    expect(source).toContain('window._appHealthSourceHealth');
    expect(source).toContain("label: 'PARTIAL'");
    expect(source).toContain("label: 'ERROR'");
    expect(source).toContain("where('createdAt', '>=', since)");
    expect(source).toContain('limit(APPACTIVITY_PAGE + 1)');
    expect(source).not.toContain("rows.filter(r => !r.createdAt || String(r.createdAt) >= since)");
  });

  test('refund center keeps source failures and caps visible instead of converting them to zero', () => {
    const source = block('// ── Refund / dispute center', 'window._reportsLastDoc');
    expect(source).toContain("where('status', '==', 'refunded')");
    expect(source).toContain("where('eventType', '==', 'REFUND')");
    expect(source).toContain('limit(REFUND_PAGE + 1)');
    expect(source).toContain('window._refundSourceHealth');
    expect(source).toContain('sourceFailures');
    expect(source).toContain('Показано в выборке');
    expect(source).not.toContain('skip RC silently');
    expect(source).not.toContain('Возвратов нет 🎉');
  });

  test('Mission Control relies on complete source health, not flags, DOM errors, or zero fallbacks', () => {
    const source = block("if(window.PMPhase3Ops && window.PMPhase3Ops.version==='phase3')", 'function inboxFromModQueue');
    expect(source).toContain("window._modQueueSourceHealth?.complete === true");
    expect(source).toContain("window._appHealthSourceHealth?.complete === true");
    expect(source).toContain("const queueCount=m.queueKnown?m.mq:null");
    expect(source).toContain("m.queueKnown?`Content:");
    expect(source).not.toContain('const queueCount=m.mq||');
  });

  test('learning outcomes stays absent because the authoritative callable has no such projection', () => {
    const server = fs.readFileSync(path.join(root, 'functions/src/admin_product_analytics.ts'), 'utf8');
    const runtime = fs.readFileSync(path.join(root, 'admin/v2/scripts/pages/product-analytics.js'), 'utf8');
    expect(server).not.toMatch(/\blearningOutcomes\s*:/);
    expect(runtime).not.toContain('data.learningOutcomes');
    expect(html).not.toContain('id="product-analytics-learning-outcomes"');
  });

  test('new server-side filters have exact composite indexes', () => {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')) as {
      indexes: Array<{ collectionGroup: string; queryScope: string; fields: Array<{ fieldPath: string; order: string }> }>;
    };
    const has = (collectionGroup: string, fields: Array<{ fieldPath: string; order: string }>) => (
      config.indexes.some((entry) => entry.collectionGroup === collectionGroup
        && entry.queryScope === 'COLLECTION'
        && JSON.stringify(entry.fields) === JSON.stringify(fields))
    );
    for (const collection of ['error_reports', 'user_reports']) {
      expect(has(collection, [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ])).toBe(true);
    }
    expect(has('community_pack_purchases', [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'refundedAt', order: 'DESCENDING' },
    ])).toBe(true);
    expect(has('revenuecat_premium_events', [
      { fieldPath: 'eventType', order: 'ASCENDING' },
      { fieldPath: 'eventTimestampMs', order: 'DESCENDING' },
    ])).toBe(true);
  });

  test('moderation coverage and copy match every bounded source without invented AI priority', () => {
    const source = block('// ── Unified Moderation Queue', '// ── Refund / dispute center');
    for (const collection of [
      'error_reports', 'user_reports', 'community_pack_submissions',
      'community_pack_reports', 'explain_report_entries', 'app_errors',
    ]) expect(source).toContain(`collection(db, '${collection}')`);
    expect(html).toContain('Шесть ограниченных источников');
    expect(html).not.toContain('отсортированы по приоритету ИИ-триажа');
    expect(html).not.toContain('UGC-паки на проверке и чат лиг');
    expect(source).toContain("source: 'pack-report'");
    expect(source).toContain("source: 'explain'");
    expect(source).toContain("source: 'app-health'");
  });

  test('refund center gets shard refunds only through the money.read server projection', () => {
    const source = block('// ── Refund / dispute center', 'window._reportsLastDoc');
    expect(source).not.toContain("collection(db, 'revenuecat_shard_refunds')");
    expect(source).toContain("createAdminAuthCallable('adminListShardRefunds')");
    expect(source).toContain('rangeDays:REFUND_RANGE_DAYS');
    expect(source).toContain('cap:REFUND_PAGE');
    expect(source).toContain('shardResult?.data?.sourceHealth');
    expect(source).toContain('shardResult?.data?.rows');
    expect(source).toContain("type:'shards'");
    expect(source).toContain('const serialVisible = health.complete === true && r.serial === true');
    expect(source).toContain('serialVisible ?');
    expect(source).toContain('buyerCount:Number.isSafeInteger(r.buyerRefundCount) ? Number(r.buyerRefundCount) : null');
    expect(source).toContain('if (onlySerial) items = health.complete ? items.filter(r => r.serial) : []');
    expect(source).not.toContain('${r.serial ?');
    expect(html).toContain('<option value="shards">Осколки RevenueCat</option>');
  });

  test('Mission Control refreshes only sources the operator already opened and timestamps only complete refreshes', () => {
    const source = block("if(window.PMPhase3Ops && window.PMPhase3Ops.version==='phase3')", 'function inboxFromModQueue');
    expect(source).not.toContain('queueMicrotask(()=>void refreshBoundedSources(false))');
    expect(source).toContain("window._appHealthSourceHealth || window._modQueueSourceHealth");
    expect(source).toContain("tab === 'app-health' ? Boolean(window._appHealthSourceHealth) : Boolean(window._modQueueSourceHealth)");
    expect(source).toMatch(/if\s*\(complete\)\s*state\.todayLastRefreshAt\s*=\s*Date\.now\(\)/);
    expect(source).toContain("state.todayRefreshState=complete?'fresh'");
  });

  test('App Health force refresh and errors clear stale rows, cursors, ranges, and load-more state', () => {
    const source = block('// App Health: production diagnostics', 'window.filterAppHealth = function');
    expect(source).toContain('if (force && !append) {');
    expect(source).toContain('_appHealthAll = [];');
    expect(source).toContain('window._appHealthLastDoc = null;');
    expect(source).toContain('window._appHealthHasMore = false;');
    expect(source).toContain("window._appHealthSourceHealth = { state:'loading'");
    expect(source).toContain("window._appHealthSourceHealth = { state:'error'");
    expect(source).toContain('window._appHealthRangeSince = null;');
  });

  test('App Messages and Push expose explicit success/error health and never set loaded before a read', () => {
    const messages = block('window.loadAppMessages = async function', 'let _fnAdminCreateSettingsMessage');
    const push = block('window.loadPushJobs = async function', 'window._bulkSelected');
    for (const [source, loaded, health] of [
      [messages, '_appMessagesLoaded', '_appMessagesSourceHealth'],
      [push, '_pushJobsLoaded', '_pushJobsSourceHealth'],
    ]) {
      expect(source.indexOf(`window.${loaded} = true`)).toBeGreaterThan(source.indexOf('await getDocs'));
      expect(source).toContain(`window.${health} = { state:'ready', complete:true`);
      expect(source).toContain(`window.${health} = { state:'error', complete:false`);
      expect(source).toContain(`window.${loaded} = false`);
    }
    const mission = block('function missionMetrics()', 'function metric(value,known)');
    expect(mission).toContain("window._appMessagesSourceHealth?.complete === true");
    expect(mission).toContain("window._pushJobsSourceHealth?.complete === true");
  });

  test('App Messages and Push use a cap sentinel and never call a capped sample complete', () => {
    const messages = block('window.loadAppMessages = async function', 'let _fnAdminCreateSettingsMessage');
    const push = block('window.loadPushJobs = async function', 'window._bulkSelected');
    expect(messages).toContain('limit(APP_MESSAGES_PAGE + 1)');
    expect(messages).toContain('const truncated = snap.docs.length > APP_MESSAGES_PAGE');
    expect(messages).toContain('snap.docs.slice(0, APP_MESSAGES_PAGE)');
    expect(messages).toContain("state:'partial', complete:false, truncated:true");
    expect(messages).toContain("state:'ready', complete:true, truncated:false");
    expect(push).toContain('limit(PUSH_JOBS_PAGE + 1)');
    expect(push).toContain('const truncated = snap.docs.length > PUSH_JOBS_PAGE');
    expect(push).toContain('snap.docs.slice(0, PUSH_JOBS_PAGE)');
    expect(push).toContain("state:'partial', complete:false, truncated:true");
    expect(push).toContain("state:'ready', complete:true, truncated:false");
  });

  test('additional moderation filters have exact composite indexes', () => {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')) as {
      indexes: Array<{ collectionGroup: string; queryScope: string; fields: Array<{ fieldPath: string; order: string }> }>;
    };
    const has = (collectionGroup: string, fields: Array<{ fieldPath: string; order: string }>) => config.indexes.some((entry) => (
      entry.collectionGroup === collectionGroup && entry.queryScope === 'COLLECTION'
      && JSON.stringify(entry.fields) === JSON.stringify(fields)
    ));
    expect(has('community_pack_reports', [{ fieldPath:'status', order:'ASCENDING' }, { fieldPath:'createdAt', order:'DESCENDING' }])).toBe(true);
    expect(has('explain_report_entries', [{ fieldPath:'status', order:'ASCENDING' }, { fieldPath:'createdAtMs', order:'DESCENDING' }])).toBe(true);
    expect(has('app_errors', [{ fieldPath:'status', order:'ASCENDING' }, { fieldPath:'createdAt', order:'DESCENDING' }])).toBe(true);
  });
});
