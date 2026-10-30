"""Offline browser regression suite. Firebase requests are mocked; no production writes.
Run: python tests/admin_stories_regression.py [path/to/story_announcements_v2.js]
Requires Python Playwright and Chromium. CHROMIUM_EXECUTABLE overrides the executable.
"""
import json,sys,os,shutil,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
SOURCE_PATH=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'admin/v2/scripts/pages/story_announcements_v2.js'
SOURCE=SOURCE_PATH.read_text(encoding='utf-8')
BOOT=r'''window.calls=[]; window.holds={}; window.listMode='ok'; window.commandMode='ok';
window.items=[{id:'story-a',revision:2,status:'draft',content:{design:'manifest',title:'Original',blocks:[{text:'Body',size:16,style:'normal'}]}}];
window.authObservers=[];
window.__pmAdminCore={app:{options:{projectId:'offline-test'}},functionsUs:{},auth:{currentUser:BOOT_USER,onIdTokenChanged(fn){authObservers.push(fn);return ()=>{};}},httpsCallable(_f,name){return async data=>{
 calls.push({name,data,uid:__pmAdminCore.auth.currentUser?.uid});
 if(!__pmAdminCore.auth.currentUser) throw Error('unauthenticated');
 if(name==='adminStoryAnnouncementsList'){
  if(listMode==='hold')return new Promise(resolve=>{(holds.list??=[]).push(resolve)});
  if(listMode==='bad')return {data:{}};
  if(listMode==='error')throw Error('network_failed');
  return {data:{items:JSON.parse(JSON.stringify(items))}};
 }
 if(commandMode==='hold')return new Promise(resolve=>holds.command=resolve);
 if(commandMode==='bad')return {data:{}};
 if(commandMode==='error')throw Error('network_failed');
 const revision=data.expectedRevision+1;
 const row={id:data.id,revision,status:data.action==='publish'?'published':'draft',content:data.content||items.find(x=>x.id===data.id)?.content};
 items=[row,...items.filter(x=>x.id!==row.id)];return {data:{ok:true,revision}};
}}};
window.login=uid=>{__pmAdminCore.auth.currentUser=uid?{uid}:null;for(const fn of authObservers)fn(__pmAdminCore.auth.currentUser)};
window.confirm=()=>true;'''
results=[]
def check(name,fn):
 try: fn(); results.append({'test':name,'passed':True}); print('PASS',name,flush=True)
 except Exception as e: results.append({'test':name,'passed':False,'error':(str(e).splitlines() or [type(e).__name__])[0]});print('FAIL',name, (str(e).splitlines() or [type(e).__name__])[0],flush=True)
def assert_js(p,expr):
 if not p.evaluate(expr):raise AssertionError(expr)
def new_page(browser,uid='user-a',extra=''):
 p=browser.new_page();p.set_default_timeout(1500)
 p.route('**/*',lambda r:r.fulfill(status=404,body='offline'))
 p.set_content('<html><head></head><body><div id="tab-stories"></div></body></html>');p.evaluate(BOOT.replace('BOOT_USER',json.dumps({'uid':uid}) if uid else 'null'));p.evaluate(extra or 'void 0');p.add_script_tag(content=SOURCE);p.wait_for_timeout(40);return p
with sync_playwright() as pw:
 executable=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
 browser=pw.chromium.launch(**({'executable_path':executable} if executable else {}),headless=True,args=['--no-sandbox'])
 def test_catalogue():
  p=new_page(browser);p.get_by_role('button',name='Новое объявление',exact=True).click();assert p.locator('.ann2-form select').first.locator('option').count()==37;p.close()
 check('36 templates remain usable without preview',test_catalogue)
 def test_login():
  p=new_page(browser,None);assert_js(p,'calls.length===0');p.evaluate("login('user-a')");p.wait_for_function('__ann2.loaded');assert_js(p,"__ann2.rows.length===1");p.close()
 check('restored login loads saved stories',test_login)
 def test_dedupe():
  p=new_page(browser,extra="listMode='hold'");p.get_by_role('button',name='Обновить список',exact=True).click();p.get_by_role('button',name='Обновить список',exact=True).click();assert_js(p,"calls.filter(x=>x.name==='adminStoryAnnouncementsList').length===1");p.close()
 check('repeated refresh coalesces list request',test_dedupe)
 def test_badrow():
  p=new_page(browser,extra="items=[{id:'bad',content:{design:'manifest',title:5,blocks:[null,{text:3,size:12}],eventAtMs:'bad'}},{id:'ok',content:{design:'manifest',title:'Valid',blocks:{}}}]");assert_js(p,'__ann2.loaded && __ann2.rows.length===2');p.locator('.ann2-row').first.click();assert_js(p,"__ann2.current.blocks[0].text==='' && __ann2.current.eventAtMs===null");p.close()
 check('malformed optional row data cannot crash list',test_badrow)
 def test_badlist():
  p=new_page(browser);p.evaluate("listMode='bad'");p.get_by_role('button',name='Обновить список',exact=True).click();assert_js(p,'__ann2.rows.length===1 && __ann2.error');p.close()
 check('invalid list response preserves existing rows',test_badlist)
 def test_badcommand():
  p=new_page(browser);p.locator('.ann2-row').click();p.evaluate("commandMode='bad'");p.get_by_role('button',name='Сохранить черновик',exact=True).click();assert_js(p,'__ann2.current.revision===2 && __ann2.error && !__ann2.busy');p.close()
 check('missing revision cannot become fake save success',test_badcommand)
 def test_busy():
  p=new_page(browser);p.locator('.ann2-row').click();p.evaluate("commandMode='hold'");p.get_by_role('button',name='Сохранить черновик',exact=True).click();assert_js(p,"[...document.querySelectorAll('.ann2-form input,.ann2-form textarea,.ann2-form select,.ann2-list button')].every(x=>x.disabled)");p.close()
 check('pending save locks draft and selection',test_busy)
 def test_published():
  p=new_page(browser,extra="items[0].status='published'");p.locator('.ann2-row').click();assert_js(p,"[...document.querySelectorAll('.ann2-form input,.ann2-form textarea,.ann2-form select')].every(x=>x.disabled)");assert p.get_by_role('button',name='Снять с показа',exact=True).is_enabled();p.close()
 check('published content is read-only until stop',test_published)
 def test_logout():
  p=new_page(browser);p.locator('.ann2-row').click();p.evaluate('login(null)');assert_js(p,'__ann2.current===null && __ann2.rows.length===0');p.close()
 check('logout clears previous account data',test_logout)
 def test_stale():
  p=new_page(browser,extra="listMode='hold'");p.evaluate("login('user-b');holds.list[0]({data:{items:[{id:'private-a',content:{title:'Secret'}}]}})");p.wait_for_timeout(20);assert_js(p,"!__ann2.rows.some(x=>x.id==='private-a')");p.close()
 check('late prior-account response is ignored',test_stale)
 def test_long():
  p=new_page(browser);p.locator('.ann2-row').click();p.evaluate("__ann2.current.blocks[0].text='x'.repeat(261)");p.get_by_role('button',name='Сохранить черновик',exact=True).click();assert_js(p,"!calls.some(x=>x.name==='adminStoryAnnouncementCommand') && __ann2.error");p.close()
 check('overlong block is rejected, not silently truncated',test_long)
 def test_success():
  p=new_page(browser);p.locator('.ann2-row').click();p.get_by_role('button',name='Сохранить черновик',exact=True).click();assert_js(p,"__ann2.message==='Черновик сохранён.' && __ann2.current.revision===3 && !__ann2.busy");p.close()
 check('save uses confirmed revision and retains success message',test_success)
 def test_failure():
  p=new_page(browser);p.locator('.ann2-row').click();p.evaluate("commandMode='error'");p.get_by_role('button',name='Сохранить черновик',exact=True).click();assert_js(p,'!__ann2.busy && __ann2.error');p.evaluate("commandMode='ok'");p.get_by_role('button',name='Сохранить черновик',exact=True).click();assert_js(p,'__ann2.current.revision===3');p.close()
 check('failed save unlocks controls for retry',test_failure)
 def test_confirm():
  p=new_page(browser);p.locator('.ann2-row').click();p.evaluate('window.confirm=()=>false');p.get_by_role('button',name='Опубликовать',exact=True).click();assert_js(p,"!calls.some(x=>x.name==='adminStoryAnnouncementCommand')");p.close()
 check('cancelled publish sends no command',test_confirm)
 def test_poll():
  p=new_page(browser);p.get_by_role('button',name='Новое объявление',exact=True).click();p.locator('.ann2-form select').first.select_option('poll');assert p.get_by_role('button',name='Опубликовать',exact=True).is_disabled();p.close()
 check('poll deployment safety gate remains in force',test_poll)
 def test_scope_before_send():
  p=new_page(browser);p.locator('.ann2-row').click();p.evaluate("() => { window.getAdminSensitiveControlCallable=name=>name==='adminStoryAnnouncementCommand'?new Promise(resolve=>window.resolveCallable=resolve):__pmAdminCore.httpsCallable({},name); }");p.get_by_role('button',name='Сохранить черновик',exact=True).click();p.evaluate("login('user-b');resolveCallable(__pmAdminCore.httpsCallable({},'adminStoryAnnouncementCommand'))");p.wait_for_timeout(20);assert_js(p,"!calls.some(x=>x.name==='adminStoryAnnouncementCommand')");p.close()
 check('account switch before callable resolution cancels write',test_scope_before_send)
 browser.close()
out=Path(tempfile.gettempdir())/(SOURCE_PATH.stem+'-regression-results.json');out.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{sum(r["passed"] for r in results)}/{len(results)} passed; {out}')
sys.exit(0 if all(r['passed'] for r in results) else 1)
