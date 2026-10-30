"""Offline responsive checks for the real Stories builder and its 36-card gallery."""
import json, os, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from admin_stories_regression import Harness, chromium

OUT=Path(os.environ.get('STORIES_TEST_OUTPUT',tempfile.gettempdir()))
OUT.mkdir(parents=True,exist_ok=True)
results=[];title_results=[]
TITLE_GEOMETRY=r'''(selector)=>{
 const root=document.querySelector(selector),body=root.querySelector('.pbody'),box=body.getBoundingClientRect();
 const lines=[...root.querySelectorAll('.mani .ln span')].map(el=>{const range=document.createRange();range.selectNodeContents(el);const b=range.getBoundingClientRect();return {text:el.textContent,font:getComputedStyle(el).fontSize,left:b.left,right:b.right,top:b.top,bottom:b.bottom}});
 return {box:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},lines,inter:document.fonts.check('800 16px Inter')};
}'''
TITLE_SAME=r'''({selector,title})=>[...document.querySelectorAll(selector+' .mani .ln span')].map(el=>el.textContent).join('').replace(/\s+/gu,'')===title.replace(/\s+/gu,'')'''
TITLE_ORDINARY='Один текст во всех 36 шаблонах'
def title_measure(h,title,label):
 h.page.get_by_role('textbox',name='Заголовок',exact=True).fill(title)
 metric={'case':label,'title':title}
 for key,frame,selector in [('main',h.preview(),'#preview'),('gallery',h.gallery(),'.ann-gallery-card[data-design="manifest"]')]:
  frame.wait_for_function(TITLE_SAME,arg={'selector':selector,'title':title})
  value=frame.evaluate(TITLE_GEOMETRY,selector);box=value['box'];lines=value['lines']
  assert ''.join(''.join(line['text'].split()) for line in lines)==''.join(title.split()),value
  assert all(line['left']>=box['left']-1 and line['right']<=box['right']+1 and line['top']>=box['top']-1 and line['bottom']<=box['bottom']+1 for line in lines),value
  metric[key]=value
 title_results.append(metric)
 return metric
with sync_playwright() as pw:
 browser=chromium(pw)
 for width in [2048,1662,1280,1024,768,390,320]:
  h=Harness(browser,width=width);p=h.page
  p.get_by_role('textbox',name='Заголовок',exact=True).fill('Один текст во всех 36 шаблонах')
  p.get_by_role('textbox',name='Текст истории',exact=True).fill('Меняем текст и сразу видим результат')
  f=h.gallery();preview=h.preview()
  f.evaluate('async()=>{await document.fonts.ready}');preview.evaluate('async()=>{await document.fonts.ready}')
  f.wait_for_function('[...document.images].every(img=>img.complete && img.naturalWidth>0)')
  f.wait_for_function("document.querySelector('.ann-gallery-card[data-design=quote]').innerText.includes('Один текст')")
  p.wait_for_timeout(150)
  d=p.evaluate('''()=>{
   const main=document.querySelector('.ann2-frame'),gallery=document.querySelector('.ann2-gallery-frame');
   const phone=main.parentElement, region=document.querySelector('.ann2');
   return {viewportWidth:innerWidth,iframeWidth:main.clientWidth,iframeHeight:main.clientHeight,frameRect:main.getBoundingClientRect().width,phoneWidth:phone.clientWidth,galleryWidth:gallery.clientWidth,galleryHeight:gallery.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,build:region.dataset.storiesBuild,legacyVisible:[...document.querySelectorAll('#legacy-test-status,#legacy-test-refresh,#legacy-test-header,#pm-story-editor')].some(x=>x.getBoundingClientRect().width>0&&x.getBoundingClientRect().height>0)};
  }''')
  d.update(gallery=f.evaluate('''()=>({cards:document.querySelectorAll('.ann-gallery-card').length,visible:[...document.querySelectorAll('.ann-gallery-card')].filter(x=>x.getBoundingClientRect().width>0&&x.getBoundingClientRect().height>0).length,overflow:document.documentElement.scrollWidth>innerWidth+1,contentHeight:document.documentElement.scrollHeight,animations:document.getAnimations().filter(a=>a.playState==='running').length})'''),
           preview=preview.evaluate(r'''()=>({viewport:innerWidth,phoneWidth:document.querySelector('#preview .ph').getBoundingClientRect().width,text:document.querySelector('#preview').innerText.replace(/\s+/g,' ').toLowerCase()})'''),errors=h.errors)
  assert d['iframeWidth']==412 and d['iframeHeight']==866,d
  assert abs(d['frameRect']-d['phoneWidth'])<1,d
  assert d['preview']['viewport']==412 and d['preview']['phoneWidth']==390,d
  assert 'одинтекствовсех36шаблонах' in ''.join(d['preview']['text'].split()),d
  assert not d['overflow'] and not d['legacyVisible'] and not d['gallery']['overflow'],d
  assert d['gallery']['cards']==36 and d['gallery']['visible']==36,d
  assert d['gallery']['contentHeight']<=d['galleryHeight']+2,d
  assert d['gallery']['animations']==0 and not d['errors'],d
  if width in [2048,1662,390]:p.screenshot(path=str(OUT/f'stories-builder-{width}.png'),full_page=True)
  results.append(d);print(json.dumps({k:v for k,v in d.items() if k!='preview'},ensure_ascii=False),flush=True)
  h.close()
 for font_mode in ['real','blocked']:
  h=Harness(browser,font_assets=font_mode)
  h.preview().evaluate('async()=>{await document.fonts.ready}');h.gallery().evaluate('async()=>{await document.fonts.ready}')
  titles=[('ordinary',TITLE_ORDINARY)]+[(f'{kind}-{n}',(token*n)[:n]) for kind,token in [('wide','Ш'),('cjk','漢'),('mixed','Ж漢ЙÉ')] for n in [30,80,110]]
  for label,title in titles:
   metric=title_measure(h,title,font_mode+'-'+label)
   if label=='ordinary':
    for key in ['main','gallery']:assert any(line['text']=='шаблонах' or line['text'].endswith(' шаблонах') for line in metric[key]['lines']),metric
   print('PASS title geometry',font_mode,label,flush=True)
  assert not h.errors,h.errors
  h.close()
 h=Harness(browser,font_assets='hold')
 title_measure(h,TITLE_ORDINARY,'delayed-font-before-release')
 assert h.font_requests
 selected=h.page.evaluate('__ann2.current.design');content=h.page.evaluate('__ann2.current.title')
 h.release_fonts();h.preview().evaluate('async()=>{await document.fonts.ready}');h.gallery().evaluate('async()=>{await document.fonts.ready}')
 h.page.wait_for_timeout(100)
 baseline=next(item for item in title_results if item['case']=='real-ordinary')
 delayed={'case':'delayed-font-after-release'}
 for key,frame,selector in [('main',h.preview(),'#preview'),('gallery',h.gallery(),'.ann-gallery-card[data-design="manifest"]')]:
  value=frame.evaluate(TITLE_GEOMETRY,selector);delayed[key]=value
  assert value['inter'],value
  assert [(line['text'],line['font']) for line in value['lines']]==[(line['text'],line['font']) for line in baseline[key]['lines']],{'baseline':baseline,'delayed':delayed}
 assert h.page.evaluate('__ann2.current.design')==selected and h.page.evaluate('__ann2.current.title')==content
 assert not h.errors,h.errors
 title_results.append(delayed);print('PASS delayed font reflow preserves content, selection and final line breaks',flush=True)
 h.close()
 browser.close()
(OUT/'layout-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
(OUT/'title-fit-results.json').write_text(json.dumps(title_results,ensure_ascii=False,indent=2))
print(f'{len(results)}/7 responsive layouts passed')
print('20/20 title geometry cases and 1/1 delayed font reflow passed')
