"""Offline acceptance for motion in all 36 Stories templates.

The fixture serves the real renderer and assets locally. These checks observe
actual CSS effects and text over time; no production APIs or writes are used.
"""
import json
import os
import re
import tempfile
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

from admin_stories_regression import Harness, chromium, command_calls
from admin_stories_picker_regression import (
    DIALOG, SCROLLER, closed, geometry, open_picker, scroll_metrics, wheel,
)


OUT = Path(os.environ.get('STORIES_TEST_OUTPUT', tempfile.gettempdir()))
OUT.mkdir(parents=True, exist_ok=True)
FILTER = os.environ.get('STORIES_ANIMATION_TEST_FILTER', '')

# The measured effects belong to a template's slide. Shared ambient phone glows
# are intentionally excluded: an animated glow cannot make a static template pass.
SAMPLE = r'''ids => ids.map(id => {
  const card=document.querySelector('.ann-gallery-card[data-design="'+id+'"]');
  const story=card.querySelector('.story');
  const effects=story.getAnimations({subtree:true}).filter(a=>{
    const target=a.effect?.target;
    return target instanceof Element && target.closest('.sl');
  }).map((a,index)=>{
    const target=a.effect.target, s=getComputedStyle(target);
    return {key:index+':'+a.animationName, name:a.animationName,
      time:a.currentTime, state:a.playState,
      value:[s.transform,s.opacity,s.clipPath,s.strokeDashoffset,s.strokeDasharray].join('|')};
  });
  return {id,static:card.querySelector('.ph').classList.contains('ann-static'),
    offscreen:story.classList.contains('offscreen'),hovered:card.matches(':hover'),effects};
})'''

MAIN_SAMPLE = r'''() => {
  const phone=document.querySelector('#preview .ph'),story=phone.querySelector('.story');
  return {static:phone.classList.contains('ann-static'),offscreen:story.classList.contains('offscreen'),
    effects:story.getAnimations({subtree:true}).filter(a=>a.effect?.target?.closest('.sl')).map((a,index)=>({
      key:index+':'+a.animationName,time:a.currentTime,state:a.playState,
      value:[getComputedStyle(a.effect.target).transform,getComputedStyle(a.effect.target).opacity,
        getComputedStyle(a.effect.target).clipPath].join('|')}))};
}'''


def changed_effects(before, after):
    old = {effect['key']: effect for effect in before['effects']}
    time_changes, visual_changes = [], []
    for effect in after['effects']:
        previous = old.get(effect['key'])
        if not previous:
            continue
        if (effect['time'] is not None and previous['time'] is not None
                and effect['time'] - previous['time'] > 60
                and effect['state'] == 'running'):
            time_changes.append(effect['key'])
            if effect['value'] != previous['value']:
                visual_changes.append(effect['key'])
    return time_changes, visual_changes


def move_to_card(h, frame, design):
    card = frame.locator(f'.ann-gallery-card[data-design="{design}"]')
    bounds = card.bounding_box()
    clip = scroll_metrics(h.page)
    assert bounds
    delta = bounds['y'] - clip['top'] - 8
    if abs(delta) > 5:
        wheel(h.page, clip['left'] + 45, clip['top'] + 90, delta)
    # No preview relies on hover to start motion.
    h.page.mouse.move(20, 20)
    return card


def wait_active(frame, designs):
    frame.wait_for_function(r'''ids => ids.every(id=>{
      const story=document.querySelector('[data-design="'+id+'"] .story');
      return story&&!story.classList.contains('offscreen')&&
        story.getAnimations({subtree:true}).some(a=>a.playState==='running');
    })''', arg=designs)


def all_templates_move(h):
    p = h.page
    title = '1000 движений с моим текстом'
    body = 'Мой текст уже в каждом подходящем макете.'
    p.get_by_role('textbox', name='Заголовок', exact=True).fill(title)
    p.get_by_role('textbox', name='Текст истории', exact=True).fill(body)
    frame = open_picker(h)
    frame.evaluate('async()=>{await document.fonts.ready}')
    frame.wait_for_function('[...document.images].every(img=>img.complete&&img.naturalWidth>0)')
    frame.wait_for_function(r'''title => [...document.querySelectorAll('.ann-gallery-card')]
      .filter(c=>!['number','thanks'].includes(c.dataset.design))
      .every(c=>c.innerText.replace(/\s+/g,' ').toLowerCase().includes(title.toLowerCase()))''', arg=title)
    designs = frame.locator('.ann-gallery-card').evaluate_all('(cards)=>cards.map(c=>c.dataset.design)')
    assert len(designs) == len(set(designs)) == 36
    assert frame.locator('iframe').count() == 0
    geo = geometry(frame)
    assert geo['columns'] == 3
    assert all(abs(n['width'] - 390) < 1 and abs(n['height'] - 844) < 1 for n in geo['phones'])
    details = []
    for start in range(0, len(designs), 3):
        row = designs[start:start + 3]
        move_to_card(h, frame, row[0])
        wait_active(frame, row)
        first = frame.evaluate(SAMPLE, row)
        p.wait_for_timeout(650)
        second = frame.evaluate(SAMPLE, row)
        for before, after in zip(first, second):
            assert not after['static'] and not after['offscreen'] and not after['hovered'], after
            advancing, visual = changed_effects(before, after)
            assert advancing, f"No template animation advances for {after['id']}: {after}"
            assert visual, f"No rendered template effect changes for {after['id']}: {after}"
            details.append({'design': after['id'], 'movingEffects': visual})
        if start in (0, 24, 33):
            p.screenshot(path=str(OUT / f'stories-animation-row-{start // 3 + 1}.png'))
    assert body in frame.locator('[data-design="manifest"]').inner_text()
    return {'animatedTemplates': len(details), 'columns': 3, 'naturalPhone': '390x844', 'effects': details}


def counter_and_repeat(h):
    p = h.page
    p.get_by_role('textbox', name='Заголовок', exact=True).fill('1000')
    p.get_by_role('textbox', name='Текст истории', exact=True).fill('Спасибо всем за поддержку')
    frame = open_picker(h)
    frame.evaluate('async()=>{await document.fonts.ready}')
    move_to_card(h, frame, 'thanks')
    wait_active(frame, ['thanks'])
    counter = frame.locator('[data-design="thanks"] [data-cnt]')
    samples = []
    for _ in range(10):
        samples.append(int(re.sub(r'\D', '', counter.inner_text()) or '0'))
        p.wait_for_timeout(220)
    assert any(0 < value < 1000 for value in samples), samples
    assert samples[-1] == 1000, samples
    assert len(set(samples)) >= 3, samples
    # A real cycle must rebuild the entrance and restart the counter without a
    # mouse hover or click. Observe the renderer's unmodified ten-second cycle.
    current_node = counter.element_handle()
    frame.wait_for_function('el=>!el.isConnected', arg=current_node, timeout=12000)
    reset = int(re.sub(r'\D', '', counter.inner_text()) or '0')
    assert reset < 1000, reset
    frame.wait_for_function("document.querySelector('[data-design=thanks] [data-cnt]').textContent.replace(/\\D/g,'')==='1000'", timeout=3500)
    return {'counterSamples': samples, 'nextCycleCounter': reset, 'loopsAutomatically': True}


def lifecycle_and_selection(h):
    p = h.page
    p.get_by_role('textbox', name='Заголовок', exact=True).fill('Анимированный выбранный шаблон')
    p.get_by_role('textbox', name='Текст истории', exact=True).fill('Не потерять текст после выбора')
    frame = open_picker(h)
    frame.evaluate('async()=>{await document.fonts.ready}')
    wait_active(frame, ['manifest', 'editorial', 'quote'])
    move_to_card(h, frame, 'thanks')
    frame.wait_for_function("document.querySelector('[data-design=manifest] .story').classList.contains('offscreen')")
    first = frame.evaluate(SAMPLE, ['manifest'])[0]
    p.wait_for_timeout(350)
    second = frame.evaluate(SAMPLE, ['manifest'])[0]
    assert first['effects'] and second['effects']
    assert [a['time'] for a in first['effects']] == [a['time'] for a in second['effects']], (first, second)
    p.get_by_role('button', name='Закрыть выбор шаблона', exact=True).click()
    closed(p)
    p.wait_for_timeout(100)
    frame.wait_for_function("[...document.querySelectorAll('.ann-gallery-card .story')].every(st=>st.classList.contains('offscreen'))")
    closed_before = frame.evaluate(SAMPLE, ['thanks'])[0]
    p.wait_for_timeout(350)
    closed_after = frame.evaluate(SAMPLE, ['thanks'])[0]
    assert not any(a['state'] == 'running' for a in closed_after['effects']), closed_after
    assert [a['time'] for a in closed_before['effects']] == [a['time'] for a in closed_after['effects']], (closed_before, closed_after)
    frame = open_picker(h)
    move_to_card(h, frame, 'thanks')
    wait_active(frame, ['thanks'])
    resumed_before = frame.evaluate(SAMPLE, ['thanks'])[0]
    p.wait_for_timeout(500)
    resumed_after = frame.evaluate(SAMPLE, ['thanks'])[0]
    assert changed_effects(resumed_before, resumed_after)[0], (resumed_before, resumed_after)
    frame.locator('[data-design="thanks"]').click()
    closed(p)
    assert p.locator('.ann2-selected-label').inner_text() == 'Спасибо'
    assert p.get_by_role('textbox', name='Заголовок', exact=True).input_value() == 'Анимированный выбранный шаблон'
    assert p.get_by_role('textbox', name='Текст истории', exact=True).input_value() == 'Не потерять текст после выбора'
    preview = h.preview()
    preview.wait_for_function("!document.querySelector('#preview .ph').classList.contains('ann-static')")
    main_before = preview.evaluate(MAIN_SAMPLE)
    p.wait_for_timeout(500)
    main_after = preview.evaluate(MAIN_SAMPLE)
    advancing, visual = changed_effects(main_before, main_after)
    assert advancing and visual and not main_after['offscreen'], main_after
    return {'offscreenPauses': True, 'closedPauses': True, 'reopenResumes': True,
            'mainPreviewAnimated': True, 'textPreserved': True}


def main_default_and_hidden(h):
    p = h.page
    preview = h.preview()
    preview.evaluate('async()=>{await document.fonts.ready}')
    preview.wait_for_function("!document.querySelector('#preview .ph').classList.contains('ann-static')")
    p.get_by_role('textbox', name='Заголовок', exact=True).fill('Движение сразу при вводе')
    preview.wait_for_function(r"document.querySelector('#preview').innerText.replace(/\s+/g,' ').toLowerCase().includes('движение сразу при вводе')")
    first = preview.evaluate(MAIN_SAMPLE)
    p.wait_for_timeout(600)
    second = preview.evaluate(MAIN_SAMPLE)
    assert changed_effects(first, second)[1], (first, second)
    open_picker(h)
    frame = h.gallery()
    wait_active(frame, ['manifest'])
    p.evaluate("location.hash='other'")
    p.locator(DIALOG).wait_for(state='hidden')
    p.wait_for_timeout(100)
    preview.wait_for_function("document.querySelector('#preview .story').classList.contains('offscreen')")
    frame.wait_for_function("[...document.querySelectorAll('.ann-gallery-card .story')].every(st=>st.classList.contains('offscreen'))")
    hidden_main = preview.evaluate(MAIN_SAMPLE)
    hidden_gallery = frame.evaluate(SAMPLE, ['manifest'])[0]
    p.wait_for_timeout(350)
    assert not any(a['state'] == 'running' for a in preview.evaluate(MAIN_SAMPLE)['effects'])
    assert not any(a['state'] == 'running' for a in frame.evaluate(SAMPLE, ['manifest'])[0]['effects'])
    assert hidden_main['offscreen'] and hidden_gallery['offscreen']
    return {'mainAnimatedByDefault': True, 'typingRefreshesAnimation': True, 'routePausesBoth': True}


def page_lifecycle(h):
    p = h.page
    frame = open_picker(h)
    frame.evaluate('async()=>{await document.fonts.ready}')
    wait_active(frame, ['manifest'])
    frame.evaluate("dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))")
    frame.wait_for_function("[...document.querySelectorAll('.ann-gallery-card .story')].every(st=>st.classList.contains('offscreen'))")
    frame.evaluate("async()=>{await Promise.all(document.getAnimations().map(a=>a.ready.catch(()=>{})))}")
    before = frame.evaluate(SAMPLE, ['manifest'])[0]
    p.wait_for_timeout(300)
    after = frame.evaluate(SAMPLE, ['manifest'])[0]
    assert [a['time'] for a in before['effects']] == [a['time'] for a in after['effects']]
    frame.evaluate("dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
    wait_active(frame, ['manifest'])
    p.get_by_role('button', name='Закрыть выбор шаблона', exact=True).click()
    closed(p)
    preview = h.preview()
    preview.wait_for_function("!document.querySelector('#preview .story').classList.contains('offscreen')")
    preview.evaluate("dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))")
    preview.wait_for_function("document.querySelector('#preview .story').classList.contains('offscreen')")
    assert not any(a['state'] == 'running' for a in preview.evaluate(MAIN_SAMPLE)['effects'])
    preview.evaluate("dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
    preview.wait_for_function("!document.querySelector('#preview .story').classList.contains('offscreen')")
    first = preview.evaluate(MAIN_SAMPLE)
    p.wait_for_timeout(600)
    second = preview.evaluate(MAIN_SAMPLE)
    assert changed_effects(first, second)[1], (first, second)
    return {'galleryPageHidePauses': True, 'galleryPageShowResumes': True,
            'mainPageHidePauses': True, 'mainPersistedPageShowResumes': True}


def pending_content_survives_restore(h):
    p = h.page
    old_text = 'Текст предыдущего аккаунта'
    p.get_by_role('textbox', name='Заголовок', exact=True).fill(old_text)
    frame = open_picker(h)
    frame.evaluate('async()=>{await document.fonts.ready}')
    frame.wait_for_function(r"document.querySelector('[data-design=quote]').innerText.replace(/\s+/g,' ').includes('Текст предыдущего аккаунта')")
    # Deliver a genuine-shaped parent clear, then pagehide in the same turn so
    # its scheduled render has not run. Restoring must keep that latest message.
    frame.evaluate("""() => {
      dispatchEvent(new MessageEvent('message',{source:parent,origin:location.origin,
        data:{channel:'pm-ann-gallery',enabled:false,selectedDesign:'manifest',
          content:{title:'',badge:'',blocks:[]},theme:'ink',ap:'dark'}}));
      dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
      dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    }""")
    assert frame.locator('.ann-gallery-card').count() == 36
    assert frame.locator('.ann-gallery-card .story').count() == 0
    assert old_text not in frame.locator('#ann-gallery').inner_text()
    return {'pendingParentClearPreserved': True, 'staleContentRemoved': True, 'templateShells': 36}


def reduced_motion(h):
    p = h.page
    p.emulate_media(reduced_motion='reduce')
    p.reload()
    p.wait_for_function('window.__ann2?.loaded')
    p.get_by_role('textbox', name='Заголовок', exact=True).fill('1000')
    frame = open_picker(h)
    frame.evaluate('async()=>{await document.fonts.ready}')
    assert frame.locator('.ann-gallery-card').count() == 36
    frame.wait_for_function("document.querySelector('[data-design=thanks] [data-cnt]').textContent.replace(/\\D/g,'')==='1000'")
    assert frame.evaluate("document.getAnimations().filter(a=>a.playState==='running').length") == 0
    assert h.preview().evaluate("document.getAnimations().filter(a=>a.playState==='running').length") == 0
    return {'respectsReducedMotion': True, 'finalCounter': '1000', 'templates': 36}


def main():
    results = []
    with sync_playwright() as pw:
        browser = chromium(pw)
        for name, fn in [
            ('all 36 templates visibly animate without hover', all_templates_move),
            ('counter animates and template repeats automatically', counter_and_repeat),
            ('offscreen and closed templates pause while selected preview animates', lifecycle_and_selection),
            ('main preview animates by default and route pauses both renderers', main_default_and_hidden),
            ('pagehide pauses and persisted pageshow resumes both renderers', page_lifecycle),
            ('pending parent content clear survives page restoration', pending_content_survives_restore),
            ('reduced motion keeps readable final frames', reduced_motion),
        ]:
            if FILTER and not re.search(FILTER, name):
                continue
            h = None
            try:
                h = Harness(browser, width=1662, height=850, shell_mode='fixed')
                details = fn(h)
                assert not h.errors, h.errors
                assert not command_calls(h.page), command_calls(h.page)
                result = {'test': name, 'passed': True, 'details': details}
                print('PASS', name, flush=True)
            except Exception as error:
                result = {'test': name, 'passed': False, 'error': str(error), 'traceback': traceback.format_exc()}
                print('FAIL', name, str(error), flush=True)
                if h:
                    h.page.screenshot(path=str(OUT / ('stories-animation-failed-' + re.sub('[^a-z0-9]+', '-', name.lower()) + '.png')))
            finally:
                if h:
                    h.close()
            results.append(result)
            (OUT / 'animation-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
        browser.close()
    failed = sum(not result['passed'] for result in results)
    print(f'{len(results) - failed}/{len(results)} Stories animation scenarios passed', flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
