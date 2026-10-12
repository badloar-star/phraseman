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
# зачем (Ядро 13.10, energy-modes-002/004/016): тап по слову только ставит его в фразу — ошибка засчитывается проверкой (автопроверка выключена).
# Неверное первое слово + два верных + «Проверить»; метка -wrong — первый неверный вариант ТЕКУЩЕЙ позиции.
WRONG = ['tap:#lesson1-word-option-wrong', 'tap:#lesson1-word-option-correct', 'tap:#lesson1-word-option-correct', 'tap:#lesson1-check']
STOP = START + WRONG + ['wait:1500']
put('energy-modes-001', START, LI + '&mode=b&energy=5', EM, note='Режим Б: первое задание урока 1, энергия 5 (lessonintro=skip, прямой маршрут)')
put('energy-modes-003', START, LI + '&mode=b&energy=1', EM, note='Режим Б: осталась 1 энергия (energy=1)')
put('energy-modes-002', START + WRONG + ['wait:600'], LI + '&mode=b&energy=5', EM, note='Режим Б: ошибка — тряска и «−1» (lesson1-word-option-wrong)')
put('energy-modes-004', STOP, LI + '&mode=b&energy=1', EM, note='Режим Б: ошибка на последней энергии → шторка остановки (energy-stop-sheet)')
# 005: пейвол поверх шторки; кнопку покупки НЕ жать (сторож: #paywall-cta без _dev_state=/paywall= красный)
put('energy-modes-005', STOP + ['tap:#energy-stop-plus', 'wait:1200'], LI + '&mode=b&energy=1', EM, note='Режим Б: «Продолжить с Plus» → пейвол поверх шторки (кнопку покупки не жать)')
put('energy-modes-006', STOP + ['tap:#energy-stop-plus', 'wait:1500'], LI + '&mode=b&energy=1&energy_stop=plus_granted', EM, note='Режим Б: Plus выдан в памяти (energy_stop=plus_granted) → тост «Plus активирован», занятие на том же вопросе')
put('energy-modes-016', START + WRONG + ['wait:600'], LI + '&mode=a&energy=5', EM, note='Режим А: ошибка — сердечко и серия монет')
put('energy-modes-015', START, LI + '&mode=a&energy=5', EM, note='Режим А: старт занятия, −1 энергия')
# 008: энергия 0, следующая единица через 8 с; шторка «Нужна энергия» → «Подожду» → тост «Энергия восстановилась»
put('energy-modes-008', ['wait:3000', 'tap:#lesson-menu-primary', 'wait:1200', 'tap:#energy-needed-wait', 'wait:7500'], 'plus=off&free=on&mode=b&energy=restoring&restore_in=8', '/lesson_menu?id=1', unique=False, note='Режим Б: энергия 0, восстановление через 8 с → «Нужна энергия» → «Подожду» → тост (energy=restoring&restore_in=8; состав макета Б8 сверить по кадру)')

# ── Партия 4 Ядра (d0c04fbfd): cards=demo_nopacks, energy=0, blitz_answer=wrong, mode=a
# зачем (Ядро 12.10): хвосты Карточек и энергии — только гость; в energy-modes-013 пилюля энергии не меняется (ошибка в диалоге энергию не тратит)
from dev_links_r1_steps import DLG_START as _DS, DLG as _DLG  # noqa: E402
put('cards-gap-019', ['tap:Layover', 'tap:#fc-expanded-to-pack'], 'cards=demo_nopacks&plus=on', '/flashcards_collection?cat=saved', note='шторка «В какой набор?»: своих наборов пока нет (cards=demo_nopacks → тап по карточке → «В набор»)')
put('cards-gap-040', [], 'cards=demo&plus=off&free=on&mode=a&energy=5', '/flashcards_recall_session?deck=saved&size=all&dir=to_target', note='«Напиши»: флаг energy_mistake_charge выключен (mode=a) — пилюля энергии вместо сердец')
put('energy-modes-007', ['wait:3000', 'tap:#lesson-menu-primary', 'wait:1500'], 'plus=off&free=on&mode=b&energy=0', '/lesson_menu?id=1', unique=False, note='Режим Б: энергии 0 → шторка «Нужна энергия» (energy-needed-sheet); если меню уводит на Главную — прислать журнал [ENERGY-NEEDED]')
put('energy-modes-012', ['wait:4000', 'await:#fc-blitz-opt-target', 'tap:#fc-blitz-opt-target', 'wait:300'], 'cards=demo&plus=off&free=on&mode=b&energy=5&blitz_answer=wrong', '/flashcards_blitz_session?deck=saved&sec=60', note='Режим Б: блиц, неверный ответ — −1 энергия, сердец нет (blitz_answer=wrong)')
put('energy-modes-013', _DS + ['tap:#dialogue-v2-session-input', 'type:I goed home', 'tap:#dialogue-v2-session-send', 'wait:2500'], 'plus=off&mode=b&energy=5&dquota=reset&coinRank=6&aiConsent=granted&dev_dialog_send=ok', _DLG, unique=False, note='Режим Б: диалог, реплика с ошибкой — пилюля энергии не меняется (dev_dialog_send=ok)')
put('energy-modes-014', ['tap:#home-v2-phrase-of-day', 'wait:800'], 'plus=off&mode=b&energy=5', '/(tabs)/home', unique=False, note='Режим Б: фраза дня энергию не тратит (пилюля на Главной)')

# ── Круг «40 строк по кадру» (Макеты 12.10, по просьбе координатора): шаги по подменам Ядра/кодам экранов
# зачем: «Вспомни и напиши» — подсказка / ответ показан / неверный ввод детерминированы (карточка не нужна); верный ввод и «Правда/ложь»
# зависят от случайного порядка карточек (shuffle в сессии) — для них нужна подмена Ядра (запрос отправлен), строки manual_conditional.
from dev_links_r1_steps import RECALL_ROUTE as _RR  # noqa: E402
_RECALL = 'cards=demo&plus=on&studyTarget=en'
_R0 = ['wait:4000', 'await:#fc-recall-input']
put('cards-v2-049', _R0 + ['tap:#fc-recall-hint', 'wait:500'], _RECALL, _RR, unique=False, note='«Вспомни и напиши»: подсказка (fc-recall-hint); шаг не проверен на кадре')
put('cards-v2-050', _R0 + ['tap:#fc-recall-reveal', 'wait:600'], _RECALL, _RR, unique=False, note='«Вспомни и напиши»: ответ показан, «Знал / Не знал» (fc-recall-reveal); шаг не проверен на кадре')
put(['cards-v2-040', 'cards-section-052'], _R0 + ['tap:#fc-recall-input', 'type:zzzz', 'tap:#fc-recall-check', 'wait:800'], _RECALL, _RR, unique=False, note='«Напиши — неверно»: введено zzzz → проверка; шаг не проверен на кадре')
put('cards-section-016', ['tap:Layover', 'wait:600'], 'cards=demo&plus=on&studyTarget=en', '/flashcards_collection?cat=saved', unique=False, note='«Своя карточка»: раскрытая карточка Layover (лицевая сторона) — тап по плитке')
put('spire-gap-022', ['see:#spire-beta-pill'], '', '/dev_spire_preview?state=room&spirePanel=off&tier=0&floor=4', unique=False, note='«бета» рядом с языком (es/de/fr/it): гость по умолчанию с изучаемым es; тап не нужен')
put('community-024', ['wait:800', 'tap:#friend-row-body-dev-demo-friend-1', 'wait:800', 'tap:#friend-together-sheet-delete', 'wait:800'], 'friends=demo&spire=open&plus=off&free=on&cards=demo', '/(tabs)/community', unique=False, note='«Удалить друга?»: демо-друг Maria → шторка «вместе» → «Удалить» (подтверждение не жать)')
put('community-012', ['tap:#friends-open-add', 'wait:800', 'tap:#friends-code-input', 'type:ZZ98', 'tap:#friends-search', 'wait:1500'], 'friends=demo&spire=open&plus=off&free=on&cards=demo', '/(tabs)/community', unique=False, note='«ник или код не найден»: поиск по несуществующему коду ZZ98 — настоящий поиск (чтение), без подмены')

# ── Подмены Авторизации (DEV_SWITCHES_R1_CORE.md, «Авторизация — Карточки и Друзья»): итоги тренировок, answer=, cards=demo_few, fail=video_list, друзья
# зачем: переводит manual_conditional → ready; сеть в подменённых ветках не вызывается; итоги идут через /dev_cards_result_preview, не через настоящую тренировку
_RES = '/dev_cards_result_preview?state='
_T = 'tap:#fc-training-setup-deck-saved'
_S = [_T, 'tap:#fc-training-setup-start', 'wait:2500']
_F = 'friends=demo&spire=open&plus=off&free=on&cards=demo'
_SRCH = ['tap:#friends-open-add', 'wait:800', 'tap:#friends-code-input']
put(['cards-v2-041', 'cards-section-053', 'cards-section-054'], ['wait:1500'], '', _RES + 'errors', note='итог тренировки с ошибками (/dev_cards_result_preview?state=errors; данные макета, монеты не зачисляются)')
put(['cards-v2-042', 'cards-section-055'], ['wait:1500'], '', _RES + 'clean', note='итог тренировки без ошибок (state=clean)')
put('cards-v2-051', ['wait:1500'], '', _RES + 'good', note='итог «Хороший результат» (state=good); плашка баланса показывает настоящий баланс устройства, не «1 240» из макета')
put('cards-v2-052', ['wait:1500'], '', _RES + 'grow', note='итог «Есть куда расти» (state=grow); плашка баланса — настоящий баланс устройства')
put(['cards-v2-038', 'cards-section-049'], _S + ['tap:#flashcards-truefalse-answer-target', 'wait:600'], 'cards=demo&plus=on&answer=wrong', '/flashcards_training_setup?mode=truefalse', note='«Правда/ложь»: неверный ответ — панель «Неверно» (answer=wrong помечает кнопку testID flashcards-truefalse-answer-target); слово — первая карточка демо, не Gate из макета')
put(['cards-v2-039', 'cards-section-050'], _S + ['tap:#fc-recall-check', 'wait:600'], 'cards=demo&plus=on&answer=correct', '/flashcards_training_setup?mode=recall', note='«Напиши»: верный ответ вписан (answer=correct) → панель «Верно» +10; слово — первая карточка демо')
put('cards-026', [_T, 'wait:500'], 'cards=demo_few&plus=on', '/flashcards_training_setup?mode=blitz', note='«Мало карточек для блица»: 3 карточки (cards=demo_few), подсказка «Для блица нужно минимум 4 карточки.»')
put('cards-030', ['wait:800'], 'cards=demo&fail=video_list', '/flashcards_video_packs', note='«Из видео»: список не читается (fail=video_list)')
put('community-008', _SRCH + ['type:ZZ99', 'tap:#friends-search'], _F + '&dev_friends_hold=search', '/(tabs)/community', note='поиск друга держится в скелетоне (dev_friends_hold=search) — снимать сразу после тапа')
put('community-013', _SRCH + ['type:DEVSLF', 'tap:#friends-search', 'wait:800'], _F, '/(tabs)/community', unique=False, note='«это твой код» (код DEVSLF; фраза выбирается случайно из 5)')
put('community-015', _SRCH + ['type:ZZ99', 'tap:#friends-search', 'wait:800'], _F + '&dev_friends_fail=search_offline', '/(tabs)/community', note='поиск без сети (dev_friends_fail=search_offline)')
put('community-021', ['wait:1000'], _F + '&dev_friends_fail=list', '/(tabs)/community', note='«Связь пропала»: вкладка «Друзья» не загрузилась (dev_friends_fail=list)')

# ── cards-027 (владелец 12.10: п.82(2) → уточнение п.83): кнопка языка на настройке тренировки — фильтр наборов по языку (чип «EN ⌄» + меню), рядом пилюля остатка Free; у пользователя с наборами на одном языке чип без стрелки (R1_FC_LANG_FILTER.md)
put('cards-027', [], 'cards=demo&plus=off&free=on', '/flashcards_training_setup?mode=blitz', unique=False, note='настройка тренировки: чип языка «EN» (+ стрелка и меню, если наборы на нескольких языках) и пилюля остатка (Free); образец cards-states №22 перерисован 12.10 по п.83; меню открывается тапом по чипу (в dev-демо наборы только на английском — стрелки может не быть)')

# ── packs-simple-001 (вердикт 144): образец — вкладка «Наборы» внутри «Сообщества» (код: community-sections-packs), а не отдельный /flashcards_packs
put('packs-simple-001', ['wait:1200', 'tap:#community-sections-packs', 'wait:1500'], 'catalog=demo&spire=open&plus=off&free=on', '/(tabs)/community', unique=False, note='каталог наборов внутри «Сообщества» (вкладка «Наборы» есть в коде: community-sections-packs, шапка «Шпиль · Друзья · Наборы»)')
