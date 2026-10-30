"""Offline Stories layout regression using the real preview and mocked Firebase."""
import json, os, shutil, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=(Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/'admin/v2').resolve()
WORK=Path(os.environ.get('STORIES_TEST_OUTPUT',tempfile.gettempdir()))
WORK.mkdir(parents=True,exist_ok=True)
BOOT='''window.__pmAdminCore={app:{options:{projectId:'test'}},auth:{currentUser:{uid:'test-owner'},onIdTokenChanged(fn){return ()=>{};}},functionsUs:{},httpsCallable(_f,name){return async data=>({data:{items:[{id:'legacy-story',revision:2,status:'published',content:{templateId:'focus',title:'Мы полностью переосмыслили дизайн PhraseMan',badge:'ОБНОВЛЕНИЕ',blocks:[{text:'Новая версия уже у вас',size:16,style:'normal'}]}}]}})}}; window.confirm=()=>true;'''
PREVIEW=(ROOT/'scripts/pages/story_announcements_v2_preview.html').read_text().replace('<body>', '<body class="preview">')
PREVIEW=PREVIEW.replace('<link rel="stylesheet" href="../../assets/stories_v2/kit.css">', '<style>'+(ROOT/'assets/stories_v2/kit.css').read_text()+'</style>')
PREVIEW=PREVIEW.replace('<script src="../../assets/stories_v2/spire-tower-render.js"></script>', '<script>'+(ROOT/'assets/stories_v2/spire-tower-render.js').read_text()+'</script>')
HTML='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
*{box-sizing:border-box}body{margin:0;background:#0b1915;color:#e3efeb;font:14px/1.5 system-ui,sans-serif;--pm-surface:#152b25;--pm-card:#1b382e;--pm-muted:#a2bdb2;--pm-accent:#8fd3a8}#admin-app{margin-left:168px;padding:32px}.reports-tab{width:100%;min-width:0}input,select,textarea{max-width:100%}
img,canvas,svg,video,iframe{max-width:100%;height:auto}
body.pm-phase6-ready [id^="tab-"] :where(canvas,svg,img,video,iframe){max-width:100%}
@media(max-width:800px){#admin-app{margin-left:0;padding:16px}}
</style></head><body class="pm-phase6-ready"><main id="admin-app"><section id="tab-stories" class="reports-tab"></section></main><script>BOOT</script><script src="scripts/pages/story_announcements_v2.js"></script></body></html>'''.replace('BOOT',BOOT)
all_results=[]
with sync_playwright() as pw:
 executable=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
 b=pw.chromium.launch(**({'executable_path':executable} if executable else {}),headless=True,args=['--no-sandbox'])
 for mode in ['after']:
  for width in [1562,1280,1024,768,640,390,320]:
   p=b.new_page(viewport={'width':width,'height':960},reduced_motion='reduce'); errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.route('**/*',lambda r:r.fulfill(status=404,body='offline'))
   p.set_content(HTML.replace('<script src="scripts/pages/story_announcements_v2.js"></script>',''))
   script=ROOT/'scripts/pages/story_announcements_v2.js'
   style=ROOT/'scripts/pages/story_announcements_v2.css'
   p.add_style_tag(content=style.read_text());p.add_script_tag(content=script.read_text())
   p.wait_for_function('window.__ann2?.loaded')
   p.evaluate('(html)=>document.querySelector(".ann2-frame").srcdoc=html',PREVIEW)
   p.wait_for_function('window.__ann2?.previewReady')
   p.wait_for_timeout(300)
   d=p.evaluate('''()=>{const f=document.querySelector('.ann2-frame'),phone=document.querySelector('.ann2-phone'),body=f.contentDocument;return {viewportWidth:innerWidth,iframeViewport:f.contentWindow.innerWidth,iframeWidth:f.clientWidth,iframeHeight:f.clientHeight,phoneWidth:phone.clientWidth,frameRect:f.getBoundingClientRect().width,phoneRect:body.querySelector('.ph').getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth+1,selected:window.__ann2.current?.id,build:document.querySelector('.ann2').dataset.storiesBuild,previewText:body.querySelector('#preview').innerText}}''')
   d.update(mode=mode,width=width,errors=errors)
   if width==1562:p.screenshot(path=str(WORK/f'stories-{mode}.png'),full_page=True)
   if mode=='after':
    assert d['iframeViewport']==412,d
    assert d['iframeHeight']==866,d
    assert d['phoneRect']==390,d
    assert abs(d['frameRect']-d['phoneWidth'])<1,d
    assert d['selected']=='legacy-story',d
    assert not d['overflow'],d
    assert not errors,d
    assert 'мы полностью' in d['previewText'].lower(),d
   all_results.append(d);print(json.dumps({k:v for k,v in d.items() if k!='previewText'},ensure_ascii=False),flush=True)
   p.close()
 b.close()
(WORK/'layout-results.json').write_text(json.dumps(all_results,ensure_ascii=False,indent=2))
