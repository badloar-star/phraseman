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

put('dialogs-gap-001', ['wait:1200'], MEM_BASE + 'demo', MEMORY, note='«Память диалогов» у Plus: сводка и два сценария (dev_dialog_memory=demo, без чтения настоящей памяти)')
put('dialogs-gap-004', OPEN_CLEAR, MEM_BASE + 'demo', MEMORY, note='«Очистить память?» — окно подтверждения (тап по кнопке очистки)')
put('dialogs-gap-005', OPEN_CLEAR + ['tap:Очистить', 'wait:300'], MEM_BASE + 'clearing', MEMORY, unique=False, note='«Очищаем…» (dev_dialog_memory=clearing; текст кнопки подтверждения «Очистить» — не проверен на кадре)')
put('dialogs-gap-006', OPEN_CLEAR + ['tap:Очистить', 'wait:800'], MEM_BASE + 'clear_fail', MEMORY, unique=False, note='«Не удалось очистить» (dev_dialog_memory=clear_fail; текст кнопки подтверждения «Очистить» — не проверен на кадре)')

# Свободный разговор: подставной ход без сервера (dev_dialog_send=ok обязателен)
FREE = 'plus=on&dquota=reset&energy=5&dev_dialog_send=ok'
FREE_ROUTE = '/dialogue_v2_freeform'
SEND = ['tap:#dialogue-v2-session-input', 'type:Hello', 'tap:#dialogue-v2-session-send', 'wait:1500']
put('dialogs-045', [], FREE, FREE_ROUTE, note='свободный разговор у Plus: пустое состояние «Что можно спросить» (dev_dialog_send=ok — без настоящей сессии на проде)')
put('dialogs-046', ['wait:1200'] + SEND, FREE, FREE_ROUTE, unique=False, note='свободный разговор: реплика отправлена, ответ собеседника (dev_dialog_send=ok); id поля ввода сессии общие с обычным диалогом — не проверено на кадре')
put('dialogs-gap-011', ['wait:1200'] + SEND, 'plus=on&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_fail=service', FREE_ROUTE, unique=False, note='свободный разговор: «не удалось продолжить» (dev_dialog_fail=service после реплики)')

# Каталог сообщества без сети (dfeeb913e): catalog=empty обязателен — «Нет сети» показывается только при пустом каталоге
put('cards-v2-044', [], 'catalog=empty&fail=catalog_load', '/flashcards_packs', unique=False, note='каталог без сети: catalog=empty + fail=catalog_load → «Нет сети» + «Повторить» (в образце №44 другие тексты: «Сейчас недоступно · Проверь интернет · Попробовать снова» — сверить на кадре)')
