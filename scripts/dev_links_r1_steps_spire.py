# Ссылки и шаги для кадров Шпиля (R1) — запись в тот же реестр ENTRIES, что и dev_links_r1_steps.py (Темы, 15.10, по поручению координатора).
#
# зачем: робот scripts/parity_batch_shoot.mjs снимает Шпиль сам. Состояния Шпиля берутся из dev-превью `/dev_spire_preview?state=…`
# (components/spire/spire_preview_fixtures.ts: моки, в сеть ничего не уходит); `spirePanel=off` убирает полосу переключения состояний, которая
# перекрывала низ кадров (Сверка, spire-gap-008). Ссылка идёт через `dev_state`, чтобы пройти онбординг и вернуть маркер готовности робота.
#
# Правило честности: unique=True только там, где состояние превью однозначно соответствует ярлыку строки реестра; где в превью нет нужного
# состояния (оффлайн «все участники», причины провала «время/прервана», прокрутка правил до конца, флажок жалобы, пилюля «бета») — unique=False,
# Сверка снимает руками. Файл подключается из scripts/dev_links_r1_generate.py (import), отдельный от общего steps-файла, чтобы не пересекаться с его правками.
from dev_links_r1_steps import add

PANEL_OFF = 'spirePanel=off'


def preview(state, extra=''):
    """Маршрут dev-превью Шпиля без полосы состояний. `&` экранирует link() из общего модуля."""
    tail = f'&{extra}' if extra else ''
    return f'/dev_spire_preview?state={state}&{PANEL_OFF}{tail}'


NEXT_TOUR = 'tap:#spire-tour-next'
# зачем (Ядро/Макеты d39cb4db3, 13.10): образцы сняты на «Гранит · этаж 4», превью без параметров — «Нефрит · этаж 7»; строки, где видны лига или этаж, несут tier=0&floor=4

# ── Тур первого входа
add('spire-001', [], '', preview('tour'), note='тур, страница 1')
add('spire-002', [NEXT_TOUR], '', preview('tour'), note='тур, страница 2')
add('spire-003', [NEXT_TOUR, NEXT_TOUR], '', preview('tour'), note='тур, страница 3')

# ── Главный экран
add(['spire-004'], [], '', preview('room'), note='башня, этаж 7 (превью)')
add(['spire-005', 'community-002'], ['see:#spire-all-members'], '', preview('room'), note='ниже башни: друзья и пьедестал (see: подкручивает страницу, scroll:down крутил окно башни)')
add('spire-gap-009', [], '', preview('empty', 'tier=0&floor=4'), note='комнаты ещё нет, «Подняться» зависит от данных превью')
add('spire-gap-010', ['see:#spire-all-members'], '', preview('empty', 'tier=0&floor=4'), note='пьедестал и «Все участники» без комнаты — по превью «empty», прокрутка вниз')
add('spire-gap-007', [], '', preview('block_offline', 'tier=0&floor=4'), note='нет сети — задания недели не скачались')
add('spire-gap-008', [], '', preview('block_missing', 'tier=0&floor=4'), note='задания недели ещё готовятся')
add('spire-gap-011', [], '', preview('locked', 'tier=0&floor=4'), note='«Шпиль откроется чуть позже»')

# ── Все участники, правила
# зачем (сторож селекторов 12.10): testID кнопки «Все участники» — spire-all-members (SpirePodium); прежний spire-open-all не существовал
add('spire-006', ['tap:#spire-all-members'], '', preview('room', 'tier=0&floor=4'), note='«Все участники»')
add('community-003', [], '', preview('all'), note='в превью нет состояния offline-safe: плашки «Последнее обновление…» нет', unique=False)
# зачем (координатор 12.10, Темы f8c38da27): превью принимает tier= (0 = Гранит) и floor= — данные образцов «Гранит, этаж 4» (spire-007/011/gap-018) и «Базальт, этаж 1» (gap-015)
add('community-004', [], '', preview('rules'), note='шторка правил, начало списка')
add('spire-gap-018', [], '', preview('rules', 'tier=0&floor=4'), note='шторка правил, начало списка (данные образца: Гранит, этаж 4)')
add('spire-gap-019', ['scroll:down'], '', preview('rules', 'tier=0&floor=4'), note='прокрутка списка внутри шторки — шаг не отлажен', unique=False)

# ── Ступень
add('spire-007', [], '', preview('step_choice', 'tier=0&floor=4'), note='задание с выбором ответа')
add('spire-008', [], '', preview('step_wrong', 'tier=0&floor=4'), note='ошибка — правильный ответ')
add('spire-009', [], '', preview('step_choice', 'exit=1&tier=0&floor=4'), note='выход — шторка подтверждения')
# зачем (12.10, координатор): флажок «пожаловаться» теперь есть и в превью (Дизайн 8390b34c9: testID spire-task-report-0, состояния step_* при answering) —
# ждём его перед кадром, чтобы кадр снимался в фазе «вопрос показан, ответ не дан». Раньше шаг был откатан, пока превью передавало reportSlot={null}.
add('spire-gap-001', ['see:#spire-task-report-0'], '', preview('step_gap', 'tier=0&floor=4'), note='вставь слово')
add('spire-gap-002', ['see:#spire-task-report-0'], '', preview('step_odd', 'tier=0&floor=4'), note='найди лишнее')
add('spire-gap-003', [], '', preview('step_build', 'tier=0&floor=4'), note='собери перевод')
add('spire-gap-004', ['see:#spire-task-report-0'], '', preview('step_listen_choose', 'tier=0&floor=4'), note='послушай и выбери')
add('spire-gap-005', ['see:#spire-task-report-0'], '', preview('step_listen_build', 'tier=0&floor=4'), note='послушай и собери')
add('spire-gap-006', [], '', preview('step_items', 'tier=0&floor=4'), note='найди пары')
# зачем (координатор 12.10): spire-gap-021 — задание с флажком жалобы: то же превью step_choice (флажок есть в превью, testID spire-task-report-0)
add('spire-gap-021', ['see:#spire-task-report-0'], '', preview('step_choice', 'tier=0&floor=4'), note='ступень с флажком жалобы')
add('spire-gap-020', [], '', preview('step_prep', 'tier=0&floor=4'), note='готовим ступень…')

# ── Итоги ступени
add('spire-010', [], '', preview('passed', 'tier=0&floor=4'), note='ступень пройдена')
add('spire-011', [], '', preview('lose', 'tier=0&floor=4'), note='ступень провалена')
add('spire-012', [], '', preview('guard', 'tier=0&floor=4'), note='этаж 4 пройден — впереди Страж')
add('spire-013', [], '', preview('summit', 'tier=0&floor=4'), note='вершина, 15 этаж')
# зачем (координатор 12.10): в превью появились причины провала lose_timeout / lose_aborted (components/spire/spire_preview_fixtures.ts) — строки различаются
add('spire-gap-012', [], '', preview('lose_timeout', 'tier=0&floor=4'), note='провал — время вышло (причина timeout)')
add('spire-gap-013', [], '', preview('lose_aborted', 'tier=0&floor=4'), note='провал — ступень прервана (причина backed_out)')
add('spire-gap-014', [], '', preview('save_failed', 'tier=0&floor=4'), note='ступень не сохранилась')

# ── Итог недели
add(['spire-014', 'community-005'], [], '', preview('weekresult'), note='поднимаешься (Нефрит)')
add('spire-gap-015', [], '', preview('weekresult', 'tier=1&floor=1&steps=39'), note='итог недели — поднимаешься (данные образца: Базальт, этаж 1)')
add(['spire-015', 'spire-gap-016'], [], '', preview('weekresult_stay'), note='остаёшься')
add('spire-gap-017', [], '', preview('weekresult_down', 'tier=0&floor=1&steps=5'), note='спускаешься (данные образца №17: в Гранит, 5 ступеней, новая неделя с 1 этажа)')

# ── Энергия и сеть
add('spire-016', [], 'plus=off&energy=0', preview('room', 'tier=0&floor=4'), note='нет энергии: кнопка неактивна, «Энергия через …» (живая энергия приложения)')
add('spire-017', [], '', preview('offline', 'tier=0&floor=4'), note='нет сети')
