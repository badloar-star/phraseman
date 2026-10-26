// Run from the project root: node scripts/admin_manual_reads_regression.cjs
// Executes extracted production functions with mocks; never initializes Firebase.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const ts = require(path.join(process.cwd(), 'node_modules/typescript'));
const html = fs.readFileSync(process.argv[2] || 'admin/v2/legacy.html', 'utf8');
const functions = new Map();
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
  const source = ts.createSourceFile('admin.js', match[1], ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(source.parseDiagnostics.length, 0, 'Inline script syntax');
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(source));
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && (ts.isFunctionExpression(node.right) || ts.isArrowFunction(node.right))) {
      functions.set(node.left.getText(source), node.getText(source));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function install(context, name) {
  assert(functions.has(name), 'Missing production function: ' + name);
  vm.runInContext(functions.get(name), context);
}
async function main() {
  let reads = 0, allowed = true;
  const state = new Map();
  const context = vm.createContext({
    window: {}, document: {dispatchEvent() {}, getElementById: () => null},
    CustomEvent: function() {}, console,
    isLocalAdminVisualTestMode: () => false, pmV5Can: () => allowed, isAdminSwitchableTab: t => t === 'users',
    PM_V5_REFRESHERS: {users: async () => { reads++; return {status: 'fresh'}; }},
    PM_V5_REFRESH_STATE: state, PM_V5_REFRESH_GENERATION: new Map(),
    pmV5SetRefreshState() {}, pmV5RefreshPolicy: () => ({focusMs: 0, reopenMs: 60000}),
    pmV5TimeLabel: String, pmV5Telemetry() {}, pmPhase1Coalesce: async (_key, fn) => fn(),
    pmV5NormalizeRefreshResult: result => result, pmV5ApplyCurrentPermissions() {},
  });
  install(context, 'pmV5RefreshSection');
  for (const [reason, expected] of [['open',1],['focus',0],['subsection',1],['manual',1],['retry',1],['phase5-manual',1]]) {
    state.clear(); reads = 0;
    await context.pmV5RefreshSection('users', {reason, force: true});
    assert.equal(reads, expected, 'Read count for ' + reason);
  }
  state.clear(); reads=0; await Promise.all([context.pmV5RefreshSection('users',{reason:'open'}),context.pmV5RefreshSection('users',{reason:'open'})]); assert.equal(reads,1,'Concurrent openings coalesce'); await context.pmV5RefreshSection('users',{reason:'open'}); assert.equal(reads,1,'Fresh cache avoids duplicate read');
  allowed = false; reads = 0;
  await context.pmV5RefreshSection('users', {reason:'manual', force:true});
  assert.equal(reads, 0, 'Denied section must never invoke loader');
  for (const [controls, projection, expected] of [['fresh','fresh','fresh'],['fresh','error','partial'],['error','fresh','partial'],['error','error','error']]) {
    const soc2 = vm.createContext({window:{},soc2SyncReadiness:async()=>({status:controls}),loadAutomatedProjection:async()=>({status:projection})});
    install(soc2, 'window.loadSoc2Readiness');
    assert.equal((await soc2.window.loadSoc2Readiness()).status, expected);
  }
  let writes = 0;
  const controls = vm.createContext({window:{pmSoc2ReadinessBackend:{loadControls:async()=>[],persistControl:async()=>writes++}},soc2SetSyncStatus(){},soc2MergeRemoteControls(){},soc2ReadinessState:()=>({controls:[{status:'done'}]}),console});
  install(controls, 'soc2SyncReadiness'); await controls.soc2SyncReadiness();
  assert.equal(writes, 0, 'SOC2 viewing must not write snapshots');
  assert(!html.includes('daily-digest.js') && !html.includes('tab-daily-digest'), 'Digest remains retired');
  const cardContext = vm.createContext({document:{getElementById:()=>null}});
  install(cardContext, 'cpIsVisibleBlock');
  let visible = true, contained = true;
  const chip = {getClientRects:()=>[],closest:()=>({getClientRects:()=>visible?[{}]:[]})};
  cardContext.document.getElementById = id => id === 'tab-control-panel' ? {contains:()=>contained} : chip;
  assert.equal(cardContext.cpIsVisibleBlock('cp-promo-banner-status'), true, 'Empty chip in visible card must load');
  visible = false; assert.equal(cardContext.cpIsVisibleBlock('cp-promo-banner-status'), false, 'Hidden card must not load');
  visible = true; contained = false; assert.equal(cardContext.cpIsVisibleBlock('cp-promo-banner-status'), false, 'Other section must not load');
  const normalized = html.replaceAll('\r\n', '\n');
  const hostStart = normalized.indexOf("  window.addEventListener('message',async event=>{\n    const frame=document.getElementById('pm-story-editor');");
  const hostEnd = normalized.indexOf('  function getAdminCreateAppMessageCallable', hostStart);
  assert(hostStart >= 0 && hostEnd > hostStart, 'Stories host handler is present');
  let listener; const messages = [];
  const frame = {dataset:{refreshRequested:'true'},contentWindow:{postMessage:message=>messages.push(message)}};
  const host = vm.createContext({window:{addEventListener:(_name,fn)=>{listener=fn;}},document:{documentElement:{dataset:{pmTheme:'light'}},getElementById:()=>frame}});
  vm.runInContext(normalized.slice(hostStart,hostEnd), host);
  await listener({source:{},data:{channel:'pm-story-ready'}});
  assert.equal(frame.dataset.ready, undefined, 'Unknown frame cannot mark Stories ready');
  await listener({source:frame.contentWindow,data:{channel:'pm-story-ready'}});
  assert.equal(frame.dataset.ready, 'true'); assert.equal(frame.dataset.refreshRequested, undefined);
  assert.equal(messages.length, 2); assert.equal(messages[0].channel, 'pm-story-theme'); assert.equal(messages[0].theme, 'light'); assert.equal(messages[1].channel, 'pm-story-refresh');
  const encoded = html.match(/frame.srcdoc=.*?atob\('([^']+)'\)/)?.[1];
  assert(encoded, 'Stories srcdoc exists');
  const story = Buffer.from(encoded, 'base64').toString('utf8');
  assert(story.includes("parent.postMessage({channel:'pm-story-ready'},'*')"));
  assert(!/setInterval\([^\n]*15000/.test(story), 'Stories polling must stay removed');
  console.log('PASS: manual/automatic/denied reads, SOC2 failure matrix and no read-time writes, digest retirement');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

