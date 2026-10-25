# Данные для scripts/dev_links_r1_generate.py: по строкам реестра, у которых ссылка общая с соседями, — свои параметры под-состояния
# и шаги (колонка «тапы»), которые выполняет робот scripts/parity_batch_shoot.mjs (грамматика — scripts/parity_steps.mjs).
#
# зачем (координатор 12.10, поправка Сверки): у 476 из 503 строк ссылка общая; слепой робот снял бы один кадр на группу.
# Здесь каждая строка получает ссылку+шаги, которые открывают РОВНО её кадр, и признак «уникальна».
# Правило честности: unique=True только там, где путь выведен из кода/testID и однозначно соответствует ярлыку строки;
# сомнительное остаётся unique=False (робот такие строки не берёт, Сверка снимает руками по shot list).
#
# Шаги — по testID (язык интерфейса и вёрстка не мешают); текстовые — только когда testID нет.

COMMON = 'onboarding=done&intros=seen'


def link(params, nxt):
    """Полная dev-ссылка. `&` внутри next экранируется (как L() в генераторе)."""
    middle = f'&{params}' if params else ''
    # зачем (Сверка 12.10, overlays-041): parse берёт ПЕРВОЕ значение параметра, а COMMON всегда ставит intros=seen — окно знакомства фичи
    # иначе не показать; строка с intros=reset получает префикс без intros=seen.
    common = 'onboarding=done' if 'intros=reset' in (params or '') else COMMON
    return f"phraseman://dev_state?{common}{middle}&next={nxt.replace('&', '%26')}"


ENTRIES = {}


def add(ids, steps=(), params='', nxt='', unique=True, note=''):
    # зачем (координатор 12.10): у гостя ранг 0 — все диалоги закрыты «Откроется на ранге N»; для всех ссылок через хаб Диалогов подменяем ПОКАЗЫВАЕМЫЙ ранг
    # (dev_state?coinRank=6, app/dev_coin_rank.ts — только память, монеты и ранг не пишутся)
    if nxt.startswith('/ai_dialog_home') and 'coinRank=' not in params:
        params = f'{params}&coinRank=6' if params else 'coinRank=6'
    # зачем (координатор 12.10): без согласия на ИИ «Начать» открывает шторку согласия, а не сессию; dev_state?aiConsent=granted подменяет ТОЛЬКО ответ гейта в памяти
    # (запись согласия и облако не вызываются). Нужен всем ссылкам, чьи шаги нажимают «Начать» в брифинге; строка dialogs-009 (сама шторка) снимается без подмены.
    if nxt.startswith('/ai_dialog_home') and any('dialogue-v2-briefing-start' in s for s in steps) and 'aiConsent=' not in params:
        params = f'{params}&aiConsent=granted' if params else 'aiConsent=granted'
    for rid in ([ids] if isinstance(ids, str) else ids):
        if rid in ENTRIES:
            raise SystemExit(f'duplicate steps entry: {rid}')
        ENTRIES[rid] = {'link': link(params, nxt), 'steps': list(steps), 'unique': unique, 'note': note}


# ───────────────────────── Карточки · «Сохранённые» (/flashcards_collection?cat=saved) ─────────────────────────
SAVED = '/flashcards_collection?cat=saved'
MENU = 'tap:#fc-saved-actions'
TILE = 'tap:#fc-gallery-tile-*'
TILE2 = 'tap:#fc-gallery-tile-*@2'
TILE3 = 'tap:#fc-gallery-tile-*@3'
SELECT = 'tap:#fc-menu-select'
DECK = 'tap:#fc-saved-view-deck'
SEARCH = ['tap:#fc-collection-search', 'tap:#fc-search-input']
DEMO = 'cards=demo&plus=on'

# зачем (12.10): после увеличения плиток список оказывался прокрученным (заголовок «Сохранённые 64» уходил за экран) — возвращаем наверх перед снимком.
# снято 25.10 (Ревизор, прогон 05:00; решение владельца 22.10 «только нормальный вид», 3bb32f502): кнопок масштаба в приложении больше нет — кадры cards-005, cards-section-005, cards-v2-005, cards-v2-007 (3 колонки), cards-v2-008 (5 колонок) недостижимы, их шаги убраны
add('cards-v2-006', [], DEMO, SAVED, note='2 колонки')
add('cards-007', [MENU, SELECT], DEMO, SAVED, note='режим выделения')
add('cards-008', [MENU, DECK], DEMO, SAVED, note='стопка')
add(['cards-032', 'cards-v2-048'], [MENU], DEMO, SAVED, note='меню «⋯» открыто')
add('cards-037', [MENU, DECK, 'tap:#fc-deck-card'], DEMO, SAVED, note='стопка, оборот карточки')
add(['cards-section-006', 'cards-v2-009'], SEARCH + ['type:lay'], DEMO, SAVED, note='поиск «lay» — есть совпадения')
add('cards-038', SEARCH + ['type:zzzqq'], DEMO, SAVED, note='поиск без совпадений')
add('cards-034', ['long:#fc-gallery-tile-*'], DEMO, SAVED, note='долгое нажатие — шторка действий «Править / Удалить»')
add('cards-035', [MENU, SELECT, TILE, TILE2, TILE3, 'tap:#fc-delete-selected'], DEMO, SAVED, note='3 выбранных → окно подтверждения удаления')
add('cards-036', [MENU, SELECT, TILE, TILE2, TILE3], DEMO, SAVED, note='3 выбранных — «выбери ещё» (мало для набора)')
add('cards-006', ['swipe-left:#fc-saved-row-word-*'], DEMO, SAVED, unique=False, note='список (1 колонка, как в образце): свайп влево по строке — плашка «Удалено · Вернуть»; подсказка «Зажми карточку…» при плашке скрыта (привязка образца cards-v2 №10 «Удалено — вернуть»)')
add('cards-v2-020', [TILE], DEMO, SAVED, note='карточка открыта, лицевая сторона')
add(['cards-v2-021', 'cards-section-017'], [TILE, 'tap:#fc-expanded-card-flip'], DEMO, SAVED, note='оборот карточки')
add(['cards-section-015', 'cards-v2-010'], [TILE, 'tap:#fc-expanded-delete'], DEMO, SAVED, note='карточка удалена — плашка «Вернуть»')
add(['cards-009', 'cards-section-007', 'cards-v2-011'], [], 'cards=empty&plus=off', SAVED, note='пустые «Сохранённые» (cards=empty очищает данные прошлого кадра)')


# ───────────────────────── Карточки · «Мои наборы», экран своего набора, создание набора, редактор карточки ─────────────────────────
# Демо-наборы cards=demo: Путешествия (на проверке), B2 глаголы, Работа, Фразовые глаголы (id — app/dev_state_cards_demo.ts, DEMO_OWN_PACKS).
MYPACKS = '/flashcards_my_packs'
WORK = 'local_pack_dev_demo_work'
TRAVEL = 'local_pack_dev_demo_travel'
ROW_WORK = f'tap:#fc-my-packs-pack-{WORK}'
ROW_TRAVEL = f'tap:#fc-my-packs-pack-{TRAVEL}'
DEMO_PLUS = 'cards=demo&plus=on'
EMPTY_FREE = 'cards=empty&plus=off'
EMPTY_PLUS = 'cards=empty&plus=on'
CREATE = '/community_pack_create'

add(['cards-011', 'cards-v2-012', 'cards-section-009'], [], DEMO_PLUS, MYPACKS, note='«Мои наборы», 4 демо-набора')
add(['cards-013', 'cards-v2-013', 'cards-section-011'], [], EMPTY_FREE, MYPACKS, note='«Мои наборы» пусто (cards=empty)')
add('cards-012', [f'long:#fc-my-packs-pack-{WORK}', f'tap:#fc-my-packs-pack-delete-{WORK}'], DEMO_PLUS, MYPACKS, note='долгое нажатие → «Удалить» → окно подтверждения')
add('cards-045', [f'long:#fc-my-packs-pack-{WORK}', f'tap:#fc-my-packs-pack-delete-{WORK}', 'tap:#fc-delete-pack-confirm-confirm'], DEMO_PLUS, MYPACKS, note='набор удалён — тост (удаляет «Работа» на устройстве; восстановить ссылкой cards=demo)')
add('cards-046', ['tap:#fc-my-packs-menu', 'tap:#fc-my-packs-menu-search', 'tap:#fc-my-packs-search', 'type:zzzqq'], DEMO_PLUS, MYPACKS, note='поиск без совпадений')
add(['cards-section-012', 'cards-v2-014'], [ROW_WORK], DEMO_PLUS, MYPACKS, note='открыт свой набор «Работа»')
add('cards-v2-017', [ROW_WORK, 'tap:#fc-pack-menu'], DEMO_PLUS, MYPACKS, note='действия с набором (шторка ⋯)')
add('cards-gap-030', [ROW_TRAVEL], DEMO_PLUS, MYPACKS, note='набор «Путешествия» — на проверке')

add(['cards-section-019', 'cards-v2-022', 'cards-023', 'cards-066'], [], EMPTY_PLUS, CREATE, note='новый набор, пустая форма (черновик сбрасывается фикстурой)')
add('cards-section-020', ['tap:#ugc-pack-first-card'], EMPTY_PLUS, CREATE, note='шторка «Новая карточка»')
add(['cards-v2-024', 'cards-022'], ['tap:#ugc-pack-first-card', 'tap:#ugc-pack-draft-front', 'type:Layover'], EMPTY_PLUS, CREATE, note='новая карточка — живое превью (набрано Layover)')
add('cards-067', [], EMPTY_PLUS, CREATE, note='новый набор, пустая форма (привязка образца cards-v2 №22 «Новый набор»; по названию строки — меню набора)')
# зачем (R1_DIFF_ONE_FIX / координатор 12.10, cards-070 «Проверь поля»): состояние достижимо без подмены — «Создать набор» всегда нажимается; при пустом названии (форма пуста, cards=empty очищает черновик) сохранение не уходит и показывает тост «Укажи название и описание набора.» (в образце cards-states №65 текст «Проверь название, описание и все карточки.» — Макеты сверят по приложению). Ничего не пишется ни в облако, ни на устройство.
# зачем (сторож Ядра 69a4230ba): тап «Создать набор» без подмены публикации мог дойти до сети — fail=publish_error гасит запись (пустая форма и так отсекается до сети)
add('cards-070', ['tap:#ugc-pack-save'], EMPTY_PLUS + '&fail=publish_error', CREATE, note='«Проверь поля»: «Создать набор» при пустой форме → тост «Укажи название и описание набора.» (ничего не сохраняется)')
add(['cards-065', 'cards-section-021', 'cards-v2-023'], [], DEMO_PLUS, f'{CREATE}?packId={WORK}', note='правка своего набора «Работа»')
add('cards-024', ['tap:#ugc-pack-add-card'], DEMO_PLUS, f'{CREATE}?packId={WORK}', note='новая карточка в существующем наборе (шторка)')

add('cards-021', [], DEMO_PLUS, '/flashcards_card_editor?create=1&cat=custom', note='новая карточка (редактор)')
add('cards-063', [], DEMO_PLUS, '/flashcards_card_editor?id=dev_missing_card', note='карточка не найдена')


# ───────────────────────── Карточки · хаб, режим тренировки, настройка, каталог, «Из видео», лимиты, шторка «В какой набор?» ─────────────────────────
HUB = '/flashcards'
# зачем (координатор 12.10): animations=off — парение стопки хаба не запускается (только память, в сторе недоступно): uiautomator не доходит до покоя на вечной анимации, а кадр совпадает с неподвижным макетом
HUB_FREE = 'cards=demo&plus=off&animations=off'
# зачем (сбои ROBOT8/ROBOT9, 12.10): хаб Карточек живёт бесконечной анимацией и не отдаёт дерево интерфейса (память 11.10) — тап `#fc-cards-hub-train` не находился ни разу.
# Окно режимов открывает сам хаб по ?train=1 (FlashcardsHubScreen: автооткрытие, та же логика лимита и пейвола), настройку режима — прямой маршрут.
HUB_TRAIN = '/flashcards?train=1'
SETUP = '/flashcards_training_setup?mode='

add('cards-v2-001', [], HUB_FREE, HUB, note='хаб Карточек (демо-аккаунт, Free)')
# зачем (координатор 12.10, Дизайн 11a040d40): кадры снимались при исчерпанном лимите Free («0/30», «Безлимит с Plus» вместо «Начать») — перед съёмкой счётчик сбрасывается подменой quota=reset.
# зачем (12.10): автооткрытие шторки по ?train=1 не срабатывало (эффект хаба вызывает onTrainPress один раз и молча выходит, пока вход в тренировку не готов) — после паузы жмём «Тренироваться» сами.
add(['cards-002', 'cards-section-032', 'cards-v2-027'], ['wait:2500', 'tap:#fc-cards-hub-train', 'wait:800'], HUB_FREE + '&quota=reset', '/flashcards', note='шторка выбора режима тренировки (хаб открывает её сам по ?train=1)')
add(['cards-section-033', 'cards-v2-028'], [], HUB_FREE, SETUP + 'blitz', note='настройка тренировки «Блиц» (прямой маршрут)')
add('cards-section-034', [], HUB_FREE, SETUP + 'speaking', note='настройка тренировки «Устно» (прямой маршрут)')
add('cards-section-035', [], HUB_FREE, SETUP + 'truefalse', note='настройка тренировки «Правда / ложь» (прямой маршрут)')
add('cards-section-036', [], HUB_FREE, SETUP + 'recall', note='настройка тренировки «Вспомни и напиши» (прямой маршрут)')

PACKS = '/flashcards_packs'
add(['cards-014', 'cards-section-022', 'cards-section-024', 'cards-v2-025', 'packs-simple-001'], [], 'catalog=demo', PACKS, note='каталог сообщества, «Новые»')
add('cards-016', ['long:#flashcards-pack-card-dev_demo_community_1', 'tap:#flashcards-pack-report'], 'catalog=demo', PACKS, note='жалоба на набор: долгое нажатие по набору → «Пожаловаться» (привязка образца cards-states №15 «Жалоба на набор»)')
add(['cards-017', 'cards-section-023', 'cards-048', 'cards-v2-026'], ['tap:#flashcards-packs-search', 'type:zzzqq', 'key:ENTER', 'wait:600'], 'catalog=demo', PACKS, note='поиск по каталогу без совпадений («Ничего не найдено»)')
add('cards-section-028', [], 'catalog=demo', PACKS, note='каталог (привязка образца: «Каталог»; по названию строки — «Ничего не нашли»)')
add('cards-015', [], 'catalog=demo', PACKS, note='каталог (привязка образца cards-v2 №25 «Каталог»; по названию строки — поиск и меню по долгому нажатию)')
# зачем (Макеты, 12.10; координатор: ждать ≥5 с): набор открывается на скелетах и «не скачан» объявляется после тихих повторов (1,5 + 3 с) — кадр снимали раньше; ждём 5,5 с, затем тост и снимаем после
add('cards-gap-034', ['tap:#flashcards-pack-card-dev_demo_community_2', 'wait:5500', 'await:Набор ещё не скачан'], 'catalog=demo', PACKS, note='набор из демо-каталога ещё не скачан — тост')

VIDEO = '/flashcards_video_packs'
add(['cards-028', 'cards-v2-018'], [], DEMO_PLUS, VIDEO, note='«Из видео»: 5 демо-роликов (по строкам не тапать)')
add('cards-081', ['tap:#fc-video-packs-menu', 'tap:#fc-video-packs-menu-search', 'tap:#fc-video-packs-search', 'type:zzzqq'], DEMO_PLUS, VIDEO, note='поиск по роликам без совпадений')

CUSTOM50 = 'plus=off&cards=custom50'
# зачем (координатор 12.10, cards-010 снят пустым «Пока пусто»): лимит «сохранённых» считается по СОХРАНЁННЫМ карточкам (savedCards ≥ FREE_SAVED_CARD_LIMIT, flashcards_collection.tsx), а cards=custom50 пишет СВОИ карточки —
# в «Сохранённых» они не видны. Нужен список сохранённых из 64 (cards=demo) на Free: пилюля «50/50» и блок «+14 скрыто · Безлимит с Plus» (в образце «+78» — данные).
add(['cards-010', 'cards-v2-045'], [], 'cards=demo&plus=off', SAVED, note='Free: список из 64 сохранённых, лимит 50/50 и блок «+14 скрыто» (cards=demo&plus=off; cards=custom50 тут не годится — свои карточки в «Сохранённых» не видны)')
add('cards-v2-046', [], CUSTOM50, '/flashcards_card_editor?create=1&cat=custom', note='Free: лимит своих карточек 50/50 в редакторе новой карточки')

TO_PACK = 'tap:#fc-expanded-to-pack'
PACK_WORK = f'tap:#fc-expanded-pack-{WORK}'
add('cards-gap-018', [TILE, TO_PACK], DEMO, SAVED, note='шторка «В какой набор?» — список')
# зачем (R1_DIFF_ONE_FIX, cards-gap-020): набор «Работа» в демо содержит первые 19 сохранённых слов (demoPackCards), поэтому первая плитка (Layover) — дубль и тост «Эта карточка уже в наборе» ложился поверх шторки; для «Добавлено» берём плитку ниже по списку (после прокрутки), которой в наборе нет
add('cards-gap-020', ['scroll:down', 'scroll:down', 'scroll:down', 'scroll:down', 'tap:#fc-gallery-tile-*@3', TO_PACK, PACK_WORK], DEMO, SAVED, note='карточка добавлена в «Работа» — тост «Добавлено»')
# зачем (сбои ROBOT9, 12.10): после первого добавления шторка карточки закрывается — для второго «В набор» карточку открываем заново; паузы — анимация шторок
# зачем (Сверка 12.10, step_target_not_found #fc-expanded-to-pack: шторка карточки не успевала открыться — список листался вслепую): паузы после тапа по плитке 900 мс
add('cards-gap-021', [TILE, 'wait:900', TO_PACK, 'wait:900', PACK_WORK, 'wait:1800', TILE, 'wait:900', TO_PACK, 'wait:900', PACK_WORK], DEMO, SAVED, note='повторное добавление — тост «уже в наборе»')

# Карточки: состояния, которые открывает сама ссылка (фикстура держит/ломает данные, тап не нужен)
# cards-039: привязка образца — cards-v2 №44 «Каталог без сети»; запись «Сохранённые — ошибка загрузки» ей не соответствует, кадр «без сети» ссылкой не выводится → строка «нет» до перепривязки
# (fail=saved_load: dev_state?cards=demo&fail=saved_load&next=/flashcards_collection?cat=saved — пригодится, когда Макеты перепривяжут строку)
add('cards-047', [], 'hold=catalog_loading', PACKS, note='каталог — загрузка (hold=catalog_loading; снять hold=off)')
add('cards-075', [], 'cards=demo&plus=on&hold=setup_loading', '/flashcards_training_setup?mode=truefalse', note='настройка «Правда / ложь» — загрузка наборов (hold=setup_loading); режим ОБЯЗАТЕЛЕН в маршруте, без ?mode= кнопка показывает «Режим недоступен»')
add('cards-gap-014', [], 'moderation=approved', HUB, note='окно «Твой набор одобрен» приходит само через 0,9 с')
add('cards-gap-015', [], 'moderation=rejected', HUB, note='окно «Твой набор отклонён» приходит само через 0,9 с')
add('cards-gap-016', [], 'moderation=revision', HUB, note='окно «Нужна доработка» (revision_requested) приходит само через 0,9 с')
add('cards-gap-017', [], 'moderation=removed', HUB, note='окно «Набор снят с продажи» приходит само через 0,9 с')
add('cards-gap-037', [], 'cards=demo&hold=voices_loading', '/flashcards_voice_picker', note='голос озвучки — загрузка (hold=voices_loading)')
add(['cards-v2-030', 'cards-section-056'], [], 'plus=off&cards=demo&quota=exhausted', '/flashcards_training_setup?mode=blitz', note='Free: тренировки 30/30 — настройка с пилюлей и «Безлимит с Plus» (прямой маршрут; тап «Тренироваться» при исчерпанном лимите ведёт на пейвол, а не на настройку)')


# ───────────────────────── Диалоги (/ai_dialog_home и вложенные) ─────────────────────────
# Сессия диалога требует живого старта на сервере (ИИ) — кадры самой переписки остаются «нет» (ручной путь), пока не будет подставного старта.
DLG = '/ai_dialog_home'
WORLD = 'tap:#dialogue-v2-world-toggle-*'
ROW = 'tap:#dialogue-v2-catalogue-row-*'
# зачем (R1_DIFF_ONE_FIX, dialogs-001): `dquota=reset` стирает зеркало остатка → хаб не знает остатка и не рисует «30/30»; у Free с полным остатком пилюля есть (dquota=30 пишет зеркало 30/30)
add('dialogs-001', [], 'plus=off&dquota=30', DLG, note='хаб «Диалоги», Free (пилюля «30/30»: dquota=30)')
add('dialogs-002', [], 'plus=on&dquota=reset', DLG, note='хаб «Диалоги», Plus')
add('dialogs-004', [], 'plus=off&dquota=0', DLG, note='хаб — лимит исчерпан 0/30')
add('dialogs-005', [], 'plus=off&dquota=30&hold=dialog_language_gate', DLG, note='хаб с карточкой «Диалоги на этом языке ещё проверяются» (dev-удержание hold=dialog_language_gate; снять: hold=off)')
add('dialogs-003', [WORLD], 'plus=off&dquota=30&dialogsDone=3', DLG, note='первая категория раскрыта, 3 первых диалога пройдены (dialogsDone=3: локальная запись, только гость; стереть: dialogsDone=reset) — «пройдено ✓» и счётчик «3 / всего»')
add('dialogs-006', [WORLD], 'plus=off&dquota=30', DLG, note='категория раскрыта (первая)')
add('dialogs-007', [WORLD, ROW], 'plus=off&dquota=reset', DLG, note='брифинг первого диалога первой категории')
# зачем (координатор 12.10, dialogs-011; журнал кадра: «confirmSpendOne(ai_dialog) → cancelled (dev_energy_fail)»): dev_energy_fail=1 подменяет ответ на «отказ» — это тост «Не получилось начать диалог» (dialogs-gap, строка про отказ старта),
# а окно «Энергия закончилась» показывает настоящий ответ 'insufficient' при нулевой энергии без подмены отказа. Free (plus=off) и energy=0.
# зачем (сторож Ядра 69a4230ba): старт сессии без dev_dialog_send=ok уходил на сервер — подставной старт на кадр не влияет
add('dialogs-011', [WORLD, ROW, 'tap:#dialogue-v2-briefing-start'], 'plus=off&energy=0&dev_dialog_send=ok', DLG, note='старт без энергии — окно «Энергия закончилась» (energy=0; подмена отказа энергии даёт тост, а не окно)')
# зачем (R1_DIFF_ONE_FIX, dialogs-gap-002): строка «Для этого языка пока ничего не сохранено.» рисуется, когда память прочитана (`memory && !hasMemory`); кадр снимали, пока она грузилась — ждём
add('dialogs-gap-002', ['wait:3000'], 'plus=on&dquota=reset', '/dialogue_v2_memory', note='память диалогов, Plus (кадр «пусто», если памяти нет)')
add('dialogs-gap-003', [], 'plus=off&dquota=reset', '/dialogue_v2_memory', note='память диалогов без Plus — только удаление')
# зачем (сторож Ядра 69a4230ba): открытие свободного разговора стартует сессию на сервере даже при hold=freeform_loading — нужен dev_dialog_send=ok
add('dialogs-gap-009', [], 'plus=on&hold=freeform_loading&dev_dialog_send=ok', '/dialogue_v2_freeform', note='свободный разговор — готовим разговор (hold=freeform_loading)')
add('dialogs-gap-010', [], 'plus=off&dev_dialog_send=ok', '/dialogue_v2_freeform', note='свободный разговор без Plus — «доступен в Plus»')


# ───────────────────────── Пейволы ─────────────────────────
# Контекстные входы пейвола — через dev_state (plus=off&free=on&energy=5, чтобы Plus прошлого кадра не мешал), затем переход на /premium_modal?….
PAYWALL_FREE = 'plus=off&free=on&energy=5'


def paywall(context, source, extra=''):
    return f'/premium_modal?context={context}&source={source}{extra}'


add('paywall-gap-001', [], PAYWALL_FREE, paywall('generic', 'settings_premium'), note='пейвол из Настроек — верх шторки')
add('paywall-gap-002', ['see:#paywall-compare-toggle'], PAYWALL_FREE, paywall('generic', 'settings_premium'), note='«Free и Plus» свёрнуто (прокрутка до блока)')
add('paywall-gap-003', ['tap:#paywall-compare-toggle'], PAYWALL_FREE, paywall('generic', 'settings_premium'), note='«Free и Plus» развёрнуто')
add('paywall-gap-005', ['tap:#paywall-plan-monthly'], PAYWALL_FREE, paywall('generic', 'settings_premium'), note='выбран план «Месяц»')
add('paywall-gap-007', [], PAYWALL_FREE, paywall('flashcard_limit', 'flashcards_collection'), note='Карточки — место закончилось (50 из 50)')
add('paywall-gap-008', [], PAYWALL_FREE, paywall('flashcard_training', 'flashcards_training_setup'), note='Карточки — тренировки на месяц закончились (30 из 30)')
add('paywall-gap-009', [], PAYWALL_FREE, paywall('flashcard_create', 'card_editor_create'), note='Карточки — добавь свою фразу')
add('paywall-gap-010', [], PAYWALL_FREE, paywall('pack_create', 'pack_create'), note='Карточки — собери свой набор')
add('paywall-gap-011', [], 'plus=off&toast=purchase_confirmed', '/(tabs)/settings', note='тост «покупка подтверждена» (приходит сам; снимать сразу после открытия)')
add('paywall-gap-012', [], 'plus=off&toast=restored', '/(tabs)/settings', note='тост «покупки восстановлены»')
add('paywall-gap-013', [], 'plus=off&toast=restore_failed', '/(tabs)/settings', note='тост «не удалось восстановить покупки»')

MANAGE = '/manage_subscription'
PLAN_Y = 'plus=on&plan=yearly'
CANCEL = 'tap:#manage-subscription-cancel'
REASON = 'tap:#manage-subscription-reason-too_expensive'
add(['paywalls-019', 'profile-016'], [], PLAN_Y, MANAGE, note='управление подпиской, годовая')
add('profile-017', [], 'plus=on&plan=monthly', MANAGE, note='управление подпиской, месячная')
add(['paywalls-021', 'profile-018'], [], 'plus=on&plan=lifetime', MANAGE, note='управление подпиской, разовая покупка')
add(['paywalls-022', 'profile-024'], ['tap:#manage-subscription-restore'], PLAN_Y, MANAGE, note='«Восстановить» — покупок не найдено')
add(['paywalls-023', 'profile-020'], [CANCEL], PLAN_Y, MANAGE, note='причины отмены, ничего не выбрано')
# зачем (12.10): кадр profile-021 снят с пустым полем «Расскажи подробнее…», а в образце набран текст с кареткой — вводим строку (adb input text не печатает кириллицу, поэтому латиницей).
add('profile-021', [CANCEL, 'tap:#manage-subscription-reason-other', 'tap:#manage-subscription-reason-other-input', 'type:Not needed yet'], PLAN_Y, MANAGE, note='причина «Другое» (поле ввода, текст набран)')
# зачем (Макеты 12.10, profile-022 / paywalls-024): без прогресса «Продолжить» сразу уводил в браузер магазина — offerProgress=on даёт 12 дней и 38 уроков, шаг остаётся на шторке удержания
add(['paywalls-024', 'profile-022'], [CANCEL, REASON, 'tap:#manage-subscription-reasons-continue'], PLAN_Y + '&offerProgress=on', MANAGE, note='оверлей удержания после выбора причины «Слишком дорого»')

# ───────────────────────── Настройки и профиль ─────────────────────────
SETTINGS = '/(tabs)/settings'
S_FREE = 'plus=off'
add(['profile-001', 'settings-gap-002'], [], S_FREE, SETTINGS, note='главная Настроек, Plus не активна')
add('settings-gap-003', [], PLAN_Y, SETTINGS, note='главная Настроек, Plus по подписке (годовой план читается при старте)')
add(['profile-004', 'settings-gap-018'], [], S_FREE, '/settings_language', note='язык интерфейса — список языков')
add(['profile-005', 'settings-gap-019'], ['see:#settings-study-language-row', 'tap:#settings-study-language-row'], S_FREE, SETTINGS, note='шторка «Язык изучения» (строка у низа экрана: сначала прокрутка, иначе тап попадает в таб-бар и открывает «Диалоги»)')
add('profile-006', [], S_FREE, '/settings_notifications', note='уведомления — верх')
add('settings-gap-011', ['scroll:down', 'scroll:down'], S_FREE, '/settings_notifications', note='уведомления — низ списка')
add(['profile-007', 'settings-gap-014'], [], S_FREE, '/settings_edu', note='обучение и озвучка — верх')
add('settings-gap-015', ['scroll:down', 'scroll:down'], S_FREE, '/settings_edu', note='обучение — низ (скорость, голос)')
add('profile-008', [], S_FREE, '/settings_themes', note='темы')
add('profile-011', ['tap:#privacy-policy-row'], S_FREE, '/privacy_settings', note='Privacy Policy (документ)')
add('profile-012', ['tap:#privacy-terms-row'], S_FREE, '/privacy_settings', note='Terms (документ)')
add('profile-013', [], S_FREE, '/support_report', note='форма поддержки — пусто')
add(['profile-014', 'settings-gap-022'], ['tap:#support-diagnostics-disclosure'], S_FREE, '/support_report', note='форма поддержки — диагностика раскрыта')
add('settings-gap-035', ['tap:#support-report-input', 'type:short'], S_FREE, '/support_report', note='«Отправить» неактивна: меньше 10 символов')
add('settings-gap-036', ['tap:#support-report-input', 'type:Test message for the layout check', 'tap:#support-report-submit'], 'plus=off&support=fail', '/support_report', note='отправка не удалась (support=fail — на сервер ничего не уходит)')
add('profile-025', [], S_FREE, '/survey_screen', note='опрос недоступен — совместимый маршрут')
add('profile-026', [], 'referral=off', '/referrals', note='приглашение друга (referral=off)')


# ───────────────────────── Промокод (экран ввода кода) ─────────────────────────
# Ответ сервера подменяет фикстура promo=<результат> (app/dev_social_state.ts, память процесса); любой введённый код получает этот ответ.
PROMO = '/promo_code_entry'
PROMO_TYPE = ['tap:#promo-code-input', 'type:TESTCODE']
PROMO_SEND = PROMO_TYPE + ['tap:#promo-code-submit']
# зачем (координатор 12.10): кадры ответов overlays-campaigns-009…012/015 снимались с открытой клавиатурой — после ввода кода `back` закрывает её (экран остаётся: пока поле в фокусе, первый back гасит только клавиатуру), затем отправка.
PROMO_SEND_NOKB = PROMO_TYPE + ['hidekb', 'tap:#promo-code-submit']
PROMO_BASE = 'plus=off&energy=3'
add('overlays-campaigns-004', [], PROMO_BASE, PROMO, note='ввод промокода — пусто')
add('overlays-campaigns-005', PROMO_TYPE, PROMO_BASE, PROMO, note='введён код — кнопка активна («можно применить»)')
add('overlays-campaigns-007', PROMO_SEND, PROMO_BASE + '&promo=ok', PROMO, note='ответ «срок подтверждён» (promo=ok)')
add('overlays-campaigns-008', PROMO_SEND, PROMO_BASE + '&promo=lifetime', PROMO, note='ответ «бессрочно» (promo=lifetime)')
add('overlays-campaigns-009', PROMO_SEND_NOKB, PROMO_BASE + '&promo=not_found', PROMO, note='ответ «не найден»')
add('overlays-campaigns-010', PROMO_SEND_NOKB, PROMO_BASE + '&promo=expired', PROMO, note='ответ «истёк»')
add('overlays-campaigns-011', PROMO_SEND_NOKB, PROMO_BASE + '&promo=limit', PROMO, note='ответ «лимит исчерпан»')
add('overlays-campaigns-012', PROMO_SEND_NOKB, PROMO_BASE + '&promo=used', PROMO, note='ответ «уже использован»')
# зачем (Ядро 12.10): макет №11 promo-code-states — ОБЩИЙ рубильник «Промокоды сейчас временно выключены» (promo=off); promo=disabled — «этот код отключён» и показывает тот же текст, что «не найден».
add('overlays-campaigns-014', PROMO_SEND_NOKB, PROMO_BASE + '&promo=off', PROMO, note='«Промокоды сейчас временно выключены» — общий рубильник (promo=off), без клавиатуры')
add('overlays-campaigns-015', PROMO_SEND_NOKB, PROMO_BASE + '&promo=error', PROMO, note='ответ «ошибка проверки»')


# ───────────────────────── Код от друга (шит на «Награда за друга», макет referral-code-states.html) ─────────────────────────
# Ответ сервера подменяет фикстура refcode=<статус> (app/dev_social_state.ts, память процесса): сервер, поиск владельца кода
# и заявка в друзья при подмене не вызываются — в прод ноль записей. referral=on снимает возможный referral=off прошлого кадра.
# Коды — как в макете (ANNA42 / ZZZ999 / MY4CODE).
REF = '/referrals?enter=1'
REF_BASE = 'referral=on'
def ref_send(code):
    return ['tap:#referral-code-sheet-input', f'type:{code}', 'tap:#referral-code-sheet-submit']
add('overlays-campaigns-016', [], REF_BASE + '&refcode=none', REF, note='шит открыт, поле пустое, кнопка приглушена')
add('overlays-campaigns-017', ['tap:#referral-code-sheet-input', 'type:ANNA42'], REF_BASE + '&refcode=none', REF, note='введено 6 знаков — кнопка активна')
add('overlays-campaigns-018', ref_send('ANNA42'), REF_BASE + '&refcode=hold', REF, note='«Применяем…» держится (refcode=hold)')
add('overlays-campaigns-019', ref_send('ANNA42'), REF_BASE + '&refcode=applied', REF, note='«Код принят…» (без заявки в друзья)')
add('overlays-campaigns-020', ref_send('ANNA42'), REF_BASE + '&refcode=already', REF, note='«Код уже привязан…»')
add('overlays-campaigns-021', ref_send('ANNA'), REF_BASE + '&refcode=invalid', REF, unique=False,
    note='текст «слишком короткий» есть, но в макете в поле AN — до 4 знаков кнопка выключена, такой кадр в коде недостижим; нужен вердикт Макетов')
add('overlays-campaigns-022', ref_send('ZZZ999'), REF_BASE + '&refcode=unknown_code', REF, note='«Такой код не найден…»')
add('overlays-campaigns-023', ref_send('MY4CODE'), REF_BASE + '&refcode=self', REF, note='«Это твой код…»')
add('overlays-campaigns-024', ref_send('ANNA42'), REF_BASE + '&refcode=too_old', REF, note='«…только на новом аккаунте»')
add('overlays-campaigns-025', ref_send('ANNA42'), REF_BASE + '&refcode=disabled', REF, note='«Приглашения сейчас недоступны…» (ответ disabled; рубильник при этом включён, иначе шит не открыть)')
add('overlays-campaigns-026', ref_send('ANNA42'), REF_BASE + '&refcode=error', REF, note='«Не получилось применить код…»')


# ───────────────────────── Аккаунт: окно имени, выход, удаление (зона Авторизации) ─────────────────────────
# Ответ проверки имени подменяет namecheck=<checking|available|taken|error> (app/dev_account_state.ts, память процесса) — сервер не вызывается;
# «Сохранить» для состояний проверки робот не жмёт. Имена — как в макете settings-gaps-states.html (Alexey / Delta28).
# Выход и удаление: logout=hold|fail и delete=fail отказывают ДО замка, синхронизации и стирания — настоящие выход и удаление недостижимы.
# Кнопка выхода и окно удаления с «14 дней» есть только у ВОШЕДШЕГО аккаунта (под гостем шаг не найдёт кнопку).
ACCT = '/account_details'
NAME_OPEN = ['tap:#account-change-name', 'tap:#nickname-input']
NAME_CLEAR = NAME_OPEN + ['key:MOVE_END'] + ['key:DEL'] * 22
add('profile-003', ['tap:#account-change-name'], 'plus=off&namecheck=none', ACCT, note='шторка «Изменить имя» с текущим именем')
add('settings-gap-024', NAME_CLEAR + ['type:Alexey'], 'plus=off&namecheck=checking', ACCT, note='«Проверяем имя…» держится (namecheck=checking)')
add('settings-gap-025', NAME_CLEAR + ['type:Alexey'], 'plus=off&namecheck=available', ACCT, note='«Имя свободно»')
add('settings-gap-026', NAME_CLEAR + ['type:Delta28'], 'plus=off&namecheck=taken', ACCT, note='«Имя уже занято», «Сохранить» недоступна')
add('settings-gap-031', NAME_CLEAR + ['type:Alexey'], 'plus=off&namecheck=error', ACCT, note='«Проверим при сохранении», «Сохранить» доступна')
add('settings-gap-032', NAME_CLEAR + ['tap:#nickname-save'], 'plus=off&namecheck=none', ACCT, note='пустое поле → окно «Введи имя» (проверка до сети)')
add('settings-gap-033', NAME_CLEAR + ['type:A', 'tap:#nickname-save'], 'plus=off&namecheck=none', ACCT, note='один символ → окно «Минимум 2 символа» (проверка до сети)')
add('profile-028', ['see:#account-logout-button', 'tap:#account-logout-button', 'wait:1500'], 'logout=hold', ACCT,
    note='«Выходим из аккаунта» держится 2 мин (logout=hold), затем отказ; НУЖЕН ВХОД (кнопка выхода только у вошедшего)')
add('profile-029', ['see:#account-logout-button', 'tap:#account-logout-button', 'wait:1500'], 'logout=fail', ACCT,
    note='«Старый аккаунт не считается закрытым» (logout=fail, стирание недостижимо); НУЖЕН ВХОД')
add('profile-030', ['see:#account-delete-button', 'tap:#account-delete-button'], 'delete=fail', ACCT,
    note='окно «Удалить аккаунт?» с «14 дней», НЕ подтверждать (delete=fail — страховка); НУЖЕН ВХОД')


# ───────────────────────── Аккаунт: отказы смены и входа (switch=…, зона Авторизации) ─────────────────────────
# dev_state?switch=<режим> (app/dev_account_state.ts, память процесса): выход/смена отказывают ДО замка, синхронизации, маркера и стирания
# (форсированная попытка тоже отказывает — защёлка), вход возвращает ошибку ДО сети. В стор-сборке ссылка не действует (маршрут вырезан,
# геттеры = null). Окно смены открывает параметр Настроек switchAccount=1 (то же, что кнопка «Сменить аккаунт» из окна входа).
SWITCH = '/(tabs)/settings?switchAccount=1'
# зачем (координатор 12.10, английский проход): нажатия по testID, а не по русскому тексту — «Продолжить» = #settings-switch-continue,
# «Сменить без сохранения» — вторая кнопка окна отказа («Остаться здесь», «Сменить без сохранения») = #glass-alert-action-1.
SWITCH_GO = ['tap:#settings-switch-continue', 'wait:1500']
SWITCH_FORCE = SWITCH_GO + ['tap:#glass-alert-action-1', 'wait:1500']
SIGNIN = ['tap:#account-link-row', 'tap:#auth-google-button', 'wait:1500']
add('auth-gap-004', SIGNIN, 'switch=not_uploaded', ACCT, note='окно входа: «прогресс на месте, вход отменён» (ошибка до сети); ТОЛЬКО ГОСТЬ — «Привязать аккаунт» есть у гостя')
add('auth-gap-005', SIGNIN, 'switch=backup_blocked', ACCT, note='окно входа: «ждёт прогресс другого аккаунта»; ТОЛЬКО ГОСТЬ')
add('auth-gap-013', SWITCH_FORCE, 'switch=unsaved_cards', SWITCH, note='«Прогресс не сохранён» → «Сменить без сохранения» → окно про несохранённые карточки')
add('auth-gap-014', SWITCH_GO, 'switch=pending_spend', SWITCH, note='«Покупка ещё синхронизируется»')
add('auth-gap-015', SWITCH_GO, 'switch=quarantine', SWITCH, note='«Нужна проверка монет»')
add('auth-gap-017', SWITCH_FORCE, 'switch=guard', SWITCH, note='«Прогресс не сохранён» → «Сменить без сохранения» → «Смена аккаунта отменена» (форсированная отклонена защитной проверкой)')
add('auth-gap-018', ['tap:#settings-switch-continue', 'wait:47000'], 'switch=slow', SWITCH, note='смена дольше 45 с → окно «смена ещё идёт» (switch=slow держит 50 с, затем отказ)')


# ───────────────────────── Карточки: прямые маршруты тренировок (вердикты Макетов 12.10) ─────────────────────────
# Маршруты и параметры — из app/flashcards/training_entry.ts (deck=saved, quick=1, size=all). cards=* — только на анонимном госте (dev_state_account_guard).
TF_ROUTE = '/flashcards_truefalse_session?deck=saved&quick=1&size=all'
SPEAK_ROUTE = '/flashcards_speaking_session?deck=saved&size=all'
RECALL_ROUTE = '/flashcards_recall_session?deck=saved&size=all&dir=to_target'
BLITZ_ROUTE = '/flashcards_blitz_session?deck=saved&sec=60'
add('cards-gap-004', [], EMPTY_PLUS, TF_ROUTE, note='«Правда / ложь»: нет сохранённых карточек (cards=empty, только анонимный гость)')
add('cards-gap-010', [], EMPTY_PLUS, SPEAK_ROUTE, note='«Устно»: нечего говорить — нет карточек (cards=empty)')
add('cards-gap-007', [], 'cards=notranslation&plus=on', TF_ROUTE, note='«Правда / ложь»: нет карточек с переводом')
add('cards-gap-008', [], 'cards=notranslation&plus=on', RECALL_ROUTE, note='«Напиши»: нет карточек с переводом')
add('cards-gap-006', [], DEMO + '&train_gate=fail_swipe_quota', TF_ROUTE, note='«Правда / ложь»: не удалось проверить лимит (train_gate=fail_swipe_quota)')
add('cards-gap-001', [], DEMO + '&train_gate=fail_blitz', BLITZ_ROUTE, note='«Блиц»: тренировка не открылась (train_gate=fail_blitz)')
add('cards-gap-002', [], DEMO + '&train_gate=fail_speaking', SPEAK_ROUTE, note='«Устно»: тренировка не открылась (train_gate=fail_speaking)')
add('cards-gap-011', ['wait:2500', 'tap:#fc-cards-hub-train', 'wait:800'], 'cards=demo&plus=off&quota=reset&hold=quota_waiting&animations=off', '/flashcards', note='шторка режима: «Готовим тренировку…» (hold=quota_waiting; хаб открывает окно сам по ?train=1)')
add('cards-gap-012', [], 'cards=demo&plus=off&hold=quota_failed', HUB_TRAIN, note='шторка режима: «Не получилось подготовить тренировку» (hold=quota_failed; хаб открывает окно сам по ?train=1)')

add('cards-062', ['tap:#fc-editor-en', 'type:Test', 'tap:#fc-editor-tr', 'type:Test', 'tap:#fc-editor-save'], DEMO + '&fail=card_write', '/flashcards_card_editor?create=1&cat=custom', note='редактор: «Не удалось сохранить» (fail=card_write); создание карточки — функция Plus, поэтому plus=on')


# ───────────────────────── Диалоги: внутри сессии (подставной старт и ход Ядра: dev_dialog_send=ok, app/dev_dialog_send.ts) ─────────────────────────
# Вход: хаб → первая категория → первый диалог → «Начать». Какой именно диалог первый — зависит от каталога, поэтому кадры, привязанные к
# конкретному диалогу («приветствие баристы»), остаются «нет». Берём только кадры, чья раскладка не зависит от темы диалога.
DLG_SEND = 'plus=on&dquota=reset&energy=5&dev_dialog_send=ok'
DLG_START = [WORLD, ROW, 'tap:#dialogue-v2-briefing-start', 'wait:3000']
add('dialogs-gap-015', DLG_START + ['tap:#dialogue-v2-session-more'], DLG_SEND, DLG, note='внутри сессии: меню «⋯» открыто (подставной старт dev_dialog_send=ok)')
add('dialogs-017', DLG_START + ['tap:#dialogue-v2-session-hint'], DLG_SEND, DLG, note='внутри сессии: окно подсказки')
add('dialogs-018', DLG_START + ['tap:#dialogue-v2-session-goals'], DLG_SEND, DLG, note='внутри сессии: шторка заданий')


# ───────────────────────── Пейволы: состояния покупки (_dev_state) — через dev_state с plus=off ─────────────────────────
# зачем (разбор Макетов 600aa8d35): ссылки с context=energy_empty (такого контекста нет) падали «unknown_paywall_context»; плюс прямая ссылка не сбрасывала
# Plus прошлого кадра, и пейвол закрывался сам. Контекст — настоящий (generic), вход — через dev_state с plus=off&free=on.
PW_GENERIC = '/premium_modal?context=generic&source=settings_premium'
add('paywalls-011', [], PAYWALL_FREE, PW_GENERIC + '&_dev_state=loading', note='покупка: загрузка условий')
add('paywalls-012', [], PAYWALL_FREE, PW_GENERIC + '&_dev_state=store_unreachable', note='покупка: ошибка до checkout (тост через 0,7 с)')
add('paywalls-013', [], PAYWALL_FREE, PW_GENERIC + '&_dev_state=purchasing', note='покупка: проверяем покупку')
add('paywalls-014', [], PAYWALL_FREE, PW_GENERIC + '&_dev_state=pending', note='покупка: ожидание банка или родителя')
add('paywalls-016', [], PAYWALL_FREE, PW_GENERIC + '&_dev_state=status_unknown', note='покупка: статус неизвестен')
add('paywalls-018', [], PAYWALL_FREE, PW_GENERIC + '&_dev_state=store_promo', note='покупка: промо от магазина')
add('paywall-gap-006', [], PAYWALL_FREE, PW_GENERIC + '&_dev_state=reminder_prompt', note='после покупки: «Plus твой. Напомнить…»')
add('paywall-gap-004', [], PAYWALL_FREE, PW_GENERIC + '&_force_trial_ui=1&_force_trial_days=3', note='лента пробного периода (образец N=3; срок в проде — из магазина)')


# ───────────────────────── Диалоги: исправленные шаги (разбор Макетов 600aa8d35: кадры снимались на хабе / были чёрными) ─────────────────────────
# Порядок подмен в app/dialogue_v2_turn_coaching_client.ts: dev_dialog_fail → dev_dialog_send → сеть. Старт сессии подменяется ТОЛЬКО при dev_dialog_send,
# поэтому для кадров «отказ хода» нужны оба флага: send=ok (чтобы сессия завелась без сети) и fail=… (чтобы ход упал). dev_dialog_mood применяется
# только в ветке настоящего ответа сервера (coaching client), при подставном ходе его нет — dialogs-023 остаётся «нет» до мини-правки файла Ядра.
SEND_MSG = ['tap:#dialogue-v2-session-input', 'type:Hello', 'tap:#dialogue-v2-session-send', 'wait:2500']
SESSION_PLUS = 'plus=on&dquota=reset&energy=5'
SESSION_FREE = 'plus=off&dquota=reset&energy=5'
add('dialogs-031', DLG_START + SEND_MSG, SESSION_FREE + '&dev_dialog_send=network', DLG, note='ход не дошёл: сетевая ошибка с «Повторить» (dev_dialog_send=network)')
add('dialogs-032', DLG_START + SEND_MSG, SESSION_FREE + '&dev_dialog_send=ok&dev_dialog_fail=service', DLG, note='ход отклонён: сервис недоступен (dev_dialog_fail=service поверх подставного старта)')
add('dialogs-034', DLG_START, 'plus=off&dquota=1&energy=5&dev_dialog_send=ok', DLG, note='Free, осталась 1 реплика из 30 — пилюля «1/30» в начале сессии')
add('dialogs-035', DLG_START + SEND_MSG, 'plus=off&dquota=1&energy=5&dev_dialog_send=quota_exhausted', DLG, note='лимит исчерпан на отправке (dev_dialog_send=quota_exhausted)')
add('dialogs-gap-012', DLG_START + SEND_MSG, SESSION_PLUS + '&dev_dialog_send=ok&dev_dialog_fail=plus_daily_cap', DLG, note='Plus: потолок реплик на сегодня (dev_dialog_fail=plus_daily_cap)')
add('dialogs-gap-017', [WORLD, ROW, 'tap:#dialogue-v2-briefing-start'], 'plus=off&energy=3&dev_energy_fail=1&dev_dialog_send=ok', DLG, note='брифинг: тост «Не получилось начать диалог» (dev_energy_fail=1)')

add('cards-gap-026', [f'long:#fc-my-packs-pack-{WORK}', 'tap:#fc-my-packs-action-share'], DEMO_PLUS + '&fail=publish_daily_limit', MYPACKS, note='«Открыть сообществу» при суточном лимите — тост (dev-отказ стоит ПЕРВЫМ в publishLocalAuthorPack, описание не проверяется)')


# ───────────────────────── Главная / энергия: что выводится без ошибок внутри урока ─────────────────────────
# Режим Б и остановки по ошибкам (energy-modes-001…008, 011…014, 016) требуют ОШИБИТЬСЯ в задании, а тип первого задания (варианты слов, сборка,
# ввод) не фиксирован — их шаги не выведены (нужен записанный ручной путь). Здесь — только вход в урок и окно «нет энергии».
LESSON_MENU = '/lesson_menu?id=1'
add('energy-modes-017', ['wait:3000', 'tap:#lesson-menu-primary'], 'energy=0&plus=off&mode=a', LESSON_MENU, note='Режим А, энергии нет: «Начать» в меню урока → окно «Нет энергии» (NoEnergyModal)')
add('energy-modes-015', ['wait:3000', 'tap:#lesson-menu-primary', 'wait:3000'], 'energy=5&plus=off&mode=a', LESSON_MENU, note='Режим А: старт занятия, энергия 5 → 4 в пилюле шапки (кадр сразу после входа в урок)', unique=False)


# ───────────────────────── Раунд 4 (координатор 12.10) ─────────────────────────
# Диалог внутри сессии с настроением собеседника: dev_dialog_mood теперь применяется и при подставном ходе (dialogue_v2_turn_coaching_client.ts)
add('dialogs-023', DLG_START + SEND_MSG, SESSION_FREE + '&dev_dialog_send=ok&dev_dialog_mood=sad', DLG, note='настроение собеседника упало (dev_dialog_mood=sad поверх подставного хода)')

# Настройки: блок доступа Plus (vip читается при старте — робот перезапускает приложение сам)
add('settings-gap-004', ['see:#settings-plus-access-details'], 'vip=promo&plus=inherit', SETTINGS, note='главная Настроек: Plus по промокоду (vip=promo), блок доступа прокручен в экран')
add('settings-gap-005', ['see:#settings-plus-access-details'], 'vip=referral&plus=inherit', SETTINGS, note='главная Настроек: Plus за приглашения (vip=referral), блок доступа прокручен в экран')


# ───────────────────────── Раунд 6: Настройки и Диалоги (координатор 12.10) ─────────────────────────
# Не выводятся ссылкой/шагами (причины — для координатора): имя (profile-003, settings-gap-024…026/031…033) — окно живёт в app/account_details.tsx (зона Авторизации);
# приватность/согласие на ИИ (profile-009/010, settings-gap-016/017, dialogs-009) — согласие пишется в облако, фикстурой не трогаем; выход/удаление (profile-028…030) — зона
# Авторизации; уведомления «выключено / телефон не разрешает / сохранено» (settings-gap-010/012/013/027) меняют сохранённые настройки и системный диалог;
# тосты языка изучения (settings-gap-020/021) — у шторки нет testID, названия языков зависят от интерфейса; Pro без срока (settings-gap-006) — тир Pro выводится из плана, фикстуры нет.
CACHE_CLEAR = ['see:#settings-clear-cache-row', 'tap:#settings-clear-cache-row', 'tap:Очистить', 'wait:300']
add('settings-gap-030', [], 'plus=off&referral=off', SETTINGS, note='«Пригласить друга» скрыта (referral=off — рубильник приглашений)')
add('settings-gap-029', ['see:#settings-message-slot-top'], 'plus=off&slot=top', SETTINGS, note='верхний слот сообщений в Настройках (slot=top)')
# зачем (координатор 12.10, Дизайн 016488a3c — сид опроса): сразу после «Готово» (оно гаснет за 2,2 с) подкручиваем нижний слот сообщения, чтобы опрос после голосования был над панелью вкладок, и снимаем без паузы (settle:0).
add('settings-gap-008', CACHE_CLEAR + ['see:#settings-message-slot-bottom', 'settle:0'], 'plus=off&slot=poll_voted&cache=ok', SETTINGS, note='«Очистить кеш» → подтвердить → «Готово» (итог гаснет через 2,2 с — кадр на грани) + слот: опрос после голосования')
add('settings-gap-009', CACHE_CLEAR, 'plus=off&slot=message&cache=failed', SETTINGS, note='«Очистить кеш» → подтвердить → «не удалось» (cache=failed, итог живёт 3,2 с) + слот без опроса')
add('settings-gap-028', ['tap:#notif-time-label'], S_FREE, '/settings_notifications', note='окно выбора времени (строка «Время» активна, если ежедневное напоминание включено)')

# Диалоги: закрытый по рангу брифинг и сессия (подставной старт dev_dialog_send=ok, ранг показа coinRank)
add('dialogs-008', [WORLD, ROW], 'plus=off&dquota=reset&energy=5&coinRank=0', DLG, note='брифинг закрытого по рангу диалога: coinRank=0 (все диалоги закрыты, строка открывает брифинг)')
add('dialogs-012', DLG_START, SESSION_FREE + '&dev_dialog_send=ok', DLG, note='старт диалога: энергия 5 → 4 в пилюле сессии (кадр спустя 3 с после «Начать»)')
add(['dialogs-014', 'dialogs-030'], DLG_START + SEND_MSG, SESSION_FREE + '&dev_dialog_send=ok', DLG, note='разговор идёт: после отправки сообщения ответ собеседника на месте (подставной ход, 1,5 с)')
add('dialogs-036', DLG_START + ['back'], SESSION_FREE + '&dev_dialog_send=ok', DLG, note='внутри сессии: системная «назад» → подтверждение выхода')

# Раунд 7 (координатор 12.10)
# dialogs-029 «ИИ печатает»: индикатор живёт 1,5 с (подставной ход) — снимаем сразу после отправки (settle:0)
add('dialogs-029', DLG_START + ['tap:#dialogue-v2-session-input', 'type:Hello', 'tap:#dialogue-v2-session-send', 'settle:0'], SESSION_FREE + '&dev_dialog_send=ok', DLG, note='«ИИ печатает»: кадр сразу после отправки (индикатор 1,5 с)')
