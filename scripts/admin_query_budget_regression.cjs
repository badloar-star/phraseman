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
 const result=[];
 const el={style:{},textContent:'',innerHTML:'',hidden:false,value:'',setAttribute(){}};
 function setup(extra={}){const calls=[];const c=vm.createContext({window:{},document:{getElementById:()=>el},console,db:{},collection:(_db,...parts)=>parts.join('/'),query:(...x)=>x,where:(...x)=>({where:x}),orderBy:(...x)=>({order:x}),limit:n=>({limit:n}),startAfter:cursor=>({cursor}),documentId:()=> '__name__',getDocs:async q=>{calls.push(q);return {docs:[]}},...extra});return {c,calls};}
 for(const [type,n]of [['user',1],['error',1],['',2]]){el.value=type;const {c,calls}=setup({ARCHIVE_PAGE:100,filterArchive(){},escapeHtml:String});install(c,'window.loadArchive');await c.window.loadArchive();assert.equal(calls.length,n);result.push(['archive',type,n]);}
 for(const [type,n]of [['admin',1],['error_report',1],['user_report',1],['',3]]){el.value=type;const {c,calls}=setup({_opsAll:[],_opsCacheAt:0,OPS_CACHE_TTL_MS:60000,OPS_ADMIN_PAGE:100,OPS_REPORT_PAGE:100,filterOpsLog(){},escapeHtml:String,toOpsRow:()=>({})});install(c,'window.loadOpsLog');await c.window.loadOpsLog(true);assert.equal(calls.length,n);result.push(['ops',type,n]);}
 {const {c}=setup({auth:{currentUser:{}},_adminBadgeCache:null});install(c,'updateTabBadges');await c.updateTabBadges(true);result.push(['automatic badges',0]);}
 {const {c,calls}=setup({APP_MESSAGES_PAGE:120,renderAppMessages(){},escapeHtml:String});install(c,'window.loadAppMessages');await c.window.loadAppMessages();assert.equal(calls.length,1);assert.equal(c.window._appMessagesEngagementLoaded,false);result.push(['message list',1]);}
 {let page=0;const rows=Array.from({length:101},(_,i)=>({id:'p'+i,data:()=>({order:i,english:'Phrase '+i})}));const {c,calls}=setup({_dailyPhrases:[],DAILY_PHRASES_PAGE:100,applyCleanDailyPhrasesChrome(){},renderDailyPhrases(){}});c.getDocs=async q=>{calls.push(q);if(q[0]==='daily_phrases'){page++;return {docs:page===1?rows:rows.slice(100)}}return {docs:[]}};install(c,'window.loadDailyPhrases');await c.window.loadDailyPhrases(true);assert.equal(c._dailyPhrases.length,100);assert.equal(c.window._dailyPhrasesSourceHealth.truncated,true);assert.equal(calls.length,5);assert(calls.filter(q=>q[0]==='daily_phrase_save_counts').every(q=>q.some(x=>x?.where?.[1]==='in')));await c.window.loadDailyPhrases(true,true);assert.equal(c._dailyPhrases.length,101);assert.equal(c.window._dailyPhrasesSourceHealth.complete,true);assert(calls.filter(q=>q[0]==='daily_phrases')[1].some(x=>x?.cursor?.id==='p99'));result.push(['daily cursor',101,'counts by page ids']);}
 {const {c}=setup({showToast(){},writeBatch(){throw Error('Partial queue must never write')}});c.window._dailyPhrasesSourceHealth={complete:false};install(c,'window.dpDrop');await c.window.dpDrop({preventDefault(){}},'p1');result.push(['partial reorder','blocked']);}
 {const {c,calls}=setup({APP_MESSAGE_ENGAGEMENT_PAGE:400,appMessagePollCountsFromData:()=>({}),appMessagePollVoteTotal:()=>0});c.getDocs=async q=>{calls.push(q);return {docs:[{data:()=>({optionId:'a'})}]}};install(c,'loadAppMessagePollCounts');const counts=await c.loadAppMessagePollCounts('m',{poll:{},pollVoteCount:null,pollCounts:null});assert.equal(calls.length,1);assert.equal(counts.pollVoteCount,1);result.push(['null poll total','reads instead of zero']);}
 {const {c}=setup({_dailyPhrases:[],DAILY_PHRASES_PAGE:100,applyCleanDailyPhrasesChrome(){},renderDailyPhrases(){}});c.getDocs=async q=>{if(q[0]==='daily_phrases')return {docs:[{id:'p',data:()=>({savedCount:9})}]};throw Error('offline')};install(c,'window.loadDailyPhrases');await c.window.loadDailyPhrases(true);assert.equal(c._dailyPhrases[0].savedCount,null);assert.equal(c.window._dailyPhrasesSourceHealth.complete,false);result.push(['count failure','unknown']);}
 {const {c}=setup({loadAppMessageReactionCounts:async()=>({likes:1,dislikes:0}),loadAppMessagePollCounts:async()=>({pollVoteCount:0}),loadSettingsMessageFunnel:async()=>{},renderAppMessages(){throw Error('Stale result rendered')}});c.window._appMessages=[{id:'old'}];install(c,'window.loadAppMessageMetrics');const pending=c.window.loadAppMessageMetrics();c.window._appMessages=[{id:'new'}];await pending;assert.equal(c.window._appMessages[0].id,'new');result.push(['metrics generation','stale response discarded']);}
 console.log(JSON.stringify({status:'PASS',checks:result}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
