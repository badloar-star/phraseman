# Ссылки и шаги Карточек для покрытия съёмки r1 — группа (2б) «подмены», которые уже есть в приложении (app/dev_cards_state.ts, dev_state_cards_demo.ts).
#
# зачем (координатор 12.10, R1_PENDING_COVERAGE): Макеты числили эти строки как «не хватает подмены», но подмены написаны (cards=demo_published, fail=…, hold=…, train_gate=…, speech=…):
# строкам не хватало только ссылки и шагов. Только анонимный гость (dev_state_account_guard); все подмены — в памяти процесса, в облако ничего не пишется.
# Файл подключается из scripts/dev_links_r1_generate.py (import), как dev_links_r1_steps_spire.py.
from dev_links_r1_steps import (
    BLITZ_ROUTE, CREATE, DEMO, DEMO_PLUS, EMPTY_PLUS, HUB, MYPACKS, PACKS, RECALL_ROUTE, SAVED, SPEAK_ROUTE, TF_ROUTE, TILE, TO_PACK, WORK, MENU, add,
)

PACK_WORK = f'tap:#fc-expanded-pack-{WORK}'
PUB = 'local_pack_dev_demo_published'
DEMO_PUB = 'cards=demo_published&catalog=demo&plus=on'

# ── Сбои слоя данных (fail=…) и удержания (hold=…)
add('cards-077', [], DEMO + '&fail=setup_decks', '/flashcards_training_setup?mode=truefalse', note='настройка тренировки: «Ошибка сети» (fail=setup_decks; режим в маршруте обязателен)')
add('cards-gap-009', [], DEMO + '&fail=recall_load', RECALL_ROUTE, note='«Напиши»: «Сейчас недоступно» (fail=recall_load)')
add('cards-gap-003', [], DEMO + '&hold=swipe_quickstart', TF_ROUTE, note='«Правда / ложь»: «Готовим тренировку…» держится (hold=swipe_quickstart; снять: hold=off)')
add('cards-gap-005', [], DEMO + '&train_gate=fail_swipe_prepare', TF_ROUTE, note='«Правда / ложь»: «Не удалось подготовить тренировку. Энергия возвращена.» (train_gate=fail_swipe_prepare)')
add('cards-gap-022', [TILE, TO_PACK, PACK_WORK], DEMO + '&fail=pack_write', SAVED, note='тост «Не удалось добавить» при добавлении карточки в набор (fail=pack_write)')
add('cards-gap-035', ['long:#flashcards-pack-card-dev_demo_community_1', 'tap:#flashcards-pack-add'], 'catalog=demo&fail=pack_write', PACKS, note='каталог: «не сохранился на телефоне» («Добавить себе» при fail=pack_write)')

# ── Устно: удержание микрофона подменено верным ответом (speech=correct, SpeakingPanel); подпись кнопки — «Зажми и говори» (интерфейс ru)
# зачем (сбои ROBOT9, 12.10): кнопки «Зажми и говори» в сессии нет — это круглый микрофон `fc-speak-mic` (нажал — говорю, нажал — стоп); подмена речи срабатывает на этих двух нажатиях
add('cards-section-046', ['tap:#fc-speak-mic', 'wait:900', 'tap:#fc-speak-mic', 'wait:1200'], DEMO + '&speech=correct', SPEAK_ROUTE, note='«Устно — верно»: удержание микрофона подменено верным ответом (speech=correct; только русский интерфейс)')

# ── Фильтр по уроку: карточки с источником «урок» (cards=demo_lessons: те же 64, у части source=lesson)
# зачем (сбои ROBOT9, 12.10): строка «Фильтр» в меню «⋯» появляется только при виде «Фразы» (hasFilter: savedContentKind === 'phrase') — сперва чип «Фразы»
add('cards-gap-024', [MENU, 'tap:Фразы', 'wait:600', 'tap:#fc-menu-filter', 'tap:Урок 3'], 'cards=demo_lessons&plus=on', SAVED, note='фильтр «Урок 3» (cards=demo_lessons)')

# ── Свой ОПУБЛИКОВАННЫЙ набор автора (cards=demo_published: локальный набор «Мой опубликованный», 10 карточек, + кэш каталога от моего stableId)
# unique=False: кадр пробной съёмки 12.10 03:24 показал «B1 · 10 карточек · Только ты» — у демо-набора нет одобрения модерации, бейдж «В сообществе» и «Править набор» не рисуются (flashcards_collection.tsx:1030-1039)
# зачем (12.10, кадры cards-040/041 6:24–6:25 показали список «Из видео» вместо экрана набора): «Мой набор — ещё не в сообществе» = набор «Путешествия» (cards=demo, «На проверке») из «Моих наборов»; cards-041 — его шторка действий по долгому нажатию («Отправить в сообщество / Править набор / Новая карточка / Удалить набор»).
TRAVEL = 'local_pack_dev_demo_travel'
add('cards-040', [f'tap:#fc-my-packs-pack-{TRAVEL}', 'wait:800'], DEMO, MYPACKS, note='свой набор «Путешествия», ещё не в сообществе (cards=demo)')
add('cards-041', [f'long:#fc-my-packs-pack-{TRAVEL}', 'wait:600'], DEMO, MYPACKS, note='действия со своим набором: шторка по долгому нажатию («Отправить в сообщество»)')
add('cards-042', [f'tap:#fc-my-packs-pack-{PUB}'], DEMO_PUB, MYPACKS, note='свой опубликованный набор открыт: «Только ты» (одобрения модерации у демо нет — бейдж «В сообществе» и «Править набор» недостижимы без серверной записи)', unique=False)
add('cards-049', [], DEMO_PUB, PACKS, note='каталог: свой опубликованный набор (карандаш, «Топ») — не проверено на кадре (пробная съёмка 12.10 пересеклась с прогоном Сверки)', unique=False)

# ── Разовая подсказка «Зажми карточку…» (cards-033): фикстуры карточек помечают её увиденной, hint=show возвращает её для этого кадра
add('cards-033', [], DEMO + '&hint=show', SAVED, note='разовая подсказка «Зажми карточку, чтобы изменить или удалить её» (hint=show; остальные кадры карточек её не показывают)')

# ── Группа (2а), Карточки: прямые маршруты сессий тренировок и экранов, достижимых одной ссылкой (cards=demo — Plus on, без энергии)
add('cards-section-008', [], DEMO, SAVED, note='«Сохранённые» — 2 колонки (вид по умолчанию после фикстуры)')
add('cards-section-010', [f'long:#fc-my-packs-pack-{WORK}'], DEMO_PLUS, MYPACKS, note='действия с набором: шторка по долгому нажатию на «Работа»')
add(['cards-v2-031', 'cards-section-039'], [], DEMO, BLITZ_ROUTE, note='«Блиц»: сессия, первый вопрос')
# зачем (12.10): кадр cards-v2-033 снимали на экране «Готовим тренировку…» (подготовка ещё идёт) — ждём 4 с до первой карточки; если и после паузы «Готовим…», это висящая подготовка (нужен журнал [FLASHCARDS-SESSION]).
add(['cards-v2-033', 'cards-section-042'], ['wait:4000'], DEMO, TF_ROUTE, note='«Правда / ложь»: сессия, первая карточка')
add(['cards-v2-034', 'cards-section-043'], [], DEMO, RECALL_ROUTE, note='«Вспомни и напиши»: сессия, первая карточка')
# зачем (координатор 12.10): у en всегда есть стартовая колода «Первые 50» (deck_options.ts) — «Нет карточек» недостижимо; у es колоды нет. studyTarget=es — dev-подмена языка изучения (только гость, локально, без выгрузки)
add(['cards-v2-029', 'cards-076'], [], EMPTY_PLUS + '&studyTarget=es', '/flashcards_training_setup?mode=blitz', note='настройка тренировки без карточек: гость с языком изучения es + cards=empty → «Нет карточек» (studyTarget=es)')
add('cards-078', [], DEMO, '/flashcards_training_setup', note='«Режим недоступен»: маршрут настройки без параметра mode')
add('cards-020', ['long:#flashcards-pack-card-dev_demo_community_1', 'tap:#flashcards-pack-report'], 'catalog=demo', PACKS, note='жалоба на набор сообщества (долгое нажатие → «Пожаловаться»)')
# зачем (сбои ROBOT9, 12.10): клавиатура после ввода закрывает поле «Перевод» — `back` убирает её перед следующим тапом
add('cards-064', ['tap:#fc-editor-en', 'type:Test', 'back', 'tap:#fc-editor-tr', 'type:Test', 'back', 'tap:#fc-editor-save'], DEMO, '/flashcards_card_editor?create=1&cat=custom', note='редактор: карточка сохранена (тост)')
add('cards-068', ['tap:#ugc-pack-first-card', 'tap:#ugc-pack-draft-front', 'type:Test', 'tap:#ugc-pack-draft-back', 'type:test', 'tap:#ugc-pack-draft-save', 'tap:#ugc-pack-menu', 'tap:#ugc-pack-clear-draft'], EMPTY_PLUS, CREATE, note='«Очистить черновик?»: одна карточка в черновике → меню набора → очистить')
