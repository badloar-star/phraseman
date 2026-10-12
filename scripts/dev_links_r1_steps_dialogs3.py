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


# ── energy-modes: первый неверный вариант слова урока 1 помечен lesson1-word-option-wrong (Ядро 25775d555) — ошибка одним шагом
# зачем (Ядро 12.10, кадры energy-modes-002…006 показали Главную): меню урока само уводит только при замке/пейволе, значит либо replace на /lesson_menu не дошёл, либо после него «назад» — пробуем
# ПРЯМОЙ маршрут занятия, как его открывает само меню: /lesson1?id=1&from=lesson_menu (без тапа lesson-menu-primary). Если и он даст Главную — дело не в меню, нужен журнал (запрос Сверке).
EM = '/lesson1?id=1&from=lesson_menu'
# зачем (кадр energy-modes-015 7:38: прямой маршрут открыл урок 1, но перед первым заданием — вступительные экраны «Зачем это в испанском» («Коснитесь, чтобы увидеть дальше»), тап в любом месте = следующий блок, в конце кнопка lesson-intro-start):
# листаем тапами в середину экрана и жмём «Начать»; число блоков заранее не известно, лишние тапы безвредны — не проверено на кадре
INTRO_TAP = ['xy:540,1300', 'wait:700']
START = ['wait:1500'] + INTRO_TAP * 6 + ['await:#lesson-intro-start', 'tap:#lesson-intro-start', 'wait:2500']
WRONG = ['tap:#lesson1-word-option-wrong']
put('energy-modes-001', START, 'plus=off&free=on&mode=b&energy=5', EM, unique=False, note='Режим Б: первое задание урока 1, энергия 5 (прямой маршрут /lesson1?id=1&from=lesson_menu; не проверено на кадре)')
put('energy-modes-003', START, 'plus=off&free=on&mode=b&energy=1', EM, unique=False, note='Режим Б: осталась 1 энергия (energy=1; прямой маршрут занятия, не проверено на кадре)')
put('energy-modes-002', START + WRONG + ['wait:300'], 'plus=off&free=on&mode=b&energy=5', EM, unique=False, note='Режим Б: ошибка — тряска и «−1» (lesson1-word-option-wrong; прямой маршрут занятия)')
put('energy-modes-004', START + WRONG + ['wait:1500'], 'plus=off&free=on&mode=b&energy=1', EM, unique=False, note='Режим Б: ошибка на последней энергии → остановка (прямой маршрут занятия)')
put('energy-modes-016', START + WRONG + ['wait:300'], 'plus=off&free=on&mode=a&energy=5', EM, unique=False, note='Режим А: ошибка — сердечко и серия монет (прямой маршрут занятия)')

put('energy-modes-015', START, 'plus=off&free=on&mode=a&energy=5', EM, unique=False, note='Режим А: старт занятия, −1 энергия (прямой маршрут + пролистать вступление урока; не проверено на кадре)')
