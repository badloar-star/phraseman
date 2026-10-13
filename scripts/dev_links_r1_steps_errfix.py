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
#   mistakes-panel-021 — НУЖНА ПОДМЕНА: практика требует ≥5 готовых ошибок (`minFive`), демо-снимок хаба даёт две; подмена в
#                        app/mistake_practice_session_runtime.ts (владелец экрана/Ядро), шагами не лечится.
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
