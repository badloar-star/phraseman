"""Offline acceptance for the fullscreen Stories picker inside the fixed admin shell."""
import json
import os
import re
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright
from admin_stories_regression import Harness, chromium, command_calls

OUT = Path(os.environ.get('STORIES_TEST_OUTPUT', tempfile.gettempdir()))
OUT.mkdir(parents=True, exist_ok=True)
FILTER = os.environ.get('STORIES_PICKER_TEST_FILTER', '')
DIALOG = '#ann2-template-picker'
SCROLLER = '.ann2-picker-body'


def opener(page):
    return page.get_by_role('button', name='Выбрать шаблон', exact=True)


def open_picker(h):
    opener(h.page).click()
    h.page.locator(DIALOG).wait_for(state='visible')
    assert opener(h.page).get_attribute('aria-expanded') == 'true'
    return h.gallery()


def closed(page):
    page.locator(DIALOG).wait_for(state='hidden')
    assert opener(page).get_attribute('aria-expanded') == 'false'


def scroll_metrics(page):
    return page.locator(SCROLLER).evaluate('''el => {
      const b=el.getBoundingClientRect();
      return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,
        scrollTop:el.scrollTop,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,
        clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,
        overflowY:getComputedStyle(el).overflowY,viewportHeight:innerHeight};
    }''')


def visible_point(page, locator):
    box = locator.bounding_box()
    clip = scroll_metrics(page)
    if not box:
        return None
    top = max(box['y'], clip['top'], 0)
    bottom = min(box['y'] + box['height'], clip['bottom'], clip['viewportHeight'])
    left = max(box['x'], clip['left'])
    right = min(box['x'] + box['width'], clip['right'])
    if bottom - top < 24 or right - left < 12:
        return None
    return ((left + right) / 2, (top + bottom) / 2)


def wheel(page, x, y, delta):
    before = scroll_metrics(page)['scrollTop']
    page.mouse.move(x, y)
    page.mouse.wheel(0, delta)
    page.wait_for_function('''({before,delta,selector}) =>
      (document.querySelector(selector).scrollTop-before)*Math.sign(delta)>5''',
      arg={'before': before, 'delta': delta, 'selector': SCROLLER}, timeout=2500)
    page.wait_for_timeout(60)
    return scroll_metrics(page)['scrollTop'] - before


def reach_by_wheel(page, target, x):
    steps = 0
    while not visible_point(page, target):
        clip = scroll_metrics(page)
        box = target.bounding_box()
        assert box
        delta = (min(3000, max(120, box['y'] - clip['bottom'] + 100))
                 if box['y'] >= clip['bottom'] - 24
                 else -min(3000, max(120, clip['top'] - box['y'] - box['height'] + 100)))
        wheel(page, x, min(clip['bottom'], clip['viewportHeight']) - 40, delta)
        steps += 1
        assert steps <= 35, 'A real wheel gesture must reach template 36'
    return steps


def geometry(frame):
    return frame.evaluate('''() => ({
      height:document.documentElement.scrollHeight,width:innerWidth,
      scrollWidth:document.documentElement.scrollWidth,
      columns:getComputedStyle(document.querySelector('#ann-gallery')).gridTemplateColumns.split(' ').length,
      phones:[...document.querySelectorAll('.ann-gallery-thumb .ph')].map(el=>{
        const b=el.getBoundingClientRect();
        return {width:b.width,height:b.height,scale:new DOMMatrixReadOnly(getComputedStyle(el).transform).a};
      })
    })''')


def main_workspace(h):
    p = h.page
    assert not p.locator(DIALOG).is_visible()
    assert opener(p).is_visible() and opener(p).get_attribute('aria-haspopup') == 'dialog'
    title = 'Мой текст в примерочной'
    p.get_by_role('textbox', name='Заголовок', exact=True).fill(title)
    p.get_by_role('textbox', name='Текст истории', exact=True).fill('Меняется сразу при вводе.')
    h.preview().wait_for_function(r'''title =>
      document.querySelector('#preview').innerText.replace(/\s+/g,' ').toLowerCase().includes(title.toLowerCase())''', arg=title)
    metrics = p.evaluate('''() => {
      const box=selector=>{const b=document.querySelector(selector).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right}};
      return {form:box('.ann2-form'),phone:box('.ann2-phone'),opener:box('[aria-haspopup="dialog"]'),
        scrollTop:document.querySelector('#tab-stories').scrollTop,
        scrollWidth:document.documentElement.scrollWidth,width:innerWidth,height:innerHeight};
    }''')
    assert metrics['form']['right'] <= metrics['phone']['x'] + 1, metrics
    assert metrics['phone']['y'] >= 68 and metrics['phone']['bottom'] <= 851, metrics
    assert metrics['phone']['width'] >= 200, metrics
    assert metrics['scrollTop'] == 0 and metrics['scrollWidth'] <= metrics['width'] + 1, metrics
    p.screenshot(path=str(OUT / 'stories-picker-main-1662.png'))
    return metrics


def gallery_acceptance(h, width, expected_columns):
    p = h.page
    title = 'Макет с моим текстом'
    body = 'Этот текст уже введён до открытия галереи.'
    p.get_by_role('textbox', name='Заголовок', exact=True).fill(title)
    p.get_by_role('textbox', name='Текст истории', exact=True).fill(body)
    opener(p).scroll_into_view_if_needed()
    before = p.locator('#tab-stories').evaluate('(el)=>el.scrollTop')
    frame = open_picker(h)
    frame.evaluate('async()=>{await document.fonts.ready}')
    frame.wait_for_function(r'''title => [...document.querySelectorAll('.ann-gallery-card')]
      .filter(c=>!['number','thanks'].includes(c.dataset.design))
      .every(c=>c.innerText.replace(/\s+/g,' ').toLowerCase().includes(title.toLowerCase()))''', arg=title)
    cards = frame.locator('.ann-gallery-card')
    assert cards.count() == 36
    assert len(set(cards.evaluate_all('(cards)=>cards.map(c=>c.dataset.design)'))) == 36
    assert body in frame.locator('[data-design="manifest"]').inner_text()
    frame.wait_for_function('[...document.images].every(img=>img.complete && img.naturalWidth>0)')
    p.wait_for_timeout(100)
    bounds = p.locator(DIALOG).bounding_box()
    assert bounds and abs(bounds['x']) <= 1 and abs(bounds['y']) <= 1, bounds
    assert abs(bounds['width'] - width) <= 1 and abs(bounds['height'] - 850) <= 1, bounds
    geo = geometry(frame)
    assert geo['columns'] == expected_columns, geo
    assert geo['scrollWidth'] <= geo['width'] + 1, geo
    if width >= 1024:
        assert all(abs(n['width'] - 390) <= 1 and abs(n['height'] - 844) <= 1 and abs(n['scale'] - 1) < .01 for n in geo['phones']), geo
    else:
        assert all(0 < n['width'] <= 390 and n['scale'] <= 1.001 for n in geo['phones']), geo
    clip = scroll_metrics(p)
    assert clip['scrollWidth'] <= clip['clientWidth'] + 1, clip
    assert clip['overflowY'] in ('auto', 'scroll') and clip['scrollHeight'] > clip['clientHeight'], clip
    assert geo['height'] <= p.locator('iframe.ann2-gallery-frame').evaluate('(el)=>el.clientHeight') + 2, geo
    assert p.locator('#tab-stories').evaluate('(el)=>el.scrollTop') == before
    p.screenshot(path=str(OUT / f'stories-picker-gallery-{width}.png'))
    phone_point = visible_point(p, cards.first.locator('.ph'))
    assert phone_point
    phone_delta = wheel(p, *phone_point, 500)
    box1, box2 = cards.nth(0).bounding_box(), cards.nth(1).bounding_box()
    clip = scroll_metrics(p)
    iframe_box = p.locator('iframe.ann2-gallery-frame').bounding_box()
    gap_x = ((box1['x'] + box1['width'] + box2['x']) / 2 if expected_columns >= 2 else iframe_box['x'] + 1)
    gap_delta = wheel(p, gap_x, (clip['top'] + clip['bottom']) / 2, 400)
    last = cards.nth(35)
    steps = reach_by_wheel(p, last, phone_point[0])
    assert visible_point(p, last), 'Template 36 must be visible before the mouse click'
    p.screenshot(path=str(OUT / f'stories-picker-last-{width}.png'))
    p.mouse.click(*visible_point(p, last))
    closed(p)
    assert p.locator('.ann2-selected-label').inner_text() == 'Совет'
    assert p.get_by_role('textbox', name='Заголовок', exact=True).input_value() == title
    assert p.get_by_role('textbox', name='Текст истории', exact=True).input_value() == body
    assert opener(p).evaluate('(el)=>el===document.activeElement')
    assert abs(p.locator('#tab-stories').evaluate('(el)=>el.scrollTop') - before) <= 1
    h.preview().wait_for_function(r'''title => document.querySelector('#preview').innerText.replace(/\s+/g,' ').toLowerCase().includes(title.toLowerCase())''', arg=title)
    assert frame.locator('.ann-gallery-card[aria-pressed="true"]').get_attribute('data-design') == 'tip'
    p.screenshot(path=str(OUT / f'stories-picker-selected-{width}.png'))
    return {'width': width, 'columns': geo['columns'], 'phone': geo['phones'][0], 'galleryHeight': geo['height'], 'wheelOverPhoneDelta': phone_delta, 'wheelOverGapDelta': gap_delta, 'wheelStepsTo36': steps, 'selected': 'tip'}


def close_reopen(h):
    p = h.page
    p.get_by_role('textbox', name='Заголовок', exact=True).fill('Первый текст')
    f = open_picker(h)
    f.locator('[data-design="quote"]').click()
    closed(p)
    assert p.locator('.ann2-selected-label').inner_text() == 'Цитата'
    p.get_by_role('textbox', name='Заголовок', exact=True).fill('Новый текст без сохранения')
    f = open_picker(h)
    f.wait_for_function("document.querySelector('[data-design=quote]').innerText.includes('Новый текст без сохранения')")
    assert f.locator('.ann-gallery-card[aria-pressed="true"]').get_attribute('data-design') == 'quote'
    f.locator('[data-design="quote"]').focus()
    f.locator('[data-design="quote"]').press('Escape')
    closed(p)
    assert opener(p).evaluate('(el)=>el===document.activeElement')
    assert p.locator('.ann2-selected-label').inner_text() == 'Цитата'
    assert p.get_by_role('textbox', name='Заголовок', exact=True).input_value() == 'Новый текст без сохранения'
    open_picker(h)
    p.get_by_role('button', name='Закрыть выбор шаблона', exact=True).click()
    closed(p)
    assert opener(p).evaluate('(el)=>el===document.activeElement')
    return {'escapeInsideIframe': True, 'closeButton': True, 'freshTextOnReopen': True}


def navigation_account(h):
    p = h.page
    p.get_by_role('textbox', name='Заголовок', exact=True).fill('Черновик прежнего аккаунта')
    open_picker(h)
    p.evaluate("location.hash='other'")
    p.locator(DIALOG).wait_for(state='hidden')
    p.evaluate("location.hash='stories'")
    p.wait_for_function("location.hash==='#stories'")
    open_picker(h)
    p.evaluate("login('user-b')")
    p.locator(DIALOG).wait_for(state='hidden')
    assert p.get_by_role('textbox', name='Заголовок', exact=True).input_value() == ''
    frame = open_picker(h)
    frame.wait_for_function("!document.body.innerText.includes('Черновик прежнего аккаунта')")
    p.get_by_role('button', name='Закрыть выбор шаблона', exact=True).click()
    return {'routeClosesPicker': True, 'accountChangeClearsPreviousText': True}


def fallback(h):
    p = h.page
    p.get_by_role('textbox', name='Заголовок', exact=True).fill('Текст без загрузившихся макетов')
    opener(p).click()
    p.locator(DIALOG).wait_for(state='visible')
    choices = p.locator('.ann2-template-fallback button[data-design]')
    assert choices.count() == 36 and choices.last.is_visible()
    p.locator('.ann2-template-fallback button[data-design="quote"]').click()
    closed(p)
    assert p.locator('.ann2-selected-label').inner_text() == 'Цитата'
    assert p.get_by_role('textbox', name='Заголовок', exact=True).input_value() == 'Текст без загрузившихся макетов'
    assert opener(p).evaluate('(el)=>el===document.activeElement')
    return {'fallbackChoices': 36, 'chosen': 'quote'}


def list_timeout(h):
    p = h.page
    retry = p.get_by_role('button', name='Повторить загрузку', exact=True)
    retry.wait_for(state='visible')
    assert 'Сервер не ответил вовремя' in p.locator('.ann2-notice').inner_text()
    assert 'deadline-exceeded' not in p.locator('.ann2-notice').inner_text()
    p.get_by_role('textbox', name='Заголовок', exact=True).fill('Не потерять из-за таймаута')
    frame = open_picker(h)
    frame.locator('[data-design="quote"]').click()
    closed(p)
    p.evaluate('failList=false')
    retry.click()
    p.wait_for_function('__ann2.loaded && !__ann2.loading')
    assert p.get_by_role('textbox', name='Заголовок', exact=True).input_value() == 'Не потерять из-за таймаута'
    assert p.locator('.ann2-selected-label').inner_text() == 'Цитата'
    assert not retry.is_visible()
    assert p.get_by_role('combobox', name='Открыть черновик', exact=True).is_enabled()
    return {'timeoutExplained': True, 'pickerUsableDuringFailure': True, 'retryPreservesDraft': True}


def main():
    results = []
    with sync_playwright() as pw:
        browser = chromium(pw)
        def check(name, fn, **options):
            if FILTER and not re.search(FILTER, name):
                return
            h = None
            try:
                h = Harness(browser, height=850, shell_mode='fixed', **options)
                details = fn(h)
                assert not h.errors, h.errors
                assert not command_calls(h.page), command_calls(h.page)
                result = {'test': name, 'passed': True, 'details': details}
                print('PASS', name, json.dumps(details, ensure_ascii=False), flush=True)
            except Exception as error:
                result = {'test': name, 'passed': False, 'error': str(error)}
                print('FAIL', name, str(error), flush=True)
                if h:
                    h.page.screenshot(path=str(OUT / ('stories-picker-failed-' + re.sub('[^a-z0-9]+', '-', name.lower()) + '.png')))
            finally:
                if h:
                    h.close()
            results.append(result)
            (OUT / 'picker-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
        check('main preview stays beside input and fits the first screen', main_workspace, width=1662)
        for width, columns in [(1662, 3), (1024, 2), (390, 1)]:
            check(f'fullscreen gallery and real wheel selection at {width}', lambda h, w=width, c=columns: gallery_acceptance(h, w, c), width=width)
        check('reopen refreshes text and Escape or close restores focus', close_reopen, width=1662)
        check('route and account changes close the picker safely', navigation_account, width=1662)
        check('missing renderer keeps all fallback choices usable', fallback, width=1662, renderer=False)
        check('list timeout has recovery without losing typed content', list_timeout, width=1662, wait_loaded=False,
              extra="""window.failList=true;window.getAdminSensitiveControlCallable=name=>async data=>{
                if(name==='adminStoryAnnouncementsList'&&failList){const err=Error('deadline-exceeded');err.code='functions/deadline-exceeded';throw err;}
                return __pmAdminCore.httpsCallable(__pmAdminCore.functionsUs,name)(data);
              };""")
        browser.close()
    failed = sum(not r['passed'] for r in results)
    print(f'{len(results) - failed}/{len(results)} Stories picker scenarios passed', flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
