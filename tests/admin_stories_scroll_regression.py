"""Focused offline acceptance for full-size templates inside the actual fixed shell."""
import json, os, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from admin_stories_regression import Harness, chromium, command_calls

OUT=Path(os.environ.get('STORIES_TEST_OUTPUT',tempfile.gettempdir()))
OUT.mkdir(parents=True,exist_ok=True)
WIDTHS=[int(value) for value in os.environ.get('STORIES_SCROLL_WIDTHS','1662,1024,390').split(',')]

def scroll_metrics(page):
 return page.evaluate('''()=>{
  const tab=document.querySelector('#tab-stories'),b=tab.getBoundingClientRect();
  return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,scrollTop:tab.scrollTop,scrollHeight:tab.scrollHeight,clientHeight:tab.clientHeight,clientWidth:tab.clientWidth,scrollWidth:tab.scrollWidth,overflowY:getComputedStyle(tab).overflowY,bodyOverflow:getComputedStyle(document.body).overflow,documentY:document.scrollingElement.scrollTop,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,viewportHeight:innerHeight};
 }''')

def visible_point(page,locator):
 box=locator.bounding_box();clip=scroll_metrics(page)
 if not box:return None
 top=max(box['y'],clip['top'],0);bottom=min(box['y']+box['height'],clip['bottom'],clip['viewportHeight'])
 left=max(box['x'],clip['left']);right=min(box['x']+box['width'],clip['right'])
 if bottom-top<24 or right-left<12:return None
 return ((left+right)/2,(top+bottom)/2)

def wheel(page,x,y,delta):
 before=scroll_metrics(page)['scrollTop']
 page.mouse.move(x,y);page.mouse.wheel(0,delta)
 page.wait_for_function('({before,delta})=>(document.querySelector("#tab-stories").scrollTop-before)*Math.sign(delta)>5',arg={'before':before,'delta':delta},timeout=2500)
 page.wait_for_timeout(60)
 return scroll_metrics(page)['scrollTop']-before

def reach_by_wheel(page,target,x=None):
 steps=0
 while not visible_point(page,target):
  clip=scroll_metrics(page)
  point_x=x if x is not None else clip['left']+5
  box=target.bounding_box();assert box
  delta=min(3000,max(120,box['y']-clip['bottom']+100)) if box['y']>=clip['bottom']-24 else -min(3000,max(120,clip['top']-(box['y']+box['height'])+100))
  wheel(page,point_x,min(clip['bottom'],clip['viewportHeight'])-40,delta)
  steps+=1
  assert steps<=30,'A visible wheel gesture could not reach the requested card'
 return steps

results=[]
with sync_playwright() as pw:
 browser=chromium(pw)
 for width in WIDTHS:
  h=Harness(browser,width=width,height=850,shell_mode='fixed');p=h.page
  try:
   title='Текст сохранится при выборе 36-го шаблона'
   p.get_by_role('textbox',name='Заголовок',exact=True).fill(title)
   gallery=h.gallery();gallery.evaluate('async()=>{await document.fonts.ready}')
   gallery.wait_for_function('[...document.images].every(img=>img.complete && img.naturalWidth>0)')
   cards=gallery.locator('.ann-gallery-card');assert cards.count()==36
   p.wait_for_timeout(100)
   geometry=gallery.evaluate('''()=>({height:document.documentElement.scrollHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('#ann-gallery')).gridTemplateColumns.split(' ').length,phones:[...document.querySelectorAll('.ann-gallery-thumb .ph')].map(el=>{const b=el.getBoundingClientRect();return {width:b.width,height:b.height,scale:new DOMMatrixReadOnly(getComputedStyle(el).transform).a}})})''')
   iframe_height=p.locator('iframe.ann2-gallery-frame').evaluate('(el)=>el.clientHeight')
   assert len(geometry['phones'])==36 and geometry['height']<=iframe_height+2,geometry
   assert geometry['scrollWidth']<=geometry['width']+1,geometry
   if width>=769:
    assert all(abs(phone['width']-390)<=1 and abs(phone['height']-844)<=1 and abs(phone['scale']-1)<.01 for phone in geometry['phones']),geometry
   else:
    assert all(0<phone['width']<=390 and phone['scale']<=1.001 for phone in geometry['phones']),geometry
   if width==1662:assert geometry['columns']==3,geometry
   if width==1024:assert geometry['columns']==1 and geometry['height']>22000,geometry
   initial=scroll_metrics(p)
   assert initial['viewportHeight']==850 and initial['bottom']<=851 and initial['clientHeight']>200,initial
   assert initial['overflowY']=='auto' and initial['scrollHeight']>initial['clientHeight'],initial
   assert initial['documentWidth']<=width+1 and initial['scrollWidth']<=initial['clientWidth']+1,initial
   if width>=769:assert initial['bodyOverflow']=='hidden' and initial['documentY']==0,initial
   first=cards.first.locator('.ph');reach_by_wheel(p,first)
   p.screenshot(path=str(OUT/f'stories-large-first-{width}.png'))
   phone_point=visible_point(p,first);phone_delta=wheel(p,*phone_point,500)
   box1=cards.nth(0).bounding_box();box2=cards.nth(1).bounding_box()
   iframe_box=p.locator('iframe.ann2-gallery-frame').bounding_box();clip=scroll_metrics(p)
   gap_x=(box1['x']+box1['width']+box2['x'])/2 if geometry['columns']>=2 else iframe_box['x']+1
   gap_delta=wheel(p,gap_x,(clip['top']+min(clip['bottom'],850))/2,400)
   last=cards.nth(35);last_design=last.get_attribute('data-design')
   last_steps=reach_by_wheel(p,last,x=phone_point[0])
   assert visible_point(p,last), 'Card 36 must already be visible before clicking, without locator auto-scroll'
   last_point=visible_point(p,last);p.mouse.click(*last_point)
   p.wait_for_function('(design)=>__ann2.current.design===design',arg=last_design)
   assert last.get_attribute('aria-pressed')=='true'
   assert p.get_by_role('textbox',name='Заголовок',exact=True).input_value()==title
   assert not command_calls(p) and not h.errors,(command_calls(p),h.errors)
   final=scroll_metrics(p)
   assert final['documentWidth']<=width+1 and final['scrollWidth']<=final['clientWidth']+1,final
   assert not p.locator('#legacy-test-refresh').is_visible()
   result={'width':width,'height':850,'columns':geometry['columns'],'phone':geometry['phones'][0],'galleryHeight':geometry['height'],'iframeHeight':iframe_height,'wheelOverPhoneDelta':phone_delta,'wheelOverGapDelta':gap_delta,'wheelStepsTo36':last_steps,'selected':last_design,'initial':initial,'final':final}
   results.append(result);print(json.dumps(result,ensure_ascii=False),flush=True)
   (OUT/f'scroll-results-{width}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
   p.screenshot(path=str(OUT/f'stories-large-card36-{width}.png'))
  except Exception:
   p.screenshot(path=str(OUT/f'stories-large-scroll-failed-{width}.png'))
   raise
  finally:h.close()
 browser.close()
(OUT/'scroll-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(f'{len(results)}/{len(WIDTHS)} full-size gallery and real wheel scenarios passed')
