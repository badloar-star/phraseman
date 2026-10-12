# Ссылки и шаги по п.83 (кнопка языка на «Настройке» тренировки Карточек) и по chain7 Диалогов (dialogs-005/017/018/036) — Дизайн, 12.10 ночь.
#
# зачем: docs/phraseman-2.0/DEV_LINKS_R1.md ГЕНЕРИРУЕТСЯ (scripts/dev_links_r1_generate.py) из ENTRIES; правки руками в самом документе пропадают при следующей генерации
# (так откатились шаги dialogs-017/018/036 и строка cards-027 — коммит f5e3dec80). Поэтому исправления живут здесь и подключены в генераторе ПОСЛЕДНИМИ: put() заменяет прежние записи тех же id.
# Остальные кадры п.83 и «Из видео» (нет строк реестра) — в отдельном документе DEV_LINKS_P83.md.
from dev_links_r1_steps import DLG, DLG_SEND, DLG_START, ENTRIES, SESSION_FREE, add


def put(ids, steps, params, nxt, **kw):
    for rid in ([ids] if isinstance(ids, str) else ids):
        ENTRIES.pop(rid, None)
    add(ids, steps, params, nxt, **kw)


# Подсказку приносит ответ собеседника (подставной ход dev_dialog_send=ok теперь её несёт), поэтому сперва — первая реплика; клавиатуру прячем, иначе тап по карточке цели закроет её, а не откроет окно.
SEND_FIRST = ['tap:#dialogue-v2-session-input', 'type:Hello', 'tap:#dialogue-v2-session-send', 'wait:2500', 'hidekb']

put('dialogs-017', DLG_START + SEND_FIRST + ['tap:#dialogue-v2-session-goal-hint', 'wait:500'], DLG_SEND, DLG,
    note='внутри сессии ПОСЛЕ первого хода (подсказку приносит ответ собеседника; подставной ход её несёт): окно подсказки — открывает кнопка `dialogue-v2-session-goal-hint`, `…-session-hint` — само окно')
put('dialogs-018', DLG_START + ['tap:#dialogue-v2-session-goal', 'wait:500'], DLG_SEND, DLG,
    note='внутри сессии: шторка заданий — открывает тап по карточке цели `dialogue-v2-session-goal`, `…-session-goals` — сама шторка')
# «Выйти из диалога?» показывается ТОЛЬКО после первой реплики (DialogueV2SessionScreen.requestBack: hasConversation); до неё «назад» сразу выходит на предыдущий экран.
put('dialogs-036', DLG_START + SEND_FIRST + ['back', 'wait:600'], SESSION_FREE + '&dev_dialog_send=ok', DLG,
    note='внутри сессии ПОСЛЕ первой реплики: системная «назад» → «Выйти из диалога?» (до реплики терять нечего — «назад» сразу выходит)')
put('dialogs-005', [], 'plus=off&dquota=30&hold=dialog_language_gate', DLG,
    note='хаб с карточкой «Диалоги на этом языке ещё проверяются» (dev-удержание hold=dialog_language_gate; снять: hold=off); «Свободный разговор» под гейтом СКРЫТ (как в образце) — журнал `[DIALOGUE-V2] hub:freeform_hidden reason=language_gate source=dev_hold`')

# п.83: чип языка на «Настройке» — меню открыто (cardslangs=on: списки ES и FR в памяти, app/dev_fc_lang_state.ts); остальные кадры — DEV_LINKS_P83.md
put('cards-027', ['wait:1800', 'tap:#fc-training-setup-language-chip', 'wait:400'], 'cards=demo&plus=off&free=on&cardslangs=on', '/flashcards_training_setup?mode=blitz',
    note='меню языка наборов открыто: чип «EN ⌄», пункты English / Español 3 / Français 2 (cardslangs=on — списки только в памяти; остальные кадры п.83 — DEV_LINKS_P83.md) · пилюля остатка (Free)')
# «Сейчас недоступно» наступает после тихих повторов (1/3/8 с ≈ 12 с); wait:800 снимал скелет.
put('cards-030', ['wait:14000'], 'cards=demo&fail=video_list', '/flashcards_video_packs', note='«Из видео»: список не читается (fail=video_list); скелет ≈2,5 с, затем «Сейчас недоступно» после тихих повторов')

# п.85(2): «Из видео» при пустом каталоге → «Пока пусто» (videopacks=empty: пустой ответ в памяти и локальном кэше устройства, Firestore не вызывается; app/dev_state_fixtures.ts)
put('cards-080', ['wait:1500'], 'videopacks=empty', '/flashcards_video_packs',
    note='«Из видео» при пустом каталоге → «Пока пусто» (videopacks=empty); журнал `[VIDEO-EMPTY] ветка=empty причина=answer_zero_packs`; повторов и «Сейчас недоступно» нет')
