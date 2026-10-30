"""Offline browser fixture for Stories. All network requests terminate in this fixture."""
from pathlib import Path
from urllib.parse import urlparse
import json, os, shutil, re, sys, tempfile, traceback, mimetypes
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SOURCE_PATH=ROOT/'admin/v2/scripts/pages/story_announcements_v2.js'
ORIGIN='https://stories.test'
BOOT=r'''window.calls=[];window.holds={};window.listMode='ok';window.commandMode='ok';window.authObservers=[];window.confirmations=[];window.confirmAnswer=true;
const now=Date.now();
window.items=[{id:'story-a',revision:2,status:'draft',publishedAtMs:null,expiresAtMs:null,content:{design:'manifest',title:'Original',badge:'Draft badge',blocks:[{text:'Body',size:16,style:'normal'}],lifetime:7,unit:'days',durationMs:12000}}];
window.__pmAdminCore={app:{options:{projectId:'offline-test'}},functionsUs:{},auth:{currentUser:BOOT_USER,onIdTokenChanged(fn){authObservers.push(fn);return ()=>{const i=authObservers.indexOf(fn);if(i>=0)authObservers.splice(i,1);};}},httpsCallable(_f,name){return async data=>{
 if(!['adminStoryAnnouncementsList','adminStoryAnnouncementCommand'].includes(name))throw Error('Unexpected callable '+name);
 calls.push({name,data,uid:__pmAdminCore.auth.currentUser?.uid});
 if(!__pmAdminCore.auth.currentUser)throw Error('unauthenticated');
 if(name==='adminStoryAnnouncementsList'){
  if(listMode==='hold')return new Promise(resolve=>{(holds.list??=[]).push(resolve)});
  if(listMode==='bad')return {data:{}};
  if(listMode==='error')throw Error('network_failed');
  return {data:{items:JSON.parse(JSON.stringify(items))}};
 }
 if(commandMode==='hold')return new Promise(resolve=>holds.command=resolve);
 if(commandMode==='bad')return {data:{}};
 if(commandMode==='error')throw Error('network_failed');
 if(commandMode==='conflict')throw Error('revision_conflict');
 const old=items.find(x=>x.id===data.id);
 if(old&&old.revision!==data.expectedRevision)throw Error('revision_conflict');
 if(old?.status==='published'&&data.action!=='stop')throw Error('published_edit_requires_stop');
 const revision=data.expectedRevision+1;
 const row={id:data.id,revision,status:data.action==='publish'?'published':'draft',content:data.content||old?.content,publishedAtMs:data.action==='publish'?Date.now():null,expiresAtMs:data.action==='publish'?Date.now()+86400000:null};
 items=[row,...items.filter(x=>x.id!==row.id)];return {data:{id:data.id,revision,auditId:'offline-audit'}};
}}};
window.login=uid=>{__pmAdminCore.auth.currentUser=uid?{uid}:null;for(const fn of [...authObservers])fn(__pmAdminCore.auth.currentUser);};
window.confirm=(message)=>{confirmations.push(message);return confirmAnswer;};
window.loadStoryWorkspace=()=>{document.querySelector('#pm-story-editor').src='https://stories.test/old-editor-must-not-load.html';};
'''
SHELL='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;background:#0b1915;color:#e3efeb;font:14px/1.5 system-ui,sans-serif;--pm-surface:#152b25;--pm-card:#1b382e;--pm-muted:#a2bdb2;--pm-accent:#8fd3a8;--pm-text:#e3efeb}#admin-app{margin-left:168px;padding:32px}.reports-tab{display:none;width:100%;min-width:0}.reports-tab.active{display:block}input,select,textarea{max-width:100%}
img,canvas,svg,video,iframe{max-width:100%;height:auto}
body.pm-phase6-ready [id^="tab-"] :where(canvas,svg,img,video,iframe){max-width:100%}
@media(max-width:800px){#admin-app{margin-left:0;padding:16px}}
</style></head><body class="pm-phase6-ready"><main id="admin-app"><section id="tab-stories" class="reports-tab active"><div class="pm-v5-sync pm-story-status" id="legacy-test-status">Редактор открыт · результат загрузки показан внутри редактора</div><button class="pm-manual-load" data-pm-manual-load="stories" id="legacy-test-refresh">Обновить</button><div class="pm-v4-section-header" id="legacy-test-header">Истории старого редактора</div><iframe id="pm-story-editor" title="Старый редактор" style="display:block" src="about:blank"></iframe></section></main><script>BOOT_SCRIPT</script><script src="/scripts/pages/story_announcements_v2.js"></script></body></html>'''

class Harness:
 def __init__(self,browser,uid='user-a',extra='',width=1562,route='builder',renderer=True,wait_loaded=True,font_assets='real'):
  self.page=browser.new_page(viewport={'width':width,'height':1100},reduced_motion='no-preference')
  self.page.set_default_timeout(3000)
  self.errors=[];self.requested=[];self.blocked=[];self.font_requests=[];self.font_assets=font_assets
  self.page.on('pageerror',lambda err:self.errors.append(str(err)))
  html=SHELL.replace('BOOT_SCRIPT',BOOT.replace('BOOT_USER',json.dumps({'uid':uid}) if uid else 'null')+'\n'+extra)
  assets={'/scripts/pages/story_announcements_v2.js':SOURCE_PATH,'/scripts/pages/story_announcements_v2.css':ROOT/'admin/v2/scripts/pages/story_announcements_v2.css'}
  if renderer:
   assets.update({p:ROOT/'admin/v2'/p.lstrip('/') for p in ['/scripts/pages/story_announcements_v2_preview.html','/assets/stories_v2/kit.css','/assets/stories_v2/spire-tower-render.js']})
  def intercept(request):
   url=request.request.url;self.requested.append(url);parsed=urlparse(url)
   if parsed.netloc=='stories.test' and parsed.path=='/legacy.html':request.fulfill(status=200,content_type='text/html; charset=utf-8',body=html);return
   target=assets.get(parsed.path) if parsed.netloc=='stories.test' else None
   if renderer and parsed.netloc=='stories.test' and parsed.path.startswith('/assets/stories_v2/'):
    asset_root=(ROOT/'admin/v2/assets/stories_v2').resolve()
    candidate=(ROOT/'admin/v2'/parsed.path.lstrip('/')).resolve()
    if candidate.is_relative_to(asset_root) and candidate.is_file():target=candidate
   if target and target.suffix in {'.ttf','.woff','.woff2'} and self.font_assets!='real':
    if self.font_assets=='hold':self.font_requests.append((request,target));return
    self.blocked.append(url);request.fulfill(status=404,body='offline fixture: font unavailable');return
   if target and target.exists():
    mime=mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
    request.fulfill(status=200,content_type=mime,body=target.read_bytes());return
   self.blocked.append(url);request.fulfill(status=404,body='offline fixture: external request blocked')
  self.page.route('**/*',intercept)
  self.page.goto(ORIGIN+'/legacy.html?stories='+route+'#stories',wait_until='domcontentloaded' if font_assets=='hold' else 'load')
  self.page.locator('section.ann2').wait_for(state='attached')
  if uid and wait_loaded:self.page.wait_for_function('window.__ann2?.loaded')
 def gallery(self):
  self.page.locator('iframe.ann2-gallery-frame').wait_for(state='attached')
  handle=self.page.locator('iframe.ann2-gallery-frame').element_handle()
  frame=handle.content_frame();assert frame is not None
  frame.locator('.ann-gallery-card').nth(35).wait_for(state='attached')
  return frame
 def preview(self):
  handle=self.page.locator('iframe.ann2-frame').element_handle();frame=handle.content_frame();assert frame is not None
  frame.locator('#preview .ph').wait_for(state='attached')
  return frame
 def release_fonts(self):
  self.font_assets='real'
  while self.font_requests:
   request,target=self.font_requests.pop(0)
   request.fulfill(status=200,content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream',body=target.read_bytes())
 def close(self):self.page.close()

def chromium(pw):
 executable=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
 return pw.chromium.launch(**({'executable_path':executable} if executable else {}),headless=True,args=['--no-sandbox'])

def assert_js(page,expression):
 assert page.evaluate(expression),expression

def open_record(h,story_id='story-a'):
 p=h.page;p.get_by_role('tab',name='Опубликовано',exact=True).click()
 row=p.locator(f'[data-story-id="{story_id}"]')
 if not row.is_visible():
  details=p.locator('#ann2-published details').filter(has=row)
  if not details.count():details=p.locator('#ann2-published details').first
  details.locator('summary').click()
 row.get_by_role('button',name=re.compile(r'^(Открыть|Просмотр)$')).click()
 p.locator('#ann2-builder').wait_for(state='visible')
 return row

def select_design(h,design):
 h.gallery().locator(f'.ann-gallery-card[data-design="{design}"]').click()
 h.page.wait_for_function('(id)=>window.__ann2.current?.design===id',arg=design)

def command_calls(p):
 return p.evaluate("calls.filter(c=>c.name==='adminStoryAnnouncementCommand')")

def main():
 global SOURCE_PATH
 if len(sys.argv)>1:SOURCE_PATH=Path(sys.argv[1]).resolve()
 results=[]
 output=Path(os.environ.get('STORIES_TEST_OUTPUT',tempfile.gettempdir()))
 output.mkdir(parents=True,exist_ok=True)
 with sync_playwright() as pw:
  browser=chromium(pw)
  def check(name,fn,**options):
   h=None
   try:
    h=Harness(browser,**options);fn(h);assert not h.errors,h.errors
    results.append({'test':name,'passed':True});print('PASS',name,flush=True)
   except Exception as e:
    details=str(e);results.append({'test':name,'passed':False,'error':details})
    print('FAIL',name,' | '.join(details.splitlines()[:5]),flush=True)
    if h:
     try:h.page.screenshot(path=str(output/('failed-'+re.sub('[^a-z0-9]+','-',name.lower())+'.png')),full_page=True)
     except Exception:pass
   finally:
    if h:h.close()
  def catalogue(h):
   p=h.page;f=h.gallery()
   f.evaluate('async()=>{await document.fonts.ready}')
   f.wait_for_function('[...document.images].every(img=>img.complete && img.naturalWidth>0)')
   assert f.evaluate("document.fonts.check('800 16px Inter')")
   assert f.locator('.ann-gallery-card').count()==36
   assert f.locator('.ann-gallery-card:visible').count()==36
   assert len(set(f.locator('.ann-gallery-card').evaluate_all('(cards)=>cards.map(c=>c.dataset.design)')))==36
   assert f.locator('iframe').count()==0
   assert f.evaluate("document.getAnimations().filter(a=>a.playState==='running').length")==0
   assert f.evaluate('ST.players.length')==0
   assert len(command_calls(p))==0
  check('all 36 real templates are visible together without nested players',catalogue)
  def fallback(h):
   p=h.page;buttons=p.locator('.ann2-template-fallback button[data-design]')
   assert buttons.count()==36 and buttons.nth(35).is_visible()
   p.locator('.ann2-template-fallback button[data-design="quote"]').click()
   p.get_by_role('textbox',name='Заголовок',exact=True).fill('Offline preview still saves')
   p.get_by_role('button',name='Сохранить черновик',exact=True).click()
   p.wait_for_function("calls.some(c=>c.name==='adminStoryAnnouncementCommand')")
   assert command_calls(p)[0]['data']['content']['design']=='quote'
  check('all 36 fallback choices and draft saving work without renderer',fallback,renderer=False)
  def live_text(h):
   p=h.page;f=h.gallery();p.get_by_role('textbox',name='Заголовок',exact=True).fill('QA Marker 482')
   p.get_by_role('textbox',name='Метка',exact=True).fill('QA badge')
   p.get_by_role('textbox',name='Текст истории',exact=True).fill('QA body live')
   f.wait_for_function("[...document.querySelectorAll('.ann-gallery-card')].filter(c=>!['number','thanks'].includes(c.dataset.design)).every(c=>c.innerText.replace(/\\s+/g,' ').toLowerCase().includes('qa marker 482'))")
   preview=h.preview();preview.wait_for_function("document.querySelector('#preview').innerText.replace(/\\s+/g,' ').toLowerCase().includes('qa marker 482')")
   assert not command_calls(p)
   assert 'QA body live' in f.locator('.ann-gallery-card[data-design="manifest"]').inner_text()
  check('typing changes every applicable thumbnail and main preview without save',live_text)
  def selection(h):
   p=h.page;p.get_by_role('textbox',name='Заголовок',exact=True).fill('Keep typed title');select_design(h,'quote')
   assert p.get_by_role('textbox',name='Заголовок',exact=True).input_value()=='Keep typed title'
   selected=h.gallery().locator('.ann-gallery-card[aria-pressed="true"]')
   assert selected.count()==1 and selected.get_attribute('data-design')=='quote'
   p.get_by_role('button',name='Сохранить черновик',exact=True).click()
   p.wait_for_function("calls.some(c=>c.name==='adminStoryAnnouncementCommand')")
   assert command_calls(p)[0]['data']['content']['design']=='quote'
  check('clicking a thumbnail selects exactly one template and preserves typed text',selection)
  def navigation(h):
   p=h.page;p.get_by_role('textbox',name='Заголовок',exact=True).fill('Unsaved survives navigation')
   p.get_by_role('tab',name='Опубликовано',exact=True).click()
   assert p.locator('#ann2-published').is_visible() and not p.locator('#ann2-builder').is_visible()
   assert 'stories=published' in p.url and p.url.endswith('#stories')
   p.go_back();p.locator('#ann2-builder').wait_for(state='visible')
   assert p.get_by_role('textbox',name='Заголовок',exact=True).input_value()=='Unsaved survives navigation'
   assert 'stories=builder' in p.url
   assert not command_calls(p)
  check('published and builder are separate navigable pages with preserved edits',navigation)
  def legacy(h):
   p=h.page
   for selector in ['#legacy-test-status','#legacy-test-refresh','#legacy-test-header','#pm-story-editor']:
    assert not p.locator(selector).is_visible(),selector
   p.evaluate('async()=>{await Promise.all([loadStoryWorkspace(),loadStoryWorkspace(),loadStoryWorkspace(),loadStoryWorkspace()]);}')
   assert not any('old-editor-must-not-load' in url for url in h.requested)
   assert not p.locator('#pm-story-editor').get_attribute('srcdoc')
   assert p.locator('section.ann2').count()==1
  check('old editor and duplicate service blocks stay hidden and never boot',legacy)
  def login(h):
   p=h.page;assert_js(p,'calls.length===0');p.evaluate("login('user-a')");p.wait_for_function('__ann2.loaded')
   assert_js(p,'__ann2.rows.length===1')
  check('restored login loads saved stories',login,uid=None)
  def dedupe(h):
   p=h.page;p.get_by_role('tab',name='Опубликовано',exact=True).click()
   p.get_by_role('button',name='Обновить список',exact=True).click();p.get_by_role('button',name='Обновить список',exact=True).click()
   assert_js(p,"calls.filter(c=>c.name==='adminStoryAnnouncementsList').length===1")
  check('repeated refresh coalesces an in-flight request',dedupe,extra="listMode='hold';",wait_loaded=False)
  def malformed(h):
   open_record(h,'bad');assert_js(h.page,"__ann2.current.blocks[0].text==='' && __ann2.current.eventAtMs===null")
  check('malformed optional server fields do not crash opening a draft',malformed,extra="items=[{id:'bad',revision:2,status:'draft',content:{design:'manifest',title:5,blocks:[null,{text:3,size:12}],eventAtMs:'bad'}},{id:'ok',revision:2,status:'draft',content:{design:'manifest',title:'Valid',blocks:{}}}];")
  def bad_list(h):
   p=h.page;p.get_by_role('tab',name='Опубликовано',exact=True).click();p.evaluate("listMode='bad'")
   p.get_by_role('button',name='Обновить список',exact=True).click();p.wait_for_function('__ann2.error')
   assert_js(p,'__ann2.rows.length===1')
  check('invalid list response preserves existing saved rows',bad_list)
  def no_revision(h):
   open_record(h);p=h.page;p.evaluate("commandMode='bad'");p.get_by_role('button',name='Сохранить черновик',exact=True).click()
   p.wait_for_function('__ann2.error && !__ann2.busy');assert_js(p,'__ann2.current.revision===2')
  check('missing server revision cannot become fake save success',no_revision)
  def busy(h):
   open_record(h);p=h.page;p.evaluate("commandMode='hold'");p.get_by_role('button',name='Сохранить черновик',exact=True).click()
   assert_js(p,"__ann2.busy && [...document.querySelectorAll('.ann2-form input,.ann2-form textarea,.ann2-form select')].every(x=>x.disabled)")
   before=p.evaluate('__ann2.current.id')
   assert p.get_by_role('button',name='Новая история',exact=True).is_disabled()
   p.get_by_role('button',name='Новая история',exact=True).evaluate('(button)=>button.click()')
   assert p.evaluate('__ann2.current.id')==before
   selected=p.evaluate('__ann2.current.design');h.gallery().locator('.ann-gallery-card[data-design="quote"]').click(force=True)
   assert p.evaluate('__ann2.current.design')==selected
  check('in-flight save locks edits and template changes',busy)
  def published_lock(h):
   open_record(h);p=h.page
   assert_js(p,"[...document.querySelectorAll('.ann2-form input,.ann2-form textarea,.ann2-form select')].every(x=>x.disabled)")
   publish=p.get_by_role('button',name='Опубликовать',exact=True)
   assert publish.count()==0 or not publish.is_enabled()
   assert not command_calls(p)
  check('published story is read-only until stop',published_lock,extra="items[0].status='published';items[0].publishedAtMs=now-10000;items[0].expiresAtMs=now+86400000;")
  def expiry(h):
   p=h.page;p.get_by_role('tab',name='Опубликовано',exact=True).click()
   active=p.locator('[data-story-id="active"]');expired=p.locator('[data-story-id="expired"]')
   assert active.is_visible() and 'В показе' in active.inner_text()
   assert not expired.is_visible()
   p.locator('#ann2-published details').filter(has=expired).locator('summary').click()
   assert 'Показ завершён' in expired.inner_text() and 'В показе' not in expired.inner_text()
   expired.get_by_role('button',name='Открыть',exact=True).click()
   assert_js(p,"__ann2.current.status==='published' && [...document.querySelectorAll('.ann2-form input,.ann2-form textarea,.ann2-form select')].every(x=>x.disabled)")
   assert not command_calls(p)
  check('expired published stories are archived and remain locked until stop',expiry,extra="items=[{...items[0],id:'active',status:'published',publishedAtMs:now-2000,expiresAtMs:now+86400000},{...items[0],id:'expired',status:'published',publishedAtMs:now-86400000,expiresAtMs:now-1000}];")
  def stop_expired(h):
   p=h.page;p.get_by_role('tab',name='Опубликовано',exact=True).click();row=p.locator('[data-story-id="story-a"]')
   p.locator('#ann2-published details').filter(has=row).locator('summary').click()
   row.get_by_role('button',name='Вернуть в черновики',exact=True).click();p.wait_for_function("calls.some(c=>c.name==='adminStoryAnnouncementCommand')")
   assert command_calls(p)[0]['data']['action']=='stop' and command_calls(p)[0]['data']['expectedRevision']==2
   p.wait_for_function("items[0].status==='draft' && items[0].revision===3")
  check('returning expired story to drafts uses the existing stop contract',stop_expired,extra="items[0].status='published';items[0].publishedAtMs=now-86400000;items[0].expiresAtMs=now-1000;")
  def logout(h):
   open_record(h);p=h.page;p.evaluate('login(null)')
   assert_js(p,'__ann2.rows.length===0')
   assert all(value!='Original' for value in p.locator('.ann2-form input').evaluate_all('(xs)=>xs.map(x=>x.value)'))
   assert not command_calls(p)
  check('logout clears previously opened private content',logout)
  def stale(h):
   p=h.page;p.evaluate("login('user-b');holds.list[0]({data:{items:[{id:'private-a',content:{title:'Secret'}}]}})")
   p.wait_for_timeout(30);assert_js(p,"!__ann2.rows.some(x=>x.id==='private-a')")
  check('late prior-account list response is ignored',stale,extra="listMode='hold';",wait_loaded=False)
  def overlong(h):
   open_record(h);p=h.page;p.evaluate("__ann2.current.blocks[0].text='x'.repeat(261)")
   p.get_by_role('button',name='Сохранить черновик',exact=True).click();assert_js(p,'__ann2.error')
   assert not command_calls(p)
  check('overlong content is rejected instead of silently truncated',overlong)
  def save(h):
   open_record(h);p=h.page;p.get_by_role('textbox',name='Заголовок',exact=True).fill('Changed title')
   p.get_by_role('button',name='Сохранить черновик',exact=True).click();p.wait_for_function('__ann2.current.revision===3 && !__ann2.busy')
   call=command_calls(p)[0];assert call['data']['expectedRevision']==2 and call['data']['content']['title']=='Changed title'
   assert 'Черновик сохранён' in p.inner_text('section.ann2')
  check('save confirms server revision and keeps the success result',save)
  def retry(h):
   open_record(h);p=h.page;p.evaluate("commandMode='error'");p.get_by_role('button',name='Сохранить черновик',exact=True).click()
   p.wait_for_function('__ann2.error && !__ann2.busy');p.evaluate("commandMode='ok'");p.get_by_role('button',name='Сохранить черновик',exact=True).click()
   p.wait_for_function('__ann2.current.revision===3')
  check('failed save unlocks form for a confirmed retry',retry)
  def cancelled(h):
   open_record(h);p=h.page;p.evaluate('confirmAnswer=false');p.get_by_role('button',name='Опубликовать',exact=True).click()
   assert not command_calls(p) and p.evaluate('confirmations.length')==1
  check('cancelled publish sends no command',cancelled)
  def poll(h):
   select_design(h,'poll');assert h.page.get_by_role('button',name='Опубликовать',exact=True).is_disabled()
   assert not command_calls(h.page)
  check('poll publishing gate is retained',poll)
  def scope_before_send(h):
   open_record(h);p=h.page;p.evaluate("window.getAdminSensitiveControlCallable=name=>name==='adminStoryAnnouncementCommand'?new Promise(resolve=>window.resolveCallable=resolve):__pmAdminCore.httpsCallable({},name)")
   p.get_by_role('button',name='Сохранить черновик',exact=True).click();p.wait_for_function('typeof resolveCallable===\"function\"')
   p.evaluate("login('user-b');resolveCallable(__pmAdminCore.httpsCallable({},'adminStoryAnnouncementCommand'))")
   p.wait_for_timeout(30);assert not command_calls(p)
  check('account change before callable resolution cancels write',scope_before_send)
  def refresh_dirty(h):
   open_record(h);p=h.page;p.get_by_role('textbox',name='Заголовок',exact=True).fill('Preserve local change')
   p.get_by_role('tab',name='Опубликовано',exact=True).click();p.get_by_role('button',name='Обновить список',exact=True).click()
   p.get_by_role('tab',name='Конструктор',exact=True).click()
   assert p.get_by_role('textbox',name='Заголовок',exact=True).input_value()=='Preserve local change'
   assert not command_calls(p)
  check('refresh and page switching never replace unsaved changes',refresh_dirty)
  def forged_message(h):
   p=h.page;h.gallery();before=p.evaluate('__ann2.current.design')
   p.evaluate("window.postMessage({channel:'pm-ann-gallery-select',design:'quote'},location.origin)")
   p.wait_for_timeout(30);assert p.evaluate('__ann2.current.design')==before
  check('parent ignores a forged template selection from another window',forged_message)
  def scheduled(h):
   p=h.page;p.get_by_role('tab',name='Опубликовано',exact=True).click();row=p.locator('[data-story-id="story-a"]')
   if not row.is_visible():p.locator('#ann2-published details').filter(has=row).locator('summary').click()
   assert 'Запланировано' in row.inner_text() and 'В показе' not in row.inner_text()
   assert not command_calls(p)
  check('future publication is not mislabelled as currently visible',scheduled,extra="items[0].status='published';items[0].publishedAtMs=now+86400000;items[0].expiresAtMs=now+172800000;")
  def copy_published(h):
   p=h.page;p.get_by_role('tab',name='Опубликовано',exact=True).click();row=p.locator('[data-story-id="story-a"]')
   row.get_by_role('button',name='Создать копию',exact=True).click()
   p.locator('#ann2-builder').wait_for(state='visible')
   assert p.get_by_role('textbox',name='Заголовок',exact=True).input_value()=='Original'
   assert p.get_by_role('textbox',name='Заголовок',exact=True).is_enabled()
   assert_js(p,"__ann2.current.id!=='story-a' && __ann2.current.revision===0 && __ann2.current.status==='draft' && items.length===1 && items[0].status==='published' && items[0].revision===2")
   assert not command_calls(p)
  check('copy creates a fresh editable draft without mutating the publication',copy_published,extra="items[0].status='published';items[0].publishedAtMs=now-10000;items[0].expiresAtMs=now+86400000;")
  def leave_stories(h):
   p=h.page;h.gallery()
   p.evaluate("document.querySelector('#tab-stories').classList.remove('active');location.hash='control-panel';document.dispatchEvent(new CustomEvent('pm:section-opened',{detail:{tab:'control-panel'}}));")
   assert not p.locator('#tab-stories').is_visible()
   assert p.locator('#tab-stories').evaluate('(el)=>getComputedStyle(el).display')=='none'
   assert not command_calls(p)
  check('leaving Stories lets the admin shell hide the entire workspace',leave_stories)
  def auth_without_observer(h):
   open_record(h);p=h.page;p.get_by_role('textbox',name='Заголовок',exact=True).fill('Private text from account A')
   p.evaluate("__pmAdminCore.auth.currentUser={uid:'user-b'};[...document.querySelectorAll('button')].find(b=>b.textContent==='Сохранить черновик').click();")
   p.wait_for_timeout(50)
   assert not command_calls(p),'A stale account-A draft was sent under account B'
   assert p.evaluate('__ann2.current?.title')!='Private text from account A'
  check('identity change before auth callback cannot send the previous draft',auth_without_observer)
  def stale_list_after_save(h):
   open_record(h);p=h.page;p.get_by_role('textbox',name='Заголовок',exact=True).fill('NEW confirmed title')
   p.evaluate("beforeSaveRows=JSON.parse(JSON.stringify(items));listMode='hold'")
   p.get_by_role('tab',name='Опубликовано',exact=True).click();p.get_by_role('button',name='Обновить список',exact=True).click()
   p.wait_for_function('holds.list?.length===1');p.get_by_role('tab',name='Конструктор',exact=True).click()
   p.get_by_role('button',name='Сохранить черновик',exact=True).click()
   p.wait_for_function('items[0].revision===3')
   p.evaluate("listMode='ok';holds.list[0]({data:{items:beforeSaveRows}});if(holds.list[1])holds.list[1]({data:{items:JSON.parse(JSON.stringify(items))}})")
   p.wait_for_function('!__ann2.busy')
   assert p.get_by_role('textbox',name='Заголовок',exact=True).input_value()=='NEW confirmed title'
   assert_js(p,"__ann2.current.revision===3 && __ann2.current.title==='NEW confirmed title'")
   assert len(command_calls(p))==1
  check('late pre-save list response cannot roll back confirmed title or revision',stale_list_after_save)
  def stop_same_dirty(h):
   open_record(h);p=h.page;p.get_by_role('textbox',name='Заголовок',exact=True).fill('MY UNSAVED TEXT')
   p.evaluate("items[0]={...items[0],revision:3,status:'published',publishedAtMs:Date.now()-1000,expiresAtMs:Date.now()+86400000,content:{...items[0].content,title:'REMOTE PUBLICATION'}}")
   p.get_by_role('tab',name='Опубликовано',exact=True).click();p.get_by_role('button',name='Обновить список',exact=True).click()
   p.wait_for_function('__ann2.rows.some(r=>r.id===\"story-a\" && r.revision===3)')
   p.locator('[data-story-id="story-a"]').get_by_role('button',name='Снять с показа',exact=True).click()
   p.wait_for_function('!__ann2.busy && items[0].revision===4')
   p.get_by_role('tab',name='Конструктор',exact=True).click()
   assert p.get_by_role('textbox',name='Заголовок',exact=True).input_value()=='MY UNSAVED TEXT'
   assert_js(p,"__ann2.current.revision===4 && __ann2.current.status==='draft' && __ann2.dirty")
   assert command_calls(p)[0]['data']['expectedRevision']==3
   p.get_by_role('button',name='Сохранить черновик',exact=True).click();p.wait_for_function('__ann2.current.revision===5 && !__ann2.busy')
   assert command_calls(p)[1]['data']['expectedRevision']==4
   assert command_calls(p)[1]['data']['content']['title']=='MY UNSAVED TEXT'
  check('stopping a remotely published same-id story preserves local unsaved text',stop_same_dirty)
  def stop_other_dirty(h):
   open_record(h);p=h.page;p.get_by_role('textbox',name='Заголовок',exact=True).fill('LOCAL DRAFT A')
   p.get_by_role('tab',name='Опубликовано',exact=True).click()
   p.locator('[data-story-id="story-b"]').get_by_role('button',name='Снять с показа',exact=True).click()
   p.wait_for_function('!__ann2.busy && items.some(x=>x.id===\"story-b\" && x.revision===6)')
   p.get_by_role('tab',name='Конструктор',exact=True).click()
   assert p.get_by_role('textbox',name='Заголовок',exact=True).input_value()=='LOCAL DRAFT A'
   assert_js(p,"__ann2.current.id==='story-a' && __ann2.current.revision===2 && __ann2.dirty")
   calls=command_calls(p);assert len(calls)==1 and calls[0]['data']['id']=='story-b'
  check('stopping another publication never replaces the current dirty draft',stop_other_dirty,extra="items.push({...items[0],id:'story-b',revision:5,status:'published',publishedAtMs:now-1000,expiresAtMs:now+86400000,content:{...items[0].content,title:'Story B'}})")
  browser.close()
 report=output/'stories-editor-regression-results.json';report.write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print(f'{sum(r["passed"] for r in results)}/{len(results)} passed; {report}')
 return 0 if all(r['passed'] for r in results) else 1

if __name__=='__main__':raise SystemExit(main())
