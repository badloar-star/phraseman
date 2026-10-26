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

async function main(){
 const ctx=vm.createContext({window:{},console});
 install(ctx,'pmV5CombineRefresh');install(ctx,'pmV5NormalizeRefreshResult');
 for(const [statuses,expected]of [[['fresh','partial'],'partial'],[['partial'],'partial'],[['fresh','stale'],'partial'],[['managed'],'managed'],[[],'unsupported'],[['fresh','error'],'partial'],[['error'],'error'],[['cached','cached'],'cached']])assert.equal(ctx.pmV5CombineRefresh(statuses.map(status=>({status}))).status,expected,JSON.stringify(statuses));
 assert.notEqual(ctx.pmV5NormalizeRefreshResult(undefined,'test').status,'fresh');
 if(functions.has('pmV5ReadLoaderHealth'))install(ctx,'pmV5ReadLoaderHealth');
 install(ctx,'pmV5SafeCall');ctx.window.noResult=async()=>{};
 assert.notEqual((await ctx.pmV5SafeCall('noResult')).status,'fresh');
 ctx.window.loadExplainCache=async()=>{ctx.window._explainCacheSourceHealth={state:'error',complete:false}};
 assert.equal((await ctx.pmV5SafeCall('loadExplainCache')).status,'error');
 ctx.window.loadExplainCache=async()=>{ctx.window._explainCacheSourceHealth={state:'partial',complete:false,truncated:true}};
 assert.equal((await ctx.pmV5SafeCall('loadExplainCache')).status,'partial');
 ctx.window.loadExplainCache=async()=>{ctx.window._explainCacheSourceHealth={state:'ready',complete:true}};
 assert.equal((await ctx.pmV5SafeCall('loadExplainCache')).status,'fresh');
 ctx.window.loadExplainCache=async()=>{throw Error('offline')};assert.equal((await ctx.pmV5SafeCall('loadExplainCache')).status,'error');
 ctx._onboardingFunnelLoaded=true;ctx._onboardingExitsLoaded=false;ctx.window.pmRefreshOnboardingAnalytics=async()=>{};assert.equal((await ctx.pmV5SafeCall('pmRefreshOnboardingAnalytics')).status,'partial');ctx._onboardingExitsLoaded=true;assert.equal((await ctx.pmV5SafeCall('pmRefreshOnboardingAnalytics')).status,'fresh');
 const el={textContent:'',innerHTML:'',value:'30'};let data={totals:{},features:[],models:[]};
 const budget=vm.createContext({window:{loadOpenAiDialogModelConfig(){},loadOpenAiDialogQuotaConfig(){}},document:{getElementById:()=>el},_openAiBudgetLoaded:false,getOpenAiBudgetDashboardCallable:()=>async()=>({data}),openAiBudgetSummaryCards:()=>'',openAiBudgetSeriesChart:()=>'',openAiBudgetRowsTable:()=>'',openAiBudgetRecentCard:()=>'',openAiBudgetUsd:String,openAiBudgetNum:String,escapeHtml:String,showToast(){}});
 install(budget,'window.loadOpenAiBudgetDashboard');const invalid=await budget.window.loadOpenAiBudgetDashboard(true);assert.equal(invalid.status,'error');assert.equal(budget._openAiBudgetLoaded,false);
 data={totals:{calls:0,totalTokens:0,inputTokens:0,outputTokens:0,costUsd:0,estimatedMonthUsd:0,uniqueUsers:0},features:[],models:[],series:[],errors:[],truncated:[]};await budget.window.loadOpenAiBudgetDashboard(true);assert.equal(budget._openAiBudgetLoaded,true,'Verified actual zero is valid');
 console.log('PASS: partial/error/managed aggregation; unknown result never fresh; loader health and failure propagation');
}main().catch(e=>{console.error(e);process.exitCode=1});
