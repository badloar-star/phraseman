# Поправки ссылок и шагов по склейкам «состояние не то / клавиатура / прокрутка» в разделах Карточки и Диалоги — Дизайн, 13.10.
#
# зачем (координатор 13.10, «43 строки: напиши шаги из существующих подмен»): у строк реестра cards*/dialogs* со статусом diff причина часто не в коде, а в кадре — открыта экранная
# клавиатура, список прокручен, остался черновик набора, лимит исчерпан прошлым кадром. Здесь только ПОПРАВКИ уже существующих записей генератора (новых подмен нет — только
# существующие `quota=`, `dquota=`, `cards=empty` и шаги `hidekb`/`scroll:up` из scripts/parity_steps.mjs). Модуль подключён в dev_links_r1_generate.py ПОСЛЕДНИМ (после p83).
# Каждая правка идемпотентна: повторный запуск ничего не меняет, а запись, которой нет в ENTRIES, — ошибка (не молчаливый пропуск).
import re

from dev_links_r1_steps import ENTRIES


def _entry(rid):
    if rid not in ENTRIES:
        raise SystemExit(f'p84: нет записи {rid} в ENTRIES — поправка не к чему применяться')
    return ENTRIES[rid]


def set_param(rid, key, value):
    """Задать параметр ссылки: заменить значение или вставить перед `&next=`."""
    entry = _entry(rid)
    link = entry['link']
    if re.search(rf'[?&]{re.escape(key)}=', link):
        link = re.sub(rf'([?&]{re.escape(key)}=)[^&]*', rf'\g<1>{value}', link, count=1)
    elif '&next=' in link:
        link = link.replace('&next=', f'&{key}={value}&next=', 1)
    else:
        link = f'{link}&{key}={value}'
    entry['link'] = link


def append_steps(rid, extra):
    entry = _entry(rid)
    if entry['steps'][-len(extra):] != list(extra):
        entry['steps'] = entry['steps'] + list(extra)


def replace_step(rid, old, new):
    entry = _entry(rid)
    entry['steps'] = [new if s == old else s for s in entry['steps']]


def add_note(rid, tail):
    entry = _entry(rid)
    if tail not in entry['note']:
        entry['note'] = f"{entry['note']} · {tail}" if entry['note'] else tail


# Поиск в «Сохранённых»: на кадре была открыта клавиатура ОС и скрыта плашка «Тренировать» (cards-section-006, cards-v2-009).
for rid in ('cards-section-006', 'cards-v2-009'):
    append_steps(rid, ['hidekb', 'wait:400'])
    add_note(rid, 'клавиатуру прячем (hidekb) — в образце её нет, плашка «Тренировать» видна')

# Каталог сообщества, «ничего не найдено»: клавиатура ОС на кадре и запрос zzzqq вместо xyzq из образца; черновик набора давал строку «Продолжить создание набора» (cards=empty стирает черновик).
for rid in ('cards-section-023', 'cards-v2-026'):
    replace_step(rid, 'type:zzzqq', 'type:xyzq')
    append_steps(rid, ['hidekb', 'wait:400'])
    set_param(rid, 'cards', 'empty')
    add_note(rid, 'запрос xyzq как в образце; клавиатура спрятана; cards=empty стирает черновик («Продолжить создание набора»)')
for rid in ('cards-section-022', 'cards-v2-025'):
    set_param(rid, 'cards', 'empty')
    add_note(rid, 'cards=empty стирает черновик набора — иначе над списком строка «Продолжить создание набора», которой нет в образце')

# «Новая карточка — превью живое»: клавиатура закрывала живую карточку-превью (cards-v2-024).
append_steps('cards-v2-024', ['hidekb', 'wait:400'])
add_note('cards-v2-024', 'клавиатуру прячем (hidekb): за ней живая карточка-превью «EN · Layover»')

# «1 колонка»: список был прокручен вниз (cards-v2-005); у соседней cards-section-005 шаг уже есть.
append_steps('cards-v2-005', ['wait:500', 'scroll:up'])

# Диалоги: пилюля «30/30» нужна в хабе Free — `dquota=30` (осталось 30 из 30), а не `reset` (dialogs-012).
set_param('dialogs-012', 'dquota', '30')
add_note('dialogs-012', 'dquota=30: пилюля «30/30» под энергией, как в образце')

# Лимит тренировок: в образце «осталось 24 из 30» и активная «Начать»; прошлый кадр оставлял 0/30 (quota=N — ИСПОЛЬЗОВАНО N, значит 6 из 30 использовано).
for rid in ('cards-section-034', 'cards-section-036', 'cards-gap-011'):
    set_param(rid, 'quota', '6')
    add_note(rid, 'quota=6 (использовано 6) → «осталось 24 из 30» как в образце')
