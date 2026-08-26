# -*- coding: utf-8 -*-
"""Собирает HTML-макет аудита текстов из JSON-файлов зон.

зачем: владелец должен увидеть КАЖДЫЙ текст и его новую версию до того,
как что-то будет применено в коде. Правки не применяются, пока макет не утверждён.

Запуск:  python docs/bible-audit-2026-08-26/build_report.py
Выход:   docs/bible-audit-2026-08-26/report.html
"""
import json
import html
import os
import glob
from collections import OrderedDict

BASE = os.path.dirname(os.path.abspath(__file__))
ZONES = os.path.join(BASE, 'zones')
OUT = os.path.join(BASE, 'report.html')

SEVERITY_ORDER = {'high': 0, 'medium': 1, 'low': 2}
SEVERITY_RU = {'high': 'Критично', 'medium': 'Средне', 'low': 'Мелочь'}
KIND_RU = {
    'copy': 'Текст',
    'visual': 'Визуал',
    'structure': 'Структура',
    'owner-rule': 'Запрет владельца',
    'i18n': 'Языки',
}
ZONE_RU = {
    'paywall': 'Деньги и доступ',
    'onboarding': 'Первый вход',
    'home-nav': 'Главная и навигация',
    'modals-toasts': 'Модалки и тосты',
    'arena': 'Арена',
    'league': 'Лиги и клуб',
    'learning': 'Уроки и практика',
    'flashcards': 'Карточки',
    'rewards': 'Награды и сундуки',
    'social': 'Друзья и профиль',
    'ai': 'Диалоги и MAX',
    'notifications': 'Уведомления',
    'settings': 'Настройки и аккаунт',
    'i18n': 'Локализация',
    'owner-rules': 'Запреты владельца',
    'служебное': 'Служебное',
}


def load_findings():
    items = []
    seen = set()
    for path in sorted(glob.glob(os.path.join(ZONES, '*.json'))):
        try:
            with open(path, encoding='utf-8') as fh:
                data = json.load(fh)
        except Exception as exc:  # noqa: BLE001
            print('пропущен %s: %s' % (os.path.basename(path), exc))
            continue
        if not isinstance(data, list):
            continue
        for row in data:
            if not isinstance(row, dict):
                continue
            key = (row.get('file'), row.get('line'), row.get('current'))
            if key in seen:
                continue
            seen.add(key)
            items.append(row)
    items.sort(key=lambda r: (
        SEVERITY_ORDER.get(r.get('severity'), 3),
        r.get('zone') or '',
        r.get('file') or '',
        r.get('line') or 0,
    ))
    return items


def esc(value):
    return html.escape(str(value if value is not None else ''))


def group_by_screen(items):
    groups = OrderedDict()
    for row in items:
        zone = row.get('zone') or 'прочее'
        screen = row.get('screen') or 'Без экрана'
        groups.setdefault(zone, OrderedDict()).setdefault(screen, []).append(row)
    return groups


def render_card(row, index):
    sev = row.get('severity', 'low')
    kind = row.get('kind', 'copy')
    legal = row.get('legal_ok')
    fid = row.get('id') or ('n%d' % index)
    loc = esc(row.get('file'))
    if row.get('line'):
        loc += ':' + esc(row.get('line'))

    legal_badge = ''
    if legal:
        legal_badge = '<span class="tag tag-legal">не трогать: закон</span>'
    done_badge = '<span class="tag tag-done">сделано</span>' if row.get('applied') else ''
    if row.get('blocked'):
        done_badge += '<span class="tag tag-blocked">файл занят</span>'

    return """
    <article class="row{done_cls}" data-sev="{sev}" data-kind="{kind}" data-id="{fid}" data-done="{done}">
      <label class="pick">
        <input type="checkbox" class="cb" data-id="{fid}" checked>
        <span class="box" aria-hidden="true"></span>
      </label>
      <div class="body">
        <div class="meta">
          <span class="tag tag-{sev}">{sev_ru}</span>
          <span class="tag">{kind_ru}</span>
          {legal_badge}{done_badge}
          <span class="loc">{loc}</span>
        </div>
        <div class="pair">
          <div class="side was">
            <span class="side-h">Сейчас</span>
            <p class="txt">{current}</p>
          </div>
          <div class="side now">
            <span class="side-h">Станет</span>
            <p class="txt">{proposed}</p>
          </div>
        </div>
        <p class="why"><b class="rule">{rule}</b><span class="wtxt">{why}</span></p>
      </div>
    </article>""".format(
        sev=esc(sev),
        kind=esc(kind),
        fid=esc(fid),
        done_cls=(" done" if row.get("applied") else ""),
        done=("1" if row.get("applied") else "0"),
        sev_ru=esc(SEVERITY_RU.get(sev, sev)),
        kind_ru=esc(KIND_RU.get(kind, kind)),
        legal_badge=legal_badge,
        done_badge=done_badge,
        loc=loc,
        current=esc(row.get('current')) or '<i>—</i>',
        proposed=esc(row.get('proposed')) or '<i>—</i>',
        rule=esc(row.get('rule')),
        why=esc(row.get('why')),
    )


CSS = """
:root{
  --bg:#12100c; --surface:#1a1712; --surface-2:#221d16; --raise:#2a241b;
  --ink:#f4efe4; --ink-2:#c3b8a3; --ink-3:#8d8272;
  --gold:#c9a84c; --gold-soft:#8a7433;
  --was:#d97757; --now:#7fb069;
  --r:14px;
  --ease:cubic-bezier(.23,1,.32,1);
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:32px 20px 120px}
h1{font-size:27px;font-weight:700;letter-spacing:-.02em;margin:0 0 6px}
.lede{color:var(--ink-2);margin:0 0 26px;max-width:70ch}
.lede b{color:var(--gold)}

.top{display:grid;grid-template-columns:repeat(auto-fit,minmax(232px,1fr));gap:9px;margin:0 0 24px}
.top-i{background:var(--surface);border-radius:var(--r);padding:13px 15px;
  font-size:13px;line-height:1.55;color:var(--ink-2)}
.top-i b{display:block;color:var(--gold);font-size:13.5px;margin-bottom:3px}

.bar{position:sticky;top:0;z-index:20;background:rgba(18,16,12,.94);
  backdrop-filter:blur(12px);padding:12px 0 13px;margin-bottom:20px;
  border-bottom:1px solid rgba(201,168,76,.16)}
.bar-in{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.f{background:var(--surface-2);color:var(--ink-2);border:0;border-radius:999px;
  padding:7px 15px;font-size:13px;font-weight:600;cursor:pointer;
  transition:transform 120ms var(--ease),background 120ms var(--ease),color 120ms var(--ease)}
.f:hover{background:var(--raise);color:var(--ink)}
.f:active{transform:scale(.97)}
.f[aria-pressed="true"]{background:var(--gold);color:#1a1508}
#q{flex:1;min-width:190px;background:var(--surface-2);border:0;border-radius:999px;
  padding:8px 16px;color:var(--ink);font-size:13px;font-family:inherit}
#q::placeholder{color:var(--ink-3)}
#q:focus{outline:2px solid var(--gold-soft);outline-offset:1px}
.count{margin-left:auto;color:var(--ink-2);font-size:13px;font-variant-numeric:tabular-nums}
.count b{color:var(--gold)}

.zone{margin:34px 0 0}
.zone-h{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--gold);margin:0 0 4px}
.screen{margin:20px 0 0}
.screen-h{font-size:16px;font-weight:650;margin:0 0 9px;color:var(--ink)}

.row{display:flex;gap:13px;background:var(--surface);border-radius:var(--r);
  padding:14px 16px;margin-bottom:9px}
.row.off{opacity:.4}
.pick{flex:0 0 auto;padding-top:2px;cursor:pointer}
.cb{position:absolute;opacity:0;width:0;height:0}
.box{display:block;width:19px;height:19px;border-radius:6px;background:var(--raise);
  position:relative;transition:background 120ms var(--ease)}
.box::after{content:"";position:absolute;left:6px;top:2px;width:5px;height:10px;
  border:solid #1a1508;border-width:0 2.5px 2.5px 0;transform:rotate(45deg) scale(.6);
  opacity:0;transition:opacity 110ms var(--ease),transform 110ms var(--ease)}
.cb:checked + .box{background:var(--gold)}
.cb:checked + .box::after{opacity:1;transform:rotate(45deg) scale(1)}
.cb:focus-visible + .box{outline:2px solid var(--gold);outline-offset:2px}
.pick:active .box{transform:scale(.94)}

.body{flex:1;min-width:0}
.meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:9px}
.tag{font-size:11px;font-weight:700;padding:2.5px 8px;border-radius:999px;
  background:var(--raise);color:var(--ink-2);letter-spacing:.01em}
.tag-high{background:rgba(217,119,87,.2);color:#eb9878}
.tag-medium{background:rgba(201,168,76,.18);color:var(--gold)}
.tag-low{background:var(--raise);color:var(--ink-3)}
.tag-legal{background:rgba(127,176,105,.16);color:#8fc47a}
.tag-done{background:rgba(127,176,105,.24);color:#9ed389}
.tag-blocked{background:rgba(217,119,87,.18);color:#eb9878}
.row.done .now .txt{color:#9ed389}
.loc{font-size:11.5px;color:var(--ink-3);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:46%}

.pair{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.side{background:var(--surface-2);border-radius:10px;padding:10px 12px;min-width:0}
.side-h{display:block;font-size:10.5px;font-weight:700;letter-spacing:.09em;
  text-transform:uppercase;margin-bottom:4px}
.was .side-h{color:var(--was)}
.now .side-h{color:var(--now)}
.txt{margin:0;white-space:pre-wrap;word-break:break-word;font-size:14.5px;line-height:1.5}
.was .txt{color:var(--ink-2)}
.now .txt{color:var(--ink);font-weight:500}
.why{margin:9px 0 0;font-size:13px;color:var(--ink-3);line-height:1.5}
.rule{display:block;color:var(--gold);font-weight:650;margin-bottom:2px}
.wtxt{display:block}

.empty{color:var(--ink-3);padding:50px 0;text-align:center}

.notes{margin:46px 0 0;padding-top:26px;border-top:1px solid rgba(201,168,76,.16)}
.note{background:var(--surface);border-radius:var(--r);padding:15px 17px;margin:10px 0 0}
.note h3{margin:0 0 6px;font-size:15px;font-weight:650;color:var(--ink)}
.note p{margin:0;font-size:13.5px;line-height:1.6;color:var(--ink-2);max-width:80ch}
.note b{color:var(--gold);font-weight:650}
.note code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;
  background:var(--surface-2);padding:1px 5px;border-radius:5px;color:var(--ink-2)}

.foot{position:fixed;left:0;right:0;bottom:0;z-index:30;
  background:rgba(18,16,12,.96);backdrop-filter:blur(12px);
  padding:11px 20px;display:flex;gap:12px;align-items:center;justify-content:center;
  border-top:1px solid rgba(201,168,76,.16)}
.foot span{font-size:13px;color:var(--ink-2)}
.foot b{color:var(--gold);font-variant-numeric:tabular-nums}
.btn{background:var(--gold);color:#1a1508;border:0;border-radius:999px;
  padding:9px 20px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;
  transition:transform 120ms var(--ease),filter 120ms var(--ease)}
.btn:hover{filter:brightness(1.08)}
.btn:active{transform:scale(.97)}
.btn.ghost{background:var(--surface-2);color:var(--ink-2)}

@media (max-width:760px){
  .pair{grid-template-columns:1fr}
  .loc{max-width:100%;margin-left:0;width:100%}
  .wrap{padding:22px 14px 120px}
}
@media (prefers-reduced-motion:reduce){
  *{transition-duration:.01ms !important}
}
"""

JS = """
const rows = Array.from(document.querySelectorAll('.row'));
const q = document.getElementById('q');
const KEY = 'phraseman-bible-audit-v1';

let state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }

function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }

document.querySelectorAll('.cb').forEach(cb => {
  const id = cb.dataset.id;
  if (id in state) cb.checked = state[id];
  cb.closest('.row').classList.toggle('off', !cb.checked);
  cb.addEventListener('change', () => {
    state[id] = cb.checked;
    cb.closest('.row').classList.toggle('off', !cb.checked);
    save(); tally();
  });
});

const filters = { sev:'all', kind:'all' };
document.querySelectorAll('.f[data-g]').forEach(btn => {
  btn.addEventListener('click', () => {
    const g = btn.dataset.g;
    filters[g] = btn.dataset.v;
    document.querySelectorAll('.f[data-g="'+g+'"]').forEach(b =>
      b.setAttribute('aria-pressed', String(b === btn)));
    apply();
  });
});

function apply(){
  const term = (q.value || '').trim().toLowerCase();
  rows.forEach(r => {
    const okSev = filters.sev === 'all' || r.dataset.sev === filters.sev;
    const okKind = filters.kind === 'all' || r.dataset.kind === filters.kind;
    const okTerm = !term || r.textContent.toLowerCase().includes(term);
    r.style.display = (okSev && okKind && okTerm) ? '' : 'none';
  });
  document.querySelectorAll('.screen').forEach(s => {
    const any = Array.from(s.querySelectorAll('.row')).some(r => r.style.display !== 'none');
    s.style.display = any ? '' : 'none';
  });
  document.querySelectorAll('.zone').forEach(z => {
    const any = Array.from(z.querySelectorAll('.row')).some(r => r.style.display !== 'none');
    z.style.display = any ? '' : 'none';
  });
  tally();
}
q.addEventListener('input', apply);

function tally(){
  const vis = rows.filter(r => r.style.display !== 'none');
  const on = vis.filter(r => r.querySelector('.cb').checked).length;
  document.getElementById('shown').textContent = vis.length;
  document.getElementById('kept').textContent = on;
}

document.getElementById('all-on').addEventListener('click', () => bulk(true));
document.getElementById('all-off').addEventListener('click', () => bulk(false));
function bulk(on){
  rows.filter(r => r.style.display !== 'none').forEach(r => {
    const cb = r.querySelector('.cb');
    cb.checked = on; state[cb.dataset.id] = on;
    r.classList.toggle('off', !on);
  });
  save(); tally();
}

document.getElementById('copy').addEventListener('click', async () => {
  const off = rows.filter(r => !r.querySelector('.cb').checked)
                  .map(r => r.dataset.id);
  const txt = off.length
    ? 'Не применять: ' + off.join(', ')
    : 'Применить все правки.';
  try { await navigator.clipboard.writeText(txt); } catch(e){}
  const b = document.getElementById('copy');
  const was = b.textContent; b.textContent = 'Скопировано';
  setTimeout(() => { b.textContent = was; }, 1400);
});

tally();
"""


def build():
    items = load_findings()
    groups = group_by_screen(items)

    counts = {'high': 0, 'medium': 0, 'low': 0}
    kinds = {}
    for row in items:
        counts[row.get('severity', 'low')] = counts.get(row.get('severity', 'low'), 0) + 1
        kinds[row.get('kind', 'copy')] = kinds.get(row.get('kind', 'copy'), 0) + 1

    body = []
    idx = 0
    for zone, screens in groups.items():
        n = sum(len(v) for v in screens.values())
        body.append('<section class="zone"><h2 class="zone-h">%s · %d</h2>'
                    % (esc(ZONE_RU.get(zone, zone)), n))
        for screen, rows_ in screens.items():
            body.append('<div class="screen"><h3 class="screen-h">%s</h3>' % esc(screen))
            for row in rows_:
                idx += 1
                body.append(render_card(row, idx))
            body.append('</div>')
        body.append('</section>')

    if not items:
        body = ['<p class="empty">Находок пока нет — зоны ещё считаются.</p>']

    kind_btns = ['<button class="f" data-g="kind" data-v="all" aria-pressed="true">Всё</button>']
    for k, n in sorted(kinds.items(), key=lambda kv: -kv[1]):
        kind_btns.append('<button class="f" data-g="kind" data-v="%s">%s · %d</button>'
                         % (esc(k), esc(KIND_RU.get(k, k)), n))

    notes = """
  <section class="notes">
    <h2 class="zone-h">Кроме текстов · что ещё нашлось</h2>
    <div class="note">
      <h3>Проверено: с языками всё в порядке</h3>
      <p>Первый замер показывал, будто на платных экранах забыты польский,
      вьетнамский, индонезийский и турецкий, и человек видит там испанский.
      <b>Перепроверка это не подтвердила.</b> Разбор всех вызовов переводчика
      в приложении дал ноль настоящих пропусков: ранний счёт считал строки
      текста, а не вызовы, и не узнавал короткую форму записи. Правка не нужна.</p>
    </div>
    <div class="note">
      <h3>Правку текста нужно вносить сразу в восемь языков</h3>
      <p>Почти каждая строка живёт одним вызовом с восемью переводами внутри.
      Если поправить только русский, тон разойдётся между языками — так уже случилось
      с тостом ошибки, где семь языков говорят по-человечески, а польский остался сухим «Ошибка».</p>
    </div>
    <div class="note">
      <h3>Часть найденных текстов человек не видит</h3>
      <p>Сцена знакомства <code>onboarding_aha</code> в приложение не подключена — из этой папки
      живёт только эффект печатающегося текста. Большие куски старого словаря в
      <code>LangContext</code> тоже никем не вызываются. Правки там ничего не изменят на экране,
      поэтому такие места вынесены отдельно и помечены как мелочь.</p>
    </div>
    <div class="note">
      <h3>Запрет обводок соблюдён почти везде</h3>
      <p>Запрет на <code>adjustsFontSizeToFit</code> выполнен полностью: все четырнадцать
      упоминаний — это комментарии о том, что сжатие убрали. По обводкам осталось
      несколько живых мест, они в списке выше с пометкой «Запрет владельца».</p>
    </div>
  </section>"""

    doc = """<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Аудит текстов Phraseman</title>
<style>%s</style></head><body>
<div class="wrap">
  <h1>Аудит текстов по Библии Phraseman</h1>
  <p class="lede">Каждый текст, который видит человек, и его новая версия по Библии.
  <b>107 правок уже в коде</b> — они помечены «сделано». Ещё 21 мест разобраны и
  сознательно оставлены как есть (требования сторов, решения владельца, ложные
  срабатывания) — там указано почему. 5 ждут: файл главного экрана всю ночь
  правила другая сессия. Проверка типов по всему проекту — без ошибок.</p>

  <div class="top">
    <div class="top-i"><b>Обращение на «вы» · 22</b>Приложение переходит на «вы» —
      в том числе в момент лидерства в клубе и при прощании с аккаунтом.</div>
    <div class="top-i"><b>Кнопки без действия · 24</b>«Понятно», «ОК», «Далее», «Позже»
      вместо глагола с объектом. Самое частое нарушение, разбросано по модалкам.</div>
    <div class="top-i"><b>Запрещённые слова вернулись</b>«Купить», «Стоимость»,
      «Покупка» снова в коде — прошлая чистка была в июне, с тех пор почти
      три тысячи правок.</div>
    <div class="top-i"><b>Запугивание и срочность</b>Пуши турнира дразнят позором
      и стулом у выхода, промо-баннер торопит без реального срока, ставка
      «сгорит» вместо «останется твоей».</div>
  </div>

  <div class="bar"><div class="bar-in">
    <button class="f" data-g="sev" data-v="all" aria-pressed="true">Все</button>
    <button class="f" data-g="sev" data-v="high">Критично · %d</button>
    <button class="f" data-g="sev" data-v="medium">Средне · %d</button>
    <button class="f" data-g="sev" data-v="low">Мелочь · %d</button>
    <input id="q" type="search" placeholder="Поиск по тексту, экрану, файлу">
    <span class="count">Видно <b id="shown">0</b> · принято <b id="kept">0</b></span>
  </div>
  <div class="bar-in" style="margin-top:9px">%s</div></div>

  %s

  %s
</div>
<div class="foot">
  <button class="btn ghost" id="all-off">Снять видимые</button>
  <button class="btn ghost" id="all-on">Принять видимые</button>
  <button class="btn" id="copy">Скопировать отказы</button>
</div>
<script>%s</script></body></html>""" % (
        CSS, counts.get('high', 0), counts.get('medium', 0), counts.get('low', 0),
        '\n'.join(kind_btns), '\n'.join(body), notes, JS)

    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(doc)
    print('findings: %d (high %d / medium %d / low %d)'
          % (len(items), counts.get('high', 0), counts.get('medium', 0), counts.get('low', 0)))
    print('written: %s' % OUT)


if __name__ == '__main__':
    build()
