# Ссылки и шаги Диалогов: память диалогов и свободный разговор без сервера (Ядро 12.10, b25cab943), каталог без сети (dfeeb913e).
#
# зачем (Ядро 12.10): dev_dialog_memory=demo|clearing|clear_fail подменяет память диалогов (настоящая память аккаунта не читается и не стирается);
# свободный разговор без dev_dialog_send=ok создавал НАСТОЯЩУЮ сессию на проде — теперь он обязателен во всех ссылках свободного разговора. Только гость.
# Кнопку подтверждения в окне «Очистить память» берём по тексту: testIDPrefix у окна совпадает с кнопкой экрана (Ядро).
from dev_links_r1_steps import ENTRIES, add


def put(ids, steps, params, nxt, **kw):
    for rid in ([ids] if isinstance(ids, str) else ids):
        ENTRIES.pop(rid, None)
    add(ids, steps, params, nxt, **kw)


MEMORY = '/dialogue_v2_memory'
MEM_BASE = 'plus=on&dev_dialog_memory='
OPEN_CLEAR = ['wait:1200', 'tap:#dialogue-v2-memory-clear-confirm', 'wait:600']
# зачем (Ядро d92d65410): у кнопки окна свой id dialogue-v2-memory-clear-dialog-confirm (раньше совпадал с кнопкой экрана) — подтверждаем по id, не по тексту
CONFIRM_CLEAR = ['wait:1200', 'tap:#dialogue-v2-memory-clear-confirm', 'wait:600', 'tap:#dialogue-v2-memory-clear-dialog-confirm']

put('dialogs-gap-001', ['wait:1200'], MEM_BASE + 'demo', MEMORY, note='«Память диалогов» у Plus: сводка и два сценария (dev_dialog_memory=demo, без чтения настоящей памяти)')
put('dialogs-gap-004', OPEN_CLEAR, MEM_BASE + 'demo', MEMORY, note='«Очистить память?» — окно подтверждения (тап по кнопке очистки)')
put('dialogs-gap-005', CONFIRM_CLEAR + ['wait:300'], MEM_BASE + 'clearing', MEMORY, note='«Очищаем…» (dev_dialog_memory=clearing; подтверждение по id окна)')
put('dialogs-gap-006', CONFIRM_CLEAR + ['wait:800'], MEM_BASE + 'clear_fail', MEMORY, note='«Не удалось очистить» (dev_dialog_memory=clear_fail; подтверждение по id окна)')

# Свободный разговор: подставной ход без сервера (dev_dialog_send=ok обязателен)
FREE = 'plus=on&dquota=reset&energy=5&dev_dialog_send=ok'
FREE_ROUTE = '/dialogue_v2_freeform'
# зачем (Ядро d92d65410): у свободного разговора свои id поля и отправки, НЕ совпадающие с обычным диалогом
SEND = ['tap:#dialogue-v2-freeform-input', 'type:Hello', 'tap:#dialogue-v2-freeform-send', 'wait:300']
put('dialogs-045', [], FREE, FREE_ROUTE, note='свободный разговор у Plus: пустое состояние «Что можно спросить» (dev_dialog_send=ok — без настоящей сессии на проде)')
put('dialogs-046', ['wait:1200'] + SEND, FREE, FREE_ROUTE, note='свободный разговор: реплика отправлена, идёт ответ собеседника (dev_dialog_send=ok, поле dialogue-v2-freeform-input)')
put('dialogs-gap-011', ['wait:1500'], 'plus=on&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_fail=service', FREE_ROUTE, note='свободный разговор: «не удалось продолжить» (dev_dialog_fail=service — отказ приходит на старте, шагов нет)')

# Каталог сообщества без сети (dfeeb913e): catalog=empty обязателен — «Нет сети» показывается только при пустом каталоге
put('cards-v2-044', [], 'catalog=empty&fail=catalog_load', '/flashcards_packs', unique=False, note='каталог без сети: catalog=empty + fail=catalog_load → «Нет сети» + «Повторить» (в образце №44 другие тексты: «Сейчас недоступно · Проверь интернет · Попробовать снова» — сверить на кадре)')


# ── energy-modes: партия 5 Ядра (990c22f61): lessonintro=skip, energy_stop=plus_granted, energy=restoring&restore_in=N
# зачем (Ядро 12.10): вступление урока пропускается флагом (раньше 6 слепых тапов), вход — прямой маршрут /lesson1?id=1&from=lesson_menu
# (меню урока после replace уводило на Главную). Первый неверный вариант слова помечен lesson1-word-option-wrong (25775d555).
EM = '/lesson1?id=1&from=lesson_menu'
LI = 'plus=off&free=on&lessonintro=skip'
START = ['wait:2500']
WRONG = ['tap:#lesson1-word-option-wrong']
STOP = START + WRONG + ['wait:1500']
put('energy-modes-001', START, LI + '&mode=b&energy=5', EM, note='Режим Б: первое задание урока 1, энергия 5 (lessonintro=skip, прямой маршрут)')
put('energy-modes-003', START, LI + '&mode=b&energy=1', EM, note='Режим Б: осталась 1 энергия (energy=1)')
put('energy-modes-002', START + WRONG + ['wait:300'], LI + '&mode=b&energy=5', EM, note='Режим Б: ошибка — тряска и «−1» (lesson1-word-option-wrong)')
put('energy-modes-004', STOP, LI + '&mode=b&energy=1', EM, note='Режим Б: ошибка на последней энергии → шторка остановки (energy-stop-sheet)')
# 005: пейвол поверх шторки; кнопку покупки НЕ жать (сторож: #paywall-cta без _dev_state=/paywall= красный)
put('energy-modes-005', STOP + ['tap:#energy-stop-plus', 'wait:1200'], LI + '&mode=b&energy=1', EM, note='Режим Б: «Продолжить с Plus» → пейвол поверх шторки (кнопку покупки не жать)')
put('energy-modes-006', STOP + ['tap:#energy-stop-plus', 'wait:1500'], LI + '&mode=b&energy=1&energy_stop=plus_granted', EM, note='Режим Б: Plus выдан в памяти (energy_stop=plus_granted) → тост «Plus активирован», занятие на том же вопросе')
put('energy-modes-016', START + WRONG + ['wait:300'], LI + '&mode=a&energy=5', EM, note='Режим А: ошибка — сердечко и серия монет')
put('energy-modes-015', START, LI + '&mode=a&energy=5', EM, note='Режим А: старт занятия, −1 энергия')
# 008: энергия 0, следующая единица через 8 с; шторка «Нужна энергия» → «Подожду» → тост «Энергия восстановилась»
put('energy-modes-008', ['tap:#lesson-menu-primary', 'wait:1200', 'tap:#energy-needed-wait', 'wait:7500'], 'plus=off&free=on&mode=b&energy=restoring&restore_in=8', '/lesson_menu?id=1', unique=False, note='Режим Б: энергия 0, восстановление через 8 с → «Нужна энергия» → «Подожду» → тост (energy=restoring&restore_in=8; состав макета Б8 сверить по кадру)')
