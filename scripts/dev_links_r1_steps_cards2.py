# Ссылки и шаги Карточек для покрытия съёмки r1 — группа (2б) «подмены», которые уже есть в приложении (app/dev_cards_state.ts, dev_state_cards_demo.ts).
#
# зачем (координатор 12.10, R1_PENDING_COVERAGE): Макеты числили эти строки как «не хватает подмены», но подмены написаны (cards=demo_published, fail=…, hold=…, train_gate=…, speech=…):
# строкам не хватало только ссылки и шагов. Только анонимный гость (dev_state_account_guard); все подмены — в памяти процесса, в облако ничего не пишется.
# Файл подключается из scripts/dev_links_r1_generate.py (import), как dev_links_r1_steps_spire.py.
from dev_links_r1_steps import (
    DEMO, HUB, MYPACKS, PACKS, RECALL_ROUTE, SAVED, SPEAK_ROUTE, TF_ROUTE, TILE, TO_PACK, WORK, MENU, add,
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
add('cards-section-046', ['long:Зажми и говори'], DEMO + '&speech=correct', SPEAK_ROUTE, note='«Устно — верно»: удержание микрофона подменено верным ответом (speech=correct; только русский интерфейс)')

# ── Фильтр по уроку: карточки с источником «урок» (cards=demo_lessons: те же 64, у части source=lesson)
add('cards-gap-024', [MENU, 'tap:#fc-menu-filter', 'tap:Урок 3'], 'cards=demo_lessons&plus=on', SAVED, note='фильтр «Урок 3» (cards=demo_lessons)')

# ── Свой ОПУБЛИКОВАННЫЙ набор автора (cards=demo_published: локальный набор «Мой опубликованный», 10 карточек, + кэш каталога от моего stableId)
# unique=False: кадр пробной съёмки 12.10 03:24 показал «B1 · 10 карточек · Только ты» — у демо-набора нет одобрения модерации, бейдж «В сообществе» и «Править набор» не рисуются (flashcards_collection.tsx:1030-1039)
add('cards-042', [f'tap:#fc-my-packs-pack-{PUB}'], DEMO_PUB, MYPACKS, note='свой опубликованный набор открыт: «Только ты» (одобрения модерации у демо нет — бейдж «В сообществе» и «Править набор» недостижимы без серверной записи)', unique=False)
add('cards-049', [], DEMO_PUB, PACKS, note='каталог: свой опубликованный набор (карандаш, «Топ») — не проверено на кадре (пробная съёмка 12.10 пересеклась с прогоном Сверки)', unique=False)
