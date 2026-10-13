# Исправления шагов робота по ошибкам step_target_not_found (Сверка: docs/phraseman-2.0/ROBOT_STEP_ERRORS_2026-10-13.md).
#
# зачем (координатор 13.10): робот теряет ~17 % кадров на step_target_not_found. По кадрам ошибок и журналам
# (docs/phraseman-2.0/evidence/parity/_runs/*) разобраны причины; здесь лежат только исправления САМИХ ШАГОВ И ССЫЛОК,
# чужие модули не правятся. Подключается в dev_links_r1_generate.py ПОСЛЕДНИМ, после p84. Как p84: правка идемпотентна,
# записи нет в ENTRIES — понятная ошибка, а не молчаливый пропуск.
#
# Причины и что НЕ здесь (исправлено кодом приложения или нужна подмена/живой кадр):
#   dialogs-015/019/020 — подставной ход не нёс перевод/«Почему так»; исправлено в app/dialogue_v2_turn_coaching_client.ts (13.10), кадры сняты.
#   practice-001…003   — на Блице uiautomator не доходит до idle (полоса таймера); исправлено в 4e74715d4 (animations=off замораживает таймер).
#   video-004, dialogs-006 — переснято успешно после появления демо-каталога videopacks=catalog / повторного прогона.
#   results-009        — запись уже тапает #stats-primary-metric-year перед see:#stats-activity-365 (ошибка была на старых шагах).
#   dialogs-016        — НУЖЕН ЖИВОЙ ХОД: кнопка озвучки только у реплики с готовым голосом, подставной ход звук не подделывает.
#   mistakes-panel-021 — подмена сделана: mistakes=demo теперь засевает журнал гостя ≥5 готовыми ошибками (app/dev_mistakes_seed.ts,
#                        лог [DEV-STATE] mistakes seeded N ready); практика читает этот журнал, `minFive` больше не срабатывает. Ссылка прежняя.
import re

from dev_links_r1_steps import ENTRIES


def _entry(rid):
    if rid not in ENTRIES:
        raise SystemExit(f'errfix: нет записи {rid} в ENTRIES — исправление не к чему применяться')
    return ENTRIES[rid]


def set_steps(rid, steps):
    _entry(rid)['steps'] = list(steps)


def prepend_steps(rid, head):
    entry = _entry(rid)
    if entry['steps'][:len(head)] != list(head):
        entry['steps'] = list(head) + entry['steps']


def set_param(rid, key, value):
    """Задать параметр ссылки: заменить значение или вставить перед `&next=`."""
    entry = _entry(rid)
    link = entry['link']
    if re.search(rf'[?&]{re.escape(key)}=', link):
        link = re.sub(rf'([?&]{re.escape(key)}=)[^&]*', rf'\g<1>{value}', link, count=1)
    else:
        link = link.replace('&next=', f'&{key}={value}&next=', 1)
    entry['link'] = link


# coins-004: кадр ошибки показывает, что состояние «Проверяем повышение» УЖЕ достигнуто (тап прошёл, коин-ранг удерживается
# coinupgrade=hold), но `await:#coin-rank-pending-spinner` не находит узел: KitSpinner крутится бесконечно (Animated.loop),
# и дамп uiautomator не доходит до idle — как на Блице. Ждём по времени, а не по дереву: скриншот от дампа не зависит.
set_steps('coins-004', ['wait:1500', 'tap:#coin-rank-upgrade', 'wait:900'])

# system-015: на кадре ошибки Главная прокручена вниз прошлым прогоном — кнопки шапки не видны, а робот ищет вниз. Сначала вверх.
prepend_steps('system-015', ['scroll:up', 'wait:400'])

# spire-gap-022: ссылка вела на ?state=room (экран задания «Ступень 3»), а пилюля «бета» — на ГЛАВНОМ экране Шпиля
# (SpireHomeScreen: показывается только при изучаемом es/de/fr/it). Нужны state=lobby и studyTarget=es.
_spire = _entry('spire-gap-022')
if 'state=room' in _spire['link']:
    _spire['link'] = _spire['link'].replace('state=room', 'state=lobby', 1)
set_param('spire-gap-022', 'studyTarget', 'es')
set_steps('spire-gap-022', ['wait:2500', 'see:#spire-beta-pill'])

# mistakes-panel-021: ссылка обязана включать mistakes=demo (засев журнала); шаги прежние — хаб → «Начать» → шторка → практика → меню.
if 'mistakes=demo' not in _entry('mistakes-panel-021')['link']:
    set_param('mistakes-panel-021', 'mistakes', 'demo')

# spire-gap-016: «Итог недели» снимался на данных не образца («Нефрит · этаж 7»), ссылка не несла tier/floor. Образец — «Гранит, этаж 4».
_week = _entry('spire-gap-016')
if 'tier=' not in _week['link']:
    _week['link'] = _week['link'] + '%26tier=0%26floor=4'

# cards-v2-037 / cards-section-046: в образце сердца в шапке (SessionAttemptsHud), а кадр снят в режиме Б энергии (EnergyAttemptsHud) — mode=a.
for _rid in ('cards-v2-037', 'cards-section-046'):
    set_param(_rid, 'mode', 'a')

# Проверено и НЕ менялось (ссылка и шаги уже верны, кадр в пересклейке «старый»): cards-041 (#fc-pack-menu на экране набора), cards-gap-011 и cards-v2-027
# (тап #fc-cards-hub-train + пауза), cards-v2-046 (ввод Layover), cards-v2-026 (cards=empty + hidekb), dialogs-gap-016 (hidekb), cards-v2-044 (fail=catalog_load).
# spire-gap-019 — шторка правил на кадре закрыта; причина без журнала [SPIRE-RULES] не установлена, нужна пересъёмка с журналом.

# spire-004/005/014/015 (Макеты 847b8151c): ссылка превью Шпиля не несла tier/floor, поэтому кадр снимался на умолчаниях «Нефрит · этаж 7». Образец — «Гранит, этаж 4».
for _rid in ('spire-004', 'spire-005', 'spire-014', 'spire-015'):
    _spire_row = _entry(_rid)
    if 'tier=' not in _spire_row['link']:
        _spire_row['link'] = _spire_row['link'] + '%26tier=0%26floor=4'

# cards-081: на кадре панель ввода ОС (⌫, поиск, смайл) после type:zzzqq — прячем клавиатуру перед кадром.
_c81 = _entry('cards-081')
if _c81['steps'][-2:] != ['hidekb', 'wait:400']:
    _c81['steps'] = _c81['steps'] + ['hidekb', 'wait:400']

# dialogs-041: настроение «Очень доволен» берётся из mood последнего хода (Ядро), а подставной ход приходил с mood:null — без dev_dialog_mood=happy состояние не показывается.
set_param('dialogs-041', 'dev_dialog_mood', 'happy')
