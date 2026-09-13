# -*- coding: utf-8 -*-
# зачем: собрать макет всех 47 шаблонов в один HTML, чтобы владелец увидел
# письма такими, какими они придут в Telegram, и утвердил до правки кода.
# Запуск: python docs/design/telegram-alerts/build_mockup.py
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from templates_data import T  # noqa: E402

CATS = [
    ('people', '💚 Люди', 'Рост базы. Тон праздничный: каждый новый человек — маленькая победа.'),
    ('learning', '📚 Обучение', 'Оценки и прогресс. Ведёт оценка, а не имя: сначала сколько звёзд, потом кто поставил.'),
    ('reports', '🚩 Репорты и ошибки', 'Тон тревожный. Ведёт суть проблемы, техника прячется под свёрнутый блок.'),
    ('revenue', '💰 Деньги', 'Сумма — главный знак письма. Приход празднует, уход не паникует, сбой оплаты тревожит.'),
    ('content', '✍️ Контент и обратная связь', 'Ведёт голос человека: цитата крупно, служебное мелко.'),
    ('operations', '⚙️ Операции', 'Состояние системы. Ведёт факт «работает / упало» и что это значит для людей.'),
]

MOODS = {
    'celebrate': ('Праздник', '#4ade80'),
    'neutral': ('Нейтральный', '#7aa7d6'),
    'warn': ('Предупреждение', '#f0b95c'),
    'alarm': ('Тревога', '#f2706e'),
    'digest': ('Сводка', '#b58ce0'),
}


def esc(s):
    """Экранируем всё, кроме намеренной разметки <b> из данных шаблона."""
    s = str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return s.replace('&lt;b&gt;', '<b>').replace('&lt;/b&gt;', '</b>')


def block(kind, value):
    if kind == 'plain':
        return f'<div class="b-plain">{esc(value)}</div>'
    if kind == 'meta':
        return f'<div class="b-meta">{esc(value)}</div>'
    if kind == 'stat':
        return f'<div class="b-stat">{esc(value)}</div>'
    if kind == 'big':
        return f'<div class="b-big">{esc(value)}</div>'
    if kind == 'money':
        return f'<div class="b-money">{esc(value)}</div>'
    if kind == 'title':
        return f'<div class="b-title">{esc(value)}</div>'
    if kind == 'phrase':
        return f'<div class="b-phrase">{esc(value)}</div>'
    if kind == 'quote':
        return f'<div class="b-quote">{esc(value)}</div>'
    if kind == 'from':
        return f'<div class="b-from">{esc(value)}</div>'
    if kind == 'chain':
        return f'<div class="b-chain">{esc(value)}</div>'
    if kind == 'code':
        return f'<div class="b-code">{esc(value)}</div>'
    if kind == 'badge':
        return f'<div class="b-badge">{esc(value)}</div>'
    if kind == 'warn':
        return f'<div class="b-warn">{esc(value)}</div>'
    if kind == 'deadline':
        return f'<div class="b-deadline">{esc(value)}</div>'
    if kind == 'counter':
        return f'<div class="b-counter">{esc(value)}</div>'
    if kind == 'progress':
        return f'<div class="b-progress">{esc(value)}</div>'
    if kind == 'trend':
        return f'<div class="b-trend">{esc(value)}</div>'
    if kind == 'stars':
        return f'<div class="b-stars">{esc(value)}</div>'
    if kind == 'link':
        return f'<div class="b-link">{esc(value)}</div>'
    if kind == 'stack':
        return f'<div class="b-stack">▸ {esc(value)}</div>'
    if kind == 'question':
        return f'<div class="b-q"><span>Вопрос</span>{esc(value)}</div>'
    if kind == 'finding':
        return f'<div class="b-f"><span>Находка</span>{esc(value)}</div>'
    if kind == 'recommend':
        return f'<div class="b-r"><span>Что делать</span>{esc(value)}</div>'
    if kind == 'table':
        rows = ''.join(
            f'<div class="tr"><span>{esc(k)}</span><b>{esc(v)}</b></div>' for k, v in value)
        return f'<div class="b-table">{rows}</div>'
    if kind == 'sections':
        rows = ''.join(
            f'<div class="sec"><b>{esc(k)}</b><span>{esc(v)}</span></div>' for k, v in value)
        return f'<div class="b-sections">{rows}</div>'
    if kind == 'bars':
        rows = ''.join(
            f'<div class="bar"><div class="bar-t"><span>{esc(k)}</span><b>{esc(v)}</b></div>'
            f'<div class="bar-r"><i style="width:{w}%"></i></div></div>' for k, v, w in value)
        return f'<div class="b-bars">{rows}</div>'
    if kind == 'funnel':
        rows = ''.join(
            f'<div class="fn"><div class="fn-r" style="width:{max(w, 8)}%"></div>'
            f'<div class="fn-t"><span>{esc(k)}</span><b>{esc(v)}</b></div></div>'
            for k, v, w in value)
        return f'<div class="b-funnel">{rows}</div>'
    raise ValueError(f'unknown block kind: {kind}')


def bubble(x):
    mood_label, mood_color = MOODS[x['mood']]
    body = ''.join(block(k, v) for k, v in x['body'])
    foot = f'<div class="foot">{esc(x["foot"])}</div>' if x['foot'] else ''
    note = f'<div class="note">{esc(x["note"])}</div>' if x['note'] else ''
    return f'''<div class="card">
  <div class="card-head">
    <div class="card-id">{esc(x['label'])}<code>{esc(x['id'])}</code></div>
    <div class="chip" style="--c:{mood_color}">{esc(mood_label)}</div>
  </div>
  <div class="tg">
    <div class="bubble mood-{x['mood']}">
      <div class="hero"><span class="hero-e">{x['emoji']}</span><span class="hero-t">{esc(x['hero'])}</span></div>
      {body}
      {foot}
      <div class="tick">12:50 ✓✓</div>
    </div>
  </div>
  {note}
</div>'''


def build():
    by_cat = {}
    for x in T:
        by_cat.setdefault(x['cat'], []).append(x)

    nav = ''.join(
        f'<a href="#{cid}">{esc(title)} <i>{len(by_cat.get(cid, []))}</i></a>'
        for cid, title, _ in CATS)

    sections = []
    for cid, title, subtitle in CATS:
        items = by_cat.get(cid, [])
        cards = ''.join(bubble(x) for x in items)
        sections.append(f'''<section id="{cid}">
  <div class="sec-head">
    <h2>{esc(title)}</h2>
    <p>{esc(subtitle)}</p>
    <div class="sec-count">{len(items)} типов</div>
  </div>
  <div class="grid">{cards}</div>
</section>''')

    html = TEMPLATE.replace('{{NAV}}', nav).replace('{{SECTIONS}}', ''.join(sections))
    html = html.replace('{{TOTAL}}', str(len(T)))
    out = HERE / 'alert-templates-mockup.html'
    out.write_text(html, encoding='utf-8')
    return out


TEMPLATE = '''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Шаблоны Telegram-уведомлений · Phraseman</title>
<style>
  :root{
    --bg:#0f1216; --panel:#161b22; --ink:#e8edf4; --dim:#8b98a9; --line:#232b36;
    --tg-bubble:#1e2b3a; --tg-ink:#e9f0f7; --tg-dim:#8ba3bd; --tg-link:#6ab3f3;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased}
  .wrap{max-width:1500px;margin:0 auto;padding:40px 24px 90px}

  header{margin-bottom:34px}
  h1{font-size:30px;line-height:1.2;margin:0 0 10px;letter-spacing:-.02em}
  .lede{color:var(--dim);max-width:760px;margin:0 0 8px;font-size:16px}
  .lede b{color:var(--ink);font-weight:600}

  .legend{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 0}
  .lg{display:flex;align-items:center;gap:7px;background:var(--panel);
    padding:7px 13px;border-radius:999px;font-size:13px;color:var(--dim)}
  .lg i{width:9px;height:9px;border-radius:50%;background:var(--c);display:block}

  nav{position:sticky;top:0;z-index:20;background:rgba(15,18,22,.93);
    backdrop-filter:blur(12px);padding:14px 0;margin:26px 0 6px;
    display:flex;flex-wrap:wrap;gap:8px}
  nav a{color:var(--dim);text-decoration:none;background:var(--panel);
    padding:8px 14px;border-radius:10px;font-size:13.5px;font-weight:500;
    display:flex;align-items:center;gap:7px;transition:color .15s,background .15s}
  nav a:hover{color:var(--ink);background:#1d242e}
  nav a i{font-style:normal;font-size:11px;color:#5d6b7d;background:#0f1318;
    padding:2px 7px;border-radius:6px}

  section{margin:52px 0 0;scroll-margin-top:72px}
  .sec-head{margin-bottom:22px}
  .sec-head h2{font-size:21px;margin:0 0 5px;letter-spacing:-.01em}
  .sec-head p{margin:0;color:var(--dim);font-size:14.5px;max-width:680px}
  .sec-count{margin-top:9px;font-size:12px;color:#5d6b7d;text-transform:uppercase;letter-spacing:.08em}

  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(348px,1fr));gap:20px}

  .card{background:var(--panel);border-radius:16px;padding:16px 16px 14px;
    display:flex;flex-direction:column;gap:12px}
  .card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  .card-id{font-size:14px;font-weight:600;line-height:1.35}
  .card-id code{display:block;font-size:11.5px;color:#5d6b7d;font-weight:400;
    margin-top:3px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .chip{font-size:11px;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent);
    padding:4px 10px;border-radius:999px;white-space:nowrap;font-weight:600;flex-shrink:0}

  /* ── телеграм-пузырь ── */
  .tg{background:#0c1014;border-radius:12px;padding:14px 12px;
    background-image:radial-gradient(circle at 20% 15%,#16202b 0,transparent 45%),
                     radial-gradient(circle at 80% 85%,#131c26 0,transparent 40%)}
  .bubble{background:var(--tg-bubble);color:var(--tg-ink);border-radius:14px 14px 14px 5px;
    padding:11px 13px 8px;position:relative;font-size:14px;line-height:1.5;
    box-shadow:0 1px 2px rgba(0,0,0,.4)}
  .bubble>div{margin:0 0 7px}
  .bubble>div:last-child{margin-bottom:0}

  .hero{display:flex;gap:9px;align-items:flex-start;margin-bottom:10px!important;
    padding-left:9px;border-radius:4px;position:relative}
  .hero::before{content:"";position:absolute;left:0;top:2px;bottom:2px;width:3px;
    border-radius:3px;background:var(--m)}
  .hero-e{font-size:17px;line-height:1.25}
  .hero-t{font-weight:700;font-size:14.5px;letter-spacing:.01em;color:#fff;line-height:1.3}
  .mood-celebrate{--m:#4ade80}
  .mood-neutral{--m:#7aa7d6}
  .mood-warn{--m:#f0b95c}
  .mood-alarm{--m:#f2706e}
  .mood-digest{--m:#b58ce0}

  .b-plain{color:var(--tg-ink)}
  .b-meta{color:var(--tg-dim);font-size:12.5px}
  .b-stat{color:var(--tg-dim);font-size:13px}
  .b-big{font-size:19px;font-weight:700;color:#fff;letter-spacing:-.01em}
  .b-money{font-size:24px;font-weight:800;color:#4ade80;letter-spacing:-.02em;line-height:1.15}
  .mood-alarm .b-money{color:#f2706e}
  .mood-digest .b-money{color:#fff}
  .b-title{font-weight:600;color:#fff;font-size:14.5px}
  .b-phrase{font-size:17px;font-weight:600;color:#fff}
  .b-from{color:var(--tg-dim);font-size:13px}
  .b-chain{color:var(--tg-ink);font-size:13.5px}
  .b-stars{font-size:16px;color:#f0b95c;letter-spacing:.05em}

  .b-quote{border-left:2.5px solid var(--m);padding:2px 0 2px 10px;
    color:var(--tg-ink);background:rgba(255,255,255,.035);border-radius:0 6px 6px 0}
  .b-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;
    background:rgba(0,0,0,.3);padding:7px 9px;border-radius:7px;color:#ffb4b2;
    overflow-wrap:anywhere}
  .b-stack{font-size:12.5px;color:var(--tg-dim);background:rgba(0,0,0,.22);
    padding:6px 9px;border-radius:7px;cursor:default}
  .b-badge{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.04em;
    background:rgba(255,255,255,.08);color:#fff;padding:3px 9px;border-radius:6px;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .b-warn{font-size:13px;color:#ffcf8f;background:rgba(240,185,92,.13);
    padding:6px 9px;border-radius:7px}
  .b-deadline{font-size:13px;color:#9fd6ff;background:rgba(106,179,243,.12);
    padding:6px 9px;border-radius:7px}
  .b-counter{font-size:13px;color:var(--tg-dim)}
  .b-progress{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;
    color:var(--m);letter-spacing:.02em}
  .b-trend{font-size:13px;color:#4ade80}
  .b-link{color:var(--tg-link);font-size:13.5px}

  .b-table .tr{display:flex;justify-content:space-between;gap:14px;
    padding:3.5px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13.5px}
  .b-table .tr:last-child{border-bottom:0}
  .b-table span{color:var(--tg-dim)}
  .b-table b{color:#fff;font-variant-numeric:tabular-nums}

  .b-sections .sec{display:flex;justify-content:space-between;gap:12px;
    padding:5px 0;font-size:13.5px}
  .b-sections b{color:#fff;font-weight:600}
  .b-sections span{color:var(--tg-dim);text-align:right}

  .b-bars .bar{margin-bottom:7px}
  .b-bars .bar:last-child{margin-bottom:0}
  .bar-t{display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px}
  .bar-t span{color:var(--tg-dim)}
  .bar-t b{color:#fff}
  .bar-r{height:5px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}
  .bar-r i{display:block;height:100%;background:var(--m);border-radius:3px}

  .b-funnel .fn{position:relative;margin-bottom:5px;padding:6px 9px;border-radius:6px;
    background:rgba(255,255,255,.04);overflow:hidden}
  .b-funnel .fn:last-child{margin-bottom:0}
  .fn-r{position:absolute;left:0;top:0;bottom:0;background:rgba(181,140,224,.28)}
  .fn-t{position:relative;display:flex;justify-content:space-between;font-size:13px}
  .fn-t span{color:var(--tg-ink)}
  .fn-t b{color:#fff}

  .b-q span,.b-f span,.b-r span{display:block;font-size:10.5px;text-transform:uppercase;
    letter-spacing:.09em;color:var(--tg-dim);margin-bottom:2px}
  .b-q{color:#fff;font-weight:600}
  .b-f{background:rgba(242,112,110,.12);padding:7px 9px;border-radius:7px;color:#ffc9c8}
  .b-r{background:rgba(74,222,128,.12);padding:7px 9px;border-radius:7px;color:#a6f0c2}

  .foot{color:var(--tg-dim);font-size:12.5px;padding-top:3px}
  .tick{text-align:right;font-size:11px;color:#6d8199;margin-top:4px!important}

  .note{font-size:12.5px;color:#8b98a9;line-height:1.5;padding-left:11px;position:relative}
  .note::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:2px;
    background:#2f3a47;border-radius:2px}

  @media (max-width:640px){
    .wrap{padding:26px 14px 60px}
    h1{font-size:24px}
    .grid{grid-template-columns:1fr}
  }
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>Шаблоны Telegram-уведомлений</h1>
  <p class="lede">Все <b>{{TOTAL}} типов</b> уведомлений, каждый со своим шаблоном: свой
  эмодзи-герой, своя первая строка, свой порядок блоков и свой тон. Сегодня все типы
  идут одним каркасом, поэтому покупка Premium выглядит так же, как падение крона.</p>
  <p class="lede">Пустые поля <b>не печатаются</b>: нет ника — нет строки. Заглушки
  «ник не найден» и «версия не передана клиентом» убраны.</p>
  <div class="legend">
    <div class="lg" style="--c:#4ade80"><i></i>Праздник</div>
    <div class="lg" style="--c:#7aa7d6"><i></i>Нейтральный</div>
    <div class="lg" style="--c:#f0b95c"><i></i>Предупреждение</div>
    <div class="lg" style="--c:#f2706e"><i></i>Тревога</div>
    <div class="lg" style="--c:#b58ce0"><i></i>Сводка</div>
  </div>
</header>
<nav>{{NAV}}</nav>
{{SECTIONS}}
</div>
</body>
</html>'''


if __name__ == '__main__':
    out = build()
    ids = [x['id'] for x in T]
    print(f'Собрано шаблонов: {len(T)}')
    print(f'Уникальных id: {len(set(ids))}')
    print(f'Уникальных шапок: {len(set(x["hero"] for x in T))}')
    print(f'Уникальных эмодзи: {len(set(x["emoji"] for x in T))}')
    print(f'Файл: {out}')

    # Сверка с боевым каталогом: макет обязан покрывать все типы и ничего не выдумывать.
    catalog = HERE.parents[2] / 'functions' / 'src' / 'admin_alert_catalog.ts'
    if catalog.exists():
        real = re.findall(r"\{ id: '([a-zA-Z]+)'", catalog.read_text(encoding='utf-8'))
        missing = [r for r in real if r not in ids]
        extra = [i for i in ids if i not in real]
        print(f'В каталоге типов: {len(real)}')
        print(f'Нет шаблона: {missing or "—"}')
        print(f'Лишние в макете: {extra or "—"}')

    # Сверка с боевой таблицей шаблонов: макет и код обязаны совпадать
    # по шапкам и эмодзи, иначе макет начнёт врать.
    impl = HERE.parents[2] / 'functions' / 'src' / 'admin_alert_templates.ts'
    if impl.exists():
        src = impl.read_text(encoding='utf-8')
        # Берём ОСНОВНОЙ вариант каждого типа: у шести типов есть второй
        # вариант (бан снят, крон поднялся, рассылка упала, низкая оценка),
        # он описан в примечании карточки, а не отдельным пузырём.
        body = src.split('ADMIN_ALERT_TEMPLATES', 1)[1]
        entries = re.findall(r"^  (\w+): \{\s*emoji: '([^']+)', hero: '([^']+)'", body, re.M)
        pairs = {k: e for k, e, _ in entries}
        heroes = {k: h for k, _, h in entries}
        bad = [x['id'] for x in T
               if pairs.get(x['id']) != x['emoji'] or heroes.get(x['id']) != x['hero']]
        print(f'Расхождений макета с кодом: {bad or "—"}')
