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
    return f"phraseman://dev_state?{COMMON}{middle}&next={nxt.replace('&', '%26')}"


ENTRIES = {}


def add(ids, steps=(), params='', nxt='', unique=True, note=''):
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

add(['cards-005', 'cards-section-005'], [], DEMO, SAVED, note='список, 2 колонки (шаг по умолчанию)')
add('cards-v2-006', [], DEMO, SAVED, note='2 колонки')
add('cards-v2-005', ['tap:#fc-zoom-larger'], DEMO, SAVED, note='1 колонка')
add('cards-v2-007', ['tap:#fc-zoom-smaller'], DEMO, SAVED, note='3 колонки: шаг «мельче» ×1 от двух (по коду GALLERY_STEPS)')
add('cards-v2-008', ['tap:#fc-zoom-smaller', 'tap:#fc-zoom-smaller'], DEMO, SAVED, note='5 колонок: «мельче» ×2')
add('cards-007', [MENU, SELECT], DEMO, SAVED, note='режим выделения')
add('cards-008', [MENU, DECK], DEMO, SAVED, note='стопка')
add(['cards-032', 'cards-v2-048'], [MENU], DEMO, SAVED, note='меню «⋯» открыто')
add('cards-037', [MENU, DECK, 'tap:#fc-deck-card'], DEMO, SAVED, note='стопка, оборот карточки')
add(['cards-section-006', 'cards-v2-009'], SEARCH + ['type:lay'], DEMO, SAVED, note='поиск «lay» — есть совпадения')
add('cards-038', SEARCH + ['type:zzzqq'], DEMO, SAVED, note='поиск без совпадений')
add('cards-034', ['long:#fc-gallery-tile-*'], DEMO, SAVED, note='долгое нажатие — шторка действий «Править / Удалить»')
add('cards-035', [MENU, SELECT, TILE, TILE2, TILE3, 'tap:#fc-delete-selected'], DEMO, SAVED, note='3 выбранных → окно подтверждения удаления')
add('cards-036', [MENU, SELECT, TILE, TILE2, TILE3], DEMO, SAVED, note='3 выбранных — «выбери ещё» (мало для набора)')
add('cards-006', [TILE], DEMO, SAVED, note='карточка раскрыта (лицевая); удаление свайпом и «Вернуть» — отдельные кадры cards-v2-010')
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

add(['cards-section-019', 'cards-v2-022', 'cards-023'], [], EMPTY_PLUS, CREATE, note='новый набор, пустая форма (черновик сбрасывается фикстурой)')
add('cards-section-020', ['tap:#ugc-pack-first-card'], EMPTY_PLUS, CREATE, note='шторка «Новая карточка»')
add('cards-v2-024', ['tap:#ugc-pack-first-card', 'tap:#ugc-pack-draft-front', 'type:Layover'], EMPTY_PLUS, CREATE, note='новая карточка — живое превью (набрано Layover)')
add('cards-067', ['tap:#ugc-pack-menu'], EMPTY_PLUS, CREATE, note='меню набора')
add('cards-070', ['tap:#ugc-pack-save'], EMPTY_PLUS, CREATE, note='сохранить пустую форму — «Проверь поля» (тост)')
add(['cards-065', 'cards-section-021', 'cards-v2-023'], [], DEMO_PLUS, f'{CREATE}?packId={WORK}', note='правка своего набора «Работа»')
add('cards-024', ['tap:#ugc-pack-add-card'], DEMO_PLUS, f'{CREATE}?packId={WORK}', note='новая карточка в существующем наборе (шторка)')

add('cards-021', [], DEMO_PLUS, '/flashcards_card_editor?create=1&cat=custom', note='новая карточка (редактор)')
add('cards-063', [], DEMO_PLUS, '/flashcards_card_editor?id=dev_missing_card', note='карточка не найдена')


# ───────────────────────── Карточки · хаб, режим тренировки, настройка, каталог, «Из видео», лимиты, шторка «В какой набор?» ─────────────────────────
HUB = '/flashcards'
HUB_FREE = 'cards=demo&plus=off'
TRAIN = 'tap:#fc-cards-hub-train'

add('cards-v2-001', [], HUB_FREE, HUB, note='хаб Карточек (демо-аккаунт, Free)')
add(['cards-002', 'cards-section-032', 'cards-v2-027'], [TRAIN], HUB_FREE, HUB, note='шторка выбора режима тренировки')
add(['cards-section-033', 'cards-v2-028'], [TRAIN, 'tap:#fc-training-mode-blitz'], HUB_FREE, HUB, note='настройка тренировки «Блиц»')
add('cards-section-034', [TRAIN, 'tap:#fc-training-mode-speaking'], HUB_FREE, HUB, note='настройка тренировки «Устно»')
add('cards-section-035', [TRAIN, 'tap:#fc-training-mode-truefalse'], HUB_FREE, HUB, note='настройка тренировки «Правда / ложь»')
add('cards-section-036', [TRAIN, 'tap:#fc-training-mode-recall'], HUB_FREE, HUB, note='настройка тренировки «Вспомни и напиши»')

PACKS = '/flashcards_packs'
add(['cards-014', 'cards-section-022', 'cards-section-024', 'cards-v2-025', 'packs-simple-001'], [], 'catalog=demo', PACKS, note='каталог сообщества, «Новые»')
add(['cards-016', 'cards-048'], [], 'catalog=empty', PACKS, note='каталог пуст')
add(['cards-017', 'cards-section-023', 'cards-section-028', 'cards-v2-026'], ['tap:#flashcards-packs-search', 'type:zzzqq'], 'catalog=demo', PACKS, note='поиск по каталогу без совпадений')
add('cards-015', ['tap:#flashcards-packs-search', 'type:Fam', 'long:#flashcards-pack-card-dev_demo_community_1'], 'catalog=demo', PACKS, note='поиск «Fam» → долгое нажатие по набору — меню действий')
add('cards-gap-034', ['tap:#flashcards-pack-card-dev_demo_community_2'], 'catalog=demo', PACKS, note='набор из демо-каталога ещё не скачан — тост')

VIDEO = '/flashcards_video_packs'
add(['cards-028', 'cards-v2-018'], [], DEMO_PLUS, VIDEO, note='«Из видео»: 5 демо-роликов (по строкам не тапать)')
add('cards-081', ['tap:#fc-video-packs-menu', 'tap:#fc-video-packs-menu-search', 'tap:#fc-video-packs-search', 'type:zzzqq'], DEMO_PLUS, VIDEO, note='поиск по роликам без совпадений')

CUSTOM50 = 'plus=off&cards=custom50'
add(['cards-010', 'cards-v2-045'], [], CUSTOM50, SAVED, note='Free: лимит сохранённых 50/50')
add('cards-v2-046', [], CUSTOM50, '/flashcards_card_editor?create=1&cat=custom', note='Free: лимит своих карточек 50/50 в редакторе новой карточки')

TO_PACK = 'tap:#fc-expanded-to-pack'
PACK_WORK = f'tap:#fc-expanded-pack-{WORK}'
add('cards-gap-018', [TILE, TO_PACK], DEMO, SAVED, note='шторка «В какой набор?» — список')
add('cards-gap-020', [TILE, TO_PACK, PACK_WORK], DEMO, SAVED, note='карточка добавлена в «Работа» — тост «Добавлено»')
add('cards-gap-021', [TILE, TO_PACK, PACK_WORK, 'wait:1500', TO_PACK, PACK_WORK], DEMO, SAVED, note='повторное добавление — тост «уже в наборе»')

# Карточки: состояния, которые открывает сама ссылка (фикстура держит/ломает данные, тап не нужен)
add('cards-039', [], 'cards=demo&fail=saved_load', SAVED, note='«Сохранённые» — ошибка загрузки (fail=saved_load; снять fail=off)')
add('cards-047', [], 'hold=catalog_loading', PACKS, note='каталог — загрузка (hold=catalog_loading; снять hold=off)')
add('cards-075', [], 'cards=demo&hold=setup_loading', '/flashcards_training_setup', note='настройка тренировки — загрузка (hold=setup_loading)')
add('cards-gap-016', [], 'cards=demo_published&moderation=approved', HUB, note='окно «Нужна доработка» приходит само через задержку фикстуры')
add('cards-gap-037', [], 'cards=demo&hold=voices_loading', '/flashcards_voice_picker', note='голос озвучки — загрузка (hold=voices_loading)')
add('cards-v2-030', [TRAIN, 'tap:#fc-training-mode-blitz'], 'plus=off&cards=demo&quota=exhausted', HUB, note='Free: тренировки 30/30 в месяц — на настройке тренировки')


# ───────────────────────── Диалоги (/ai_dialog_home и вложенные) ─────────────────────────
# Сессия диалога требует живого старта на сервере (ИИ) — кадры самой переписки остаются «нет» (ручной путь), пока не будет подставного старта.
DLG = '/ai_dialog_home'
WORLD = 'tap:#dialogue-v2-world-toggle-*'
ROW = 'tap:#dialogue-v2-catalogue-row-*'
add('dialogs-001', [], 'plus=off&dquota=reset', DLG, note='хаб «Диалоги», Free')
add('dialogs-002', [], 'plus=on&dquota=reset', DLG, note='хаб «Диалоги», Plus')
add('dialogs-004', [], 'plus=off&dquota=0', DLG, note='хаб — лимит исчерпан 0/30')
add('dialogs-006', [WORLD], 'plus=off&dquota=reset', DLG, note='категория раскрыта (первая)')
add('dialogs-007', [WORLD, ROW], 'plus=off&dquota=reset', DLG, note='брифинг первого диалога первой категории')
add('dialogs-011', [WORLD, ROW, 'tap:#dialogue-v2-briefing-start'], 'energy=0&dev_energy_fail=1', DLG, note='старт без энергии — окно «Нет энергии»')
add('dialogs-gap-002', [], 'plus=on&dquota=reset', '/dialogue_v2_memory', note='память диалогов, Plus (кадр «пусто», если памяти нет)')
add('dialogs-gap-003', [], 'plus=off&dquota=reset', '/dialogue_v2_memory', note='память диалогов без Plus — только удаление')
add('dialogs-gap-009', [], 'plus=on&hold=freeform_loading', '/dialogue_v2_freeform', note='свободный разговор — готовим разговор (hold=freeform_loading)')
add('dialogs-gap-010', [], 'plus=off', '/dialogue_v2_freeform', note='свободный разговор без Plus — «доступен в Plus»')


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
add('profile-021', [CANCEL, 'tap:#manage-subscription-reason-other'], PLAN_Y, MANAGE, note='причина «Другое» (поле ввода)')
add(['paywalls-024', 'profile-022'], [CANCEL, REASON, 'tap:#manage-subscription-reasons-continue'], PLAN_Y, MANAGE, note='оверлей удержания после выбора причины «Слишком дорого»')

# ───────────────────────── Настройки и профиль ─────────────────────────
SETTINGS = '/(tabs)/settings'
S_FREE = 'plus=off'
add(['profile-001', 'settings-gap-002'], [], S_FREE, SETTINGS, note='главная Настроек, Plus не активна')
add('settings-gap-003', [], PLAN_Y, SETTINGS, note='главная Настроек, Plus по подписке (годовой план читается при старте)')
add(['profile-004', 'settings-gap-018'], [], S_FREE, '/settings_language', note='язык интерфейса — список языков')
add(['profile-005', 'settings-gap-019'], ['tap:#settings-study-language-row'], S_FREE, SETTINGS, note='шторка «Язык изучения»')
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
PROMO_BASE = 'plus=off&energy=3'
add('overlays-campaigns-004', [], PROMO_BASE, PROMO, note='ввод промокода — пусто')
add('overlays-campaigns-005', PROMO_TYPE, PROMO_BASE, PROMO, note='введён код — кнопка активна («можно применить»)')
add('overlays-campaigns-007', PROMO_SEND, PROMO_BASE + '&promo=ok', PROMO, note='ответ «срок подтверждён» (promo=ok)')
add('overlays-campaigns-008', PROMO_SEND, PROMO_BASE + '&promo=lifetime', PROMO, note='ответ «бессрочно» (promo=lifetime)')
add('overlays-campaigns-009', PROMO_SEND, PROMO_BASE + '&promo=not_found', PROMO, note='ответ «не найден»')
add('overlays-campaigns-010', PROMO_SEND, PROMO_BASE + '&promo=expired', PROMO, note='ответ «истёк»')
add('overlays-campaigns-011', PROMO_SEND, PROMO_BASE + '&promo=limit', PROMO, note='ответ «лимит исчерпан»')
add('overlays-campaigns-012', PROMO_SEND, PROMO_BASE + '&promo=used', PROMO, note='ответ «уже использован»')
add('overlays-campaigns-014', PROMO_SEND, PROMO_BASE + '&promo=disabled', PROMO, note='ответ «промокод отключён»')
add('overlays-campaigns-015', PROMO_SEND, PROMO_BASE + '&promo=error', PROMO, note='ответ «ошибка проверки»')
